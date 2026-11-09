<script lang="ts">
  import { onMount, untrack } from "svelte"
  import Plus from "@lucide/svelte/icons/plus"
  import Minus from "@lucide/svelte/icons/minus"
  import Scan from "@lucide/svelte/icons/scan"
  import Satellite from "@lucide/svelte/icons/satellite"
  import { load, type MapKit } from "@apple/mapkit-loader"
  import { PUBLIC_MAPKIT_TOKEN } from "$env/static/public"
  import type { ParkingSpot } from "../calculations"
  import type { Homezone } from "../types/evo"
  import { themeContext } from "../lib/theme-context.svelte"
  import type { Coordinate, Trip } from "./TripTypes"

  type Props = {
    homezones: Homezone[]
    origin: Coordinate | undefined
    destination: Coordinate | undefined
    originIsCurrentLocation: boolean
    trip: Trip | null
    calculating: boolean
    insets: { top: number; bottom: number; left: number }
    onReady: (mapkit: MapKit) => void
  }

  let {
    homezones,
    origin,
    destination,
    originIsCurrentLocation,
    trip,
    calculating,
    insets,
    onReady,
  }: Props = $props()

  type Marker = InstanceType<MapKit["MarkerAnnotation"]>

  // MapKit can't read CSS variables; these mirror the app.css tokens.
  const SIGNAL = "#C6F432"
  const ON_SIGNAL = "#0B0C0D"
  const ZONE = "#00BCE2"
  const colors = $derived(
    themeContext.isDarkMode
      ? { ink: "#F2F4F3", bg: "#0B0C0D", muted: "#A0A6A9" }
      : { ink: "#0B0C0D", bg: "#F2F3F3", muted: "#565C5F" },
  )

  let mapElement: HTMLDivElement
  let mapkit: MapKit | undefined
  let map = $state.raw<InstanceType<MapKit["Map"]>>()
  let originMarker = $state.raw<Marker>()
  let destinationMarker = $state.raw<Marker>()
  let parkingMarker = $state.raw<Marker>()
  let route = $state.raw<Trip["route"]["polyline"]>()
  let controlsWidth = $state(0)
  let satellite = $state(false)
  let legendHeight = $state(0)

  const parking = $derived(trip?.parking ?? null)
  const parkHere = (spot: ParkingSpot) => ({
    title: "Park Here!",
    subtitle: spot.name,
    color: SIGNAL,
    glyphColor: ON_SIGNAL,
    glyphText: "P",
  })

  function fitRoute() {
    if (!map || !mapkit || !route) return
    map.showItems(
      [route, originMarker, destinationMarker, parkingMarker].filter(
        (item) => item !== undefined,
      ),
      { animate: true, padding: new mapkit.Padding(48, 48, 48, 48) },
    )
  }

  function zoom(factor: number) {
    map?.setCameraDistanceAnimated(map.cameraDistance * factor, true)
  }

  $effect(() => {
    if (map && originIsCurrentLocation) map.showsUserLocation = true
  })

  $effect(() => {
    if (!map || !mapkit || !origin || originIsCurrentLocation) return
    const currentMap = map
    const marker = new mapkit.MarkerAnnotation(origin, { glyphText: "" })
    currentMap.addAnnotation(marker)
    originMarker = marker
    return () => {
      currentMap.removeAnnotation(marker)
      originMarker = undefined
    }
  })

  $effect(() => {
    if (!map || !mapkit || !destination) return
    const currentMap = map
    const marker = new mapkit.MarkerAnnotation(destination)
    currentMap.addAnnotation(marker)
    destinationMarker = marker
    // A route fit is on its way; a second animated zoom would fight it.
    if (!untrack(() => trip || calculating)) {
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
    if (!map || !trip) return
    const currentMap = map
    const { polyline } = trip.route
    currentMap.addOverlay(polyline)
    route = polyline
    return () => {
      currentMap.removeOverlay(polyline)
      route = undefined
    }
  })

  $effect(() => {
    if (!map || !mapkit || !parking || parking.distance_meters === 0) return
    const currentMap = map
    const marker = new mapkit.MarkerAnnotation(
      new mapkit.Coordinate(parking.latitude, parking.longitude),
      { ...parkHere(parking), displayPriority: 1000 },
    )
    currentMap.addAnnotation(marker)
    parkingMarker = marker
    return () => {
      currentMap.removeAnnotation(marker)
      parkingMarker = undefined
    }
  })

  $effect(() => {
    if (originMarker) originMarker.color = colors.muted
  })

  // Parking at the destination itself restyles its marker instead of hiding it under a second pin.
  $effect(() => {
    if (!destinationMarker) return
    Object.assign(
      destinationMarker,
      parking?.distance_meters === 0
        ? parkHere(parking)
        : {
            title: "",
            subtitle: "",
            color: colors.ink,
            glyphColor: colors.bg,
            glyphText: "",
          },
    )
  })

  $effect(() => {
    if (route && mapkit)
      route.style = new mapkit.Style({
        // Imagery is dark in both themes, so the route stays light on it.
        strokeColor: satellite ? "#F2F4F3" : colors.ink,
        lineWidth: 5,
      })
  })

  // Keeps MapKit's own controls and every fitted route clear of the shell's panels and the map overlays.
  $effect(() => {
    if (!map || !mapkit) return
    map.padding = new mapkit.Padding(
      insets.top,
      controlsWidth && controlsWidth + 40,
      insets.bottom + legendHeight,
      insets.left,
    )
    fitRoute()
  })

  $effect(() => {
    if (map) map.colorScheme = themeContext.mapColorScheme
  })

  $effect(() => {
    if (map && mapkit)
      map.mapType = satellite
        ? mapkit.Map.MapTypes.Hybrid
        : mapkit.Map.MapTypes.Standard
  })

  onMount(async () => {
    try {
      const loaded = await load({
        token: PUBLIC_MAPKIT_TOKEN,
        language: "en-US",
        libraries: ["services", "full-map", "geojson", "user-location"],
      })

      const newMap = new loaded.Map(mapElement, {
        region: new loaded.CoordinateRegion(
          new loaded.Coordinate(49.28091630159075, -123.11395918331695),
          new loaded.CoordinateSpan(0.1, 0.1),
        ),
        colorScheme: themeContext.mapColorScheme,
        showsZoomControl: false,
        showsMapTypeControl: false,
      })

      navigator.permissions
        ?.query({ name: "geolocation" })
        .then((status) => {
          if (status.state === "granted") newMap.showsUserLocation = true
        })
        .catch(() => {})

      for (const homezone of homezones) {
        const items = loaded.importGeoJSON(homezone.zone)
        if (items instanceof Error) throw items
        if (items) newMap.addItems(items.getFlattenedItemList())
      }
      const zoneStyle = new loaded.Style({ fillColor: ZONE, strokeColor: ZONE })
      newMap.overlays.forEach((overlay) => (overlay.style = zoneStyle))

      mapkit = loaded
      map = newMap
      onReady(loaded)
    } catch (err) {
      console.error("Error initializing Apple Maps:", err)
    }
  })

  const controlClass =
    "grid size-11 cursor-pointer place-items-center disabled:cursor-not-allowed disabled:text-muted"
</script>

<div class="absolute inset-0">
  <div class="h-full w-full" bind:this={mapElement}></div>

  <div
    class="pointer-events-none absolute top-0 right-0 flex flex-col gap-2 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:p-5"
  >
    <div bind:offsetWidth={controlsWidth} class="hidden flex-col gap-2 md:flex">
      <div
        class="pointer-events-auto flex flex-col border-2 border-rule bg-surface text-ink"
      >
        <button
          type="button"
          aria-label="Zoom in"
          onclick={() => zoom(0.5)}
          class={controlClass}
        >
          <Plus class="size-5" strokeWidth={2.6} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onclick={() => zoom(2)}
          class={[controlClass, "border-t border-hair"]}
        >
          <Minus class="size-5" strokeWidth={2.6} />
        </button>
      </div>
      <button
        type="button"
        aria-label="Fit route"
        disabled={!route}
        onclick={fitRoute}
        class={[
          controlClass,
          "pointer-events-auto border-2 border-rule bg-surface text-ink",
        ]}
      >
        <Scan class="size-5" />
      </button>
    </div>
    <button
      type="button"
      aria-label="Satellite view"
      aria-pressed={satellite}
      onclick={() => (satellite = !satellite)}
      class={[
        controlClass,
        "pointer-events-auto border-2 border-rule bg-surface text-ink aria-pressed:bg-signal aria-pressed:text-on-signal",
      ]}
    >
      <Satellite class="size-5" />
    </button>
  </div>

  <div
    bind:offsetHeight={legendHeight}
    class="pointer-events-none absolute right-0 bottom-0 hidden p-5 md:block"
  >
    <ul
      aria-label="Map legend"
      class="flex items-center gap-4 border-2 border-rule bg-surface px-3.5 py-2.5 text-[13px] font-semibold text-ink"
    >
      <li class="flex items-center gap-2">
        <span class="size-3.5 bg-zone/20 inset-ring-[1.5px] inset-ring-zone"
        ></span>
        Evo home zone
      </li>
      <li class="flex items-center gap-2">
        <span class="size-3 rounded-full bg-surface inset-ring-3 inset-ring-ink"
        ></span>
        Start
      </li>
      <li class="flex items-center gap-2">
        <span class="size-3 bg-ink"></span>
        Destination
      </li>
    </ul>
  </div>
</div>
