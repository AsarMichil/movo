<script lang="ts">
  import Address from "./Address.svelte";
  import Input from "./Input.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  
  // Get current location on component mount
  type ExpandedStage = "mini" | "partial" | "full";
  // Update the map with coordinates
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
    isFormView = $bindable(),
  }: TripState & {
    comparisonResult: Promise<ComparisonCalc> | undefined;
    calculateTripDetails: () => void;
    isFormView: boolean;
  } = $props();

  let origin = $state<any | undefined>(undefined)
  let destination = $state<any | undefined>(undefined)

  $inspect(originCoordinate, destinationCoordinate, origin, destination);

  $inspect(roundTripRequired);
  $effect(() => {
    if (origin) {
      originCoordinate = origin.coordinate;
    }
    if (destination) {
      destinationCoordinate = destination.coordinate;
    }
  });
  let isLoading = $state(false);
  function toggleExpandedStage(stage: ExpandedStage) {
    if (stage === "mini") {
      return "partial";
    }
    if (stage === "partial") {
      return "full";
    }
    return "mini";
  }
  // Add toggle state variables for each card
  let evoExpandedStage = $state<ExpandedStage>("mini");
  let modoMonthlyExpandedStage = $state<ExpandedStage>("mini");
  let modoPlusExpandedStage = $state<ExpandedStage>("mini");

  type CostOption = {
    label: string;
    total: number;
    details: string[];
    time_cost: number;
    distance_cost?: number;
    fees: number;
    taxes: number;
    discounts?: number;
    expandedStage: ExpandedStage;
    setExpandedStage: (stage: ExpandedStage) => void;
  };

  function editForm() {
    isFormView = true;
    evoExpandedStage = "mini";
    modoMonthlyExpandedStage = "mini";
    modoPlusExpandedStage = "mini";
  }

  // Function to toggle boolean chip values
  function toggleChip(value: boolean): boolean {
    return !value;
  }
</script>

<div class="w-full h-full overflow-y-auto md:p-5 bg-stone-50">
  {#if isFormView}
    <!-- Form View -->
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
          <!-- <label
            for="stay-duration"
            class="block text-sm text-gray-700 font-medium"
          >
            Stay Duration (minutes)
          </label>
          <input
            id="stay-duration"
            type="number"
            bind:value={stayDuration}
            min="0"
          /> -->
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
            <input
              id={inputId}
              type="checkbox"
              checked={value}
              class="hidden"
            />
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
        disabled={(!origin && !originCoordinate) ||
          (!destination && !destinationCoordinate) ||
          isLoading}
        onclick={() => {
          calculateTripDetails();
          isFormView = false;
        }}
        class="bg-gray-800 text-orange-50 w-full px-2 py-3 uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isLoading}
          Calculating...
        {:else}
          Calculate Trip
        {/if}
      </button>
    </div>
  {:else}
    {#await comparisonResult}
      <div class="flex justify-center items-center h-full">
        <div class="flex flex-col items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="animate-spin w-14 h-14"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <div class="text-gray-800">Calculating All of the Things...</div>
        </div>
      </div>
    {:then result}
      {#if !result}
        <!-- Do nothing -->
      {:else if result.error}
        <div class="text-red-500">
          {result.error.message}
        </div>
      {:else if !result.data}
        <!-- Do nothing -->
      {:else}
        <!-- Results View -->
        <div class="space-y-6">
          <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-800">Trip Results</h1>
            <button
              onclick={editForm}
              class="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Edit Trip
            </button>
          </div>

          <div class="bg-gray-100 p-4 rounded-md space-y-3">
            <div class="flex justify-between">
              <span class="font-medium">From:</span>
              {#if origin}
                <span class="text-right">{origin.displayLines.join(", ")}</span>
              {:else}
                <span class="text-right"> Your current location </span>
              {/if}
            </div>
            <div class="flex justify-between">
              <span class="font-medium">To:</span>
              <span class="text-right"
                >{destination?.displayLines.join(", ")}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Distance:</span>
              <span>{result.data.distance_km?.toFixed(1)} km</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Travel Time:</span>
              <span
                >{Math.round(result.data.travel_time_minutes_one_way)} minutes (one
                way)</span
              >
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Stay Duration:</span>
              <span>{stayDuration ?? 0} minutes</span>
            </div>
          </div>

          <div class="border-t-2 border-gray-200 pt-4">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">
              Cost Comparison
            </h2>

            <div class="space-y-4">
              <!-- Cheapest Option Highlight -->
              <div class="bg-green-100 p-4 rounded-md">
                <p class="font-bold text-green-800">
                  Best Option: {result.data.cheapest_option}
                </p>
                <p class="text-green-700">
                  You save ${result.data.savings.toFixed(2)} compared to the next
                  best option
                </p>
              </div>

              {#snippet costCard(option: CostOption)}
                <div class="border border-gray-200 rounded-md overflow-hidden">
                  <button
                    class="w-full bg-gray-800 text-white p-3 font-bold flex justify-between items-center cursor-pointer"
                    onclick={() =>
                      option.setExpandedStage(
                        toggleExpandedStage(option.expandedStage),
                      )}
                  >
                    <span>{option.label}: ${option.total.toFixed(2)}</span>

                    {#if option.expandedStage === "mini"}
                      <!-- Three dots icon -->
                      <svg
                        class="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="6" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="18" cy="12" r="2" />
                      </svg>
                    {:else if option.expandedStage === "partial"}
                      <!-- Two dots icon -->
                      <svg
                        class="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="9" cy="12" r="2" />
                        <circle cx="15" cy="12" r="2" />
                      </svg>
                    {:else}
                      <!-- X icon -->
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    {/if}
                  </button>

                  {#if option.expandedStage === "full"}
                    <div class="p-3 bg-inherit">
                      <div
                        class="border border-gray-200 bg-gray-200 rounded-md p-1 flex flex-col gap-1"
                      >
                        {#each option.details as detail}
                          <span class="text-sm">{detail}</span>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if option.expandedStage === "partial" || option.expandedStage === "full"}
                    <div class="p-3 space-y-2 bg-inherit">
                      <div class="flex justify-between text-sm">
                        <span>Time cost:</span>
                        <span>${option.time_cost.toFixed(2)}</span>
                      </div>
                      {#if option.distance_cost !== undefined}
                        <div class="flex justify-between text-sm">
                          <span>Distance cost:</span>
                          <span>${option.distance_cost.toFixed(2)}</span>
                        </div>
                      {/if}
                      <div class="flex justify-between text-sm">
                        <span>Fees:</span>
                        <span>${option.fees.toFixed(2)}</span>
                      </div>
                      <div class="flex justify-between text-sm">
                        <span>Taxes:</span>
                        <span>${option.taxes.toFixed(2)}</span>
                      </div>
                      {#if option.discounts && option.discounts > 0}
                        <div
                          class="flex justify-between text-sm text-green-600"
                        >
                          <span>Discounts:</span>
                          <span>-${option.discounts.toFixed(2)}</span>
                        </div>
                      {/if}
                    </div>
                  {/if}

                  <!-- Always visible summary footer -->
                  <div class="p-3 border-t border-gray-200 bg-white">
                    <div class="flex justify-between font-medium">
                      <span>Total Cost:</span>
                      <span>${option.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              {/snippet}

              <!-- Evo Card -->
              {@render costCard({
                label: "Evo",
                ...result.data.evo,
                expandedStage: evoExpandedStage,
                setExpandedStage: (stage) => (evoExpandedStage = stage),
              })}

              <!-- Modo Plus Card -->
              {@render costCard({
                label: "Modo Plus",
                ...result.data.modo_plus,
                expandedStage: modoPlusExpandedStage,
                setExpandedStage: (stage) => (modoPlusExpandedStage = stage),
              })}

              <!-- Modo Monthly Card -->
              {@render costCard({
                label: "Modo Monthly",
                ...result.data.modo_monthly,
                expandedStage: modoMonthlyExpandedStage,
                setExpandedStage: (stage) => (modoMonthlyExpandedStage = stage),
              })}
            </div>
          </div>
        </div>
      {/if}
    {/await}
  {/if}
</div>
