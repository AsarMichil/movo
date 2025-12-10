<script lang="ts">
  import CostCard from "./CostCard.svelte";
  import TripSummary from "./TripSummary.svelte";
  import type { ComparisonCalc } from "./TripTypes";

  type Props = {
    comparisonResult: Promise<ComparisonCalc> | undefined
    origin?: any
    destination?: any
    stayDuration?: number
    onEditForm: () => void
  }

  let {
    comparisonResult,
    origin,
    destination,
    stayDuration,
    onEditForm,
  }: Props = $props();
</script>

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
          onclick={onEditForm}
          class="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Edit Trip
        </button>
      </div>

      <TripSummary
        {origin}
        {destination}
        distanceKm={result.data.distance_km}
        travelTimeMinutes={result.data.travel_time_minutes_one_way}
        {stayDuration}
      />

      <div class="border-t-2 border-gray-200 pt-4">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">
          Cost Comparison
        </h2>

        <div class="space-y-4">
          <!-- Cheapest Option Highlight -->
          <div class="bg-green-100 p-4 rounded-lg">
            <p class="font-bold text-green-800">
              Best Option: {result.data.cheapest_option}
            </p>
            <p class="text-green-700">
              You save ${result.data.savings.toFixed(2)} compared to the next
              best option
            </p>
          </div>

          <!-- Evo Card -->
          <CostCard label="Evo" {...result.data.evo} />

          <!-- Modo Plus Card -->
          <CostCard label="Modo Plus" {...result.data.modo_plus} />

          <!-- Modo Monthly Card -->
          <CostCard label="Modo Monthly" {...result.data.modo_monthly} />
        </div>
      </div>
    </div>
  {/if}
{/await}
