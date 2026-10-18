import { ITALIAN_PAGE, PAN_ASIAN_PAGE_1, PAN_ASIAN_PAGE_2 } from "@/lib/mock/fixtures";
import { mergeDuplicates, toDishes } from "@/lib/merge";
import type { Cuisine, Feedback, MenuPage, Scan, TastePreference } from "@/lib/types";

export const MOCK_USER = {
  name: "Ayush Changedia",
  email: "ayush@forkcast.app",
};

export const DAILY_PAGE_LIMIT = 40;

export const DEFAULT_PREFS: TastePreference = {
  flavors: ["spicy", "garlicky", "cheesy", "tangy"],
  spiceTolerance: 3,
  heaviness: "balanced",
  diet: "non_veg",
  dislikes: ["mushrooms", "olives"],
  allergies: ["peanuts"],
};

export const EMPTY_PREFS: TastePreference = {
  flavors: [],
  spiceTolerance: 2,
  heaviness: "balanced",
  diet: "non_veg",
  dislikes: [],
  allergies: [],
};

function daysAgo(days: number, hour = 20): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

export const DEFAULT_FEEDBACK: Feedback[] = [
  { slug: "burnt-garlic-egg-fried-rice", verdict: 1, name: "Burnt Garlic Egg Fried Rice", cuisine: "indo_chinese", createdAt: daysAgo(12) },
  { slug: "penne-allarrabbiata", verdict: 1, name: "Penne all'Arrabbiata", cuisine: "italian", createdAt: daysAgo(9) },
  { slug: "salmon-nigiri", verdict: -1, name: "Salmon Nigiri", cuisine: "japanese", createdAt: daysAgo(5) },
];

/** Applies a list of page results (null = failed page) to build a finished scan. */
export function buildScan(
  id: string,
  pages: (MenuPage | null)[],
  createdAt: string,
  thumbnail: string | null = null,
): Scan {
  const dishes = mergeDuplicates(
    pages.flatMap((page, index) => (page ? toDishes(id, index, page.dishes) : [])),
  );
  const failed = pages.some((page) => page === null);
  return {
    id,
    restaurantName: pages.find((page) => page?.restaurant_name)?.restaurant_name ?? null,
    cuisines: uniqueCuisines(dishes.map((dish) => dish.cuisine)),
    pageCount: pages.length,
    status: failed ? "partial" : "ready",
    thumbnail,
    createdAt,
    pages: pages.map((page, index) =>
      page
        ? { index, status: "done" as const }
        : { index, status: "failed" as const, error: "Not analysed — re-upload" },
    ),
    dishes,
  };
}

export function uniqueCuisines(values: Cuisine[]): Cuisine[] {
  return [...new Set(values)];
}

export function initialScans(): Scan[] {
  return [
    buildScan("little-napoli", [ITALIAN_PAGE], daysAgo(1)),
    buildScan("bamboo-lantern", [PAN_ASIAN_PAGE_1, null], daysAgo(4, 13)),
    { ...buildScan("weekend-brunch", [PAN_ASIAN_PAGE_2, ITALIAN_PAGE], daysAgo(11, 12)), restaurantName: null },
  ];
}
