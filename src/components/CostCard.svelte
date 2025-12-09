<script lang="ts">
  import type { CostOption } from "./TripTypes";

  type ExpandedStage = "mini" | "partial" | "full";

  let {
    label,
    total,
    details,
    time_cost,
    distance_cost,
    fees,
    taxes,
    discounts,
  }: CostOption = $props();

  let expandedStage = $state<ExpandedStage>("mini");

  function toggleExpandedStage() {
    if (expandedStage === "mini") {
      expandedStage = "partial";
    } else if (expandedStage === "partial") {
      expandedStage = "full";
    } else {
      expandedStage = "mini";
    }
  }
</script>

<div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
  <button
    class="w-full bg-gray-800 text-white p-3 font-bold flex justify-between items-center cursor-pointer hover:bg-gray-700 transition-colors"
    onclick={toggleExpandedStage}
  >
    <span>{label}: ${total.toFixed(2)}</span>

    {#if expandedStage === "mini"}
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
    {:else if expandedStage === "partial"}
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

  {#if expandedStage === "full"}
    <div class="p-3 bg-inherit">
      <div
        class="border border-gray-200 bg-gray-200 rounded-md p-1 flex flex-col gap-1"
      >
        {#each details as detail}
          <span class="text-sm">{detail}</span>
        {/each}
      </div>
    </div>
  {/if}

  {#if expandedStage === "partial" || expandedStage === "full"}
    <div class="p-3 space-y-2 bg-inherit">
      <div class="flex justify-between text-sm">
        <span>Time cost:</span>
        <span>${time_cost.toFixed(2)}</span>
      </div>
      {#if distance_cost !== undefined}
        <div class="flex justify-between text-sm">
          <span>Distance cost:</span>
          <span>${distance_cost.toFixed(2)}</span>
        </div>
      {/if}
      <div class="flex justify-between text-sm">
        <span>Fees:</span>
        <span>${fees.toFixed(2)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span>Taxes:</span>
        <span>${taxes.toFixed(2)}</span>
      </div>
      {#if discounts && discounts > 0}
        <div class="flex justify-between text-sm text-green-600">
          <span>Discounts:</span>
          <span>-${discounts.toFixed(2)}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Always visible summary footer -->
  <div class="p-3 border-t border-gray-200 bg-white">
    <div class="flex justify-between font-medium">
      <span>Total Cost:</span>
      <span>${total.toFixed(2)}</span>
    </div>
  </div>
</div>
