<script lang="ts">
  import * as Drawer from "$lib/components/ui/drawer";
  import TripForm from "./TripForm.svelte";
  import TripResults from "./TripResults.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";

  let {
    originCoordinate = $bindable(),
    destinationCoordinate = $bindable(),
    stayDuration = $bindable(),
    bcaaMembership = $bindable(),
    electricVehicle = $bindable(),
    roundTripRequired = $bindable(),
    vehicleType = $bindable(),
    comparisonResult,
    calculateTripDetails,
  }: TripState & {
    comparisonResult: Promise<ComparisonCalc> | undefined;
    calculateTripDetails: () => void;
  } = $props();

  // Local state for address autocomplete results
  let origin = $state<mapkit.SearchAutocompleteResult | undefined>(undefined);
  let destination = $state<mapkit.SearchAutocompleteResult | undefined>(
    undefined,
  );

  // Sync coordinates with autocomplete results
  $effect(() => {
    if (origin) {
      originCoordinate = origin.coordinate;
    }
    if (destination) {
      destinationCoordinate = destination.coordinate;
    }
  });

  let isFormView = $state(true);
  let isLoading = $state(false);
  let open = $state(true);
  let snap = $state<string | number | null>("148px");

  function handleSubmit() {
    isLoading = true;
    calculateTripDetails();
    isFormView = false;
    snap = 0.85;
    setTimeout(() => {
      isLoading = false;
    }, 100);
  }

  function editForm() {
    isFormView = true;
    snap = "148px";
  }

  // Watch for destination changes to expand drawer
  $effect(() => {
    if (destination && isFormView) {
      snap = 0.6;
    }
  });
</script>

<div class="md:hidden">
  <div class="bg-red-500 text-white p-4">BALLS - Drawer container</div>
  <Drawer.Root
    bind:open
    bind:activeSnapPoint={snap}
    snapPoints={["148px", 0.6, 0.85, 1]}
    dismissible={false}
  >
    <Drawer.Content class="bg-stone-50 fixed bottom-0 left-0 right-0 z-50">
      <div class="mx-auto w-full max-w-md">
        <div
          class="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 mb-4 mt-2"
        ></div>
        <div class="px-4 pb-4">
          {#if isFormView}
            <TripForm
              bind:origin
              bind:destination
              bind:stayDuration
              bind:bcaaMembership
              bind:electricVehicle
              bind:roundTripRequired
              bind:vehicleType
              onSubmit={handleSubmit}
              {isLoading}
            />
          {:else}
            <TripResults
              {comparisonResult}
              {origin}
              {destination}
              {stayDuration}
              onEditForm={editForm}
            />
          {/if}
        </div>
      </div>
    </Drawer.Content>
  </Drawer.Root>
</div>
