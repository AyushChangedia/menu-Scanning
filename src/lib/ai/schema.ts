/**
 * The shape Claude returns for one menu page (spec §6.2).
 *
 * Built with the Zod 4 API (`zod/v4`, bundled in zod 3.25) because the
 * Anthropic SDK's structured-output helper expects it. Constraints the API's
 * JSON Schema subset can't express (min/max, lengths, the refinement) are
 * stripped from the request by the SDK and enforced here instead.
 */

import { z } from "zod/v4";

const Flavor = z.number().int().min(0).max(3);

const DishObject = z.object({
  name: z.string(),
  canonical_name: z.string(),
  section: z.string().nullable(),
  course: z.enum(["starter", "soup", "salad", "main", "pizza", "pasta", "rice_noodles", "sushi", "burger_sandwich", "dessert", "side", "drink", "other"]),
  cuisine: z.enum(["italian", "chinese", "indo_chinese", "thai", "japanese", "korean", "pan_asian", "mexican", "american", "continental", "lebanese_mediterranean", "indian", "other"]),
  price: z.number().nullable(),
  price_variants: z.array(z.object({ label: z.string(), price: z.number() })),
  printed_description: z.string().nullable(),
  diet: z.enum(["veg", "egg", "non_veg", "unknown"]),
  diet_source: z.enum(["menu_marker", "menu_text", "inferred"]),
  contains_onion_garlic: z.boolean().nullable(),
  key_ingredients: z.array(z.string()).min(1).max(8),
  likely_allergens: z.array(z.enum(["peanuts", "tree_nuts", "dairy", "gluten", "egg", "soy", "sesame", "shellfish", "fish"])),
  spice: z.number().int().min(0).max(5),
  flavor: z.object({
    spicy: Flavor, cheesy: Flavor, creamy: Flavor, tangy: Flavor, sweet: Flavor, smoky: Flavor,
    garlicky: Flavor, herby: Flavor, crispy: Flavor, umami: Flavor, saucy: Flavor, nutty: Flavor,
  }),
  heaviness: z.enum(["light", "balanced", "indulgent"]),
  taste_overview: z.string().max(240),
  familiar_comparison: z.string().max(120).nullable(),
  india_style_note: z.string().max(160).nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  confidence_reason: z.string().nullable(),
});

export const DishSchema = DishObject.superRefine((dish, ctx) => {
  if (dish.confidence !== "high" && !dish.confidence_reason) {
    ctx.addIssue({ code: "custom", path: ["confidence_reason"], message: "required when confidence is not high" });
  }
});

export const MenuPageSchema = z.object({
  is_menu: z.boolean(),
  restaurant_name: z.string().nullable(),
  legibility: z.enum(["good", "partial", "poor"]),
  notes: z.string().nullable(),
  dishes: z.array(DishSchema),
});

/**
 * What the API is asked to produce: the same fields and enums, but no numeric,
 * length or array-size limits. The SDK validates the reply against this schema
 * and throws on any miss, so the limits are applied afterwards by repairPage
 * and MenuPageSchema instead of costing a whole failed request.
 */
const LooseDish = DishObject.extend({
  key_ingredients: z.array(z.string()),
  spice: z.number(),
  flavor: z.object(Object.fromEntries(Object.keys(DishObject.shape.flavor.shape).map((key) => [key, z.number()]))) as unknown as z.ZodObject<
    Record<keyof typeof DishObject.shape.flavor.shape, z.ZodNumber>
  >,
  taste_overview: z.string(),
  familiar_comparison: z.string().nullable(),
  india_style_note: z.string().nullable(),
});

export const MenuPageOutputSchema = z.object({
  is_menu: z.boolean(),
  restaurant_name: z.string().nullable(),
  legibility: z.enum(["good", "partial", "poor"]),
  notes: z.string().nullable(),
  dishes: z.array(LooseDish),
});

export type MenuPageOutput = z.infer<typeof MenuPageSchema>;

/** spice 0 → 0, 1–2 → 1, 3–4 → 2, 5 → 3 (the rule the prompt states). */
export function spicyFlavorFor(spice: number): number {
  if (spice <= 0) return 0;
  if (spice <= 2) return 1;
  if (spice <= 4) return 2;
  return 3;
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Fixes small, safe deviations before strict validation, so a too-long
 * sentence doesn't cost a second API call: clips text to its limit, clamps
 * numbers into range, caps ingredients at 8, applies the spice→spicy rule,
 * and gives a guessed dish a reason. Anything else still fails validation.
 */
export function repairPage(page: z.infer<typeof MenuPageOutputSchema>): unknown {
  return {
    ...page,
    restaurant_name: page.restaurant_name?.trim() || null,
    dishes: page.dishes.map((dish) => {
      const spice = clampInt(dish.spice, 0, 5);
      const flavor = Object.fromEntries(
        Object.entries(dish.flavor).map(([key, value]) => [key, clampInt(value, 0, 3)]),
      ) as typeof dish.flavor;
      flavor.spicy = spicyFlavorFor(spice);
      const ingredients = dish.key_ingredients.map((item) => item.trim().toLowerCase()).filter(Boolean).slice(0, 8);
      return {
        ...dish,
        spice,
        flavor,
        key_ingredients: ingredients.length > 0 ? ingredients : [dish.canonical_name.toLowerCase()],
        taste_overview: clip(dish.taste_overview, 240),
        familiar_comparison: dish.familiar_comparison ? clip(dish.familiar_comparison, 120) : null,
        india_style_note: dish.india_style_note ? clip(dish.india_style_note, 160) : null,
        confidence_reason:
          dish.confidence !== "high" && !dish.confidence_reason ? "The menu doesn't say much about this dish." : dish.confidence_reason,
      };
    }),
  };
}
