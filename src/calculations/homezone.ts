import booleanIntersects from "@turf/boolean-intersects"
import circle from "@turf/circle"
import type { Homezone } from "../types/evo"

export function isInHomeZone(
  homezones: Homezone[],
  coordinate: { latitude: number; longitude: number },
  walkingDistanceMeters = 50,
): boolean {
  const searchArea = circle([coordinate.longitude, coordinate.latitude], walkingDistanceMeters, {
    units: "meters",
  })
  return homezones.some((homezone) =>
    homezone.zone.features.some((feature) => booleanIntersects(searchArea, feature)),
  )
}
