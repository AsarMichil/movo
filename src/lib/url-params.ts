import { z } from "zod"
import type { ModoPlan, VehicleClass } from "../calculations"

const VEHICLE_CLASSES = [
  "daily_drive",
  "large_loadable",
  "oversized",
] as const satisfies readonly VehicleClass[]

const MODO_PLANS = ["plus", "monthly"] as const satisfies readonly ModoPlan[]

const flag = z
  .string()
  .optional()
  .transform((val) => val === "true" || val === "1")

const TripParamsUrlSchema = z.object({
  origin_lat: z.coerce.number().optional(),
  origin_lng: z.coerce.number().optional(),
  dest_lat: z.coerce.number().optional(),
  dest_lng: z.coerce.number().optional(),
  leave_at: z
    .string()
    .datetime({ offset: true })
    .transform((val) => new Date(val))
    .optional(),
  stay_duration: z.coerce.number().optional(),
  parking_walking_distance: z.coerce.number().optional(),
  bcaa_member: flag,
  electric_vehicle: flag,
  round_trip: flag,
  vehicle_type: z.enum(VEHICLE_CLASSES).optional(),
  modo_plan: z.enum(MODO_PLANS).optional(),
})

export type TripParamsUrl = z.infer<typeof TripParamsUrlSchema>

export const DEFAULT_VALUES = {
  stay_duration: 0,
  parking_walking_distance: 250,
  bcaa_member: false,
  electric_vehicle: false,
  round_trip: false,
  modo_plan: "plus" as ModoPlan,
}

type Coordinates = Record<
  "origin_lat" | "origin_lng" | "dest_lat" | "dest_lng",
  number
>

export type SharedTrip = TripParamsUrl & typeof DEFAULT_VALUES & Coordinates

export function extractParameters(url: URL): SharedTrip | null {
  const parsed = TripParamsUrlSchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  )

  if (!parsed.success) {
    console.error("Failed to parse URL params:", parsed.error)
    return null
  }

  const { origin_lat, origin_lng, dest_lat, dest_lng } = parsed.data
  if (
    origin_lat === undefined ||
    origin_lng === undefined ||
    dest_lat === undefined ||
    dest_lng === undefined
  ) {
    return null
  }

  const defined = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  )

  return {
    ...DEFAULT_VALUES,
    ...defined,
    origin_lat,
    origin_lng,
    dest_lat,
    dest_lng,
  }
}

export function buildSearchParams(
  params: Partial<TripParamsUrl>,
): URLSearchParams {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (
      key in DEFAULT_VALUES &&
      value === DEFAULT_VALUES[key as keyof typeof DEFAULT_VALUES]
    ) {
      continue
    }
    if (value instanceof Date) {
      searchParams.set(key, value.toISOString())
    } else if (typeof value === "boolean") {
      searchParams.set(key, value ? "1" : "0")
    } else {
      searchParams.set(key, value.toString())
    }
  }

  return searchParams
}
