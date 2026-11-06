<script lang="ts">
  import { addMinutes } from "date-fns"
  import {
    MODO_PLAN_LABELS,
    type ComparisonResult,
    type CostBreakdown,
    type ModoPlan,
  } from "../calculations"
  import {
    formatDuration,
    formatTime,
    WALK_METERS_PER_MINUTE,
  } from "../lib/trip-time"
  import Segmented from "./Segmented.svelte"
  import TripVerdict from "./TripVerdict.svelte"
  import type { Trip } from "./TripTypes"

  type Props = {
    trip: Trip
    result: ComparisonResult
    fromLabel: string
    toLabel: string
    onPlanChange: (plan: ModoPlan) => void
  }

  let { trip, result, fromLabel, toLabel, onPlanChange }: Props = $props()

  const PLAN_OPTIONS = (["plus", "monthly"] as const).map((value) => ({
    value,
    label: MODO_PLAN_LABELS[value],
  }))

  const { start_date, driving_minutes, staying_minutes, round_trip_required } =
    $derived(trip.pricing)
  const arrive = $derived(addMinutes(start_date, driving_minutes))
  const leaveDestination = $derived(addMinutes(arrive, staying_minutes))
  const back = $derived(addMinutes(leaveDestination, driving_minutes))
  const walkMinutes = $derived(
    Math.max(1, Math.round(trip.walkMeters / WALK_METERS_PER_MINUTE)),
  )
  const winner = $derived(
    result.cheapest === "evo" ? "Evo" : MODO_PLAN_LABELS[result.modo_plan],
  )
</script>

{#snippet row(label: string, value: string)}
  <div class="flex justify-between gap-4">
    <dt class="font-medium">{label}</dt>
    <dd class="text-right">{value}</dd>
  </div>
{/snippet}

{#snippet costCard(label: string, cost: CostBreakdown)}
  <details
    class="group rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden"
  >
    <summary
      class="flex cursor-pointer list-none items-center justify-between bg-gray-800 dark:bg-gray-700 p-3 font-bold text-white"
    >
      <span>{label}</span>
      <span class="flex items-center gap-2">
        ${cost.total.toFixed(2)}
        <span class="text-xs font-normal underline group-open:hidden"
          >Breakdown</span
        >
        <span class="hidden text-xs font-normal underline group-open:inline"
          >Hide</span
        >
      </span>
    </summary>
    <dl class="space-y-1 p-3 text-sm">
      {@render row("Time", `$${cost.time_cost.toFixed(2)}`)}
      {@render row("Distance", `$${cost.distance_cost.toFixed(2)}`)}
      {@render row("Fees", `$${cost.fees.toFixed(2)}`)}
      {@render row("Taxes", `$${cost.taxes.toFixed(2)}`)}
      {#if cost.discounts > 0}
        <div class="text-green-700 dark:text-green-400">
          {@render row("Discounts", `-$${cost.discounts.toFixed(2)}`)}
        </div>
      {/if}
    </dl>
    {#if cost.details.length > 0}
      <ul
        class="mx-3 mb-3 space-y-1 rounded-md bg-gray-100 dark:bg-gray-800 p-2 text-sm"
      >
        {#each cost.details as detail (detail)}
          <li>{detail}</li>
        {/each}
      </ul>
    {/if}
  </details>
{/snippet}

<div class="space-y-5 text-gray-800 dark:text-gray-200">
  <TripVerdict {result} />

  <p class="font-medium">
    {winner} saves you ${result.savings.toFixed(2)}.
  </p>

  <div class="space-y-1">
    <span class="text-sm font-semibold">Your Modo plan</span>
    <Segmented
      label="Modo plan"
      options={PLAN_OPTIONS}
      value={result.modo_plan}
      onChange={onPlanChange}
    />
  </div>

  <p
    class={[
      "rounded-md p-3 text-sm",
      trip.parking
        ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200"
        : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    ]}
  >
    {#if trip.parking}
      Park at {trip.parking.name}, about {Math.round(
        trip.parking.distance_meters,
      )} m from your destination (the Park Here! pin on the map).
    {:else}
      No Evo parking within {walkMinutes} min walk — Evo must be kept for the stay.
    {/if}
  </p>

  <dl class="space-y-2 rounded-md bg-gray-100 dark:bg-gray-800 p-4">
    {@render row("From", fromLabel)}
    {@render row("To", toLabel)}
    {@render row("Leave at", formatTime(start_date, new Date()))}
    {@render row(
      "Drive",
      `${formatDuration(driving_minutes)}, ${result.distance_km.toFixed(1)} km${round_trip_required ? " each way" : ""}`,
    )}
    {@render row(
      "At destination",
      `${formatDuration(staying_minutes)}, until ${formatTime(leaveDestination, start_date)}`,
    )}
    {#if round_trip_required}
      {@render row("Back around", formatTime(back, start_date))}
    {/if}
  </dl>

  <div class="space-y-3">
    {@render costCard(MODO_PLAN_LABELS[result.modo_plan], result.modo)}
    {@render costCard("Evo", result.evo)}
  </div>
</div>
