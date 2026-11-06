import type {
  ModoPlan,
  ParkingSpot,
  TripParameters,
  VehicleClass,
} from "../calculations"
import type {
  DirectionsResponse,
  SearchAutocompleteResult,
} from "@apple/mapkit-loader"
import type { Stay } from "../lib/trip-time"

export type Place = Pick<
  SearchAutocompleteResult,
  "coordinate" | "displayLines"
>

export type Coordinate = NonNullable<Place["coordinate"]>

export interface TripForm {
  origin: Place | undefined
  destination: Place | undefined
  originIsCurrentLocation: boolean
  leaveAt: Date
  stay: Stay
  walkMeters: number
  bcaaMember: boolean
  preferEv: boolean
  roundTrip: boolean
  vehicleType: VehicleClass | undefined
  modoPlan: ModoPlan
}

// A priced trip; everything but the Modo plan is fixed when the route comes back.
export interface Trip {
  origin: Coordinate
  destination: Coordinate
  route: DirectionsResponse["routes"][number]
  parking: ParkingSpot | null
  walkMeters: number
  pricing: Omit<TripParameters, "modo_plan">
}
