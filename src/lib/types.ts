import type { FlavorId } from "@/lib/taste";

export type Course =
  | "starter" | "soup" | "salad" | "main" | "pizza" | "pasta" | "rice_noodles"
  | "sushi" | "burger_sandwich" | "dessert" | "side" | "drink" | "other";

export type Cuisine =
  | "italian" | "chinese" | "indo_chinese" | "thai" | "japanese" | "korean"
  | "pan_asian" | "mexican" | "american" | "continental"
  | "lebanese_mediterranean" | "indian" | "other";

export type DishDiet = "veg" | "egg" | "non_veg" | "unknown";
export type Allergen =
  | "peanuts" | "tree_nuts" | "dairy" | "gluten" | "egg" | "soy" | "sesame" | "shellfish" | "fish";
export type Heaviness = "light" | "balanced" | "indulgent";
export type Diet = "veg" | "eggetarian" | "non_veg" | "vegan" | "jain";

/** One dish as the AI would describe it (mirrors DishSchema in the spec). */
export type DishData = {
  name: string;
  canonical_name: string;
  section: string | null;
  course: Course;
  cuisine: Cuisine;
  price: number | null;
  price_variants: { label: string; price: number }[];
  printed_description: string | null;
  diet: DishDiet;
  diet_source: "menu_marker" | "menu_text" | "inferred";
  contains_onion_garlic: boolean | null;
  key_ingredients: string[];
  likely_allergens: Allergen[];
  spice: number;
  flavor: Record<FlavorId, number>;
  heaviness: Heaviness;
  taste_overview: string;
  familiar_comparison: string | null;
  india_style_note: string | null;
  confidence: "high" | "medium" | "low";
  confidence_reason: string | null;
};

export type MenuPage = {
  is_menu: boolean;
  restaurant_name: string | null;
  legibility: "good" | "partial" | "poor";
  notes: string | null;
  dishes: DishData[];
};

export type Dish = DishData & {
  id: string;
  slug: string;
  pageIndex: number;
  position: number;
};

export type PageStatus = "pending" | "done" | "failed" | "not_menu";

export type ScanPageState = {
  index: number;
  status: PageStatus;
  error?: string;
  /** Why it failed, for choosing the fix (e.g. "invite_required"). */
  code?: string;
  /** The name printed on this page, if any. */
  restaurantName?: string | null;
  notes?: string | null;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type ScanStatus = "processing" | "ready" | "partial" | "failed";

export type Scan = {
  id: string;
  restaurantName: string | null;
  cuisines: Cuisine[];
  pageCount: number;
  status: ScanStatus;
  /** Object URL or data URL of page 1, or null for the drawn placeholder. */
  thumbnail: string | null;
  createdAt: string;
  pages: ScanPageState[];
  dishes: Dish[];
  /** "ai" = read by AI; "demo" = sample menus because AI isn't connected. */
  source?: "ai" | "demo";
  /** Set once the diner renames the scan, so page results don't overwrite it. */
  customName?: boolean;
};

export type TastePreference = {
  flavors: FlavorId[];
  spiceTolerance: number;
  heaviness: Heaviness;
  diet: Diet;
  dislikes: string[];
  allergies: Allergen[];
};

export type Feedback = {
  slug: string;
  verdict: 1 | -1;
  name: string;
  cuisine: Cuisine;
  createdAt: string;
};
