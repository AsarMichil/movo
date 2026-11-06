import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import nearestPointOnLine from "@turf/nearest-point-on-line"
import type { MultiLineString, Polygon } from "geojson"
import type { Homezone } from "../types/evo"

type Coordinate = { latitude: number; longitude: number }

export type ParkingSpot = Coordinate & {
  distance_meters: number
  name: string
}

type Zone = { name: string; polygon: Polygon; outline: MultiLineString }

const zonesCache = new WeakMap<Homezone, Zone[]>()

function zonesOf(homezone: Homezone): Zone[] {
  let zones = zonesCache.get(homezone)
  if (!zones) {
    zones = homezone.zone.features.map((feature) => ({
      name: feature.properties.name,
      polygon: feature.geometry,
      outline: {
        type: "MultiLineString",
        coordinates: feature.geometry.coordinates,
      },
    }))
    zonesCache.set(homezone, zones)
  }
  return zones
}

function nearestInCity(
  homezone: Homezone,
  coordinate: Coordinate,
): ParkingSpot {
  const point = [coordinate.longitude, coordinate.latitude]
  let best: ParkingSpot | null = null
  for (const zone of zonesOf(homezone)) {
    if (booleanPointInPolygon(point, zone.polygon))
      return { ...coordinate, distance_meters: 0, name: zone.name }
    const nearest = nearestPointOnLine(zone.outline, point, { units: "meters" })
    const distance = nearest.properties.pointDistance
    if (!best || distance < best.distance_meters) {
      const [longitude, latitude] = nearest.geometry.coordinates as [
        number,
        number,
      ]
      best = { latitude, longitude, distance_meters: distance, name: zone.name }
    }
  }
  if (!best) throw new Error(`Home zone ${homezone.city} has no polygons`)
  return best
}

// An Evo trip must end in the home zone of the city it started in.
export function findParking(
  homezones: Homezone[],
  origin: Coordinate,
  destination: Coordinate,
  maxWalkMeters: number,
): ParkingSpot | null {
  const city = homezones.reduce((a, b) =>
    nearestInCity(b, origin).distance_meters <
    nearestInCity(a, origin).distance_meters
      ? b
      : a,
  )
  const spot = nearestInCity(city, destination)
  return spot.distance_meters <= maxWalkMeters ? spot : null
}
