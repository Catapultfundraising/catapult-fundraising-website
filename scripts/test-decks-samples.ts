import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DECKS, SALES_LIBRARY_SAMPLES } from "../lib/decks";

test("sales library exposes the two approved sample destinations only", () => {
  assert.deepEqual(SALES_LIBRARY_SAMPLES.map(s => [s.name, s.href]), [
    ["Sample feasibility study", "/samples/feasibility-study"],
    ["Sample data dashboard", "/demo-dashboard"],
  ]);
  const page = readFileSync("app/decks/page.tsx", "utf8");
  assert.match(page, /SALES_LIBRARY_SAMPLES\.map/);
  assert.match(page, /href=\{sample\.href\}/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});
test("all five existing service decks and their presentation/download controls remain", () => {
  assert.deepEqual(DECKS.map(d => d.slug), ["legacy-call", "capital-campaign", "annual-fund", "mid-level-engagement", "board-development"]);
  const page = readFileSync("app/decks/page.tsx", "utf8");
  assert.match(page, /DECKS\.map/);
  for (const fragment of ["`/decks/${deck.slug}`", "`/decks/${deck.slug}/01.png`", "`/decks/${deck.slug}/deck.pdf`", "Present"]) assert.ok(page.includes(fragment));
  const middleware = readFileSync("middleware.ts", "utf8");
  assert.match(middleware, /matchPrefix: "\/decks"/);
  assert.match(middleware, /cookieName: "catapult_decks_auth"/);
});
