import {
  load,
  type MapKit,
  type SearchAutocompleteResult,
} from "@apple/mapkit-loader"
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
      options?: { signal?: AbortSignal; localOnly?: boolean },
    ): Promise<SearchAutocompleteResult[]> => {
      const { signal, localOnly = false } = options ?? {}

      const mk = await getMapKit()

      // Centred on downtown because results rank by distance from the centre; wide enough to reach Abbotsford.
      const greaterVancouver = new mk.CoordinateRegion(
        new mk.Coordinate(49.2809, -123.1139),
        new mk.CoordinateSpan(0.7, 1.6),
      )

      const search = new mk.Search({
        includeQueries: false,
        includePointsOfInterest: true,
        includeAddresses: true,
        region: greaterVancouver,
        regionPriority: localOnly
          ? mk.Search.RegionPriority.Required
          : mk.Search.RegionPriority.Default,
        // The box crosses into Washington, so local searches also drop the US.
        limitToCountries: localOnly ? "ca" : "us,ca",
      })

      return await new Promise<SearchAutocompleteResult[]>(
        (resolve, reject) => {
          const requestId = search.autocomplete(
            query,
            (error, response) => {
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
