import type { ScoredDish } from "@/lib/match";
import { isHeadsUp } from "@/lib/match";
import type { FlavorId } from "@/lib/taste";
import type { Course, DishDiet } from "@/lib/types";

export type SortKey = "best" | "spice-asc" | "spice-desc" | "price-asc" | "price-desc";

export type MenuFilters = {
  diets: DishDiet[];
  maxSpice: number;
  flavors: FlavorId[];
  courses: Course[];
  hideDrinks: boolean;
  hideHeadsUp: boolean;
  sort: SortKey;
};

export const DEFAULT_FILTERS: MenuFilters = {
  diets: [],
  maxSpice: 5,
  flavors: [],
  courses: [],
  hideDrinks: true,
  hideHeadsUp: false,
  sort: "best",
};

export const SORT_LABEL: Record<SortKey, string> = {
  best: "Best match",
  "spice-asc": "Spice ↑",
  "spice-desc": "Spice ↓",
  "price-asc": "Price ↑",
  "price-desc": "Price ↓",
};

/** How many filters differ from the defaults (sort doesn't count). */
export function activeFilterCount(filters: MenuFilters): number {
  return [
    filters.diets.length > 0,
    filters.maxSpice < 5,
    filters.flavors.length > 0,
    filters.courses.length > 0,
    !filters.hideDrinks,
    filters.hideHeadsUp,
  ].filter(Boolean).length;
}

export function applyFilters(entries: ScoredDish[], filters: MenuFilters, query: string): ScoredDish[] {
  const q = query.trim().toLowerCase();
  const filtered = entries.filter(({ dish, match }) => {
    if (filters.hideDrinks && dish.course === "drink") return false;
    if (filters.hideHeadsUp && isHeadsUp(match)) return false;
    if (filters.diets.length > 0 && !filters.diets.includes(dish.diet)) return false;
    if (dish.spice > filters.maxSpice) return false;
    if (filters.courses.length > 0 && !filters.courses.includes(dish.course)) return false;
    if (filters.flavors.length > 0 && !filters.flavors.some((flavor) => dish.flavor[flavor] >= 2)) return false;
    if (q) {
      const haystack = [dish.name, dish.canonical_name, dish.printed_description ?? "", ...dish.key_ingredients]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const price = (entry: ScoredDish) => entry.dish.price ?? Number.POSITIVE_INFINITY;
  const sorters: Record<SortKey, (a: ScoredDish, b: ScoredDish) => number> = {
    best: (a, b) =>
      Number(a.match.excluded) - Number(b.match.excluded) ||
      b.match.score - a.match.score ||
      a.dish.position - b.dish.position,
    "spice-asc": (a, b) => a.dish.spice - b.dish.spice || a.dish.position - b.dish.position,
    "spice-desc": (a, b) => b.dish.spice - a.dish.spice || a.dish.position - b.dish.position,
    "price-asc": (a, b) => price(a) - price(b) || a.dish.position - b.dish.position,
    "price-desc": (a, b) => price(b) - price(a) || a.dish.position - b.dish.position,
  };
  return [...filtered].sort(sorters[filters.sort]);
}

/** Groups by the menu's printed section, in the order sections appear on the menu. */
export function groupBySection(entries: ScoredDish[]): { section: string; items: ScoredDish[] }[] {
  const groups = new Map<string, { first: number; items: ScoredDish[] }>();
  for (const entry of entries) {
    const key = entry.dish.section ?? "Other";
    const group = groups.get(key) ?? { first: entry.dish.position, items: [] };
    group.first = Math.min(group.first, entry.dish.position);
    group.items.push(entry);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort((a, b) => a[1].first - b[1].first)
    .map(([section, group]) => ({ section, items: group.items }));
}
