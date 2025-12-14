import { load, type MapKit } from "@apple/mapkit-loader"
import { PUBLIC_MAPKIT_TOKEN } from "$env/static/public"

let mapkitInstance: MapKit | null = null

async function getMapKit(): Promise<MapKit> {
  if (mapkitInstance) return mapkitInstance

  mapkitInstance = await load({
    token: PUBLIC_MAPKIT_TOKEN,
    language: "en-US",
    libraries: ["services"],
  })

  return mapkitInstance
}

export const mk = {
  search: {
    autocomplete: async (
      query: string,
      options?: { signal?: AbortSignal },
    ): Promise<any[]> => {
      const { signal } = options ?? {}

      const mk = await getMapKit()

      const search = new mk.Search({
        getsUserLocation: true,
        includeQueries: false,
        includePointsOfInterest: true,
        includeAddresses: true,
        coordinate: new mk.Coordinate(
          49.28091630159075,
          -123.11395918331695,
        ),
        limitToCountries: "us,ca"
      })

      return await new Promise<any[]>(
        (resolve, reject) => {
          const requestId = search.autocomplete(
            query,
            (error: Error | null, response?: any) => {
              if (error) {
                reject(error)
                return
              }

              resolve(response?.results ?? [])
            },
            {},
          )

          signal?.addEventListener("abort", () => search.cancel(requestId), {
            once: true,
            passive: true,
          })
        },
      )
    },
  },
}
