<script lang="ts">
  import Address from "./Address.svelte";
  import Input from "./Input.svelte";
  // import type { TripFormData } from "./TripTypes";
  type TripFormData = any

  let {
    origin = $bindable(),
    destination = $bindable(),
    stayDuration = $bindable(),
    bcaaMembership = $bindable(),
    electricVehicle = $bindable(),
    roundTripRequired = $bindable(),
    vehicleType = $bindable(),
    onSubmit,
    isLoading = false,
  }: TripFormData & {
    onSubmit: () => void;
    isLoading?: boolean;
  } = $props();

  // Function to toggle boolean chip values
  function toggleChip(value: boolean): boolean {
    return !value;
  }

  const canSubmit = $derived(
    (origin || !origin) && destination && !isLoading,
  );
</script>

<div class="space-y-6">
  <h1 class="hidden md:block text-2xl font-bold text-gray-800">
    Plan Your Trip
  </h1>

  <div class="space-y-4">
    <div>
      <Address
        bind:value={destination}
        label="Destination"
        placeholder="Where do you want to go?"
      />
    </div>

    <div>
      <Address
        bind:value={origin}
        label="Origin"
        placeholder="Starting location"
      />
      <p class="text-xs text-gray-500 mt-1">
        We'll try to use your current location if allowed
      </p>
    </div>

    <div>
      <Input
        labelText="Stay Duration (minutes)"
        placeholder="Stay Duration?"
        type="number"
        bind:value={stayDuration}
        min="0"
        id="stay-duration"
      />
    </div>

    {#snippet toggleChipComponent(
      value: boolean,
      label: string,
      minWidth: string,
      inputId: string,
      onToggle: (newValue: boolean) => void,
    )}
      <div>
        <input id={inputId} type="checkbox" checked={value} class="hidden" />
        <button
          type="button"
          class={`${minWidth} h-8 text-center rounded-full border-2 transition-colors duration-200 font-medium ${
            value
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-transparent text-gray-800 border-gray-300"
          }`}
          onclick={() => onToggle(toggleChip(value))}
        >
          <span class="flex justify-center items-center">
            <span class="text-xs">{label}</span>
            {#if value}
              <span class="ml-1">✓</span>
            {/if}
          </span>
        </button>
      </div>
    {/snippet}

    <div class="mt-6">
      <h3 class="text-sm font-semibold text-gray-700">Options</h3>
      <div class="flex flex-wrap gap-1 my-1">
        {@render toggleChipComponent(
          roundTripRequired,
          "Round Trip Required",
          "min-w-[140px]",
          "round-trip-required",
          (newValue) => (roundTripRequired = newValue),
        )}
        {@render toggleChipComponent(
          bcaaMembership,
          "BCAA Member",
          "min-w-[115px]",
          "bcaa-membership",
          (newValue) => (bcaaMembership = newValue),
        )}
        {@render toggleChipComponent(
          electricVehicle,
          "Electric Vehicle",
          "min-w-[115px]",
          "electric-vehicle",
          (newValue) => (electricVehicle = newValue),
        )}
        <div>
          <select
            id="vehicle-type"
            bind:value={vehicleType}
            class="min-w-[115px] text-xs h-8 text-center rounded-full border-gray-300 border-2 transition-colors duration-200 font-medium"
          >
            <option value="daily_drive">Daily Drive</option>
            <option value="large_loadable">Large Loadable</option>
            <option value="oversized">Oversized</option>
          </select>
        </div>
      </div>
    </div>
  </div>

  <button
    disabled={!canSubmit}
    onclick={onSubmit}
    class="bg-gray-800 text-orange-50 w-full px-2 py-3 uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-medium hover:bg-gray-700 transition-colors"
  >
    {#if isLoading}
      Calculating...
    {:else}
      Calculate Trip
    {/if}
  </button>
</div>
