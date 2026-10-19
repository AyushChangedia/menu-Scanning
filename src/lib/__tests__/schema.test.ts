import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { MenuPageSchema, repairPage, spicyFlavorFor, MenuPageOutputSchema } from "@/lib/ai/schema";
import { ITALIAN_PAGE, PAN_ASIAN_PAGE_1, PAN_ASIAN_PAGE_2 } from "@/lib/mock/fixtures";
import type { MenuPage } from "@/lib/types";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe("menu schema", () => {
  it("accepts every fixture page", () => {
    for (const page of [ITALIAN_PAGE, PAN_ASIAN_PAGE_1, PAN_ASIAN_PAGE_2]) {
      const result = MenuPageSchema.safeParse(page);
      assert.ok(result.success, result.success ? "" : JSON.stringify(result.error.issues.slice(0, 3)));
    }
  });

  it("requires confidence_reason when confidence isn't high", () => {
    const page = clone(PAN_ASIAN_PAGE_2);
    const guess = page.dishes.find((dish) => dish.confidence === "low")!;
    guess.confidence_reason = null;
    const result = MenuPageSchema.safeParse(page);
    assert.equal(result.success, false);
    assert.ok(!result.success && result.error.issues.some((issue) => issue.path.includes("confidence_reason")));
  });

  it("rejects spice 6", () => {
    const page = clone(ITALIAN_PAGE);
    page.dishes[0].spice = 6;
    assert.equal(MenuPageSchema.safeParse(page).success, false);
  });

  it("matches the app's own MenuPage type", () => {
    const parsed: MenuPage = MenuPageSchema.parse(ITALIAN_PAGE);
    assert.equal(parsed.dishes.length, ITALIAN_PAGE.dishes.length);
  });
});

describe("repairPage", () => {
  it("fixes small slips so a page validates without a second API call", () => {
    const page = clone(ITALIAN_PAGE);
    const dish = page.dishes[0];
    dish.spice = 7;
    dish.taste_overview = "x".repeat(300);
    dish.key_ingredients = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    dish.confidence = "low";
    dish.confidence_reason = null;
    dish.flavor.spicy = 0;
    const raw = MenuPageOutputSchema.parse({ ...page, restaurant_name: "  Klinq  " });

    const repaired = MenuPageSchema.parse(repairPage(raw));
    const fixed = repaired.dishes[0];
    assert.equal(repaired.restaurant_name, "Klinq");
    assert.equal(fixed.spice, 5);
    assert.equal(fixed.flavor.spicy, 3);
    assert.ok(fixed.taste_overview.length <= 240);
    assert.equal(fixed.key_ingredients.length, 8);
    assert.deepEqual(fixed.key_ingredients.slice(0, 2), ["a", "b"]);
    assert.ok(fixed.confidence_reason);
  });

  it("maps spice to the spicy flavour exactly as the prompt says", () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5].map(spicyFlavorFor), [0, 1, 1, 2, 2, 3]);
  });
});
