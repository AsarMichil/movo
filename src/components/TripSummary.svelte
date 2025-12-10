<script lang="ts">
  type Props = {
    origin?: any
    destination?: any
    distanceKm?: number;
    travelTimeMinutes?: number;
    stayDuration?: number;
  };

  let {
    origin,
    destination,
    distanceKm,
    travelTimeMinutes,
    stayDuration,
  }: Props = $props();
</script>

<div class="bg-gray-100 p-4 rounded-lg space-y-3">
  <div class="flex justify-between">
    <span class="font-medium">From:</span>
    {#if origin}
      <span class="text-right">{origin.displayLines.join(", ")}</span>
    {:else}
      <span class="text-right">Your current location</span>
    {/if}
  </div>
  <div class="flex justify-between">
    <span class="font-medium">To:</span>
    <span class="text-right">{destination?.displayLines.join(", ")}</span>
  </div>
  {#if distanceKm !== undefined}
    <div class="flex justify-between">
      <span class="font-medium">Distance:</span>
      <span>{distanceKm.toFixed(1)} km</span>
    </div>
  {/if}
  {#if travelTimeMinutes !== undefined}
    <div class="flex justify-between">
      <span class="font-medium">Travel Time:</span>
      <span>{Math.round(travelTimeMinutes)} minutes (one way)</span>
    </div>
  {/if}
  <div class="flex justify-between">
    <span class="font-medium">Stay Duration:</span>
    <span>{stayDuration ?? 0} minutes</span>
  </div>
</div>
