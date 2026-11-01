// Run: npx tsx lib/demo-dashboard/demo.test.ts
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEMO_DONORS, DEMO_GOAL, campaignTotals, paid, outstanding, sum, lifetime } from "./data";
import { runReport, DEFAULT_SETUP, seatGiftChart } from "./logic";
import { exampleRatings } from "./ratings";
import { isBareRoute } from "../../components/bare-route";
import { sheetRows, SAMPLE_MARK } from "./export";
import { DEMO_TABS, DEMO_HELP_TOPICS, demoSearch } from "./help";

let n = 0; const t = (name: string, f: () => void) => { f(); n++; console.log("ok", name); };

t("campaign reconciles to $5M goal, $4.6M committed, 92%", () => {
  const c = campaignTotals();
  assert.equal(c.goal, 5_000_000); assert.equal(DEMO_GOAL, 5_000_000);
  assert.equal(c.committed, 4_600_000); assert.equal(c.remaining, 400_000);
  assert.equal(Math.round(c.pct * 100), 92);
  assert.equal(c.received + c.outstanding, c.committed);
  assert.ok(c.received > 0 && c.outstanding > 0);
  for (const d of DEMO_DONORS) if (d.pledge) {
    assert.ok(paid(d) <= d.pledge.amount + 1e-6, d.name); assert.ok(outstanding(d) >= -1e-6, d.name);
    assert.ok(Number.isInteger(Math.round(paid(d) * 100)));
  }
});
t("historical giving is separate from campaign pledges", () => {
  for (const d of DEMO_DONORS) for (const g of d.gifts) assert.notEqual(g.kind, "Capital");
  assert.ok(sum(DEMO_DONORS.map(lifetime)) > 0);
});
t("gift chart seating accounts for every commitment exactly once", () => {
  const s = seatGiftChart(DEMO_GOAL);
  assert.equal(sum(s.map((x) => sum(x.committed.map((d) => d.pledge!.amount)))), 4_600_000);
  assert.equal(sum(s.map((x) => x.committed.length)), campaignTotals().commitments);
});
t("report default lists committed records and totals reconcile", () => {
  const r = runReport(DEFAULT_SETUP);
  assert.equal(sum(r.map((d) => d.pledge!.amount)), 4_600_000);
  assert.equal(r[0].pledge!.amount, 1_000_000);
  assert.equal(runReport({ ...DEFAULT_SETUP, top: 5 }).length, 5);
  const o = runReport({ ...DEFAULT_SETUP, status: "outstanding" });
  assert.equal(sum(o.map(outstanding)), campaignTotals().outstanding);
});
t("contact data is fictional only", () => {
  const ids = new Set<number>();
  for (const d of DEMO_DONORS) {
    assert.ok(!ids.has(d.cptid)); ids.add(d.cptid);
    if (d.email) assert.match(d.email, /@demo-donor\.example$/);
    assert.match(d.phone, /^202-555-01\d\d$/);
  }
});
t("exports carry the sample watermark", () => {
  const rows = sheetRows({ title: "X", cols: [{ label: "A" }], rows: [[1]] });
  assert.equal(rows[0][0], SAMPLE_MARK);
});
t("help covers every demo tab and only demo tabs", () => {
  const tabs = DEMO_HELP_TOPICS.filter((x) => x.kind === "section").map((x) => x.tab);
  assert.deepEqual([...tabs].sort(), [...DEMO_TABS].sort());
  assert.ok(demoSearch("excel").length > 0);
  const src = readFileSync("components/demo-data-dashboard.tsx", "utf8");
  for (const tab of DEMO_TABS) assert.ok(src.includes(`tab === "${tab}"`), tab);
  for (const forbidden of ["Givebutter", "DonorSearch", "Engage", "password", "CPTID"]) assert.ok(!JSON.stringify(DEMO_HELP_TOPICS).includes(forbidden), forbidden);
});
t("isolation: demo files make no network calls and import no client stores/APIs", () => {
  const files = ["components/demo-data-dashboard.tsx", "app/demo-dashboard/page.tsx", ...readdirSync("lib/demo-dashboard").filter((f) => !f.endsWith(".test.ts")).map((f) => join("lib/demo-dashboard", f))];
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    for (const bad of [/\bfetch\(/, /\/api\//, /XMLHttpRequest|EventSource|WebSocket|sendBeacon/, /-data-store|-data-crm|portal-v2|report-builder"|@vercel\/blob|mssql|process\.env/, /\b(jag|csnf|pvas|wcbhc|baq)\b/i]) assert.ok(!bad.test(s), `${f} matches ${bad}`);
  }
  const mw = readFileSync("middleware.ts", "utf8");
  assert.ok(!mw.includes("demo-dashboard"), "middleware untouched");
});
t("prospect ratings example uses A/B/C/D answers that add up per completed member", () => {
  for (const r of exampleRatings()) { assert.ok(r.dk >= 0); assert.equal(r.a + r.b + r.c + r.dk, 4); }
  assert.ok(!/Consensus|Suggested ask/.test(readFileSync("components/demo-data-dashboard.tsx", "utf8")));
});
t("export PDF uses exact brand colours only", () => {
  const s = readFileSync("lib/demo-dashboard/export.tsx", "utf8");
  for (const c of ["#0E1E31", "#B28C46", "#5A6675", "#DCE1E7"]) assert.ok(s.includes(c), c);
  for (const h of s.match(/#[0-9a-fA-F]{6}\b/g) ?? []) assert.ok(["#0E1E31", "#B28C46", "#5A6675", "#DCE1E7", "#FFFFFF"].includes(h), h);
});
t("bare route exception is exactly /demo-dashboard; client pages keep site chrome", () => {
  assert.equal(isBareRoute("/demo-dashboard"), true);
  for (const p of ["/demo-dashboard/x", "/demo", "/demo-dashboards", "/", "/pvas/data-dashboard", "/jag/data-dashboard", "/csnf/data-dashboard", "/baq/data-dashboard", "/wcbhc/data-dashboard", "/research", "/blog"]) assert.equal(isBareRoute(p), false, p);
  assert.equal(isBareRoute("/csnf"), true); assert.equal(isBareRoute("/csnfvip/x"), true);
});
t("reset clears notes and saved setups and remounts the tab; downloads need columns", () => {
  const s = readFileSync("components/demo-data-dashboard.tsx", "utf8");
  assert.match(s, /sessionStorage\.removeItem\(SETUPS_KEY\)/);
  assert.match(s, /key=\{`\$\{tab\}-\$\{rev\}`\}/);
  assert.match(s, /!rows\.length \|\| !cols\.length/);
});
console.log(`${n} tests passed`);

