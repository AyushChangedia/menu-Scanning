import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fitWithin } from "@/lib/image";
import { slugify } from "@/lib/utils";

describe("slugify", () => {
  it("is stable, lowercase kebab-case with accents stripped", () => {
    assert.equal(slugify("Penne all'Arrabbiata"), "penne-allarrabbiata");
    assert.equal(slugify("Tiramisù"), "tiramisu");
    assert.equal(slugify("  Crème Brûlée!! "), "creme-brulee");
    assert.equal(slugify(slugify("Pad Thai")), "pad-thai");
  });
});

describe("fitWithin", () => {
  it("caps the long edge at 1568 and keeps the aspect ratio", () => {
    assert.deepEqual(fitWithin(4032, 3024), { width: 1568, height: 1176 });
    assert.deepEqual(fitWithin(3024, 4032), { width: 1176, height: 1568 });
    assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  });
});
