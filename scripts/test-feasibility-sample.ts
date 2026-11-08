import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { samplePasswordValid, sampleToken, sampleTokenValid, SAMPLE_TTL } from "../lib/feasibility-sample-auth";
import { SAMPLE_PAGES, sampleAsset } from "../lib/feasibility-sample";

test("strict media allowlist and pagination bounds", () => {
  assert.equal(SAMPLE_PAGES, 126);
  for (let i = 1; i <= 126; i++) assert.ok(sampleAsset(`page-${String(i).padStart(3, "0")}.webp`));
  assert.ok(sampleAsset("document.pdf"));
  for (const name of ["page-000.webp", "page-127.webp", "page-1.webp", "../document.pdf", "asset-manifest.json", "page-001.webp/x", "https://example.com/a", "__proto__", "document.PDF"]) assert.equal(sampleAsset(name), null);
});
test("scoped sessions expire, reject tampering, rotate, and fail closed", () => {
  const before = { password: process.env.DECKS_PASSWORD, secret: process.env.DECKS_AUTH_SECRET };
  try {
    process.env.DECKS_PASSWORD = randomBytes(24).toString("hex");
    process.env.DECKS_AUTH_SECRET = randomBytes(32).toString("hex");
    assert.ok(samplePasswordValid(process.env.DECKS_PASSWORD));
    assert.ok(!samplePasswordValid("incorrect"));
    const now = Date.now(), token = sampleToken(now)!;
    assert.ok(sampleTokenValid(token, now));
    assert.ok(!sampleTokenValid(token, now + SAMPLE_TTL * 1000));
    assert.ok(!sampleTokenValid(token + "0", now));
    assert.ok(!sampleTokenValid(token.replace(/.$/, token.endsWith("0") ? "1" : "0"), now));
    assert.ok(!sampleTokenValid(token, now - SAMPLE_TTL * 1000 - 1000));
    assert.ok(!sampleTokenValid(undefined, now));
    assert.ok(!sampleTokenValid("catapult_decks_auth", now));
    process.env.DECKS_PASSWORD = randomBytes(24).toString("hex");
    assert.ok(!sampleTokenValid(token, now));
    delete process.env.DECKS_AUTH_SECRET;
    assert.equal(sampleToken(now), null);
    assert.ok(!samplePasswordValid(process.env.DECKS_PASSWORD));
    assert.ok(!sampleTokenValid(token, now));
  } finally {
    if (before.password === undefined) delete process.env.DECKS_PASSWORD; else process.env.DECKS_PASSWORD = before.password;
    if (before.secret === undefined) delete process.env.DECKS_AUTH_SECRET; else process.env.DECKS_AUTH_SECRET = before.secret;
  }
});
