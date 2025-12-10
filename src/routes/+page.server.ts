import homezones from "../data/evo/homezones.json"
import { HomezoneSchema } from "../types/evo"
import type { PageServerLoad } from "./$types"
import { extractParameters } from "../lib/url-params"

export const prerender = false

export const load: PageServerLoad = async ({ url }) => {
  const homezonesParsed = HomezoneSchema.array().parse(homezones)
  const urlParams = extractParameters(url)

  return {
    homezones: homezonesParsed,
    urlParams,
  }
}
