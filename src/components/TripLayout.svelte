<script lang="ts">
  import { onMount, untrack } from "svelte"
  import { MediaQuery } from "svelte/reactivity"
  import { Dialog } from "bits-ui"
  import X from "@lucide/svelte/icons/x"
  import { replaceState } from "$app/navigation"
  import { resolve } from "$app/paths"
  import { load, type MapKit } from "@apple/mapkit-loader"
  import { PUBLIC_MAPKIT_TOKEN } from "$env/static/public"
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
  import { nextQuarterHour, stayMinutes } from "../lib/trip-time"
  import { themeContext } from "../lib/theme-context.svelte"
  import ThemeToggle from "./ThemeToggle.svelte"
  import TripForm from "./TripForm.svelte"
  import TripResults from "./TripResults.svelte"
  import TripVerdict from "./TripVerdict.svelte"
  import type {
    Coordinate,
    Place,
    Trip,
    TripForm as TripFormState,
  } from "./TripTypes"

  type Props = { homezones: Homezone[]; shared: SharedTrip | null }

  let { homezones, shared }: Props = $props()

  const initial = untrack(() => shared)

  let form = $state<TripFormState>({
    origin: undefined,
    destination: undefined,
    originIsCurrentLocation: false,
    leaveAt: initial?.leave_at ?? nextQuarterHour(new Date()),
    stay: { minutes: initial?.stay_duration ?? 60 },
    walkMeters:
      initial?.parking_walking_distance ??
      DEFAULT_VALUES.parking_walking_distance,
    bcaaMember: initial?.bcaa_member ?? false,
    preferEv: initial?.electric_vehicle ?? false,
    roundTrip: initial?.round_trip ?? false,
    vehicleType: initial?.vehicle_type,
    modoPlan: initial?.modo_plan ?? DEFAULT_VALUES.modo_plan,
  })

  // The JS query only gates the mobile dialog; CSS decides what is visible so the first paint is right.
  const isDesktop = new MediaQuery("(min-width: 768px)", true)

  let panelOpen = $state(false)
  let view = $state<"form" | "results">("form")
  let calculating = $state(false)
  let error = $state<string | null>(null)
  let trip = $state.raw<Trip | null>(null)

  const originCoordinate = $derived(form.origin?.coordinate)
  const destinationCoordinate = $derived(form.destination?.coordinate)
  // A trip only stays on screen while the form still points at the same places.
  const activeTrip = $derived(
    trip &&
      trip.origin === originCoordinate &&
      trip.destination === destinationCoordinate
      ? trip
      : null,
  )
  const result = $derived(
    activeTrip &&
      compareCarShareOptions({
        ...activeTrip.pricing,
        modo_plan: form.modoPlan,
      }),
  )
  const panelView = $derived(
    view === "results" && (calculating || error !== null || activeTrip)
      ? "results"
      : "form",
  )

  const placeLabel = (place: Place | undefined) =>
    place?.displayLines.join(", ") ?? ""

  function openPanel(next: "form" | "results") {
    view = next
    panelOpen = true
  }

  function syncUrl() {
    if (!activeTrip) return
    const { origin, destination, walkMeters, pricing } = activeTrip
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
      modo_plan: form.modoPlan,
    })
    replaceState(resolve(`/?${searchParams}`), {})
  }

  function changePlan(plan: ModoPlan) {
    form.modoPlan = plan
    syncUrl()
  }

  async function calculate() {
    const origin = originCoordinate
    const destination = destinationCoordinate
    if (!origin || !destination || !mapkit || calculating) return

    view = "results"
    panelOpen = false
    calculating = true
    error = null

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
      const parking = findParking(homezones, destination, form.walkMeters)

      trip = {
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
          ),
          distance_km: Math.ceil(route.distance / 1000),
          is_bcaa_member: form.bcaaMember,
          vehicle_preference: form.vehicleType,
          end_is_in_evo_home_zone: parking !== null,
          round_trip_required: form.roundTrip,
          is_ev: form.preferEv,
        },
      }
      syncUrl()
    } catch (err) {
      console.error("Error calculating trip:", err)
      trip = null
      error = getErrorMessage(err, "Could not calculate this trip.")
    } finally {
      calculating = false
    }
  }

  let mapElement: HTMLDivElement
  let mapkit: MapKit | undefined
  let map = $state.raw<InstanceType<MapKit["Map"]>>()
  let originMarker: InstanceType<MapKit["MarkerAnnotation"]> | undefined
  let destinationMarker: InstanceType<MapKit["MarkerAnnotation"]> | undefined
  let fitted: Parameters<InstanceType<MapKit["Map"]>["showItems"]>[0] = []
  let topInset = $state(0)
  let bottomInset = $state(0)

  function fitRoute() {
    if (!map || !mapkit || fitted.length === 0) return
    map.showItems(fitted, {
      animate: true,
      padding: new mapkit.Padding(48, 48, 48, 48),
    })
  }

  $effect(() => {
    if (!map || !mapkit) return
    if (form.originIsCurrentLocation) map.showsUserLocation = true
    if (!originCoordinate || form.originIsCurrentLocation) return

    const currentMap = map
    const marker = new mapkit.MarkerAnnotation(originCoordinate, {
      color: "#6B7280",
      glyphText: "",
    })
    currentMap.addAnnotation(marker)
    originMarker = marker
    return () => {
      currentMap.removeAnnotation(marker)
      originMarker = undefined
    }
  })

  $effect(() => {
    if (!map || !mapkit || !destinationCoordinate) return

    const currentMap = map
    const marker = new mapkit.MarkerAnnotation(destinationCoordinate)
    currentMap.addAnnotation(marker)
    destinationMarker = marker
    if (!untrack(() => activeTrip)) {
      currentMap.showItems([marker], {
        animate: true,
        minimumSpan: new mapkit.CoordinateSpan(0.008, 0.008),
      })
    }
    return () => {
      currentMap.removeAnnotation(marker)
      destinationMarker = undefined
    }
  })

  $effect(() => {
    if (!map || !mapkit || !activeTrip) return

    const currentMap = map
    const { polyline } = activeTrip.route
    polyline.style = new mapkit.Style({ strokeColor: "#000088", lineWidth: 4 })
    currentMap.addOverlay(polyline)

    const { parking } = activeTrip
    const parkingMarker = parking
      ? new mapkit.MarkerAnnotation(
          new mapkit.Coordinate(parking.latitude, parking.longitude),
          {
            title: "Park Here!",
            subtitle: parking.name,
            color: "#16A34A",
            glyphText: "P",
            displayPriority: 1000,
          },
        )
      : undefined
    if (parkingMarker) currentMap.addAnnotation(parkingMarker)

    fitted = [polyline, originMarker, destinationMarker, parkingMarker].filter(
      (item) => item !== undefined,
    )
    fitRoute()

    return () => {
      currentMap.removeOverlay(polyline)
      if (parkingMarker) currentMap.removeAnnotation(parkingMarker)
      fitted = []
    }
  })

  // Keeps MapKit's controls and the fitted route clear of the mobile overlays.
  $effect(() => {
    if (!map || !mapkit) return
    map.padding = new mapkit.Padding(topInset, 0, bottomInset, 0)
    untrack(fitRoute)
  })

  $effect(() => {
    if (map) map.colorScheme = themeContext.mapColorScheme
  })

  // Shared links only carry coordinates, so label them with an address.
  function sharedPlace(
    coordinate: Coordinate,
    done: (place: Place) => void,
  ): Place {
    new mapkit!.Geocoder().reverseLookup(coordinate, (_, response) => {
      const address = response?.results[0]?.formattedAddress
      if (address) done({ coordinate, displayLines: [address] })
    })
    return {
      coordinate,
      displayLines: [
        `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`,
      ],
    }
  }

  onMount(async () => {
    try {
      mapkit = await load({
        token: PUBLIC_MAPKIT_TOKEN,
        language: "en-US",
        libraries: ["services", "full-map", "geojson", "user-location"],
      })

      if (shared) {
        const origin = new mapkit.Coordinate(
          shared.origin_lat,
          shared.origin_lng,
        )
        const destination = new mapkit.Coordinate(
          shared.dest_lat,
          shared.dest_lng,
        )
        form.origin = sharedPlace(origin, (place) => {
          if (form.origin?.coordinate === origin) form.origin = place
        })
        form.destination = sharedPlace(destination, (place) => {
          if (form.destination?.coordinate === destination)
            form.destination = place
        })
      }

      const newMap = new mapkit.Map(mapElement, {
        region: new mapkit.CoordinateRegion(
          new mapkit.Coordinate(49.28091630159075, -123.11395918331695),
          new mapkit.CoordinateSpan(0.1, 0.1),
        ),
        colorScheme: themeContext.mapColorScheme,
      })

      navigator.permissions
        ?.query({ name: "geolocation" })
        .then((status) => {
          if (status.state === "granted") newMap.showsUserLocation = true
        })
        .catch(() => {})

      for (const homezone of homezones) {
        const items = mapkit.importGeoJSON(homezone.zone)
        if (items instanceof Error) throw items
        if (items) newMap.addItems(items.getFlattenedItemList())
      }
      const zoneStyle = new mapkit.Style({
        fillColor: "#00BCE2",
        strokeColor: "#00BCE2",
      })
      newMap.overlays.forEach((overlay) => (overlay.style = zoneStyle))

      map = newMap

      if (shared) await calculate()
    } catch (err) {
      console.error("Error initializing Apple Maps:", err)
    }
  })
</script>

<div class="relative flex h-full w-full">
  <Dialog.Root
    bind:open={
      () => panelOpen && !isDesktop.current, (open) => (panelOpen = open)
    }
  >
    <Dialog.Content
      forceMount
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      {#snippet child({ props })}
        <aside
          {...isDesktop.current ? {} : props}
          class="fixed inset-0 z-50 hidden flex-col bg-stone-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-gray-800 data-[state=open]:flex md:static md:z-auto md:flex md:w-96 md:shrink-0 md:py-0 dark:bg-gray-900 dark:text-gray-100"
        >
          <div
            class="flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:pt-5"
          >
            <Dialog.Title class="text-2xl font-bold">
              {panelView === "form" ? "Plan Your Trip" : "Trip Results"}
            </Dialog.Title>
            <div class="flex items-center gap-2">
              {#if panelView === "results"}
                <button
                  type="button"
                  onclick={() => (view = "form")}
                  class="cursor-pointer text-sm underline text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  Edit trip
                </button>
              {:else if activeTrip}
                <button
                  type="button"
                  onclick={() => (view = "results")}
                  class="cursor-pointer text-sm underline text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  View results
                </button>
              {/if}
              <ThemeToggle />
              <Dialog.Close
                class="cursor-pointer rounded-md p-2 hover:bg-gray-200 md:hidden dark:hover:bg-gray-700"
              >
                <X class="size-6" />
                <span class="sr-only">Close</span>
              </Dialog.Close>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-5">
            <div class={{ hidden: panelView !== "form" }}>
              <TripForm
                bind:form
                drivingMinutes={activeTrip?.pricing.driving_minutes}
                {calculating}
                onSubmit={calculate}
              />
            </div>
            {#if panelView === "results"}
              {#if calculating}
                <div
                  class="flex flex-col items-center gap-3 py-16"
                  role="status"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    class="size-14 animate-spin"
                    aria-hidden="true"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Calculating All of the Things...
                </div>
              {:else if error}
                <p class="text-red-600 dark:text-red-400">{error}</p>
              {:else if activeTrip && result}
                <TripResults
                  trip={activeTrip}
                  {result}
                  fromLabel={placeLabel(form.origin)}
                  toLabel={placeLabel(form.destination)}
                  onPlanChange={changePlan}
                />
              {/if}
            {/if}
          </div>
        </aside>
      {/snippet}
    </Dialog.Content>
  </Dialog.Root>

  <div class="relative h-full min-w-0 grow">
    <div class="h-full w-full" bind:this={mapElement}></div>

    <div
      bind:clientHeight={topInset}
      class="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden"
    >
      {#if calculating}
        <p
          class="mx-auto w-fit rounded-full bg-white px-4 py-2 shadow-md dark:bg-gray-800"
          role="status"
        >
          Calculating...
        </p>
      {:else if error}
        <p
          class="rounded-md bg-white px-4 py-2 text-red-600 shadow-md dark:bg-gray-800 dark:text-red-400"
        >
          {error}
        </p>
      {:else if result}
        <TripVerdict {result} />
      {/if}
    </div>

    <div
      bind:clientHeight={bottomInset}
      class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center gap-3 px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:hidden"
    >
      {#if activeTrip || error}
        {#if activeTrip}
          <button
            type="button"
            onclick={() => openPanel("results")}
            class="pointer-events-auto cursor-pointer bg-gray-800 px-5 py-3 uppercase text-orange-50 shadow-lg dark:bg-gray-700 dark:text-gray-100"
          >
            See details
          </button>
        {/if}
        <button
          type="button"
          onclick={() => openPanel("form")}
          class="pointer-events-auto cursor-pointer border-2 border-gray-800 bg-white px-5 py-3 uppercase text-gray-800 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Edit trip
        </button>
      {:else}
        <button
          type="button"
          disabled={calculating}
          onclick={() => openPanel("form")}
          class="pointer-events-auto cursor-pointer bg-gray-800 px-6 py-3 uppercase text-orange-50 shadow-lg disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100"
        >
          Plan trip
        </button>
      {/if}
    </div>
  </div>
</div>
