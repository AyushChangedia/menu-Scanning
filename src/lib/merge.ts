import { slugify } from "@/lib/utils";
import type { Dish, DishData } from "@/lib/types";

export function normaliseName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Turns one page of AI output into Dish rows with stable ids and slugs. */
export function toDishes(scanId: string, pageIndex: number, data: DishData[]): Dish[] {
  return data.map((dish, position) => ({
    ...dish,
    id: `${scanId}-p${pageIndex}-${position}`,
    slug: slugify(dish.canonical_name),
    pageIndex,
    position: pageIndex * 100 + position,
  }));
}

/**
 * Collapses dishes that appear on more than one page (people overlap their
 * shots). Same slug and same printed name → keep the first.
 */
export function mergeDuplicates(dishes: Dish[]): Dish[] {
  const seen = new Set<string>();
  const out: Dish[] = [];
  for (const dish of [...dishes].sort((a, b) => a.position - b.position)) {
    const key = `${dish.slug}::${normaliseName(dish.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dish);
  }
  return out;
}
