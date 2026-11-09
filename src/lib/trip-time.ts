import { addMinutes, format, startOfDay, startOfHour } from "date-fns"

// The time spent at the destination: a length, or a picked time the trip must be
// over by (home when driving back, else leaving there).
export type Stay = { minutes: number } | { endBy: Date }

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
  const drives = roundTrip ? 2 : 1
  const minutes =
    (stay.endBy.getTime() - leaveAt.getTime()) / 60_000 -
    drives * drivingMinutes
  return Math.max(0, Math.round(minutes))
}

export const STAY_CHIPS = [
  { label: "Quick stop", minutes: 15 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hr", minutes: 120 },
  { label: "4 hr", minutes: 240 },
  { label: "8 hr", minutes: 480 },
  { label: "24 hr", minutes: 1440 },
] as const

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

export const walkMeters = (minutes: number) => minutes * WALK_METERS_PER_MINUTE

export const WALK_CHIP_MINUTES = [1, 5, 15] as const
