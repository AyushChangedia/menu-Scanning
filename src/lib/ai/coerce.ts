/**
 * Free models (via OpenRouter) don't have the JSON schema enforced for them,
 * so their answers drift: "Non-Veg" instead of "non_veg", "₹450" instead of
 * 450, a missing key, the JSON wrapped in ```fences```. These helpers turn
 * such answers into the expected shape before the usual repair + validation,
 * so a small slip doesn't cost one of the day's free requests.
 */

import {
  ALLERGENS,
  CONFIDENCE,
  COURSES,
  CUISINES,
  DIET_SOURCES,
  DIETS,
  FLAVOR_KEYS,
  HEAVINESS,
  LEGIBILITY,
} from "@/lib/ai/schema";

type Rec = Record<string, unknown>;

const isRec = (value: unknown): value is Rec => typeof value === "object" && value !== null && !Array.isArray(value);

/** Pulls the JSON object out of a model's reply. undefined when there's none. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const candidates: string[] = [];
  for (const match of cleaned.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) candidates.push(match[1]);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) candidates.push(cleaned.slice(start, end + 1));
  candidates.push(cleaned);

  for (const candidate of candidates) {
    for (const attempt of [candidate, candidate.replace(/,\s*([}\]])/g, "$1")]) {
      try {
        const value: unknown = JSON.parse(attempt.trim());
        if (isRec(value) || Array.isArray(value)) return value;
      } catch {
        // try the next candidate
      }
    }
  }
  return undefined;
}

function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function number(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
  return null;
}

function flag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const word = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (word === "true" || word === "yes") return true;
  if (word === "false" || word === "no") return false;
  return null;
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return value.split(/[,;]/);
  return [];
}

function slug(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s\-/&]+/g, "_").replace(/_+/g, "_") : "";
}

function pick<T extends string>(value: unknown, options: readonly T[], aliases: Record<string, T>, fallback: T): T {
  const key = slug(value);
  if ((options as readonly string[]).includes(key)) return key as T;
  return aliases[key] ?? fallback;
}

const COURSE_ALIASES: Record<string, (typeof COURSES)[number]> = {
  starters: "starter", appetizer: "starter", appetizers: "starter", appetiser: "starter", appetisers: "starter",
  small_plates: "starter", small_plate: "starter", snack: "starter", snacks: "starter", tapas: "starter",
  soups: "soup", salads: "salad",
  mains: "main", main_course: "main", main_courses: "main", entree: "main", entrees: "main", curry: "main", curries: "main",
  pizzas: "pizza", pastas: "pasta",
  rice: "rice_noodles", noodles: "rice_noodles", rice_and_noodles: "rice_noodles", noodle: "rice_noodles", ramen: "rice_noodles",
  burger: "burger_sandwich", burgers: "burger_sandwich", sandwich: "burger_sandwich", sandwiches: "burger_sandwich", wrap: "burger_sandwich", wraps: "burger_sandwich",
  desserts: "dessert", sweets: "dessert",
  sides: "side", side_dish: "side", accompaniment: "side",
  drinks: "drink", beverage: "drink", beverages: "drink", coffee: "drink", tea: "drink", mocktail: "drink", mocktails: "drink",
  cocktail: "drink", cocktails: "drink", shake: "drink", shakes: "drink", juice: "drink",
};

const CUISINE_ALIASES: Record<string, (typeof CUISINES)[number]> = {
  indochinese: "indo_chinese", chinese_indian: "indo_chinese", indian_chinese: "indo_chinese",
  asian: "pan_asian", panasian: "pan_asian", asian_fusion: "pan_asian",
  lebanese: "lebanese_mediterranean", mediterranean: "lebanese_mediterranean", middle_eastern: "lebanese_mediterranean",
  greek: "lebanese_mediterranean", turkish: "lebanese_mediterranean",
  european: "continental", french: "continental", western: "continental", english: "continental", spanish: "continental",
  north_indian: "indian", south_indian: "indian", mughlai: "indian",
  tex_mex: "mexican", fast_food: "american",
};

const DIET_ALIASES: Record<string, (typeof DIETS)[number]> = {
  vegetarian: "veg", vegan: "veg", jain: "veg", pure_veg: "veg",
  eggetarian: "egg", contains_egg: "egg", eggs: "egg",
  nonveg: "non_veg", non_vegetarian: "non_veg", nonvegetarian: "non_veg", meat: "non_veg", chicken: "non_veg", seafood: "non_veg",
};

const DIET_SOURCE_ALIASES: Record<string, (typeof DIET_SOURCES)[number]> = {
  marker: "menu_marker", symbol: "menu_marker", menu_symbol: "menu_marker",
  text: "menu_text", description: "menu_text", menu: "menu_text",
};

const ALLERGEN_ALIASES: Record<string, (typeof ALLERGENS)[number]> = {
  peanut: "peanuts", nuts: "tree_nuts", nut: "tree_nuts", tree_nut: "tree_nuts", cashew: "tree_nuts", almond: "tree_nuts",
  milk: "dairy", lactose: "dairy", cheese: "dairy", wheat: "gluten", eggs: "egg", soya: "soy", sesame_seeds: "sesame",
  shrimp: "shellfish", prawn: "shellfish", prawns: "shellfish", crustaceans: "shellfish", crustacean: "shellfish", crab: "shellfish",
};

const HEAVINESS_ALIASES: Record<string, (typeof HEAVINESS)[number]> = {
  heavy: "indulgent", rich: "indulgent", filling: "indulgent", medium: "balanced", moderate: "balanced", lite: "light",
};

const CONFIDENCE_ALIASES: Record<string, (typeof CONFIDENCE)[number]> = { med: "medium", moderate: "medium" };

const LEGIBILITY_ALIASES: Record<string, (typeof LEGIBILITY)[number]> = {
  clear: "good", readable: "good", high: "good", medium: "partial", fair: "partial", low: "poor", bad: "poor", unreadable: "poor",
};

function coerceDish(raw: unknown): Rec | null {
  if (!isRec(raw)) return null;
  const name = text(raw.name) ?? text(raw.dish) ?? text(raw.title);
  if (!name) return null;

  const variants = list(raw.price_variants)
    .filter(isRec)
    .map((variant) => ({ label: text(variant.label) ?? text(variant.size) ?? text(variant.name), price: number(variant.price) }))
    .filter((variant): variant is { label: string; price: number } => Boolean(variant.label) && variant.price !== null);
  const price = number(raw.price) ?? (variants.length > 0 ? Math.min(...variants.map((variant) => variant.price)) : null);

  const flavorRaw = isRec(raw.flavor) ? raw.flavor : isRec(raw.flavour) ? raw.flavour : {};
  const flavor = Object.fromEntries(FLAVOR_KEYS.map((key) => [key, number(flavorRaw[key]) ?? 0]));

  const allergens = [
    ...new Set(
      list(raw.likely_allergens)
        .map((item) => {
          const key = slug(item);
          return (ALLERGENS as readonly string[]).includes(key) ? key : ALLERGEN_ALIASES[key];
        })
        .filter(Boolean),
    ),
  ];

  const printed = text(raw.printed_description);
  return {
    name,
    canonical_name: text(raw.canonical_name) ?? name,
    section: text(raw.section),
    course: pick(raw.course, COURSES, COURSE_ALIASES, "other"),
    cuisine: pick(raw.cuisine, CUISINES, CUISINE_ALIASES, "other"),
    price,
    price_variants: variants,
    printed_description: printed,
    diet: pick(raw.diet, DIETS, DIET_ALIASES, "unknown"),
    diet_source: pick(raw.diet_source, DIET_SOURCES, DIET_SOURCE_ALIASES, "inferred"),
    contains_onion_garlic: flag(raw.contains_onion_garlic),
    key_ingredients: list(raw.key_ingredients).map(text).filter((item): item is string => Boolean(item)),
    likely_allergens: allergens,
    spice: number(raw.spice) ?? 0,
    flavor,
    heaviness: pick(raw.heaviness, HEAVINESS, HEAVINESS_ALIASES, "balanced"),
    taste_overview: text(raw.taste_overview) ?? text(raw.description) ?? printed ?? "",
    familiar_comparison: text(raw.familiar_comparison),
    india_style_note: text(raw.india_style_note),
    confidence: pick(raw.confidence, CONFIDENCE, CONFIDENCE_ALIASES, "medium"),
    confidence_reason: text(raw.confidence_reason),
  };
}

/** Best-effort reshape of a free model's answer into the menu-page shape. */
export function coercePage(raw: unknown): unknown {
  let page: unknown = raw;
  if (Array.isArray(page)) page = { dishes: page };
  if (isRec(page) && !("dishes" in page)) {
    const inner = Object.values(page).find((value) => isRec(value) && "dishes" in value);
    if (inner) page = inner; // e.g. { "record_menu": { ... } }
  }
  if (!isRec(page)) return raw;

  const dishes = list(page.dishes ?? page.items).map(coerceDish).filter((dish): dish is Rec => dish !== null);
  const isMenu = flag(page.is_menu) ?? dishes.length > 0;
  return {
    is_menu: isMenu,
    restaurant_name: text(page.restaurant_name) ?? text(page.restaurant),
    legibility: page.legibility === undefined ? "good" : pick(page.legibility, LEGIBILITY, LEGIBILITY_ALIASES, "partial"),
    notes: text(page.notes),
    dishes: isMenu ? dishes : [],
  };
}
