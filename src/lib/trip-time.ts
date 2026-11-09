import {
  addDays,
  addMinutes,
  format,
  setHours,
  startOfDay,
  startOfHour,
} from "date-fns"

// The time spent at the destination: a duration, a chip's time to leave it, or a
// picked time the trip must be over by (home when driving back, else leaving there).
// Picked times are their own kind so one never passes for a chip and moves with it.
export type Stay = { minutes: number } | { until: Date } | { endBy: Date }

export function nextQuarterHour(now: Date): Date {
  const hour = startOfHour(now)
  const minutes = Math.ceil((now.getTime() - hour.getTime()) / 60_000 / 15) * 15
  return addMinutes(hour, minutes)
}

export function stayMinutes(
  stay: Stay,
  leaveAt: Date,
  drivingMinutes: number,
  roundTrip: boolean,
): number {
  if ("minutes" in stay) return stay.minutes
  const [end, drives] =
    "until" in stay ? [stay.until, 1] : [stay.endBy, roundTrip ? 2 : 1]
  const minutes =
    (end.getTime() - leaveAt.getTime()) / 60_000 - drives * drivingMinutes
  return Math.max(0, Math.round(minutes))
}

const allDayEnd = (leaveAt: Date) => {
  const sixPm = setHours(startOfDay(leaveAt), 18)
  return sixPm.getTime() - leaveAt.getTime() >= 60 * 60_000
    ? sixPm
    : addDays(sixPm, 1)
}

// Leaving before 5am is already the night, so it ends that morning.
const overnightEnd = (leaveAt: Date) => {
  const nineAm = setHours(startOfDay(leaveAt), 9)
  return leaveAt.getHours() < 5 ? nineAm : addDays(nineAm, 1)
}

export const STAY_CHIPS: { label: string; stay: (leaveAt: Date) => Stay }[] = [
  { label: "Quick stop", stay: () => ({ minutes: 15 }) },
  { label: "1 hr", stay: () => ({ minutes: 60 }) },
  { label: "2 hr", stay: () => ({ minutes: 120 }) },
  { label: "4 hr", stay: () => ({ minutes: 240 }) },
  { label: "All day", stay: (leaveAt) => ({ until: allDayEnd(leaveAt) }) },
  { label: "Overnight", stay: (leaveAt) => ({ until: overnightEnd(leaveAt) }) },
]

// Chip stays are relative to the leave time, so they move with it; a picked time stays put.
export function followLeaveAt(stay: Stay, from: Date, to: Date): Stay {
  const chip = STAY_CHIPS.find((chip) => isSameStay(stay, chip.stay(from)))
  return chip ? chip.stay(to) : stay
}

export function isSameStay(a: Stay, b: Stay): boolean {
  if ("minutes" in a) return "minutes" in b && a.minutes === b.minutes
  if ("until" in a)
    return "until" in b && a.until.getTime() === b.until.getTime()
  return "endBy" in b && a.endBy.getTime() === b.endBy.getTime()
}

export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  if (rounded < 60) return `${rounded} min`
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

export function formatTime(date: Date, reference: Date): string {
  const sameDay = startOfDay(date).getTime() === startOfDay(reference).getTime()
  return format(date, sameDay ? "h:mm a" : "EEE h:mm a")
}

const WALK_METERS_PER_MINUTE = 80

export const walkMinutes = (meters: number) =>
  Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE))

export const WALK_CHIPS = [
  { minutes: 1, meters: 80 },
  { minutes: 3, meters: 250 },
  { minutes: 5, meters: 400 },
  { minutes: 10, meters: 800 },
] as const
