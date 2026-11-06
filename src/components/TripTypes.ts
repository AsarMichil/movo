import type { ComparisonResult, VehicleClass } from "../calculations"
import type {
  DirectionsResponse,
  MapKit,
  SearchAutocompleteResult,
} from "@apple/mapkit-loader"

export type Place = Pick<SearchAutocompleteResult, "coordinate" | "displayLines">

export interface TripState {
  originCoordinate: InstanceType<MapKit["Coordinate"]> | undefined
  destinationCoordinate: InstanceType<MapKit["Coordinate"]> | undefined
  inEvoHomeZone: boolean
  stayDuration: number | undefined
  bcaaMembership: boolean
  electricVehicle: boolean
  roundTripRequired: boolean
  route: DirectionsResponse["routes"][number] | undefined
  vehicleType: VehicleClass | undefined
  parkingWalkingDistance: number
  origin: Place | undefined
  destination: Place | undefined
}
type ComparisonError = {
  message: string
  show: boolean
}
export type ComparisonCalc = {
  data: ComparisonResult | null
  error: ComparisonError | null
}
