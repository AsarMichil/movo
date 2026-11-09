<script lang="ts">
  import type { Snippet } from "svelte"
  import { MODO_PLAN_LABELS, type ComparisonResult } from "../calculations"
  import { formatDuration } from "../lib/trip-time"
  import type { Trip } from "./TripTypes"

  type Props = { result: ComparisonResult; trip: Trip; footer?: Snippet }

  let { result, trip, footer }: Props = $props()

  const { driving_minutes, staying_minutes, round_trip_required } = $derived(
    trip.pricing,
  )
  const tripMinutes = $derived(
    driving_minutes * (round_trip_required ? 2 : 1) + staying_minutes,
  )

  const providers = $derived({
    evo: { label: "Evo", total: result.evo.total, dot: "bg-evo" },
    modo: {
      label: MODO_PLAN_LABELS[result.modo_plan],
      total: result.modo.total,
      dot: "bg-modo",
    },
  })
  const winner = $derived(providers[result.cheapest])
  const loser = $derived(providers[result.cheapest === "evo" ? "modo" : "evo"])
</script>

<div class="border-2 border-rule bg-surface">
  <ul aria-label="Price comparison">
    <li
      class="border-b-2 border-rule bg-signal px-3.5 pt-3 pb-2.5 text-on-signal"
    >
      <div class="flex items-center justify-between gap-2">
        <span
          class="bg-on-signal px-1.5 py-0.5 text-[11px] font-extrabold tracking-[0.07em] text-signal uppercase"
        >
          Cheapest
        </span>
        <span class="text-[13px] font-semibold tabular-nums">
          {round_trip_required ? "Round trip" : "One way"} · {formatDuration(
            tripMinutes,
          )}
        </span>
      </div>
      <div class="mt-1 flex flex-wrap items-end justify-between gap-x-2">
        <span
          class="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.02em]"
        >
          <span
            class={[
              "size-2.5 shrink-0 ring-[1.5px] ring-on-signal",
              winner.dot,
            ]}
            aria-hidden="true"
          ></span>
          {winner.label}
        </span>
        <span
          class="ml-auto text-[52px] leading-[0.9] font-extrabold tracking-[-0.045em] tabular-nums"
        >
          ${winner.total.toFixed(2)}
        </span>
      </div>
    </li>
    <li class="flex items-center gap-2.5 hatch px-3.5 py-2.5 text-muted">
      <span class="flex flex-1 items-center gap-2 font-semibold">
        <span class={["size-2.5 shrink-0", loser.dot]} aria-hidden="true"
        ></span>
        {loser.label}
      </span>
      <span class="text-[13px] font-bold text-loser tabular-nums">
        +${result.savings.toFixed(2)}<span class="sr-only"> more</span>
      </span>
      <span
        class="text-[19px] font-bold tracking-[-0.02em] text-ink tabular-nums"
      >
        ${loser.total.toFixed(2)}
      </span>
    </li>
  </ul>
  {#if footer}
    <div class="border-t-2 border-rule">
      {@render footer()}
    </div>
  {/if}
</div>
