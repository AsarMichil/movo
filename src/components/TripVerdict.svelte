<script lang="ts">
  import { MODO_PLAN_LABELS, type ComparisonResult } from "../calculations"

  let { result }: { result: ComparisonResult } = $props()

  const rows = $derived(
    [
      {
        id: "modo",
        label: MODO_PLAN_LABELS[result.modo_plan],
        total: result.modo.total,
      },
      { id: "evo", label: "Evo", total: result.evo.total },
    ].sort(
      (a, b) =>
        Number(b.id === result.cheapest) - Number(a.id === result.cheapest),
    ),
  )
</script>

<ul class="space-y-2" aria-label="Price comparison">
  {#each rows as row (row.id)}
    {@const cheapest = row.id === result.cheapest}
    <li
      class={[
        "flex items-center justify-between gap-3 rounded-full px-4 py-2 shadow-md",
        cheapest
          ? "bg-white dark:bg-gray-800 ring-2 ring-green-600 dark:ring-green-400"
          : "bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300",
      ]}
    >
      <span class="flex items-center gap-2 font-semibold">
        {row.label}
        {#if cheapest}
          <span
            class="rounded-full bg-green-600 dark:bg-green-500 px-2 py-0.5 text-xs font-medium text-white"
          >
            Cheapest
          </span>
        {/if}
      </span>
      <span
        class={["tabular-nums", cheapest ? "text-lg font-bold" : "font-medium"]}
      >
        ${row.total.toFixed(2)}
      </span>
    </li>
  {/each}
</ul>
