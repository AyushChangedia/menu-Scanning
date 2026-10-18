import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_FILTERS, applyFilters } from "@/components/scan/filters";
import { rankDishes } from "@/lib/match";
import { ITALIAN_PAGE } from "@/lib/mock/fixtures";
import { toDishes } from "@/lib/merge";
import { EMPTY_PREFS } from "@/lib/mock/data";

const ranked = rankDishes(toDishes("f", 0, ITALIAN_PAGE.dishes), EMPTY_PREFS);

describe("menu filters", () => {
  it("hides drinks by default", () => {
    assert.ok(applyFilters(ranked, DEFAULT_FILTERS, "").every((entry) => entry.dish.course !== "drink"));
  });

  it("shows drinks when Drink is picked as a course, even with Hide drinks on", () => {
    const drinks = applyFilters(ranked, { ...DEFAULT_FILTERS, courses: ["drink"] }, "");
    assert.ok(drinks.length > 0);
    assert.ok(drinks.every((entry) => entry.dish.course === "drink"));
  });

  it("searches ingredients as well as names", () => {
    assert.ok(applyFilters(ranked, DEFAULT_FILTERS, "mascarpone").some((entry) => entry.dish.name === "Tiramisù"));
  });
});
