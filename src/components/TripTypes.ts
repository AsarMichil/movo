import type { ComparisonResult } from "../calculations"
import type { MapKit } from "@apple/mapkit-loader"

export interface TripState {
  originCoordinate: InstanceType<MapKit["Coordinate"]> | undefined
  destinationCoordinate: InstanceType<MapKit["Coordinate"]> | undefined
  inEvoHomeZone: boolean
  stayDuration: number | undefined
  bcaaMembership: boolean
  electricVehicle: boolean
  roundTripRequired: boolean
  route: any | undefined
  vehicleType: "daily_drive" | "large_loadable" | "oversized" | undefined
  parkingWalkingDistance: number
}
type ComparisonError = {
  message: string;
  show: boolean;
};
export type ComparisonCalc = {
  data: ComparisonResult | null;
  error: ComparisonError | null;
};
