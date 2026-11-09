<script lang="ts">
  import ThemeToggle from "./ThemeToggle.svelte"
  import TripForm from "./TripForm.svelte"
  import TripResults from "./TripResults.svelte"
  import type { TripPlanner } from "./trip-planner.svelte"

  type Props = {
    planner: TripPlanner
    // Only the shell matching the viewport mounts the form, so there is a single TripForm.
    active: boolean
    left: number
  }

  let { planner, active, left = $bindable(0) }: Props = $props()

  // Results win whenever there is something to show, until the user asks to edit.
  let view = $state<"form" | "results">("results")
  const showResults = $derived(
    view === "results" &&
      (planner.calculating ||
        planner.error !== null ||
        planner.activeTrip !== null),
  )

  function compare() {
    view = "results"
    planner.calculate()
  }

  const statusClass = "border-2 border-rule bg-surface px-4 py-3 font-bold"
</script>

<div
  bind:offsetWidth={left}
  class="pointer-events-none absolute inset-y-0 left-0 z-10 hidden p-5 md:block"
>
  <section
    aria-label="Trip planner"
    class="pointer-events-auto flex h-full w-100 flex-col gap-4 overflow-y-auto border-2 border-rule bg-bg p-5 shadow-block"
  >
    <header class="flex items-center justify-between gap-2">
      <span class="text-[28px] leading-none font-black tracking-[-0.045em]">
        movo
      </span>
      <div class="flex gap-2">
        {#if showResults || planner.activeTrip}
          <!-- One button for both labels so focus stays on it when the view flips. -->
          <button
            type="button"
            onclick={() => (view = showResults ? "form" : "results")}
            class="h-11 cursor-pointer border-2 border-rule bg-surface px-3.5 text-sm font-bold"
          >
            {showResults ? "Edit trip" : "View results"}
          </button>
        {/if}
        <ThemeToggle />
      </div>
    </header>

    <div class={["flex flex-col gap-4", showResults && "hidden"]}>
      <h1 class="text-[34px] leading-none font-black tracking-[-0.045em]">
        Plan a trip
      </h1>
      {#if active}
        <TripForm
          bind:form={planner.form}
          drivingMinutes={planner.activeTrip?.pricing.driving_minutes}
          calculating={planner.calculating}
          onSubmit={compare}
        />
      {/if}
    </div>

    {#if showResults}
      {#if planner.calculating}
        <p role="status" class={statusClass}>Calculating...</p>
      {:else if planner.error}
        <p role="alert" class={[statusClass, "text-loser"]}>
          {planner.error}
        </p>
      {:else if planner.activeTrip && planner.result}
        <TripResults
          trip={planner.activeTrip}
          result={planner.result}
          fromLabel={planner.originLabel}
          toLabel={planner.destinationLabel}
          onPlanChange={planner.changePlan}
        />
      {/if}
    {/if}
  </section>
</div>
