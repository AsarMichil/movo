<script lang="ts">
  import type { Snippet } from "svelte"

  type Props = {
    name: string
    amount: number
    unit: "earlier" | "less"
    onStep: (minutes: number) => void
    first?: (button: HTMLButtonElement) => void
    children: Snippet
  }

  let { name, amount, unit, onStep, first, children }: Props = $props()

  const more = $derived(unit === "earlier" ? "later" : "more")
  const buttonClass =
    "h-11 w-12 shrink-0 cursor-pointer border-2 border-rule bg-surface text-2xl font-bold"
</script>

<div class="flex">
  <button
    type="button"
    aria-label="{name} {amount} min {unit}"
    onclick={() => onStep(-amount)}
    {@attach first}
    class={buttonClass}
  >
    −
  </button>
  <div
    class="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 border-y-2 border-rule bg-surface px-2 font-extrabold tracking-tight tabular-nums"
  >
    {@render children()}
  </div>
  <button
    type="button"
    aria-label="{name} {amount} min {more}"
    onclick={() => onStep(amount)}
    class={buttonClass}
  >
    +
  </button>
</div>
