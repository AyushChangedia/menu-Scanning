import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { coercePage, extractJson } from "@/lib/ai/coerce";
import { finishPage } from "@/lib/ai/shared";
import { ITALIAN_PAGE } from "@/lib/mock/fixtures";

describe("extractJson", () => {
  it("reads plain JSON", () => {
    assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  });

  it("reads JSON inside code fences, after chatter and thinking", () => {
    const reply = '<think>Let me look at the menu…</think>\nHere is the menu:\n```json\n{"is_menu": true, "dishes": [],}\n```\nHope this helps!';
    assert.deepEqual(extractJson(reply), { is_menu: true, dishes: [] });
  });

  it("returns undefined when there's no JSON", () => {
    assert.equal(extractJson("Sorry, I can't read this image."), undefined);
    assert.equal(extractJson(""), undefined);
  });
});

describe("coercePage", () => {
  it("passes a well-formed page through unchanged in meaning", () => {
    const result = finishPage(coercePage(JSON.parse(JSON.stringify(ITALIAN_PAGE))));
    assert.ok(result.ok);
    assert.equal(result.page.dishes.length, ITALIAN_PAGE.dishes.length);
    assert.deepEqual(result.page.dishes[0], ITALIAN_PAGE.dishes[0]);
  });

  it("fixes the slips free models make", () => {
    const messy = {
      record_menu: {
        is_menu: "yes",
        restaurant_name: "  Klinq ",
        dishes: [
          {
            name: "Firecracker Paneer",
            course: "Starters",
            cuisine: "Indo-Chinese",
            price: "₹ 1,250",
            diet: "Vegetarian",
            diet_source: "marker",
            key_ingredients: "Paneer, red chilli, garlic",
            likely_allergens: ["Milk", "nuts", "mystery"],
            spice: "4",
            flavour: { spicy: 2, crispy: "2" },
            heaviness: "Heavy",
            taste_overview: "Crispy paneer in a hot, sticky glaze.",
            confidence: "Medium",
          },
          { name: "", course: "main" },
          "not a dish",
          {
            dish: "Cold Brew Tonic",
            course: "Beverages",
            diet: "Non-Veg",
            price_variants: [{ size: "Regular", price: "260" }, { label: "Large", price: 320 }],
          },
        ],
      },
    };

    const result = finishPage(coercePage(messy));
    assert.ok(result.ok, result.ok ? "" : result.feedback);
    const { page } = result;
    assert.equal(page.restaurant_name, "Klinq");
    assert.equal(page.is_menu, true);
    assert.equal(page.legibility, "good");
    assert.equal(page.dishes.length, 2);

    const [paneer, brew] = page.dishes;
    assert.equal(paneer.course, "starter");
    assert.equal(paneer.cuisine, "indo_chinese");
    assert.equal(paneer.price, 1250);
    assert.equal(paneer.diet, "veg");
    assert.equal(paneer.diet_source, "menu_marker");
    assert.deepEqual(paneer.key_ingredients, ["paneer", "red chilli", "garlic"]);
    assert.deepEqual(paneer.likely_allergens, ["dairy", "tree_nuts"]);
    assert.equal(paneer.spice, 4);
    assert.equal(paneer.flavor.spicy, 2);
    assert.equal(paneer.flavor.crispy, 2);
    assert.equal(paneer.flavor.sweet, 0);
    assert.equal(paneer.heaviness, "indulgent");
    assert.equal(paneer.confidence, "medium");
    assert.ok(paneer.confidence_reason);

    assert.equal(brew.name, "Cold Brew Tonic");
    assert.equal(brew.course, "drink");
    assert.equal(brew.diet, "non_veg");
    assert.equal(brew.price, 260);
    assert.deepEqual(brew.price_variants, [
      { label: "Regular", price: 260 },
      { label: "Large", price: 320 },
    ]);
    assert.deepEqual(brew.key_ingredients, ["cold brew tonic"]);
  });

  it("returns no dishes when the photo isn't a menu", () => {
    const result = finishPage(coercePage({ is_menu: false, dishes: [{ name: "Selfie" }] }));
    assert.ok(result.ok);
    assert.equal(result.page.is_menu, false);
    assert.equal(result.page.dishes.length, 0);
  });

  it("treats a bare list as the dishes", () => {
    const result = finishPage(coercePage([{ name: "Margherita", course: "pizza", diet: "veg" }]));
    assert.ok(result.ok);
    assert.equal(result.page.dishes[0].course, "pizza");
  });
});
