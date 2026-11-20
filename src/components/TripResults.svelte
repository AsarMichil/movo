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

  const rateDate = (effective: string) =>
    format(parseISO(effective), "MMM yyyy")

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
      <a
        href={RATES.evo.source}
        target="_blank"
        rel="noreferrer"
        class="underline">Evo {rateDate(RATES.evo.effective)}</a
      >
      and
      <a
        href={RATES.modo.source}
        target="_blank"
        rel="noreferrer"
        class="underline">Modo {rateDate(RATES.modo.effective)}</a
      >
      rates.
    </p>
    <CopyLink />
  </div>
</div>
