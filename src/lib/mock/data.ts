import type { Cuisine, TastePreference } from "@/lib/types";

export const DAILY_PAGE_LIMIT = 40;

/** What a brand-new account starts with, before onboarding. */
export const EMPTY_PREFS: TastePreference = {
  flavors: [],
  spiceTolerance: 2,
  heaviness: "balanced",
  diet: "non_veg",
  dislikes: [],
  allergies: [],
};

export function uniqueCuisines(values: Cuisine[]): Cuisine[] {
  return [...new Set(values)];
}
