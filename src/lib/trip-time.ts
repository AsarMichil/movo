import {
  addDays,
  addMinutes,
  format,
  setHours,
  startOfDay,
  startOfHour,
} from "date-fns"

// The time spent at the destination: a duration, or a wall-clock time to leave it.
export type Stay = { minutes: number } | { until: Date }

export function nextQuarterHour(now: Date): Date {
  const hour = startOfHour(now)
  const minutes = Math.ceil((now.getTime() - hour.getTime()) / 60_000 / 15) * 15
  return addMinutes(hour, minutes)
}

export const toLocalInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm")

export function fromLocalInput(value: string): Date | undefined {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date : undefined
}

export function stayMinutes(
  stay: Stay,
  leaveAt: Date,
  drivingMinutes: number,
): number {
  if ("minutes" in stay) return stay.minutes
  const minutes =
    (stay.until.getTime() - leaveAt.getTime()) / 60_000 - drivingMinutes
  return Math.max(0, Math.round(minutes))
}

const allDayEnd = (leaveAt: Date) => {
  const sixPm = setHours(startOfDay(leaveAt), 18)
  return sixPm.getTime() - leaveAt.getTime() >= 60 * 60_000
    ? sixPm
    : addDays(sixPm, 1)
}

export const STAY_CHIPS: { label: string; stay: (leaveAt: Date) => Stay }[] = [
  { label: "Quick stop", stay: () => ({ minutes: 15 }) },
  { label: "1 hr", stay: () => ({ minutes: 60 }) },
  { label: "2 hr", stay: () => ({ minutes: 120 }) },
  { label: "4 hr", stay: () => ({ minutes: 240 }) },
  { label: "All day", stay: (leaveAt) => ({ until: allDayEnd(leaveAt) }) },
  {
    label: "Overnight",
    stay: (leaveAt) => ({
      until: setHours(addDays(startOfDay(leaveAt), 1), 9),
    }),
  },
]

export function isSameStay(a: Stay, b: Stay): boolean {
  if ("minutes" in a) return "minutes" in b && a.minutes === b.minutes
  return "until" in b && a.until.getTime() === b.until.getTime()
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

export const WALK_METERS_PER_MINUTE = 80

export const WALK_CHIPS = [
  { minutes: 1, meters: 80 },
  { minutes: 3, meters: 250 },
  { minutes: 5, meters: 400 },
  { minutes: 10, meters: 800 },
] as const
