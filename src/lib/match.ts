/**
 * Dish matching — pure functions, run on the client so changing the mood
 * re-ranks instantly without another AI call.
 */

import { SYNONYMS, FLAVOR_SHORT, ALLERGY_LABEL, NOT_A_HIT, type FlavorId } from "@/lib/taste";
import type { Allergen, Dish, DishData, Feedback, TastePreference } from "@/lib/types";

/** Every tunable number in one place. */
export const MATCH_TUNING = {
  base: 50,
  flavorWeight: 35,
  overHeatPenaltyPerLevel: 15,
  spicyLoverBonus: 10,
  hotForNonSpicyPenalty: 5,
  hotThreshold: 3,
  heavinessMatch: 8,
  heavinessClash: 8,
  dislikePenalty: 30,
  lovedBonus: 20,
  notForMePenalty: 40,
  learnedCuisineBonus: 5,
  learnedCuisineMinLoved: 2,
  lowConfidencePenalty: 5,
  reasonFlavorMin: 2,
  maxReasons: 3,
  forYouMinScore: 60,
  forYouMax: 5,
  forYouFallback: 3,
} as const;

const ROOT_VEGETABLES = ["potato", "onion", "garlic", "ginger", "carrot", "beetroot", "radish"];

/** Words that reveal an allergen in ingredient text, beyond the allergen list itself. */
const ALLERGEN_TERMS: Record<Allergen, string[]> = {
  peanuts: ["peanut", "peanuts", "groundnut"],
  tree_nuts: ["cashew", "almond", "walnut", "pine nut", "pine nuts", "pistachio", "hazelnut", "pesto"],
  dairy: ["milk", "cream", "cheese", "butter", "paneer", "mozzarella", "parmesan", "burrata", "ricotta", "mascarpone", "ghee", "yogurt"],
  gluten: ["wheat", "flour", "bread", "breadcrumbs", "semolina"],
  egg: ["egg", "eggs", "mayo", "mayonnaise"],
  soy: ["soy", "soya", "tofu", "edamame"],
  sesame: ["sesame", "tahini"],
  shellfish: ["prawn", "prawns", "shrimp", "crab", "lobster", "clams", "mussels"],
  fish: ["fish", "salmon", "tuna", "anchovy", "anchovies"],
};

export type Mood = { flavors?: FlavorId[]; spice?: number };

export type MatchWarning = {
  kind: "heat" | "dislike" | "allergy" | "diet_unknown" | "guess";
  text: string;
};

export type ScoreLine = { label: string; delta: number };

export type MatchResult = {
  score: number;
  excluded: boolean;
  excludedReason: string | null;
  reasons: string[];
  warnings: MatchWarning[];
  /** Everything that moved the score, for the "Why this score" panel. */
  breakdown: ScoreLine[];
};

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Singular/plural variants, so "mushrooms" finds "mushroom" and "egg" finds "eggs". */
function variants(term: string): string[] {
  const t = term.toLowerCase().trim();
  const out = new Set([t]);
  if (t.endsWith("s")) out.add(t.slice(0, -1));
  else out.add(`${t}s`);
  return [...out];
}

/** Whole-word match: "egg" hits "egg noodles" but never "eggplant". */
export function containsWord(haystack: string, term: string): boolean {
  const text = haystack.toLowerCase();
  return variants(term).some((variant) =>
    new RegExp(`(^|[^\\p{L}])${escapeRegExp(variant)}(?=$|[^\\p{L}])`, "u").test(text),
  );
}

/** The term plus everything the synonym table says means the same thing. */
export function expandTerm(term: string): string[] {
  const key = term.toLowerCase();
  return [key, ...(SYNONYMS[key] ?? [])];
}

export function mentions(haystack: string, term: string): boolean {
  let text = haystack.toLowerCase();
  for (const phrase of NOT_A_HIT[term.toLowerCase()] ?? []) text = text.split(phrase).join(" ");
  return expandTerm(term).some((candidate) => containsWord(text, candidate));
}

function dishText(dish: DishData): string {
  return [
    dish.key_ingredients.join(" | "),
    dish.name,
    dish.canonical_name,
    dish.printed_description ?? "",
  ].join(" | ");
}

function allergenHit(dish: DishData, allergen: Allergen): boolean {
  if (dish.likely_allergens.includes(allergen)) return true;
  const ingredients = dish.key_ingredients.join(" | ");
  return ALLERGEN_TERMS[allergen].some((term) => containsWord(ingredients, term));
}

// ---------------------------------------------------------------------------
// Diet
// ---------------------------------------------------------------------------

function dietExclusion(dish: DishData, prefs: TastePreference): string | null {
  const { diet } = prefs;
  const vegLike = diet === "veg" || diet === "vegan" || diet === "jain";

  if (vegLike || diet === "eggetarian") {
    if (dish.diet === "non_veg") return "Non-veg";
  }
  if (vegLike && dish.diet === "egg") return "Contains egg";

  if (diet === "vegan") {
    if (dish.likely_allergens.includes("dairy")) return "Has dairy — not vegan";
    if (dish.likely_allergens.includes("egg")) return "Has egg — not vegan";
  }

  if (diet === "jain") {
    if (dish.contains_onion_garlic === true) return "Onion / garlic — not Jain";
    const root = ROOT_VEGETABLES.find((veg) => containsWord(dish.key_ingredients.join(" | "), veg));
    if (root) return `Contains ${root} — not Jain`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function scoreDish(
  dish: Dish,
  prefs: TastePreference,
  feedback: Feedback[] = [],
  mood?: Mood,
): MatchResult {
  const T = MATCH_TUNING;
  const warnings: MatchWarning[] = [];
  const breakdown: ScoreLine[] = [];
  let excludedReason: string | null = null;

  // --- Hard exclusions -----------------------------------------------------
  const dietReason = dietExclusion(dish, prefs);
  if (dietReason) excludedReason = dietReason;

  if (dish.diet === "unknown" && ["veg", "vegan", "jain"].includes(prefs.diet)) {
    warnings.push({ kind: "diet_unknown", text: "Check if veg" });
  }

  for (const allergen of prefs.allergies) {
    if (allergenHit(dish, allergen)) {
      const text = `Contains ${ALLERGY_LABEL[allergen].toLowerCase()} — allergy`;
      warnings.push({ kind: "allergy", text });
      // An allergy is the most important thing to say, so it wins the reason.
      excludedReason = text;
    }
  }

  // --- Score ---------------------------------------------------------------
  let score = T.base;
  const liked: FlavorId[] = mood?.flavors?.length ? mood.flavors : prefs.flavors;
  const tolerance = mood?.spice ?? prefs.spiceTolerance;

  if (liked.length > 0) {
    const total = liked.reduce((acc, flavor) => acc + (dish.flavor[flavor] ?? 0), 0);
    const fit = Math.min(1, Math.max(0, total / (3 * Math.min(liked.length, 3))));
    const delta = Math.round(T.flavorWeight * fit);
    score += delta;
    if (delta > 0) breakdown.push({ label: "Flavour fit", delta });
  }

  const over = dish.spice - tolerance;
  if (over > 0) {
    const delta = -T.overHeatPenaltyPerLevel * over;
    score += delta;
    breakdown.push({ label: `Hotter than your ${tolerance}/5`, delta });
    warnings.push({
      kind: "heat",
      text: `Hotter than you like (${dish.spice}/5 vs your ${tolerance})`,
    });
  } else if (liked.includes("spicy")) {
    const delta = Math.round((T.spicyLoverBonus * dish.spice) / Math.max(tolerance, 1));
    score += delta;
    if (delta > 0) breakdown.push({ label: "Heat you enjoy", delta });
  } else if (dish.spice >= T.hotThreshold) {
    score -= T.hotForNonSpicyPenalty;
    breakdown.push({ label: "Spicy, and you didn't ask for heat", delta: -T.hotForNonSpicyPenalty });
  }

  if (dish.heaviness === prefs.heaviness) {
    score += T.heavinessMatch;
    breakdown.push({ label: `${capitalise(dish.heaviness)}, like you prefer`, delta: T.heavinessMatch });
  } else if (
    (dish.heaviness === "light" && prefs.heaviness === "indulgent") ||
    (dish.heaviness === "indulgent" && prefs.heaviness === "light")
  ) {
    score -= T.heavinessClash;
    breakdown.push({ label: `Too ${dish.heaviness} for you`, delta: -T.heavinessClash });
  }

  const text = dishText(dish);
  for (const dislike of prefs.dislikes) {
    if (mentions(text, dislike)) {
      score -= T.dislikePenalty;
      breakdown.push({ label: `Contains ${dislike}`, delta: -T.dislikePenalty });
      warnings.push({ kind: "dislike", text: `Contains ${dislike}` });
    }
  }

  const verdict = feedback.find((entry) => entry.slug === dish.slug)?.verdict;
  if (verdict === 1) {
    score += T.lovedBonus;
    breakdown.push({ label: "You loved this before", delta: T.lovedBonus });
  } else if (verdict === -1) {
    score -= T.notForMePenalty;
    breakdown.push({ label: "You said 'not for me'", delta: -T.notForMePenalty });
  }

  const lovedSameCuisine = feedback.filter(
    (entry) => entry.verdict === 1 && entry.cuisine === dish.cuisine,
  ).length;
  if (lovedSameCuisine >= T.learnedCuisineMinLoved) {
    score += T.learnedCuisineBonus;
    breakdown.push({ label: "A cuisine you keep loving", delta: T.learnedCuisineBonus });
  }

  if (dish.confidence === "low") {
    score -= T.lowConfidencePenalty;
    breakdown.push({ label: "AI is guessing", delta: -T.lowConfidencePenalty });
    warnings.push({ kind: "guess", text: "Guess" });
  }

  // --- Reasons -------------------------------------------------------------
  const flavorReasons = liked
    .filter((flavor) => (dish.flavor[flavor] ?? 0) >= T.reasonFlavorMin)
    .sort((a, b) => (dish.flavor[b] ?? 0) - (dish.flavor[a] ?? 0))
    .map((flavor) => FLAVOR_SHORT[flavor]);

  const tail = [
    over <= 0 ? `fits your heat (${dish.spice}/5)` : null,
    verdict === 1 ? "you loved this before" : null,
  ].filter((value): value is string => Boolean(value));

  const reasons = [...flavorReasons.slice(0, Math.max(0, T.maxReasons - tail.length)), ...tail];

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    excluded: excludedReason !== null,
    excludedReason,
    reasons,
    warnings,
    breakdown,
  };
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export type ScoredDish = { dish: Dish; match: MatchResult };

export function rankDishes(
  dishes: Dish[],
  prefs: TastePreference,
  feedback: Feedback[] = [],
  mood?: Mood,
): ScoredDish[] {
  return dishes
    .map((dish) => ({ dish, match: scoreDish(dish, prefs, feedback, mood) }))
    .sort((a, b) => b.match.score - a.match.score || a.dish.position - b.dish.position);
}

export function pickForYou(ranked: ScoredDish[]): {
  label: "Picked for you" | "Closest matches";
  items: ScoredDish[];
} {
  const T = MATCH_TUNING;
  const eligible = ranked.filter((entry) => !entry.match.excluded && entry.dish.course !== "drink");
  const strong = eligible.filter((entry) => entry.match.score >= T.forYouMinScore);

  if (strong.length >= T.forYouFallback) {
    return { label: "Picked for you", items: strong.slice(0, T.forYouMax) };
  }
  return { label: "Closest matches", items: eligible.slice(0, T.forYouFallback) };
}

export function isHeadsUp(match: MatchResult): boolean {
  return match.warnings.some((warning) => warning.kind === "dislike" || warning.kind === "allergy");
}
