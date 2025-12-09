<script lang="ts">
  import TripSidebar from "./TripSidebar.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  import {
    calculateDirection,
    compareCarShareOptions,
    isInHomeZone,
    type TripParameters,
  } from "../calculations";
  import type { Homezone } from "../types/evo";
  import { MediaQuery } from "svelte/reactivity";
  import { onMount } from "svelte";
  import { getMapKit } from "../utilities/mapkit";
  import WorkingDrawer from "./WorkingDrawer.svelte";

  const { homezones }: { homezones: Homezone[] } = $props();

  let tripState = $state<TripState>({
    originCoordinate: undefined,
    destinationCoordinate: undefined,
    stayDuration: undefined,
    inEvoHomeZone: false,
    bcaaMembership: false,
    electricVehicle: false,
    roundTripRequired: false,
    route: undefined,
    vehicleType: undefined,
  });

  let comparisonResult = $state<Promise<ComparisonCalc>>();

  function onSubmit() {
    comparisonResult = calculateTripDetails(tripState);
  }

  async function calculateTripDetails(
    state: TripState,
  ): Promise<ComparisonCalc> {
    if (!state.originCoordinate || !state.destinationCoordinate) {
      console.error("No origin or destination coordinates");
      return {
        data: null,
        error: {
          message: "No origin or destination coordinates",
          show: true,
        },
      };
    }

    // Get directions from MapKit
    const startCoord = state.originCoordinate;
    const endCoord = state.destinationCoordinate;
    const result = await calculateDirection(
      new mapkit.Coordinate(startCoord.latitude, startCoord.longitude),
      new mapkit.Coordinate(endCoord.latitude, endCoord.longitude),
      new Date(),
    );

    console.log("Result:", result);
    if (!result.directions.routes[0]) {
      console.error("No routes found");
      return {
        data: null,
        error: {
          message: "No routes found",
          show: true,
        },
      };
    }
    state.route = result.directions.routes[0];
    state.inEvoHomeZone = isInHomeZone(homezones, state.destinationCoordinate);
    // Using the correct response structure from the updated directions.ts file
    const travelTime = result.directions.routes[0].expectedTravelTime;
    const travelDistance = result.directions.routes[0].distance;
    console.log("traveldistance", travelDistance);
    // Calculate total trip time
    const travelTimeMinutes = Math.round((travelTime / 60) * 100) / 100;

    // Calculate days (24 hour periods)
    let tripDistanceKm = Math.ceil(travelDistance / 1000);
    console.log("tripDistanceKm", tripDistanceKm);
    // Now calculate the cost comparison
    const tripParams: TripParameters = {
      start_date: new Date(),
      driving_minutes: travelTimeMinutes,
      staying_minutes: state.stayDuration ?? 0,
      distance_km: tripDistanceKm,
      is_bcaa_member: state.bcaaMembership,
      end_is_in_evo_home_zone: state.inEvoHomeZone,
      is_ev: state.electricVehicle,
      vehicle_preference: state.vehicleType,
      round_trip_required: state.roundTripRequired,
    };
    console.log("tripParams", tripParams);
    const comparisonResult = compareCarShareOptions(tripParams);
    console.log("comparisonResult", comparisonResult);
    return {
      data: comparisonResult,
      error: null,
    };
  }

  let currentRoute = $state<mapkit.Route | undefined>(undefined);
  let currentDestination: mapkit.MarkerAnnotation | undefined;

  let mapElement: HTMLDivElement;
  let map: mapkit.Map;
  let mapkitInstance: typeof mapkit;
  // let routeOverlay: mapkit.Overlay | null = null;
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
      mapkitInstance = await getMapKit();

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

      map.addEventListener("user-location-change", (event) => {
        console.log("user-location-change", event);
        tripState.originCoordinate = event.coordinate;
      });
      map.addEventListener("user-location-error", () => {
        map.region = new mapkitInstance.CoordinateRegion(
          new mapkitInstance.Coordinate(
            defaultCoordinates.latitude,
            defaultCoordinates.longitude,
          ),
          new mapkitInstance.CoordinateSpan(defaultDelta, defaultDelta),
        );
      });

      // map.region = region;

      homezones.forEach((homezone) => {
        const zone = homezone.zone;
        const items = mapkitInstance.importGeoJSON(zone);
        if (items instanceof Error) {
          throw items;
        }

        map.addItems(items);
      });
    } catch (error) {
      console.error("Error initializing Apple Maps:", error);
    }
    map.overlays.forEach(
      (overlay) =>
        (overlay.style = new mapkitInstance.Style({
          fillColor: "#00BCE2",
          strokeColor: "#00BCE2",
        })),
    );
  });
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
    />
  </div>
  <div class="h-screen w-screen md:w-full md:h-full md:grow">
    <!-- <div class="w-full h-full bg-green-500"></div> -->
    <div class="w-full h-full" bind:this={mapElement}></div>
  </div>
</div>

{#if !isDesktop.current}
  <WorkingDrawer snapValue={snapValue}>
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
