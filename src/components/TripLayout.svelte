<script lang="ts">
  import TripSidebar from "./TripSidebar.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  import type { Homezone } from "../types/evo";
  import { MediaQuery } from "svelte/reactivity";
  import { onMount } from "svelte";
  import WorkingDrawer from "./WorkingDrawer.svelte"
  import { goto } from "$app/navigation"
  import { buildSearchParams } from "../lib/url-params"
  import { getTripContext } from "../lib/trip-context.svelte"
  import { load, type MapKit } from "@apple/mapkit-loader"
  import type { TripParameters } from "../calculations"

  import { PUBLIC_MAPKIT_TOKEN } from "$env/static/public"

  const { homezones }: { homezones: Homezone[] } = $props();

  const tripContext = getTripContext();

  let tripState = $state<TripState>({
    originCoordinate: undefined,
    destinationCoordinate: undefined,
    stayDuration: tripContext.params?.stay_duration ?? undefined,
    inEvoHomeZone: false,
    bcaaMembership: tripContext.params?.bcaa_member ?? false,
    electricVehicle: tripContext.params?.electric_vehicle ?? false,
    roundTripRequired: tripContext.params?.round_trip ?? false,
    route: undefined,
    vehicleType: tripContext.params?.vehicle_type,
  });

  let comparisonResult = $state<Promise<ComparisonCalc>>();
  let isFormView = $state(true);

  $effect(() => {
    if (tripContext.calculations) {
      comparisonResult = Promise.resolve({
        data: tripContext.calculations,
        error: null,
      });
      isFormView = false;
    }
  });

  async function onSubmit() {
    if (!tripState.originCoordinate || !tripState.destinationCoordinate) {
      console.error("No origin or destination coordinates")
      return
    }

    if (!mapkitInstance) {
      console.error("MapKit not initialized")
      return
    }

    const searchParams = buildSearchParams({
      origin_lat: tripState.originCoordinate.latitude,
      origin_lng: tripState.originCoordinate.longitude,
      dest_lat: tripState.destinationCoordinate.latitude,
      dest_lng: tripState.destinationCoordinate.longitude,
      stay_duration: tripState.stayDuration,
      bcaa_member: tripState.bcaaMembership,
      electric_vehicle: tripState.electricVehicle,
      round_trip: tripState.roundTripRequired,
      vehicle_type: tripState.vehicleType,
    })

    goto(`?${searchParams.toString()}`)

    // Perform client-side calculations
    tripContext.setIsCalculating(true)

    try {
      const { calculateDirection, compareCarShareOptions, isInHomeZone } = await import("../calculations")

      const result = await calculateDirection(
        mapkitInstance,
        tripState.originCoordinate,
        tripState.destinationCoordinate,
        new Date(),
      )

      if (!result.directions?.routes?.[0]) {
        console.error("No route found")
        tripContext.setIsCalculating(false)
        return
      }

      const route = result.directions.routes[0]
      const travelTimeMinutes = Math.round((route.expectedTravelTime / 60) * 100) / 100
      const tripDistanceKm = Math.ceil(route.distance / 1000)
      const endIsInEvoHomeZone = isInHomeZone(
        homezones,
        tripState.destinationCoordinate
      )

      const tripParams: TripParameters = {
        start_date: new Date(),
        driving_minutes: travelTimeMinutes,
        staying_minutes: tripState.stayDuration ?? 0,
        distance_km: tripDistanceKm,
        is_bcaa_member: tripState.bcaaMembership,
        end_is_in_evo_home_zone: endIsInEvoHomeZone,
        is_ev: tripState.electricVehicle,
        vehicle_preference: tripState.vehicleType,
        round_trip_required: tripState.roundTripRequired,
      }

      const calculations = compareCarShareOptions(tripParams)
      tripContext.setCalculations(calculations)
    } catch (error) {
      console.error("Error calculating trip:", error)
    } finally {
      tripContext.setIsCalculating(false)
    }
  }

  let currentRoute = $state<any | undefined>(undefined)
  let currentDestination: InstanceType<MapKit["MarkerAnnotation"]> | undefined

  let mapElement: HTMLDivElement
  let map: InstanceType<MapKit["Map"]>
  let mapkitInstance: MapKit
  // let routeOverlay: mapkit.Overlay | null = null
  const defaultDelta = 0.1;
  // Default coordinates (Vancouver)
  const defaultCoordinates = {
    latitude: 49.28091630159075,
    longitude: -123.11395918331695,
  };
  const isDesktop = new MediaQuery("(min-width: 768px)");
  let snapValue: string | number = $state("148px");
  $effect(() => {
    if (tripState.destinationCoordinate) {
      console.log("destinationCoordinate", tripState.destinationCoordinate);
      // place marker on map
      if (currentDestination) {
        map.removeAnnotation(currentDestination);
      }
      currentDestination = new mapkitInstance.MarkerAnnotation(
        new mapkitInstance.Coordinate(
          tripState.destinationCoordinate.latitude,
          tripState.destinationCoordinate.longitude,
        ),
      );
      map.addAnnotation(currentDestination);
      snapValue = 0.4;
      // center map on destination
      map.showItems([currentDestination], { animate: true });
    }

    if (tripState.route) {
      if (currentRoute) {
        map.removeOverlay(currentRoute.polyline);
      }
      const polylines = tripState.route.polyline;
      polylines.style = new mapkitInstance.Style({
        strokeColor: "#000088",
        lineWidth: 2,
      });
      if (map) map.showItems(polylines);
      currentRoute = tripState.route;
      if (tripState.destinationCoordinate) {
        if (currentDestination) {
          map.removeAnnotation(currentDestination);
        }
        currentDestination = new mapkitInstance.MarkerAnnotation(
          new mapkitInstance.Coordinate(
            tripState.destinationCoordinate.latitude,
            tripState.destinationCoordinate.longitude,
          ),
        );
        map.addAnnotation(currentDestination);
      }
    }
  });

  onMount(async () => {
    try {
      // Initialize MapKit JS
      mapkitInstance = await load({
        token: PUBLIC_MAPKIT_TOKEN,
        language: "en-US",
        libraries: ["services", "full-map", "geojson", "user-location"],
      });

      // Initialize coordinates from URL params if available
      if (tripContext.params) {
        if (
          !tripState.originCoordinate &&
          tripContext.params.origin_lat &&
          tripContext.params.origin_lng
        ) {
          tripState.originCoordinate = new mapkitInstance.Coordinate(
            tripContext.params.origin_lat,
            tripContext.params.origin_lng,
          );
        }
        if (tripContext.params.dest_lat && tripContext.params.dest_lng) {
          tripState.destinationCoordinate = new mapkitInstance.Coordinate(
            tripContext.params.dest_lat,
            tripContext.params.dest_lng,
          );
        }
      }

      // Create the map
      map = new mapkitInstance.Map(mapElement, {
        tracksUserLocation: true,
        region: new mapkitInstance.CoordinateRegion(
          new mapkitInstance.Coordinate(
            defaultCoordinates.latitude,
            defaultCoordinates.longitude,
          ),
          new mapkitInstance.CoordinateSpan(defaultDelta, defaultDelta),
        ),
      });
      // after creating map ensure overlay is on screen??

      map.addEventListener("user-location-change", (event: any) => {
        console.log("user-location-change", event)
        if (!tripState.originCoordinate) {
          tripState.originCoordinate = event.coordinate
        }
      })
      map.addEventListener("user-location-error", () => {
        map.region = new mapkitInstance.CoordinateRegion(
          new mapkitInstance.Coordinate(
            defaultCoordinates.latitude,
            defaultCoordinates.longitude,
          ),
          new mapkitInstance.CoordinateSpan(defaultDelta, defaultDelta),
        );
      });

      // map.region = region

      homezones.forEach((homezone) => {
        const zone = homezone.zone
        const items = mapkitInstance.importGeoJSON(zone)
        if (items instanceof Error) {
          throw items
        }

        if (items) {
          map.addItems(items as any)
        }
      })

      map.overlays.forEach(
        (overlay) =>
          (overlay.style = new mapkitInstance.Style({
            fillColor: "#00BCE2",
            strokeColor: "#00BCE2",
          })),
      )

      // If URL params have coordinates, perform calculation
      if (
        tripContext.params &&
        tripContext.params.origin_lat &&
        tripContext.params.origin_lng &&
        tripContext.params.dest_lat &&
        tripContext.params.dest_lng
      ) {
        await onSubmit()
      }
    } catch (error) {
      console.error("Error initializing Apple Maps:", error)
    }
  })
</script>

<div class="w-full flex h-full">
  <div class="hidden md:block md:max-w-96 h-full">
    <TripSidebar
      bind:originCoordinate={tripState.originCoordinate}
      bind:destinationCoordinate={tripState.destinationCoordinate}
      inEvoHomeZone={tripState.inEvoHomeZone}
      bind:stayDuration={tripState.stayDuration}
      bind:bcaaMembership={tripState.bcaaMembership}
      bind:electricVehicle={tripState.electricVehicle}
      bind:roundTripRequired={tripState.roundTripRequired}
      bind:vehicleType={tripState.vehicleType}
      route={tripState.route}
      {comparisonResult}
      calculateTripDetails={onSubmit}
      bind:isFormView
    />
  </div>
  <div class="h-screen w-screen md:w-full md:h-full md:grow">
    <!-- <div class="w-full h-full bg-green-500"></div> -->
    <div class="w-full h-full" bind:this={mapElement}></div>
  </div>
</div>

{#if !isDesktop.current}
  <WorkingDrawer {snapValue}>
    <TripSidebar
      bind:originCoordinate={tripState.originCoordinate}
      bind:destinationCoordinate={tripState.destinationCoordinate}
      inEvoHomeZone={tripState.inEvoHomeZone}
      bind:stayDuration={tripState.stayDuration}
      bind:bcaaMembership={tripState.bcaaMembership}
      bind:electricVehicle={tripState.electricVehicle}
      bind:roundTripRequired={tripState.roundTripRequired}
      bind:vehicleType={tripState.vehicleType}
      route={tripState.route}
      {comparisonResult}
      calculateTripDetails={onSubmit}
      bind:isFormView
    />
  </WorkingDrawer>
{/if}

<!-- <Drawer.Root snapPoints={["88px", "400px", 1]} activeSnapPoint={activeSnapPoint}>
  <Drawer.Trigger>Open</Drawer.Trigger>
  <Drawer.Content>
    <Drawer.Header>
      <Drawer.Title>Are you sure absolutely sure?</Drawer.Title>
      <Drawer.Description>This action cannot be undone.</Drawer.Description>
    </Drawer.Header>
    <Drawer.Footer>
      <Button>Submit</Button>
      <Drawer.Close>Cancel</Drawer.Close>
    </Drawer.Footer>
  </Drawer.Content>
</Drawer.Root> -->

<!-- <Drawer.Root
  snapPoints={["78px", "400px", 1]}
  bind:activeSnapPoint
>
  <Drawer.Trigger>Open</Drawer.Trigger>

  <Drawer.Portal>
    <Drawer.Overlay />

    <Drawer.Content
      class="bg-stone-50 fixed flex flex-col rounded-t-[10px] bottom-0 left-0 right-0 h-full max-h-[97%] mx-[-1px] md:hidden"
    >
      <div
        class={"flex flex-col max-w-md mx-auto w-full p-2 min-h-[400px] " +
          (activeSnapPoint === "1" ? "overflow-y-auto" : "overflow-hidden")}
      >
        <div>Hello</div>
        
        <TripSidebar
          bind:originCoordinate={tripState.originCoordinate}
          bind:destinationCoordinate={tripState.destinationCoordinate}
          inEvoHomeZone={tripState.inEvoHomeZone}
          bind:stayDuration={tripState.stayDuration}
          bind:bcaaMembership={tripState.bcaaMembership}
          bind:electricVehicle={tripState.electricVehicle}
          bind:roundTripRequired={tripState.roundTripRequired}
          bind:vehicleType={tripState.vehicleType}
          route={tripState.route}
          {comparisonResult}
          calculateTripDetails={onSubmit}
        />
      </div>
    </Drawer.Content>
    class="fixed inset-0 bg-black/40 md:hidden"
  </Drawer.Portal>
</Drawer.Root> -->
