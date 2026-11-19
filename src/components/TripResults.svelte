<script lang="ts">
  import { format, parseISO } from "date-fns"
  import {
    MODO_PLAN_LABELS,
    RATES,
    type ComparisonResult,
    type ModoPlan,
  } from "../calculations"
  import CopyLink from "./CopyLink.svelte"
  import CostBreakdown from "./CostBreakdown.svelte"
  import ParkingNote from "./ParkingNote.svelte"
  import Segmented from "./Segmented.svelte"
  import TripRoute from "./TripRoute.svelte"
  import TripSummary from "./TripSummary.svelte"
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

  const RATE_SOURCES = [
    { label: "Evo", rates: RATES.evo },
    { label: "Modo", rates: RATES.modo },
  ].map(({ label, rates }) => ({
    label,
    href: rates.source,
    date: format(parseISO(rates.effective), "MMM yyyy"),
  }))

  const PLAN_OPTIONS = (["plus", "monthly"] as const).map((value) => ({
    value,
    label: MODO_PLAN_LABELS[value].replace("Modo ", ""),
  }))
</script>

<div class="space-y-4 text-ink">
  <TripRoute {fromLabel} {toLabel} />
  <TripVerdict {result} {trip} />
  <ParkingNote parking={trip.parking} walkMeters={trip.walkMeters} />

  <div class="flex items-center justify-between gap-3">
    <span class="text-xs font-extrabold tracking-wider uppercase">
      Your Modo plan
    </span>
    <Segmented
      label="Modo plan"
      options={PLAN_OPTIONS}
      value={result.modo_plan}
      onChange={onPlanChange}
    />
  </div>

  <TripSummary {trip} {result} />
  <CostBreakdown {result} />

  <div class="flex items-center justify-between gap-3 text-[13px] text-muted">
    <p>
      Estimated from
      {#each RATE_SOURCES as source, index (source.label)}
        {#if index > 0}and{/if}
        <a href={source.href} target="_blank" rel="noreferrer" class="underline"
          >{source.label} {source.date}</a
        >
      {/each}
      rates.
    </p>
    <CopyLink />
  </div>
</div>
