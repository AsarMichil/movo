import { describe, it, expect } from "vitest"
import { buildSearchParams, extractParameters } from "./url-params"

const toUrl = (query: string | URLSearchParams) =>
  new URL(`https://example.com/?${query.toString()}`)

const coords = {
  origin_lat: 49.28,
  origin_lng: -123.12,
  dest_lat: 49.26,
  dest_lng: -123.25,
}

describe("url-params", () => {
  it("round-trips a full param set", () => {
    const full = {
      ...coords,
      stay_duration: 120,
      bcaa_member: true,
      electric_vehicle: true,
      round_trip: true,
      vehicle_type: "oversized" as const,
    }
    const result = extractParameters(toUrl(buildSearchParams(full)))
    expect(result).toMatchObject(full)
  })

  it("omits values equal to the defaults", () => {
    const sp = buildSearchParams({
      ...coords,
      stay_duration: 0,
      parking_walking_distance: 50,
      bcaa_member: false,
      electric_vehicle: false,
      round_trip: false,
    })
    expect([...sp.keys()].sort()).toEqual(
      ["dest_lat", "dest_lng", "origin_lat", "origin_lng"].sort(),
    )
  })

  it("returns null when any coordinate is missing", () => {
    for (const key of Object.keys(coords)) {
      const sp = buildSearchParams(coords)
      sp.delete(key)
      expect(extractParameters(toUrl(sp))).toBeNull()
    }
  })

  it("applies defaults when optional params are absent", () => {
    const result = extractParameters(toUrl(buildSearchParams(coords)))
    expect(result).toMatchObject({
      ...coords,
      stay_duration: 0,
      parking_walking_distance: 50,
      bcaa_member: false,
      electric_vehicle: false,
      round_trip: false,
    })
    expect(result?.vehicle_type).toBeUndefined()
  })

  it("parses booleans: 1 and true are true, 0 is false", () => {
    const base = buildSearchParams(coords).toString()
    const result = extractParameters(
      toUrl(`${base}&bcaa_member=1&electric_vehicle=true&round_trip=0`),
    )
    expect(result?.bcaa_member).toBe(true)
    expect(result?.electric_vehicle).toBe(true)
    expect(result?.round_trip).toBe(false)
  })

  it("returns null for an invalid vehicle_type", () => {
    const base = buildSearchParams(coords).toString()
    expect(extractParameters(toUrl(`${base}&vehicle_type=spaceship`))).toBeNull()
  })

  // KNOWN BUG: truthiness checks treat a coordinate of 0 as missing.
  it.fails("accepts a coordinate of exactly 0", () => {
    const result = extractParameters(
      toUrl(buildSearchParams({ ...coords, dest_lng: 0 })),
    )
    expect(result).not.toBeNull()
  })
})
