<script lang="ts">
  import { untrack } from "svelte"
  import Calendar from "@lucide/svelte/icons/calendar"
  import {
    addDays,
    addMinutes,
    differenceInCalendarDays,
    format,
    set,
  } from "date-fns"
  import type { VehicleClass } from "../calculations"
  import {
    STAY_CHIPS,
    WALK_CHIP_MINUTES,
    formatDuration,
    formatTime,
    nextQuarterHour,
    stayMinutes,
    walkMeters,
    walkMinutes,
  } from "../lib/trip-time"
  import Address from "./Address.svelte"
  import Segmented from "./Segmented.svelte"
  import Stepper from "./Stepper.svelte"
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

  const WALK_OPTIONS = [
    ...WALK_CHIP_MINUTES.map((minutes) => ({
      value: String(minutes),
      label: `${minutes} min`,
    })),
    { value: "other", label: "Other" },
  ]
  const MAX_WALK_MINUTES = 30

  // Other stays selected while stepping, even onto a chip's value.
  let customWalk = $state(
    untrack(
      () =>
        !WALK_CHIP_MINUTES.some(
          (minutes) => walkMeters(minutes) === form.walkMeters,
        ),
    ),
  )
  const walkMinutesNow = $derived(walkMinutes(form.walkMeters))

  function setWalkMinutes(minutes: number) {
    if (Number.isNaN(minutes)) return
    const clamped = Math.min(MAX_WALK_MINUTES, Math.max(1, Math.round(minutes)))
    form.walkMeters = walkMeters(clamped)
  }

  // A typed "HH:mm" moves the time on its own day; a cleared field leaves it alone.
  function atTime(date: Date, value: string) {
    const [hours, minutes] = value.split(":").map(Number)
    if (hours === undefined || minutes === undefined) return date
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return date
    return set(date, { hours, minutes })
  }

  let dateInput: HTMLInputElement | undefined

  // Switching stay modes swaps the clicked button out, so focus follows to its replacement.
  let focusOnMount: "picker" | "link" | undefined
  const focusIf =
    (key: typeof focusOnMount) => (element: HTMLButtonElement) => {
      if (focusOnMount !== key) return
      focusOnMount = undefined
      element.focus()
    }

  const onDay = (date: Date, day: Date) =>
    new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      date.getHours(),
      date.getMinutes(),
    )

  const leaveDayOffset = $derived(
    differenceInCalendarDays(form.leaveAt, new Date()),
  )

  function pickDate() {
    try {
      dateInput?.showPicker()
    } catch {
      dateInput?.focus()
    }
  }

  const place = $derived(
    form.destination?.displayLines[0] ?? "your destination",
  )
  // Before a compare there is no drive yet, so switching stay modes assumes none.
  const minutesThere = $derived(
    stayMinutes(form.stay, form.leaveAt, drivingMinutes ?? 0, form.roundTrip),
  )

  const stayHint = $derived.by(() => {
    if (drivingMinutes === undefined) {
      if ("minutes" in form.stay)
        return `${formatDuration(form.stay.minutes)} at ${place}`
      if ("endBy" in form.stay && form.stay.endBy <= form.leaveAt)
        return "That's before you leave. Pick a later time."
      return `Time at ${place} is worked out from the drive when you compare.`
    }
    const drive = formatDuration(drivingMinutes)
    if (minutesThere === 0) {
      return form.roundTrip
        ? `That's too early to get there and back with ${drive} driving each way. Pick a later time.`
        : `That's too early with a ${drive} drive. Pick a later time.`
    }
    if ("endBy" in form.stay) {
      return form.roundTrip
        ? `That gives you ${formatDuration(minutesThere)} at ${place}, with ${drive} driving each way.`
        : `That gives you ${formatDuration(minutesThere)} at ${place} after a ${drive} drive.`
    }
    const leaveThere = addMinutes(form.leaveAt, drivingMinutes + minutesThere)
    const until = `At ${place} until about ${formatTime(leaveThere, form.leaveAt)}`
    if (!form.roundTrip) return `${until}.`
    const home = addMinutes(leaveThere, drivingMinutes)
    return `${until}, home around ${formatTime(home, form.leaveAt)}.`
  })

  function pickEndBy() {
    const drives = (drivingMinutes ?? 0) * (form.roundTrip ? 2 : 1)
    form.stay = {
      endBy: nextQuarterHour(addMinutes(form.leaveAt, minutesThere + drives)),
    }
    focusOnMount = "picker"
  }

  function pickLength() {
    form.stay = { minutes: Math.max(15, Math.round(minutesThere / 15) * 15) }
    focusOnMount = "link"
  }

  const stayTooShort = $derived(
    "endBy" in form.stay &&
      (form.stay.endBy <= form.leaveAt ||
        (drivingMinutes !== undefined && minutesThere === 0)),
  )

  const canSubmit = $derived(
    form.origin?.coordinate !== undefined &&
      form.destination?.coordinate !== undefined &&
      !stayTooShort &&
      !calculating,
  )

  const chipClass =
    "inline-flex h-11 cursor-pointer items-center gap-1.5 border-2 border-rule bg-surface px-3 text-sm font-bold whitespace-nowrap aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
  const timeInputClass =
    "min-w-0 bg-transparent text-xl font-extrabold tabular-nums outline-offset-[-2px]"
  const labelClass = "text-xs font-extrabold tracking-wider uppercase"
  const linkClass =
    "h-11 cursor-pointer self-start text-sm font-bold underline underline-offset-3"
</script>

{#snippet chip(label: string, pressed: boolean, onclick: () => void)}
  <button type="button" aria-pressed={pressed} {onclick} class={chipClass}>
    {label}
  </button>
{/snippet}

{#snippet toggle(
  label: string,
  hint: string,
  checked: boolean,
  onchange: (checked: boolean) => void,
)}
  <label
    class="flex min-h-12 cursor-pointer items-center justify-between gap-3 border-b border-hair py-1"
  >
    <span>
      <span class="block font-bold">{label}</span>
      <span class="block text-sm text-muted">{hint}</span>
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
      class="relative h-7 w-12 shrink-0 border-2 border-rule bg-surface outline-offset-2 outline-ink transition-colors peer-checked:bg-signal peer-focus-visible:outline-2 after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:bg-muted after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-on-signal"
    ></span>
  </label>
{/snippet}

<div class="flex flex-col gap-5">
  <div class="border-2 border-rule bg-surface">
    <Address
      bind:value={form.origin}
      label="Origin"
      placeholder="Starting location"
      dot="round"
      localOnly
      onLocationSelected={(_, isCurrentLocation) =>
        (form.originIsCurrentLocation = isCurrentLocation)}
    />
    <div class="border-t border-hair">
      <Address
        bind:value={form.destination}
        label="Destination"
        placeholder="Where to?"
        dot="square"
      />
    </div>
  </div>

  <div role="group" aria-labelledby="{uid}-leave" class="flex flex-col gap-2">
    <span id="{uid}-leave" class={labelClass}>Leave</span>
    <div class="relative flex flex-wrap gap-1.5">
      {@render chip(
        "Today",
        leaveDayOffset === 0,
        () => (form.leaveAt = onDay(form.leaveAt, new Date())),
      )}
      {@render chip(
        "Tomorrow",
        leaveDayOffset === 1,
        () => (form.leaveAt = onDay(form.leaveAt, addDays(new Date(), 1))),
      )}
      <button
        type="button"
        aria-pressed={leaveDayOffset !== 0 && leaveDayOffset !== 1}
        onclick={pickDate}
        class={chipClass}
      >
        <Calendar class="size-4" aria-hidden="true" />
        {leaveDayOffset === 0 || leaveDayOffset === 1
          ? "Pick date"
          : format(form.leaveAt, "EEE, MMM d")}
      </button>
      <input
        {@attach (input) => {
          dateInput = input
        }}
        type="date"
        tabindex={-1}
        aria-label="Leave date"
        value={format(form.leaveAt, "yyyy-MM-dd")}
        onchange={(event) => {
          const [year, month, day] = event.currentTarget.value
            .split("-")
            .map(Number)
          if (year && month && day)
            form.leaveAt = onDay(form.leaveAt, new Date(year, month - 1, day))
        }}
        class="pointer-events-none absolute bottom-0 left-0 size-px opacity-0"
      />
    </div>
    <Stepper
      name="Leave"
      amount={15}
      unit="earlier"
      onStep={(minutes) => (form.leaveAt = addMinutes(form.leaveAt, minutes))}
    >
      <input
        type="time"
        aria-label="Leave time"
        value={format(form.leaveAt, "HH:mm")}
        onchange={(event) =>
          (form.leaveAt = atTime(form.leaveAt, event.currentTarget.value))}
        class={timeInputClass}
      />
    </Stepper>
  </div>

  <div role="group" aria-labelledby="{uid}-stay" class="flex flex-col gap-2">
    <span id="{uid}-stay" class={labelClass}>Stay</span>
    <div class="flex flex-wrap gap-1.5">
      {#each STAY_CHIPS as option (option.label)}
        {@render chip(
          option.label,
          "minutes" in form.stay && form.stay.minutes === option.minutes,
          () => {
            form.stay = { minutes: option.minutes }
          },
        )}
      {/each}
    </div>
    {#if "endBy" in form.stay}
      {@const endBy = form.stay.endBy}
      {@const dayOffset = differenceInCalendarDays(endBy, form.leaveAt)}
      {@const pickerLabel = form.roundTrip ? "Back home by" : "Leave there by"}
      <div class="flex flex-col gap-1.5 border-2 border-rule bg-surface p-1.5">
        <span class="pt-0.5 pl-1.5 font-bold">{pickerLabel}</span>
        <Stepper
          name={pickerLabel}
          amount={15}
          unit="earlier"
          onStep={(minutes) =>
            (form.stay = { endBy: addMinutes(endBy, minutes) })}
          first={focusIf("picker")}
        >
          <input
            type="time"
            aria-label="{pickerLabel} time"
            value={format(endBy, "HH:mm")}
            onchange={(event) =>
              (form.stay = { endBy: atTime(endBy, event.currentTarget.value) })}
            class={timeInputClass}
          />
          {#if dayOffset !== 0}
            <span class="shrink-0 text-base text-muted">
              {format(endBy, "EEE")}
            </span>
          {/if}
        </Stepper>
        <div class="flex gap-1.5">
          {#each ["Same day", "Next day"] as label, offset (label)}
            {@render chip(label, dayOffset === offset, () => {
              form.stay = { endBy: onDay(endBy, addDays(form.leaveAt, offset)) }
            })}
          {/each}
        </div>
      </div>
    {/if}
    <p class="text-sm text-muted" aria-live="polite">{stayHint}</p>
    {#if "endBy" in form.stay}
      <button type="button" onclick={pickLength} class={linkClass}>
        Use a stay length instead
      </button>
    {:else}
      <button
        type="button"
        {@attach focusIf("link")}
        onclick={pickEndBy}
        class={linkClass}
      >
        Set a time to be back instead
      </button>
    {/if}
  </div>

  <div class="flex flex-col gap-2">
    <span class={labelClass}>Walk from parking</span>
    <Segmented
      label="Walk from parking"
      options={WALK_OPTIONS}
      value={customWalk ? "other" : String(walkMinutesNow)}
      onChange={(value) => {
        customWalk = value === "other"
        if (!customWalk) form.walkMeters = walkMeters(Number(value))
      }}
    />
    {#if customWalk}
      <Stepper
        name="Walk"
        amount={1}
        unit="less"
        onStep={(minutes) => setWalkMinutes(walkMinutesNow + minutes)}
      >
        <input
          type="number"
          inputmode="numeric"
          min="1"
          max={MAX_WALK_MINUTES}
          aria-label="Walk from parking, minutes"
          value={walkMinutesNow}
          onchange={(event) =>
            setWalkMinutes(event.currentTarget.valueAsNumber)}
          class="w-12 [appearance:textfield] bg-transparent text-right text-xl font-extrabold tabular-nums outline-offset-[-2px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span class="text-xl">min walk</span>
      </Stepper>
    {/if}
    <p class="text-sm text-muted">
      Up to {form.walkMeters} m. Evo can only end the trip inside a home zone.
    </p>
  </div>

  <div class="flex flex-col border-t-2 border-rule">
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
  </div>

  <div class="flex flex-col gap-2">
    <span class={labelClass}>Modo car size</span>
    <Segmented
      label="Modo car size"
      options={VEHICLE_OPTIONS}
      value={form.vehicleType ?? "daily_drive"}
      onChange={(value) => (form.vehicleType = value)}
    />
  </div>

  <button
    type="button"
    disabled={!canSubmit}
    onclick={onSubmit}
    class="h-14 w-full cursor-pointer border-2 border-rule bg-signal text-lg font-black tracking-tight text-on-signal uppercase disabled:cursor-not-allowed disabled:border-hair disabled:bg-surface disabled:text-muted"
  >
    {calculating ? "Calculating..." : "Compare"}
  </button>
</div>
