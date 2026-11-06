import { describe, expect, it } from "vitest"
import homezonesJson from "../data/evo/homezones.json"
import { HomezoneSchema } from "../types/evo"
import { findParking } from "./homezone"
import {
  calculateEvoCost,
  calculateModoCost,
  compareCarShareOptions,
  evoTimeCost,
  pvrtCharges,
  type TripParameters,
} from "./price"

const TAX = 1.12 // GST 5% + PST 7%
const PVRT = 1.5 * 1.05 // PVRT with GST

const trip = (overrides: Partial<TripParameters>): TripParameters => ({
  start_date: new Date(2026, 2, 10, 14, 0),
  driving_minutes: 20,
  staying_minutes: 0,
  distance_km: 10,
  is_bcaa_member: false,
  end_is_in_evo_home_zone: true,
  round_trip_required: false,
  vehicle_preference: "daily_drive",
  is_ev: false,
  modo_plan: "plus",
  ...overrides,
})

const oneWayEvo = (minutes: number, extra: Partial<TripParameters> = {}) =>
  calculateEvoCost(trip({ driving_minutes: minutes, ...extra }))

describe("Evo", () => {
  it("charges per minute for a short one-way trip", () => {
    // 20 x 0.49 = 9.80, + 1.85 fee
    expect(oneWayEvo(20).total).toBeCloseTo((9.8 + 1.85) * TAX, 2)
  })

  it("caps minutes at the hourly rate", () => {
    // 37 x 0.49 = 18.13 > 17.99
    expect(oneWayEvo(37).time_cost).toBeCloseTo(17.99, 2)
    expect(oneWayEvo(37).total).toBeCloseTo((17.99 + 1.85) * TAX, 2)
  })

  it("caps hours at the daily rate", () => {
    // 6 x 17.99 = 107.94 > 104.99
    expect(oneWayEvo(360).total).toBeCloseTo((104.99 + 1.85) * TAX, 2)
  })

  it("picks the 3-day package over 2 days + 20h", () => {
    // 60 min drive x2 + 3960 stay = 4080 min = 2d 20h; 2 x 104.99 + 104.99 = 314.97 > 264.99
    // PVRT: ceil(4080 / 1440) = 3
    const cost = calculateEvoCost(
      trip({ driving_minutes: 60, staying_minutes: 3960, end_is_in_evo_home_zone: false }),
    )
    expect(cost.time_cost).toBeCloseTo(264.99, 2)
    expect(cost.total).toBeCloseTo((264.99 + 1.85) * TAX + 3 * PVRT, 2)
  })

  it("picks 3-day + 1 day for 4 days and the 5-day package for 4d 12h", () => {
    // 264.99 + 104.99 = 369.98 < 424.99
    expect(evoTimeCost(4 * 1440).cost).toBeCloseTo(369.98, 2)
    // 369.98 + 104.99 = 474.97 > 424.99
    expect(evoTimeCost(4 * 1440 + 720).cost).toBeCloseTo(424.99, 2)
  })

  it("applies the BCAA 10% discount to driving rates only", () => {
    // 2h = 35.98, discount 3.598
    const cost = oneWayEvo(120, { is_bcaa_member: true })
    expect(cost.discounts).toBeCloseTo(3.6, 2)
    expect(cost.total).toBeCloseTo((35.98 - 3.598 + 1.85) * TAX, 2)
  })

  it("charges PVRT per started day over 8h, none from 28 days", () => {
    expect(pvrtCharges(480)).toBe(0)
    expect(pvrtCharges(481)).toBe(1)
    expect(pvrtCharges(1441)).toBe(2)
    expect(pvrtCharges(28 * 1440)).toBe(0)
    expect(oneWayEvo(480).total).toBeCloseTo((104.99 + 1.85) * TAX, 2)
    expect(oneWayEvo(481).total).toBeCloseTo((104.99 + 1.85) * TAX + PVRT, 2)
    // 33h = 1 day + 9h (capped to a day) = 209.98
    expect(oneWayEvo(33 * 60).total).toBeCloseTo((209.98 + 1.85) * TAX + 2 * PVRT, 2)
  })

  it("splits a round trip with a long stay into two trips", () => {
    // keep car 220 min = 71.96 vs two trips 2 x 9.80 + 2 x 1.85
    const cost = calculateEvoCost(trip({ round_trip_required: true, staying_minutes: 180 }))
    expect(cost.fees).toBeCloseTo(3.7, 2)
    expect(cost.total).toBeCloseTo((19.6 + 3.7) * TAX, 2)
  })

  it("keeps the car for a short stay", () => {
    // 43 min capped to 17.99 vs two trips 23.30 pre-tax
    const cost = calculateEvoCost(trip({ round_trip_required: true, staying_minutes: 3 }))
    expect(cost.fees).toBeCloseTo(1.85, 2)
    expect(cost.total).toBeCloseTo((17.99 + 1.85) * TAX, 2)
  })

  it("bills the whole round trip when the destination is outside the home zone", () => {
    // 100 min = 17.99 + 40 min (19.60 capped to 17.99)
    const cost = calculateEvoCost(trip({ staying_minutes: 60, end_is_in_evo_home_zone: false }))
    expect(cost.total).toBeCloseTo((35.98 + 1.85) * TAX, 2)
  })
})

describe("Modo", () => {
  const dayTrip = (overrides: Partial<TripParameters>) =>
    trip({ start_date: new Date(2026, 2, 10, 9, 0), driving_minutes: 60, staying_minutes: 1320, ...overrides })

  it("charges hourly + km for a daytime trip on each plan", () => {
    // 2h, 20 km = 7.00, non-EV fee 3
    const params = trip({ driving_minutes: 30, staying_minutes: 60 })
    expect(calculateModoCost(params).total).toBeCloseTo((10 + 7 + 3) * TAX, 2)
    expect(calculateModoCost({ ...params, modo_plan: "monthly" }).total).toBeCloseTo((12 + 7 + 3) * TAX, 2)
  })

  it("bills at most 3h between 9pm and 7am", () => {
    // 20:00-08:00: 1h + 3h (of 10h night) + 1h = 5h x 5
    const params = trip({ start_date: new Date(2026, 2, 10, 20, 0), driving_minutes: 30, staying_minutes: 660 })
    const cost = calculateModoCost(params)
    expect(cost.time_cost).toBeCloseTo(25, 2)
    expect(cost.total).toBeCloseTo((25 + 7 + 3) * TAX + PVRT, 2)
  })

  it("caps a trip that starts after midnight at 3h until 7am", () => {
    // 02:00-08:00: 3h (of 5h night) + 1h = 4h x 5
    const params = trip({ start_date: new Date(2026, 2, 10, 2, 0), driving_minutes: 30, staying_minutes: 300 })
    const cost = calculateModoCost(params)
    expect(cost.time_cost).toBeCloseTo(20, 2)
    expect(cost.details).toContain("4 h × $5.00 = $20.00 (overnight capped, 2 h free)")
  })

  it("applies Day Tripper when cheaper than hourly", () => {
    // 09:00-09:00: 17h x 5 + 200 km x 0.35 = 155 > 100 (500 km included)
    const cost = calculateModoCost(dayTrip({ distance_km: 100 }))
    expect(cost.time_cost).toBeCloseTo(100, 2)
    expect(cost.distance_cost).toBeCloseTo(0, 2)
    expect(cost.total).toBeCloseTo((100 + 3) * TAX + PVRT, 2)
  })

  it("keeps hourly when cheaper than Day Tripper", () => {
    // 17h x 5 + 20 km x 0.35 = 92 < 100
    const cost = calculateModoCost(dayTrip({ distance_km: 10 }))
    expect(cost.total).toBeCloseTo((92 + 3) * TAX + PVRT, 2)
  })

  it("charges excess km over the Day Tripper allowance", () => {
    // monthly: 17h x 6 + 400 km x 0.35 = 242 vs 100 + (400 - 250) x 0.35 = 152.50
    const cost = calculateModoCost(dayTrip({ distance_km: 200, modo_plan: "monthly" }))
    expect(cost.time_cost).toBeCloseTo(100, 2)
    expect(cost.distance_cost).toBeCloseTo(52.5, 2)
    expect(cost.total).toBeCloseTo((152.5 + 3) * TAX + PVRT, 2)
  })

  it("applies Day Tripper per 24h block on multi-day trips", () => {
    // 48h, each block 17h x 5 + 100 km x 0.35 = 120 > 100; PVRT ceil(2880 / 1440) = 2
    const cost = calculateModoCost(dayTrip({ distance_km: 100, staying_minutes: 2760 }))
    expect(cost.total).toBeCloseTo((200 + 3) * TAX + 2 * PVRT, 2)
  })

  it("never applies Day Tripper to oversized vehicles", () => {
    // 17h x 10 + 400 km x 0.35 = 310
    const cost = calculateModoCost(dayTrip({ distance_km: 200, vehicle_preference: "oversized" }))
    expect(cost.total).toBeCloseTo((310 + 3) * TAX + PVRT, 2)
  })

  it("charges a $1 innovation fee for EVs and $3 otherwise", () => {
    const ev = calculateModoCost(trip({ is_ev: true }))
    const gas = calculateModoCost(trip({ is_ev: false }))
    expect(ev.fees).toBe(1)
    expect(gas.fees).toBe(3)
    expect(gas.total - ev.total).toBeCloseTo(2 * TAX, 2)
  })
})

describe("compareCarShareOptions", () => {
  it("compares Evo against the selected Modo plan", () => {
    // evo: 43 min capped = 17.99 + 1.85; modo 45 min, 20 km, $3 fee: plus 13.75, monthly 14.50
    const params = trip({ round_trip_required: true, staying_minutes: 3 })
    const plus = compareCarShareOptions(params)
    expect(plus.cheapest).toBe("modo")
    expect(plus.modo_plan).toBe("plus")
    expect(plus.modo.total).toBeCloseTo(13.75 * TAX, 2)
    expect(plus.savings).toBeCloseTo((17.99 + 1.85 - 13.75) * TAX, 2)
    expect(compareCarShareOptions({ ...params, modo_plan: "monthly" }).modo.total).toBeCloseTo(14.5 * TAX, 2)
  })

  it("picks Evo for a short one-way trip", () => {
    const result = compareCarShareOptions(trip({ driving_minutes: 10, distance_km: 5 }))
    expect(result.cheapest).toBe("evo")
    expect(result.savings).toBeCloseTo(result.modo.total - result.evo.total, 2)
  })
})

describe("findParking", () => {
  const homezones = HomezoneSchema.array().parse(homezonesJson)

  it("returns the coordinate itself inside the Vancouver home zone", () => {
    const coordinate = { latitude: 49.282, longitude: -123.118 }
    expect(findParking(homezones, coordinate, 50)).toEqual({ ...coordinate, distance_meters: 0, name: "Vancouver HZ" })
  })

  it("finds a UBC lot 100 m north of its northernmost vertex within walking distance", () => {
    const lot = homezones.flatMap((hz) => hz.zone.features).find((f) => f.properties.name === "UBC 5782")!
    const [longitude, latitude] = lot.geometry.coordinates[0]!.reduce((a, b) => (b[1] > a[1] ? b : a))
    const coordinate = { latitude: latitude + 100 / 111_320, longitude }
    const spot = findParking(homezones, coordinate, 200)
    expect(spot?.name).toBe("UBC 5782")
    expect(spot?.distance_meters).toBeCloseTo(100, -1)
    expect(spot).toMatchObject({ latitude, longitude })
    expect(findParking(homezones, coordinate, 50)).toBeNull()
  })

  it("returns null in the Strait of Georgia", () => {
    expect(findParking(homezones, { latitude: 49.25, longitude: -123.3 }, 200)).toBeNull()
  })
})
