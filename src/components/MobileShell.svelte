<script lang="ts">
  import { Dialog } from "bits-ui"
  import Pencil from "@lucide/svelte/icons/pencil"
  import Plus from "@lucide/svelte/icons/plus"
  import X from "@lucide/svelte/icons/x"
  import { walkMinutes } from "../lib/trip-time"
  import ThemeToggle from "./ThemeToggle.svelte"
  import TripForm from "./TripForm.svelte"
  import TripResults from "./TripResults.svelte"
  import TripVerdict from "./TripVerdict.svelte"
  import type { TripPlanner } from "./trip-planner.svelte"

  type Props = {
    planner: TripPlanner
    // Only the shell matching the viewport mounts the form and opens the sheet.
    active: boolean
    top: number
    bottom: number
  }

  let {
    planner,
    active,
    top = $bindable(0),
    bottom = $bindable(0),
  }: Props = $props()

  let open = $state(false)
  let view = $state<"form" | "results">("form")
  const sheetView = $derived(
    view === "results" && planner.activeTrip ? "results" : "form",
  )
  const parking = $derived(planner.activeTrip?.parking)

  function openSheet(next: typeof view) {
    view = next
    open = true
  }

  function compare() {
    open = false
    planner.calculate()
  }

  const frameClass = "border-2 border-rule bg-surface shadow-block"
  const buttonClass =
    "grid size-11 shrink-0 cursor-pointer place-items-center border-2 border-rule bg-surface"
</script>

<div
  bind:offsetHeight={top}
  class="pointer-events-none absolute inset-x-0 top-0 h-[env(safe-area-inset-top)] md:hidden"
></div>

<div
  bind:offsetHeight={bottom}
  class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:hidden"
>
  <button
    type="button"
    aria-label={planner.activeTrip ? "Edit trip" : "Plan a trip"}
    onclick={() => openSheet("form")}
    class="pointer-events-auto grid size-14 cursor-pointer place-items-center self-end bg-ink text-bg shadow-block"
  >
    {#if planner.activeTrip}
      <Pencil class="size-6" strokeWidth={2.6} />
    {:else}
      <Plus class="size-7" strokeWidth={3} />
    {/if}
  </button>

  <div aria-live="polite" class="pointer-events-auto">
    {#if planner.calculating}
      <p class={[frameClass, "w-fit px-4 py-3 font-bold"]}>Calculating...</p>
    {:else if planner.error}
      <p class={[frameClass, "px-4 py-3 font-bold text-loser"]}>
        {planner.error}
      </p>
    {:else if planner.activeTrip && planner.result}
      <div class="shadow-block">
        <TripVerdict result={planner.result} trip={planner.activeTrip}>
          {#snippet footer()}
            <div class="flex items-stretch text-[13px] font-semibold">
              {#if parking}
                <span class="flex items-center px-3 text-muted">
                  {parking.distance_meters === 0
                    ? "Park at your destination"
                    : `Car ${walkMinutes(parking.distance_meters)} min walk`}
                </span>
              {/if}
              <button
                type="button"
                onclick={() => openSheet("results")}
                class="ml-auto min-h-11 cursor-pointer bg-ink px-3.5 font-extrabold text-bg"
              >
                See details →
              </button>
            </div>
          {/snippet}
        </TripVerdict>
      </div>
    {/if}
  </div>
</div>

<Dialog.Root bind:open={() => open && active, (next) => (open = next)}>
  <Dialog.Content forceMount>
    {#snippet child({ props })}
      <div
        {...props}
        class="fixed inset-0 z-50 hidden flex-col bg-bg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-ink data-[state=open]:flex"
      >
        <div class="flex items-center justify-between gap-2 px-4 py-3">
          <Dialog.Title
            class="text-[26px] leading-none font-black tracking-[-0.04em]"
          >
            {sheetView === "form" ? "Plan a trip" : "Details"}
          </Dialog.Title>
          <div class="flex gap-2">
            {#if planner.activeTrip}
              <button
                type="button"
                onclick={() =>
                  (view = sheetView === "form" ? "results" : "form")}
                class="h-11 cursor-pointer border-2 border-rule bg-surface px-3.5 text-sm font-bold"
              >
                {sheetView === "form" ? "View results" : "Edit trip"}
              </button>
            {/if}
            <ThemeToggle />
            <Dialog.Close class={buttonClass}>
              <X class="size-5" />
              <span class="sr-only">Close</span>
            </Dialog.Close>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div class={{ hidden: sheetView !== "form" }}>
            {#if active}
              <TripForm
                bind:form={planner.form}
                drivingMinutes={planner.activeTrip?.pricing.driving_minutes}
                calculating={planner.calculating}
                onSubmit={compare}
              />
            {/if}
          </div>
          {#if sheetView === "results" && planner.activeTrip && planner.result}
            <TripResults
              trip={planner.activeTrip}
              result={planner.result}
              fromLabel={planner.originLabel}
              toLabel={planner.destinationLabel}
              onPlanChange={planner.changePlan}
            />
          {/if}
        </div>
      </div>
    {/snippet}
  </Dialog.Content>
</Dialog.Root>
