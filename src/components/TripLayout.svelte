<script lang="ts">
  import TripSidebar from "./TripSidebar.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  import type { Homezone } from "../types/evo";
  import { MediaQuery } from "svelte/reactivity";
  import { onMount, untrack } from "svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import X from "@lucide/svelte/icons/x";
  import { goto } from "$app/navigation";
  import { buildSearchParams } from "../lib/url-params";
  import { getTripContext } from "../lib/trip-context.svelte";
  import { themeContext } from "../lib/theme-context.svelte";
  import { load, type MapKit } from "@apple/mapkit-loader";
  import type { TripParameters } from "../calculations";

  import { PUBLIC_MAPKIT_TOKEN } from "$env/static/public";

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
    parkingWalkingDistance: tripContext.params?.parking_walking_distance ?? 50,
    origin: undefined,
    destination: undefined,
  });

  let comparisonResult = $state<Promise<ComparisonCalc>>();
  let isFormView = $state(true);
  let dialogOpen = $state(false);

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
      console.error("No origin or destination coordinates");
      return;
    }

    if (!mapkitInstance) {
      console.error("MapKit not initialized");
      return;
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
    });

    // Perform client-side calculations
    tripContext.setIsCalculating(true);

    try {
      const { calculateDirection, compareCarShareOptions, isInHomeZone } =
        await import("../calculations");

      const result = await calculateDirection(
        mapkitInstance,
        tripState.originCoordinate,
        tripState.destinationCoordinate,
        new Date(),
      );

      if (!result.directions?.routes?.[0]) {
        console.error("No route found");
        tripContext.setIsCalculating(false);
        return;
      }
      tripState.route = result.directions.routes[0];
      const route = tripState.route;

      const travelTimeMinutes =
        Math.round((route.expectedTravelTime / 60) * 100) / 100;
      const tripDistanceKm = Math.ceil(route.distance / 1000);
      const endIsInEvoHomeZone = isInHomeZone(
        homezones,
        tripState.destinationCoordinate,
        tripState.parkingWalkingDistance,
      );

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
      };

      const calculations = compareCarShareOptions(tripParams);
      tripContext.setCalculations(calculations);
    } catch (error) {
      console.error("Error calculating trip:", error);
    } finally {
      tripContext.setIsCalculating(false);
      goto(`?${searchParams.toString()}`, {
        replaceState: true,
        keepFocus: true,
        noScroll: true,
      });
    }
  }

  let currentRoute: TripState["route"];
  let currentDestination: InstanceType<MapKit["MarkerAnnotation"]> | undefined;
  let currentOrigin: InstanceType<MapKit["MarkerAnnotation"]> | undefined;
  let originIsCurrentLocation = $state(false);

  let mapElement: HTMLDivElement;
  let map: InstanceType<MapKit["Map"]> | undefined = $state();
  let mapkitInstance: MapKit;
  // let routeOverlay: mapkit.Overlay | null = null
  const defaultDelta = 0.1;
  // Default coordinates (Vancouver)
  const defaultCoordinates = {
    latitude: 49.28091630159075,
    longitude: -123.11395918331695,
  };
  const isDesktop = new MediaQuery("(min-width: 768px)", true);

  $effect(() => {
    if (!map) {
      return;
    }
    if (
      tripState.originCoordinate &&
      mapkitInstance &&
      !originIsCurrentLocation
    ) {
      // Remove old origin marker if exists
      if (currentOrigin) {
        map.removeAnnotation(currentOrigin);
      }

      // Only create marker for non-current-location origins (gray marker)
      // Current location is handled by showsUserLocation
      currentOrigin = new mapkitInstance.MarkerAnnotation(
        new mapkitInstance.Coordinate(
          tripState.originCoordinate.latitude,
          tripState.originCoordinate.longitude,
        ),
        {
          color: "#6B7280",
          glyphText: "",
        },
      );
      map.addAnnotation(currentOrigin);
    } else if (currentOrigin && originIsCurrentLocation) {
      // Remove marker if switching to current location
      map.removeAnnotation(currentOrigin);
      currentOrigin = undefined;
    }

    // Enable user location display when using current location
    if (map && originIsCurrentLocation) {
      if (!map.showsUserLocation) {
        map.showsUserLocation = true;
      }
    }
  });

  $effect(() => {
    if (!map) {
      return;
    }
    if (tripState.destinationCoordinate && !tripState.route) {
      // place marker on map only if no route calculated yet
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
      // center map on destination
      map.showItems([currentDestination], {
        animate: true,
        minimumSpan: new mapkitInstance.CoordinateSpan(0.008, 0.008),
      });
    }
  });

  $effect(() => {
    if (tripState.route && mapkitInstance && map) {
      if (currentRoute) {
        map.removeOverlay(currentRoute.polyline);
      }
      // Style and add the route polyline
      const polyline = tripState.route.polyline;
      polyline.style = new mapkitInstance.Style({
        strokeColor: "#000088",
        lineWidth: 3,
      });
      map.addOverlay(polyline);
      currentRoute = tripState.route;

      // Update markers
      const itemsToShow: any[] = [polyline];

      // Add origin marker if not using current location
      if (tripState.originCoordinate && !originIsCurrentLocation) {
        if (currentOrigin) {
          itemsToShow.push(currentOrigin);
        }
      }

      // Add/update destination marker
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
        itemsToShow.push(currentDestination);
      }

      // Zoom to show all items (route, origin, destination)
      if (itemsToShow.length > 0) {
        map.showItems(itemsToShow, {
          animate: true,
          padding: new mapkitInstance.Padding(60, 60, 60, 60),
        });
      }

    }
  });

  // Only resets re-run this; markers stay because the form keeps its values.
  $effect(() => {
    tripContext.resetTrigger;
    untrack(() => {
      if (map && currentRoute) {
        map.removeOverlay(currentRoute.polyline);
      }
      currentRoute = undefined;
      tripState.route = undefined;
    });
  });

  $effect(() => {
    if (map) {
      map.colorScheme = themeContext.mapColorScheme;
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

      const params = tripContext.params;
      if (params) {
        tripState.originCoordinate = new mapkitInstance.Coordinate(
          params.origin_lat,
          params.origin_lng,
        );
        tripState.destinationCoordinate = new mapkitInstance.Coordinate(
          params.dest_lat,
          params.dest_lng,
        );
      }

      // Create the map
      map = new mapkitInstance.Map(mapElement, {
        region: new mapkitInstance.CoordinateRegion(
          new mapkitInstance.Coordinate(
            defaultCoordinates.latitude,
            defaultCoordinates.longitude,
          ),
          new mapkitInstance.CoordinateSpan(defaultDelta, defaultDelta),
        ),
        colorScheme: themeContext.mapColorScheme,
      });

      // Check if location permission is already granted
      if (navigator.permissions) {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((result) => {
            if (result.state === "granted" && map) {
              map.showsUserLocation = true;
            }
          })
          .catch(() => {
            // Permissions API not supported or error, do nothing
          });
      }

      // map.region = region

      homezones.forEach((homezone) => {
        const zone = homezone.zone;
        const items = mapkitInstance.importGeoJSON(zone);
        if (items instanceof Error) {
          throw items;
        }

        if (items) {
          map?.addItems(items as any);
        }
      });

      map.overlays.forEach(
        (overlay) =>
          (overlay.style = new mapkitInstance.Style({
            fillColor: "#00BCE2",
            strokeColor: "#00BCE2",
          })),
      );

      if (params) {
        await onSubmit();
      }
    } catch (error) {
      console.error("Error initializing Apple Maps:", error);
    }
  });
</script>

{#snippet sidebar()}
  <TripSidebar
    bind:originCoordinate={tripState.originCoordinate}
    bind:destinationCoordinate={tripState.destinationCoordinate}
    inEvoHomeZone={tripState.inEvoHomeZone}
    bind:stayDuration={tripState.stayDuration}
    bind:bcaaMembership={tripState.bcaaMembership}
    bind:electricVehicle={tripState.electricVehicle}
    bind:roundTripRequired={tripState.roundTripRequired}
    bind:vehicleType={tripState.vehicleType}
    bind:route={tripState.route}
    bind:parkingWalkingDistance={tripState.parkingWalkingDistance}
    bind:origin={tripState.origin}
    bind:destination={tripState.destination}
    {comparisonResult}
    calculateTripDetails={onSubmit}
    bind:isFormView
    bind:originIsCurrentLocation
  />
{/snippet}

<div class="relative flex w-full h-full">
  {#if isDesktop.current}
    <div class="hidden md:block min-w-sm max-w-96 h-full">
      {@render sidebar()}
    </div>
  {/if}
  <div class="w-full h-full grow" bind:this={mapElement}></div>
</div>

{#if !isDesktop.current}
  <button
    type="button"
    onclick={() => (dialogOpen = true)}
    class="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-10 px-6 py-3 uppercase shadow-lg cursor-pointer bg-gray-800 dark:bg-gray-700 text-orange-50 dark:text-gray-100"
  >
    {isFormView ? "Plan trip" : "View results"}
  </button>

  <Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content
      class="inset-0 translate-x-0 translate-y-0 flex flex-col gap-0 h-dvh w-full max-w-none sm:max-w-none rounded-none p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-base bg-stone-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100"
    >
      <div class="flex items-center justify-between px-4 py-3">
        <Dialog.Title class="text-2xl font-bold">
          {isFormView ? "Plan Your Trip" : "Trip Results"}
        </Dialog.Title>
        <Dialog.Close
          class="p-2 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X class="size-6" />
          <span class="sr-only">Close</span>
        </Dialog.Close>
      </div>
      <div class="min-h-0 flex-1 px-4 pb-4">
        {@render sidebar()}
      </div>
    </Dialog.Content>
  </Dialog.Root>
{/if}
