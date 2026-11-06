import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import nearestPointOnLine from "@turf/nearest-point-on-line"
import type { MultiLineString, Polygon } from "geojson"
import type { Homezone } from "../types/evo"

export type ParkingSpot = {
  latitude: number
  longitude: number
  distance_meters: number
  name: string
}

type Zone = { name: string; polygon: Polygon; outline: MultiLineString }

const zonesCache = new WeakMap<Homezone[], Zone[]>()

function zonesOf(homezones: Homezone[]): Zone[] {
  let zones = zonesCache.get(homezones)
  if (!zones) {
    zones = homezones.flatMap((homezone) =>
      homezone.zone.features.map((feature) => ({
        name: feature.properties.name,
        polygon: feature.geometry,
        outline: {
          type: "MultiLineString",
          coordinates: feature.geometry.coordinates,
        },
      })),
    )
    zonesCache.set(homezones, zones)
  }
  return zones
}

export function findParking(
  homezones: Homezone[],
  coordinate: { latitude: number; longitude: number },
  maxWalkMeters: number,
): ParkingSpot | null {
  const point = [coordinate.longitude, coordinate.latitude]
  let best: ParkingSpot | null = null
  for (const zone of zonesOf(homezones)) {
    if (booleanPointInPolygon(point, zone.polygon))
      return { ...coordinate, distance_meters: 0, name: zone.name }
    const nearest = nearestPointOnLine(zone.outline, point, { units: "meters" })
    const distance = nearest.properties.pointDistance
    if (
      distance <= maxWalkMeters &&
      (!best || distance < best.distance_meters)
    ) {
      const [longitude, latitude] = nearest.geometry.coordinates as [
        number,
        number,
      ]
      best = { latitude, longitude, distance_meters: distance, name: zone.name }
    }
  }
  return best
}
