import type { MapKit } from "@apple/mapkit-loader"
import { replaceState } from "$app/navigation"
import { resolve } from "$app/paths"
import {
  calculateDirection,
  compareCarShareOptions,
  findParking,
  type ModoPlan,
} from "../calculations"
import type { Homezone } from "../types/evo"
import {
  buildSearchParams,
  DEFAULT_VALUES,
  type SharedTrip,
} from "../lib/url-params"
import { getErrorMessage } from "../lib/errors"
import { nextQuarterHour, stayMinutes, walkMeters } from "../lib/trip-time"
import type { Coordinate, Place, Trip, TripForm } from "./TripTypes"

const label = (place: Place | undefined) => place?.displayLines.join(", ") ?? ""

// The one place trip state lives; both shells and the map read from it.
export class TripPlanner {
  form = $state<TripForm>({
    origin: undefined,
    destination: undefined,
    originIsCurrentLocation: false,
    leaveAt: nextQuarterHour(new Date()),
    stay: { minutes: 60 },
    walkMeters: walkMeters(5),
    bcaaMember: false,
    preferEv: false,
    roundTrip: false,
    vehicleType: undefined,
    modoPlan: DEFAULT_VALUES.modo_plan,
  })
  trip = $state.raw<Trip | null>(null)
  calculating = $state(false)
  error = $state<string | null>(null)

  originLabel = $derived(label(this.form.origin))
  destinationLabel = $derived(label(this.form.destination))
  origin = $derived(this.form.origin?.coordinate)
  destination = $derived(this.form.destination?.coordinate)
  // A trip only stays on screen while the form still points at the same places.
  activeTrip = $derived(
    this.trip &&
      this.trip.origin === this.origin &&
      this.trip.destination === this.destination
      ? this.trip
      : null,
  )
  result = $derived(
    this.activeTrip &&
      compareCarShareOptions({
        ...this.activeTrip.pricing,
        modo_plan: this.form.modoPlan,
      }),
  )

  #homezones: Homezone[]
  #shared: SharedTrip | null
  #mapkit: MapKit | undefined

  constructor(homezones: Homezone[], shared: SharedTrip | null) {
    this.#homezones = homezones
    this.#shared = shared
    if (shared)
      Object.assign(this.form, {
        leaveAt: shared.leave_at ?? this.form.leaveAt,
        stay: { minutes: shared.stay_duration },
        walkMeters: shared.parking_walking_distance,
        bcaaMember: shared.bcaa_member,
        preferEv: shared.electric_vehicle,
        roundTrip: shared.round_trip,
        vehicleType: shared.vehicle_type,
        modoPlan: shared.modo_plan,
      } satisfies Partial<TripForm>)
  }

  async start(mapkit: MapKit) {
    this.#mapkit = mapkit
    const shared = this.#shared
    if (!shared) return

    const origin = new mapkit.Coordinate(shared.origin_lat, shared.origin_lng)
    const destination = new mapkit.Coordinate(shared.dest_lat, shared.dest_lng)
    this.form.origin = this.#sharedPlace(mapkit, origin, (place) => {
      if (this.form.origin?.coordinate === origin) this.form.origin = place
    })
    this.form.destination = this.#sharedPlace(mapkit, destination, (place) => {
      if (this.form.destination?.coordinate === destination)
        this.form.destination = place
    })
    await this.calculate()
  }

  // Shared links only carry coordinates, so label them with an address.
  #sharedPlace(
    mapkit: MapKit,
    coordinate: Coordinate,
    done: (place: Place) => void,
  ): Place {
    new mapkit.Geocoder().reverseLookup(coordinate, (_, response) => {
      const address = response?.results[0]?.formattedAddress
      if (address) done({ coordinate, displayLines: address.split(", ") })
    })
    return {
      coordinate,
      displayLines: [
        `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`,
      ],
    }
  }

  #syncUrl() {
    if (!this.activeTrip) return
    const { origin, destination, walkMeters, pricing } = this.activeTrip
    const searchParams = buildSearchParams({
      origin_lat: origin.latitude,
      origin_lng: origin.longitude,
      dest_lat: destination.latitude,
      dest_lng: destination.longitude,
      leave_at: pricing.start_date,
      stay_duration: pricing.staying_minutes,
      parking_walking_distance: walkMeters,
      bcaa_member: pricing.is_bcaa_member,
      electric_vehicle: pricing.is_ev,
      round_trip: pricing.round_trip_required,
      vehicle_type: pricing.vehicle_preference,
      modo_plan: this.form.modoPlan,
    })
    replaceState(resolve(`/?${searchParams}`), {})
  }

  changePlan = (plan: ModoPlan) => {
    this.form.modoPlan = plan
    this.#syncUrl()
  }

  clear = () => {
    this.form.origin = undefined
    this.form.destination = undefined
    this.form.originIsCurrentLocation = false
    this.trip = null
    this.error = null
    replaceState(resolve("/"), {})
  }

  calculate = async () => {
    const { origin, destination, form } = this
    const mapkit = this.#mapkit
    if (!origin || !destination || !mapkit || this.calculating) return

    this.calculating = true
    this.error = null

    try {
      const { directions } = await calculateDirection(
        mapkit,
        origin,
        destination,
        form.leaveAt,
      )
      const route = directions?.routes[0]
      if (!route) throw new Error("No driving route found for this trip.")

      const driving_minutes =
        Math.round((route.expectedTravelTime / 60) * 100) / 100
      const parking = findParking(
        this.#homezones,
        origin,
        destination,
        form.walkMeters,
      )

      this.trip = {
        origin,
        destination,
        route,
        parking,
        walkMeters: form.walkMeters,
        pricing: {
          start_date: form.leaveAt,
          driving_minutes,
          staying_minutes: stayMinutes(
            form.stay,
            form.leaveAt,
            driving_minutes,
            form.roundTrip,
          ),
          distance_km: Math.ceil(route.distance / 1000),
          is_bcaa_member: form.bcaaMember,
          vehicle_preference: form.vehicleType,
          end_is_in_evo_home_zone: parking !== null,
          round_trip_required: form.roundTrip,
          is_ev: form.preferEv,
        },
      }
      this.#syncUrl()
    } catch (err) {
      console.error("Error calculating trip:", err)
      this.trip = null
      this.error = getErrorMessage(err, "Could not calculate this trip.")
    } finally {
      this.calculating = false
    }
  }
}
