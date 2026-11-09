<script lang="ts">
  import { addMinutes } from "date-fns"
  import type { ComparisonResult } from "../calculations"
  import { formatDuration, formatTime } from "../lib/trip-time"
  import type { Trip } from "./TripTypes"

  let { trip, result }: { trip: Trip; result: ComparisonResult } = $props()

  const { start_date, driving_minutes, staying_minutes, round_trip_required } =
    $derived(trip.pricing)
  const leaveDestination = $derived(
    addMinutes(start_date, driving_minutes + staying_minutes),
  )
  const back = $derived(addMinutes(leaveDestination, driving_minutes))
</script>

{#snippet cell(label: string, value: string, wide = false)}
  <div class={["bg-surface px-3 py-2.5", wide && "col-span-2"]}>
    <dt class="text-xs font-semibold text-muted">{label}</dt>
    <dd class="font-bold">{value}</dd>
  </div>
{/snippet}

<dl class="grid grid-cols-2 gap-px border-2 border-rule bg-hair">
  {@render cell("Leave at", formatTime(start_date, new Date()))}
  {@render cell(
    round_trip_required ? "Drive, each way" : "Drive",
    `${formatDuration(driving_minutes)} · ${result.distance_km.toFixed(1)} km`,
  )}
  {@render cell(
    "At destination",
    `${formatDuration(staying_minutes)}, until ${formatTime(leaveDestination, start_date)}`,
    !round_trip_required,
  )}
  {#if round_trip_required}
    {@render cell("Back around", formatTime(back, start_date))}
  {/if}
</dl>
