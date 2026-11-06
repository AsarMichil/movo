import { z } from "zod"

const PositionSchema = z.tuple([z.number(), z.number()])

const ZoneFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(PositionSchema)),
  }),
  properties: z.object({ name: z.string() }),
})

export type Homezone = z.infer<typeof HomezoneSchema>
export const HomezoneSchema = z.object({
  id: z.string(),
  city: z.string(),
  zone: z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(ZoneFeatureSchema),
  }),
})
