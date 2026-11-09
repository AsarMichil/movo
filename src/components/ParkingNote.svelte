<script lang="ts">
  import type { ParkingSpot } from "../calculations"
  import { walkMinutes } from "../lib/trip-time"

  let {
    parking,
    walkMeters,
  }: { parking: ParkingSpot | null; walkMeters: number } = $props()
</script>

<div class="flex items-start gap-3 border-2 border-rule bg-surface p-3">
  <span
    aria-hidden="true"
    class="grid size-7 shrink-0 place-items-center bg-signal text-[15px] font-black text-on-signal ring-[2.5px] ring-on-signal ring-inset"
  >
    P
  </span>
  <p class="text-sm">
    {#if !parking}
      No Evo parking within {walkMinutes(walkMeters)} min walk — Evo must be kept
      for the stay.
    {:else if parking.distance_meters === 0}
      Your destination is inside the Evo home zone — park right there.
    {:else}
      Park at <b>{parking.name}</b> (~{Math.round(parking.distance_meters)} m,
      {walkMinutes(parking.distance_meters)} min walk) — see the Park Here! pin
    {/if}
  </p>
</div>
