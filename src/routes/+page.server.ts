import homezones from "../data/evo/homezones.json";
import { HomezoneSchema } from "../types/evo";
import type { PageServerLoad } from "./$types";
export const load: PageServerLoad = async () => {
  const homezonesParsed = HomezoneSchema.array().parse(homezones);

  return {
    homezones: homezonesParsed,
  };
};
