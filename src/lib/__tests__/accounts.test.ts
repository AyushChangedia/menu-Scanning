import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { emailIssue, hashPassword, istDay, normaliseEmail, passwordIssue, verifyPassword } from "@/lib/accounts";

describe("accounts", () => {
  it("normalises and validates emails", () => {
    assert.equal(normaliseEmail("  Ayush@Example.COM "), "ayush@example.com");
    assert.equal(emailIssue("ayush@example.com"), null);
    assert.ok(emailIssue("ayush@"));
    assert.ok(emailIssue(""));
  });

  it("enforces the password rules", () => {
    assert.ok(passwordIssue("short1A"));
    assert.ok(passwordIssue("alllowercase1"));
    assert.ok(passwordIssue("ALLUPPERCASE1"));
    assert.ok(passwordIssue("NoNumbersHere"));
    assert.equal(passwordIssue("Forkcast2026"), null);
  });

  it("hashes with a random salt and verifies only the right password", async () => {
    const a = await hashPassword("Forkcast2026");
    const b = await hashPassword("Forkcast2026");
    assert.notEqual(a.hash, b.hash);
    assert.equal(await verifyPassword("Forkcast2026", a.salt, a.hash), true);
    assert.equal(await verifyPassword("forkcast2026", a.salt, a.hash), false);
  });

  it("counts days in India time", () => {
    assert.equal(istDay("2026-10-18T19:00:00Z"), "2026-10-19");
    assert.equal(istDay("2026-10-18T18:00:00Z"), "2026-10-18");
  });
});
