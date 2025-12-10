import type { MapKit } from "@apple/mapkit-loader"

export const calculateDirection = async (
  mapkitInstance: MapKit,
  start: InstanceType<MapKit["Coordinate"]>,
  end: InstanceType<MapKit["Coordinate"]>,
  departureDate: Date,
) => {
  const directions = new mapkitInstance.Directions()
  const directionsRequest: Parameters<InstanceType<MapKit["Directions"]>["route"]>[0] = {
    origin: start,
    destination: end,
    transportType: mapkitInstance.Directions.Transport.Automobile,
    departureDate,
  }

  // Using the correct ETA response structure
  const route = new Promise<{ directions: Parameters<Parameters<InstanceType<MapKit["Directions"]>["route"]>[1]>[1] }>(
    (resolve, reject) => {
      directions.route(directionsRequest, (error, data) => {
        if (error) {
          console.error(error);
          reject(error);
        } else if (data) {
          resolve({ directions: data });
        } else {
          reject(new Error("No data returned from directions API"));
        }
      });
    },
  );

  return route;
};
