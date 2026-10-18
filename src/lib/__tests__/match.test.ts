import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { containsWord, mentions, pickForYou, rankDishes, scoreDish } from "@/lib/match";
import { ITALIAN_PAGE, PAN_ASIAN_PAGE_1, PAN_ASIAN_PAGE_2 } from "@/lib/mock/fixtures";
import { mergeDuplicates, toDishes } from "@/lib/merge";
import { EMPTY_PREFS } from "@/lib/mock/data";
import type { Dish, TastePreference } from "@/lib/types";

const ALL: Dish[] = [
  ...toDishes("t", 0, ITALIAN_PAGE.dishes),
  ...toDishes("t", 1, PAN_ASIAN_PAGE_1.dishes),
  ...toDishes("t", 2, PAN_ASIAN_PAGE_2.dishes),
];

const byName = (name: string) => {
  const dish = ALL.find((entry) => entry.name === name);
  assert.ok(dish, `fixture ${name} missing`);
  return dish;
};

const prefs = (patch: Partial<TastePreference>): TastePreference => ({ ...EMPTY_PREFS, ...patch });

describe("match", () => {
  it("never puts non-veg or egg dishes in For you for a veg user", () => {
    const picks = pickForYou(rankDishes(ALL, prefs({ diet: "veg", flavors: ["spicy", "cheesy"] })));
    assert.ok(picks.items.length > 0);
    for (const { dish } of picks.items) assert.ok(dish.diet !== "non_veg" && dish.diet !== "egg", dish.name);
  });

  it("excludes an allergy hit and says why", () => {
    const result = scoreDish(byName("Chicken Satay"), prefs({ allergies: ["peanuts"] }));
    assert.equal(result.excluded, true);
    assert.match(result.excludedReason ?? "", /peanuts/);
    assert.ok(result.warnings.some((warning) => warning.kind === "allergy"));
  });

  it("does not let an 'egg' dislike hit 'eggplant'", () => {
    assert.equal(containsWord("grilled eggplant, basil", "egg"), false);
    assert.equal(containsWord("egg noodles", "egg"), true);
    assert.equal(containsWord("two eggs", "egg"), true);
  });

  it("maps capsicum to bell pepper", () => {
    assert.equal(mentions("roasted red bell pepper", "capsicum"), true);
    assert.equal(mentions("chilli garlic noodles with capsicum", "capsicum"), true);
  });

  it("ranks a dish over the user's heat below one within it", () => {
    const user = prefs({ flavors: ["garlicky"], spiceTolerance: 2 });
    const hot = scoreDish(byName("Chilli Garlic Hakka Noodles"), user);
    const mild = scoreDish(byName("Spaghetti Aglio, Olio e Peperoncino"), user);
    assert.ok(mild.score > hot.score, `${mild.score} vs ${hot.score}`);
    assert.ok(hot.warnings.some((warning) => warning.kind === "heat"));
  });

  it("re-ranks when the mood changes", () => {
    const user = prefs({ flavors: ["creamy", "cheesy"], spiceTolerance: 5 });
    const saved = rankDishes(ALL, user)[0].dish.name;
    const spicy = rankDishes(ALL, user, [], { flavors: ["spicy"], spice: 5 })[0].dish.name;
    assert.notEqual(saved, spicy);
  });

  it("is deterministic", () => {
    const user = prefs({ flavors: ["tangy", "herby"], dislikes: ["mushrooms"] });
    assert.deepEqual(rankDishes(ALL, user), rankDishes(ALL, user));
  });

  it("penalises dislikes found through synonyms", () => {
    const result = scoreDish(byName("Crystal Veg Dumplings"), prefs({ dislikes: ["mushrooms"] }));
    assert.ok(result.warnings.some((warning) => warning.text === "Contains mushrooms"));
  });

  it("marks low-confidence dishes as a guess", () => {
    const result = scoreDish(byName("Volcano Bowl"), prefs({ diet: "veg" }));
    assert.ok(result.warnings.some((warning) => warning.kind === "guess"));
    assert.ok(result.warnings.some((warning) => warning.kind === "diet_unknown"));
    assert.equal(result.excluded, false);
  });
});

describe("merge", () => {
  it("collapses the same dish photographed on two pages", () => {
    const pageA = toDishes("m", 0, ITALIAN_PAGE.dishes);
    const pageB = toDishes("m", 1, ITALIAN_PAGE.dishes.slice(0, 3));
    const merged = mergeDuplicates([...pageA, ...pageB]);
    assert.equal(merged.length, ITALIAN_PAGE.dishes.length);
    assert.ok(merged.every((dish) => dish.pageIndex === 0));
  });
});

describe("fixtures", () => {
  it("cover every diet and spice level, plus a guess and price variants", () => {
    assert.deepEqual(new Set(ALL.map((dish) => dish.diet)), new Set(["veg", "egg", "non_veg", "unknown"]));
    assert.deepEqual(new Set(ALL.map((dish) => dish.spice)), new Set([0, 1, 2, 3, 4, 5]));
    assert.ok(ALL.some((dish) => dish.confidence === "low"));
    assert.ok(ALL.some((dish) => dish.price_variants.length > 1));
    for (const dish of ALL) {
      if (dish.confidence !== "high") assert.ok(dish.confidence_reason, `${dish.name} needs a reason`);
      assert.ok(dish.taste_overview.length <= 240, dish.name);
    }
  });
});

describe("dislike exceptions", () => {
  it("doesn't treat olive oil as olives", () => {
    assert.equal(mentions("tomato, mozzarella, olive oil", "olives"), false);
    assert.equal(mentions("kalamata olives, feta", "olives"), true);
  });
});

describe("mood and score breakdown", () => {
  it("treats an empty mood as 'no flavour preference tonight'", () => {
    const user = prefs({ flavors: ["garlicky"] });
    const dish = byName("Spaghetti Aglio, Olio e Peperoncino");
    assert.ok(scoreDish(dish, user).breakdown.some((line) => line.label === "Flavour fit"));
    assert.ok(!scoreDish(dish, user, [], { flavors: [] }).breakdown.some((line) => line.label === "Flavour fit"));
  });

  it("explains a capped score so the lines add up", () => {
    const dish = byName("Korean Fire Chicken");
    const user = prefs({ flavors: ["spicy"], spiceTolerance: 5, heaviness: "indulgent" });
    const loved = [{ slug: dish.slug, verdict: 1 as const, name: dish.name, cuisine: dish.cuisine, createdAt: "2026-10-01T00:00:00Z" }];
    const result = scoreDish(dish, user, loved);
    assert.equal(result.score, 100);
    assert.ok(result.breakdown.some((line) => line.label === "Capped at 100"));
    assert.equal(50 + result.breakdown.reduce((sum, line) => sum + line.delta, 0), result.score);
  });
});
