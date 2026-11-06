<script lang="ts">
  import { addMinutes } from "date-fns"
  import type { VehicleClass } from "../calculations"
  import {
    STAY_CHIPS,
    WALK_CHIPS,
    WALK_METERS_PER_MINUTE,
    formatDuration,
    fromLocalInput,
    isSameStay,
    stayMinutes,
    toLocalInput,
  } from "../lib/trip-time"
  import Address from "./Address.svelte"
  import Segmented from "./Segmented.svelte"
  import type { TripForm } from "./TripTypes"

  type Props = {
    form: TripForm
    drivingMinutes: number | undefined
    calculating: boolean
    onSubmit: () => void
  }

  let {
    form = $bindable(),
    drivingMinutes,
    calculating,
    onSubmit,
  }: Props = $props()

  const uid = $props.id()

  const VEHICLE_OPTIONS: { value: VehicleClass; label: string }[] = [
    { value: "daily_drive", label: "Everyday" },
    { value: "large_loadable", label: "Large" },
    { value: "oversized", label: "Oversized" },
  ]

  const leaveDestination = $derived.by(() => {
    if ("until" in form.stay) return form.stay.until
    if (drivingMinutes === undefined) return undefined
    return addMinutes(form.leaveAt, drivingMinutes + form.stay.minutes)
  })

  const stayHint = $derived.by(() => {
    if ("minutes" in form.stay)
      return `${formatDuration(form.stay.minutes)} at your destination`
    if (form.stay.until <= form.leaveAt)
      return "That's before you leave. Pick a later time."
    if (drivingMinutes === undefined) {
      return "Time at destination is worked out from the drive when you compare."
    }
    const minutes = stayMinutes(form.stay, form.leaveAt, drivingMinutes)
    return `${formatDuration(minutes)} at your destination after a ${formatDuration(drivingMinutes)} drive`
  })

  const walkHint = $derived(
    WALK_CHIPS.some((chip) => chip.meters === form.walkMeters)
      ? `Up to ${form.walkMeters} m`
      : `Up to ${form.walkMeters} m (about ${Math.max(1, Math.round(form.walkMeters / WALK_METERS_PER_MINUTE))} min)`,
  )

  const canSubmit = $derived(
    form.origin?.coordinate !== undefined &&
      form.destination?.coordinate !== undefined &&
      !calculating,
  )
</script>

{#snippet chip(label: string, pressed: boolean, onclick: () => void)}
  <button
    type="button"
    aria-pressed={pressed}
    {onclick}
    class="h-8 cursor-pointer border-2 border-gray-300 px-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-700 aria-pressed:border-gray-800 aria-pressed:bg-gray-800 aria-pressed:text-white dark:border-gray-600 dark:text-gray-300 dark:aria-pressed:border-gray-600 dark:aria-pressed:bg-gray-600"
  >
    {label}
  </button>
{/snippet}

{#snippet toggle(
  label: string,
  hint: string,
  checked: boolean,
  onchange: (checked: boolean) => void,
)}
  <label class="flex cursor-pointer items-center justify-between gap-4 py-1">
    <span>
      <span class="block font-medium">{label}</span>
      <span class="block text-sm text-gray-600 dark:text-gray-400">{hint}</span>
    </span>
    <input
      type="checkbox"
      role="switch"
      {checked}
      onchange={(event) => onchange(event.currentTarget.checked)}
      class="peer sr-only"
    />
    <span
      aria-hidden="true"
      class="relative h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-gray-800 peer-focus-visible:ring-2 peer-focus-visible:ring-gray-800 peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5 dark:bg-gray-600 dark:peer-checked:bg-gray-300 dark:after:bg-gray-900"
    ></span>
  </label>
{/snippet}

<div class="space-y-6 text-gray-800 dark:text-gray-100">
  <div class="space-y-4">
    <Address
      bind:value={form.destination}
      label="Destination"
      placeholder="Where to?"
    />
    <Address
      bind:value={form.origin}
      label="Origin"
      placeholder="Starting location"
      onLocationSelected={(_, isCurrentLocation) =>
        (form.originIsCurrentLocation = isCurrentLocation)}
    />
  </div>

  <fieldset class="space-y-3">
    <legend class="text-sm font-semibold">When</legend>
    <label class="block space-y-1">
      <span class="block text-sm text-gray-700 dark:text-gray-300"
        >Leave at</span
      >
      <input
        type="datetime-local"
        step="900"
        bind:value={
          () => toLocalInput(form.leaveAt),
          (value) => (form.leaveAt = fromLocalInput(value) ?? form.leaveAt)
        }
        class="w-full border-2 border-gray-800 bg-transparent p-2 dark:border-gray-600"
      />
    </label>

    <div class="space-y-1">
      <span
        id="{uid}-stay"
        class="block text-sm text-gray-700 dark:text-gray-300"
      >
        Time at destination
      </span>
      <div
        class="flex flex-wrap gap-1"
        role="group"
        aria-labelledby="{uid}-stay"
      >
        {#each STAY_CHIPS as option (option.label)}
          {@render chip(
            option.label,
            isSameStay(form.stay, option.stay(form.leaveAt)),
            () => {
              form.stay = option.stay(form.leaveAt)
            },
          )}
        {/each}
      </div>
    </div>

    <label class="block space-y-1">
      <span class="block text-sm text-gray-700 dark:text-gray-300"
        >Or leave destination at</span
      >
      <input
        type="datetime-local"
        step="900"
        bind:value={
          () => (leaveDestination ? toLocalInput(leaveDestination) : ""),
          (value) => {
            const until = fromLocalInput(value)
            if (until) form.stay = { until }
          }
        }
        class="w-full border-2 border-gray-800 bg-transparent p-2 dark:border-gray-600"
      />
    </label>
    <p class="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
      {stayHint}
    </p>
  </fieldset>

  <fieldset class="space-y-1">
    <legend class="text-sm font-semibold"
      >How far are you willing to walk from parking?</legend
    >
    <div class="flex flex-wrap gap-1 pt-1">
      {#each WALK_CHIPS as option (option.meters)}
        {@render chip(
          `${option.minutes} min`,
          form.walkMeters === option.meters,
          () => {
            form.walkMeters = option.meters
          },
        )}
      {/each}
    </div>
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {walkHint}. Evo can only end the trip inside a home zone.
    </p>
  </fieldset>

  <fieldset class="space-y-2">
    <legend class="text-sm font-semibold">Trip</legend>
    {@render toggle(
      "I'm driving back",
      "Need a car for the return trip",
      form.roundTrip,
      (checked) => (form.roundTrip = checked),
    )}
    {@render toggle(
      "I'm a BCAA member",
      "Gets the BCAA discount on Evo",
      form.bcaaMember,
      (checked) => (form.bcaaMember = checked),
    )}
    {@render toggle(
      "Prefer an EV (Modo)",
      "Price Modo with an electric car",
      form.preferEv,
      (checked) => (form.preferEv = checked),
    )}
    <div class="space-y-1 pt-1">
      <span class="block font-medium">Modo car size</span>
      <Segmented
        label="Modo car size"
        options={VEHICLE_OPTIONS}
        value={form.vehicleType ?? "daily_drive"}
        onChange={(value) => (form.vehicleType = value)}
      />
    </div>
  </fieldset>

  <button
    type="button"
    disabled={!canSubmit}
    onclick={onSubmit}
    class="w-full cursor-pointer bg-gray-800 px-2 py-3 text-orange-50 uppercase hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100"
  >
    {calculating ? "Calculating..." : "Compare prices"}
  </button>
</div>
