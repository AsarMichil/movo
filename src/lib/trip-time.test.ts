import { describe, expect, it } from "vitest"
import {
  STAY_CHIPS,
  formatDuration,
  fromLocalInput,
  isSameStay,
  nextQuarterHour,
  stayMinutes,
  toLocalInput,
} from "./trip-time"

const at = (value: string) => new Date(value)

describe("trip-time", () => {
  it("rounds up to the next quarter hour, keeping exact quarters", () => {
    expect(toLocalInput(nextQuarterHour(at("2026-11-06T14:01:30")))).toBe(
      "2026-11-06T14:15",
    )
    expect(toLocalInput(nextQuarterHour(at("2026-11-06T14:45")))).toBe(
      "2026-11-06T14:45",
    )
    expect(toLocalInput(nextQuarterHour(at("2026-11-06T23:50")))).toBe(
      "2026-11-07T00:00",
    )
  })

  it("parses local datetime input values and rejects empty ones", () => {
    expect(fromLocalInput("2026-11-06T09:30")?.getHours()).toBe(9)
    expect(fromLocalInput("")).toBeUndefined()
  })

  it("derives the stay from an end time minus the drive, clamped at 0", () => {
    const leaveAt = at("2026-11-06T10:00")
    expect(stayMinutes({ minutes: 90 }, leaveAt, 20)).toBe(90)
    expect(stayMinutes({ until: at("2026-11-06T12:00") }, leaveAt, 20)).toBe(
      100,
    )
    expect(stayMinutes({ until: at("2026-11-06T10:10") }, leaveAt, 20)).toBe(0)
  })

  it("ends All day at 6pm, or the next day when leaving late", () => {
    const allDay = STAY_CHIPS.find((chip) => chip.label === "All day")!
    expect(allDay.stay(at("2026-11-06T09:00"))).toEqual({
      until: at("2026-11-06T18:00"),
    })
    expect(allDay.stay(at("2026-11-06T17:30"))).toEqual({
      until: at("2026-11-07T18:00"),
    })
  })

  it("ends Overnight at 9am the next day", () => {
    const overnight = STAY_CHIPS.find((chip) => chip.label === "Overnight")!
    expect(overnight.stay(at("2026-11-06T19:00"))).toEqual({
      until: at("2026-11-07T09:00"),
    })
  })

  it("compares stays by kind and value", () => {
    expect(isSameStay({ minutes: 60 }, { minutes: 60 })).toBe(true)
    expect(isSameStay({ minutes: 60 }, { until: at("2026-11-06T10:00") })).toBe(
      false,
    )
    expect(
      isSameStay(
        { until: at("2026-11-06T10:00") },
        { until: at("2026-11-06T10:00") },
      ),
    ).toBe(true)
  })

  it("formats durations in hours and minutes", () => {
    expect(formatDuration(15)).toBe("15 min")
    expect(formatDuration(120)).toBe("2 hr")
    expect(formatDuration(135.4)).toBe("2 hr 15 min")
  })
})
