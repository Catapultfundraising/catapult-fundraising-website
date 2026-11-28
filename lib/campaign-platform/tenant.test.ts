import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAMPLE_GIFTS_CSV, SAMPLE_PROSPECTS_CSV, autoMap, buildDashboard, buildGifts, buildProspects, readTable, GIFT_FIELDS, PROSPECT_FIELDS } from "./tenant";

describe("campaign platform slice", () => {
  it("maps sample files and builds a dashboard", () => {
    const g = readTable(SAMPLE_GIFTS_CSV); const gm = autoMap(g.headers, GIFT_FIELDS);
    assert.deepEqual(gm, { donor: 0, amount: 1, kind: 2, date: 3 });
    const gifts = buildGifts(g.rows, gm); assert.deepEqual(gifts.problems, []);
    const p = readTable(SAMPLE_PROSPECTS_CSV); const pm = autoMap(p.headers, PROSPECT_FIELDS);
    const prospects = buildProspects(p.rows, pm).prospects;
    const d = buildDashboard({ id: "t", name: "x", goal: 2_500_000, createdAt: "", gifts: gifts.gifts, prospects });
    assert.equal(d.raised, 250000 + 100000 + 50000 + 25000 * 2 + 10000 * 2 + 5000 + 2500 + 1000);
    assert.equal(d.seats.find((s) => s.prospect.name === "Harbor Family Trust"), undefined);
    assert.ok(d.seats.length > 0);
  });
  it("skips bad rows", () => {
    assert.equal(buildGifts([["A", "abc"], ["", "5"], ["B", "$1,000"]], { donor: 0, amount: 1, kind: -1, date: -1 }).gifts.length, 1);
  });
});
