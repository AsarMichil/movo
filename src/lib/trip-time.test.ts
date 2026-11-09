import { describe, expect, it } from "vitest"
import {
  formatDuration,
  nextQuarterHour,
  stayMinutes,
  walkMeters,
  walkMinutes,
} from "./trip-time"

const at = (value: string) => new Date(value)

describe("trip-time", () => {
  it("rounds up to the next quarter hour, keeping exact quarters", () => {
    expect(nextQuarterHour(at("2026-11-06T14:01:30"))).toEqual(
      at("2026-11-06T14:15"),
    )
    expect(nextQuarterHour(at("2026-11-06T14:45"))).toEqual(
      at("2026-11-06T14:45"),
    )
    expect(nextQuarterHour(at("2026-11-06T23:50"))).toEqual(
      at("2026-11-07T00:00"),
    )
  })

  it("uses a stay length as is", () => {
    expect(stayMinutes({ minutes: 90 }, at("2026-11-06T10:00"), 20, true)).toBe(
      90,
    )
  })

  it("takes both drives off a picked end time only when driving back", () => {
    const leaveAt = at("2026-11-06T10:00")
    const endBy = { endBy: at("2026-11-06T12:00") }
    expect(stayMinutes(endBy, leaveAt, 20, true)).toBe(80)
    expect(stayMinutes(endBy, leaveAt, 20, false)).toBe(100)
    expect(
      stayMinutes({ endBy: at("2026-11-06T10:30") }, leaveAt, 20, true),
    ).toBe(0)
  })

  it("rounds walking time to whole minutes, at least 1", () => {
    expect(walkMinutes(0)).toBe(1)
    expect(walkMinutes(250)).toBe(3)
    expect(walkMinutes(800)).toBe(10)
  })

  it("converts walking minutes to metres and back", () => {
    expect(walkMeters(15)).toBe(1200)
    expect(walkMinutes(walkMeters(7))).toBe(7)
  })

  it("formats durations in hours and minutes", () => {
    expect(formatDuration(15)).toBe("15 min")
    expect(formatDuration(120)).toBe("2 hr")
    expect(formatDuration(135.4)).toBe("2 hr 15 min")
  })
})
