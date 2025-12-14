import { z } from "zod";

const VehiclePreferenceSchema = z
  .enum(["daily_drive", "large_loadable", "oversized"])
  .optional();

const TripParamsUrlSchema = z.object({
  origin_lat: z.coerce.number().optional(),
  origin_lng: z.coerce.number().optional(),
  dest_lat: z.coerce.number().optional(),
  dest_lng: z.coerce.number().optional(),
  stay_duration: z.coerce.number().optional(),
  parking_walking_distance: z.coerce.number().optional(),
  bcaa_member: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  electric_vehicle: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  round_trip: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
  vehicle_type: VehiclePreferenceSchema,
});

export type TripParamsUrl = z.infer<typeof TripParamsUrlSchema>;

const DEFAULT_VALUES = {
  stay_duration: 0,
  parking_walking_distance: 50,
  bcaa_member: false,
  electric_vehicle: false,
  round_trip: false,
  vehicle_type: undefined as
    | "daily_drive"
    | "large_loadable"
    | "oversized"
    | undefined,
};

export function extractParams(
  params: Record<string, string>,
): TripParamsUrl | null {
  const parsed = TripParamsUrlSchema.safeParse(params);
  if (!parsed.success) {
    console.error("Failed to parse URL params:", parsed.error);
    return null;
  }

  const result = parsed.data;

  if (
    !result.origin_lat ||
    !result.origin_lng ||
    !result.dest_lat ||
    !result.dest_lng
  ) {
    return null;
  }

  return {
    ...DEFAULT_VALUES,
    ...result,
  };
}

export function extractParameters(url: URL): TripParamsUrl | null {
  const params = Object.fromEntries(url.searchParams.entries());

  const parsed = TripParamsUrlSchema.safeParse(params);

  if (!parsed.success) {
    console.error("Failed to parse URL params:", parsed.error);
    return null;
  }

  const result = parsed.data;

  if (
    !result.origin_lat ||
    !result.origin_lng ||
    !result.dest_lat ||
    !result.dest_lng
  ) {
    return null;
  }

  return {
    ...DEFAULT_VALUES,
    ...result,
  };
}

export function buildSearchParams(
  params: Partial<TripParamsUrl>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.origin_lat !== undefined) {
    searchParams.set("origin_lat", params.origin_lat.toString());
  }
  if (params.origin_lng !== undefined) {
    searchParams.set("origin_lng", params.origin_lng.toString());
  }
  if (params.dest_lat !== undefined) {
    searchParams.set("dest_lat", params.dest_lat.toString());
  }
  if (params.dest_lng !== undefined) {
    searchParams.set("dest_lng", params.dest_lng.toString());
  }
  if (
    params.stay_duration !== undefined &&
    params.stay_duration !== DEFAULT_VALUES.stay_duration
  ) {
    searchParams.set("stay_duration", params.stay_duration.toString());
  }
  if (
    params.parking_walking_distance !== undefined &&
    params.parking_walking_distance !== DEFAULT_VALUES.parking_walking_distance
  ) {
    searchParams.set(
      "parking_walking_distance",
      params.parking_walking_distance.toString(),
    );
  }
  if (
    params.bcaa_member !== undefined &&
    params.bcaa_member !== DEFAULT_VALUES.bcaa_member
  ) {
    searchParams.set("bcaa_member", params.bcaa_member ? "1" : "0");
  }
  if (
    params.electric_vehicle !== undefined &&
    params.electric_vehicle !== DEFAULT_VALUES.electric_vehicle
  ) {
    searchParams.set("electric_vehicle", params.electric_vehicle ? "1" : "0");
  }
  if (
    params.round_trip !== undefined &&
    params.round_trip !== DEFAULT_VALUES.round_trip
  ) {
    searchParams.set("round_trip", params.round_trip ? "1" : "0");
  }
  if (
    params.vehicle_type !== undefined &&
    params.vehicle_type !== DEFAULT_VALUES.vehicle_type
  ) {
    searchParams.set("vehicle_type", params.vehicle_type);
  }

  return searchParams;
}
