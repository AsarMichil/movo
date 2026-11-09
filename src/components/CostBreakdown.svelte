<script lang="ts">
  import {
    MODO_PLAN_LABELS,
    type ComparisonResult,
    type CostBreakdown,
  } from "../calculations"

  let { result }: { result: ComparisonResult } = $props()

  const providers = $derived(
    [
      { id: "evo", label: "Evo", dot: "bg-evo", cost: result.evo },
      {
        id: "modo",
        label: MODO_PLAN_LABELS[result.modo_plan],
        dot: "bg-modo",
        cost: result.modo,
      },
    ].sort(
      (a, b) =>
        Number(b.id === result.cheapest) - Number(a.id === result.cheapest),
    ),
  )

  const lines = (cost: CostBreakdown) =>
    [
      ["Time", cost.time_cost],
      ["Distance", cost.distance_cost],
      ["Fees", cost.fees],
      ["Taxes", cost.taxes],
    ] as const
</script>

<div class="space-y-3 text-[13px] tabular-nums">
  <div class="grid grid-cols-2 gap-3">
    {#each providers as provider (provider.id)}
      <dl class="flex flex-col gap-1 border-t-2 border-rule pt-2">
        <div class="flex justify-between gap-2 text-[15px] font-extrabold">
          <dt class="flex items-center gap-1.5">
            <span class={["size-2.5 shrink-0", provider.dot]} aria-hidden="true"
            ></span>
            {provider.label}
          </dt>
          <dd>${provider.cost.total.toFixed(2)}</dd>
        </div>
        {#each lines(provider.cost) as [label, amount] (label)}
          <div class="flex justify-between gap-2 text-muted">
            <dt>{label}</dt>
            <dd>${amount.toFixed(2)}</dd>
          </div>
        {/each}
        {#if provider.cost.discounts > 0}
          <div class="flex justify-between gap-2 text-muted">
            <dt>Discounts</dt>
            <dd>-${provider.cost.discounts.toFixed(2)}</dd>
          </div>
        {/if}
      </dl>
    {/each}
  </div>

  <details class="group border-t border-hair pt-2">
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center font-bold underline"
    >
      <span class="group-open:hidden">How these are calculated</span>
      <span class="hidden group-open:inline">Hide calculation</span>
    </summary>
    <div class="space-y-3 text-muted">
      {#each providers as provider (provider.id)}
        {#if provider.cost.details.length > 0}
          <div>
            <h3 class="font-extrabold text-ink">{provider.label}</h3>
            <ul>
              {#each provider.cost.details as detail, index (index)}
                <li class="whitespace-pre-wrap">{detail}</li>
              {/each}
            </ul>
          </div>
        {/if}
      {/each}
    </div>
  </details>
</div>
