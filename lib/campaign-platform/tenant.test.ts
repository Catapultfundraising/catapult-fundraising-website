import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAMPLE_GIFTS_CSV, autoMap, buildDashboard, buildGifts, readTable, GIFT_FIELDS, TEMPLATE_CSV, type TenantRecord } from "./tenant";
import { enrichTenant, enrichedCsv, sampleProvider } from "./enrich";

async function sampleTenant(): Promise<TenantRecord> {
  const g = readTable(SAMPLE_GIFTS_CSV); const gm = autoMap(g.headers, GIFT_FIELDS);
  const b = buildGifts(g.rows, gm); assert.deepEqual(b.problems, []);
  return { id: "t", name: "x", goal: 2_500_000, createdAt: "", gifts: b.gifts, prospects: [], constituents: b.constituents };
}

describe("campaign platform", () => {
  it("one file yields gifts and not-yet-giving constituents", async () => {
    const t = await sampleTenant();
    assert.equal(t.gifts.length, 7); assert.equal(t.constituents!.length, 14);
    assert.equal(buildDashboard(t).raised, 250000 + 100000 + 50000 + 25000 * 2 + 10000 + 5000);
  });
  it("GC2P is built from the enriched upload and includes donors as candidates for further gifts", async () => {
    const e = await enrichTenant(await sampleTenant(), sampleProvider);
    const d = buildDashboard(e);
    assert.ok(d.seats.length > 0);
    assert.ok(d.seats.every((s) => s.prospect.ds));
    const donorNames = new Set(e.gifts.map((g) => g.donor));
    assert.ok(d.seats.some((s) => donorNames.has(s.prospect.name)), "donors can be seated for further gifts");
    assert.ok(d.seats.every((s) => s.level <= s.prospect.capacity));
  });
  it("never re-searches a record that already has a result", async () => {
    const e = await enrichTenant(await sampleTenant(), sampleProvider);
    let calls = 0; await enrichTenant(e, async (c) => { calls++; return sampleProvider(c); });
    assert.equal(calls, 0);
    assert.ok(enrichedCsv(e).startsWith("Name,State"));
  });
  it("maps the full spec layout and excludes deceased / do-not-solicit", async () => {
    const t = await sampleTenant();
    assert.deepEqual(t.constituents!.filter((c) => c.excluded).map((c) => c.excluded).sort(), ["Deceased", "Do not solicit"]);
    const e = await enrichTenant(t, sampleProvider);
    assert.ok(e.constituents!.filter((c) => c.excluded).every((c) => !c.ds));
    const names = buildDashboard(e).seats.map((s) => s.prospect.name);
    assert.ok(!names.includes("Evelyn Strand") && !names.includes("Miguel Santos"));
    assert.ok(TEMPLATE_CSV.includes("Home zip") && TEMPLATE_CSV.includes("Solicitation preferences"));
  });
  it("skips invalid rows", () => {
    const r = buildGifts([["A", "abc"], ["", "5"], ["B", "$1,000"], ["C", ""]], { fullName: 0, amount: 1 });
    assert.equal(r.gifts.length, 1); assert.equal(r.problems.length, 2); assert.equal(r.constituents.length, 2);
  });
});
