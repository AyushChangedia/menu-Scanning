/**
 * Taste vocabulary shared by onboarding, the Taste page, the matcher and the
 * AI prompt. Icons live in taste-icons.ts so this file stays importable from
 * plain Node tests.
 */

export const FLAVORS = [
  { id: "spicy", label: "Spicy", hint: "chilli heat" },
  { id: "cheesy", label: "Cheesy", hint: "mozzarella, cheese sauce" },
  { id: "creamy", label: "Creamy", hint: "cream, white sauce, coconut milk" },
  { id: "tangy", label: "Tangy & sour", hint: "tomato, lemon, vinegar, tamarind" },
  { id: "sweet", label: "Sweet", hint: "honey, teriyaki, sweet chilli" },
  { id: "smoky", label: "Smoky & grilled", hint: "charred, BBQ" },
  { id: "garlicky", label: "Garlicky", hint: "garlic-forward" },
  { id: "herby", label: "Herby & fresh", hint: "basil, mint, coriander, lemongrass" },
  { id: "crispy", label: "Crispy", hint: "fried, crunchy, tempura" },
  { id: "umami", label: "Savoury & umami", hint: "soy, parmesan, broth" },
  { id: "saucy", label: "Saucy", hint: "gravy, sauce-heavy" },
  { id: "nutty", label: "Nutty", hint: "peanut, sesame, pesto" },
] as const;

export type FlavorId = (typeof FLAVORS)[number]["id"];

export const FLAVOR_LABEL: Record<FlavorId, string> = Object.fromEntries(
  FLAVORS.map((flavor) => [flavor.id, flavor.label]),
) as Record<FlavorId, string>;

/** Short labels for the "Why" line — "Tangy & sour" reads badly mid-sentence. */
export const FLAVOR_SHORT: Record<FlavorId, string> = {
  spicy: "Spicy",
  cheesy: "Cheesy",
  creamy: "Creamy",
  tangy: "Tangy",
  sweet: "Sweet",
  smoky: "Smoky",
  garlicky: "Garlicky",
  herby: "Herby",
  crispy: "Crispy",
  umami: "Umami",
  saucy: "Saucy",
  nutty: "Nutty",
};

/** Spice anchors — the same table the AI prompt rates against. */
export const SPICE_LEVELS = [
  { level: 0, word: "no heat", anchors: ["Margherita pizza", "Alfredo pasta", "Tiramisu"] },
  { level: 1, word: "a hint", anchors: ["Pad Thai", "Hakka noodles", "Teriyaki chicken"] },
  { level: 2, word: "gentle warmth", anchors: ["Aglio e Olio", "Peri-peri fries", "Veg Manchurian"] },
  { level: 3, word: "properly spicy", anchors: ["Penne Arrabbiata", "Schezwan fried rice", "Thai curry"] },
  { level: 4, word: "hot", anchors: ["Chilli garlic noodles", "Diavola pizza", "Tteokbokki"] },
  { level: 5, word: "very hot", anchors: ["Buldak 'fire' noodles", "Bird's-eye chilli dishes", "Nashville hot chicken"] },
] as const;

export function spiceWord(level: number): string {
  return SPICE_LEVELS[Math.max(0, Math.min(5, level))].word;
}

export const HEAVINESS = ["light", "balanced", "indulgent"] as const;

export const HEAVINESS_META = {
  light: { label: "Light", hint: "Salads, clear soups, sushi, grilled fish" },
  balanced: { label: "Balanced", hint: "A proper meal without the food coma" },
  indulgent: { label: "Indulgent", hint: "Cream, cheese, fried, big portions" },
} as const;

export const DIETS = ["veg", "eggetarian", "non_veg", "vegan", "jain"] as const;

export const DIET_META = {
  veg: { label: "Veg", hint: "No meat, fish or egg" },
  eggetarian: { label: "Eggetarian", hint: "Veg, plus eggs" },
  non_veg: { label: "Non-veg", hint: "Everything's on the table" },
  vegan: { label: "Vegan", hint: "No dairy, egg or meat" },
  jain: { label: "Jain", hint: "Veg, no onion, garlic or root veg" },
} as const;

export const DISLIKE_OPTIONS = [
  "mushrooms", "olives", "capsicum", "jalapeños", "coriander", "onion", "garlic",
  "tofu", "egg", "seafood", "prawns", "raw fish", "pork", "beef", "blue cheese",
  "coconut", "pineapple",
];

export const ALLERGY_OPTIONS = [
  "peanuts", "tree_nuts", "dairy", "gluten", "egg", "soy", "sesame", "shellfish", "fish",
] as const;

export const ALLERGY_LABEL: Record<(typeof ALLERGY_OPTIONS)[number], string> = {
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
  dairy: "Dairy",
  gluten: "Gluten",
  egg: "Egg",
  soy: "Soy",
  sesame: "Sesame",
  shellfish: "Shellfish",
  fish: "Fish",
};

/**
 * One table, unit-tested. Matching is word-boundary based, so "egg" never
 * matches "eggplant".
 */
export const SYNONYMS: Record<string, string[]> = {
  capsicum: ["bell pepper", "bell peppers"],
  coriander: ["cilantro"],
  prawns: ["shrimp", "prawn"],
  "spring onion": ["scallion", "green onion"],
  brinjal: ["eggplant", "aubergine"],
  zucchini: ["courgette"],
  mushrooms: ["mushroom", "funghi", "porcini", "shiitake"],
  olives: ["olive"],
  seafood: ["prawns", "prawn", "shrimp", "fish", "squid", "calamari", "crab", "lobster", "clams", "mussels", "octopus", "tuna", "salmon"],
  "raw fish": ["sashimi", "nigiri", "ceviche", "poke", "tartare"],
  peanuts: ["peanut", "groundnut"],
  tree_nuts: ["cashew", "almond", "walnut", "pine nut", "pine nuts", "pistachio", "hazelnut", "pesto"],
};

/**
 * Phrases that contain a dislike word but aren't that food — "olive oil" is
 * not olives, "coconut oil" barely tastes of coconut.
 */
export const NOT_A_HIT: Record<string, string[]> = {
  olives: ["olive oil"],
  coconut: ["coconut oil"],
  garlic: ["garlic-free", "no garlic"],
  onion: ["onion-free", "no onion"],
};

export const COURSE_LABEL: Record<string, string> = {
  starter: "Starter",
  soup: "Soup",
  salad: "Salad",
  main: "Main",
  pizza: "Pizza",
  pasta: "Pasta",
  rice_noodles: "Rice & noodles",
  sushi: "Sushi",
  burger_sandwich: "Burger / sandwich",
  dessert: "Dessert",
  side: "Side",
  drink: "Drink",
  other: "Other",
};

export const CUISINE_LABEL: Record<string, string> = {
  italian: "Italian",
  chinese: "Chinese",
  indo_chinese: "Indo-Chinese",
  thai: "Thai",
  japanese: "Japanese",
  korean: "Korean",
  pan_asian: "Pan-Asian",
  mexican: "Mexican",
  american: "American",
  continental: "Continental",
  lebanese_mediterranean: "Lebanese",
  indian: "Indian",
  other: "Other",
};
