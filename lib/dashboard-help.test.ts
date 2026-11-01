// Run: npx tsx lib/dashboard-help.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_HELP_TOPICS, DASHBOARD_TABS, searchTopics, sectionTopicsFor, taskTopicsFor, topicForTab, type HelpClient } from "./dashboard-help";

const CLIENTS: HelpClient[] = ["jag", "csnf", "pvas", "wcbhc", "baq"];

// 1. Manifest matches what each dashboard actually renders (TABS constant + Prospect Ratings), and the Help button is mounted.
for (const c of CLIENTS) {
  const src = readFileSync(`components/${c}-data-dashboard.tsx`, "utf8");
  const m = /const TABS = \[([^\]]+)\] as const/.exec(src);
  assert.ok(m, `${c}: TABS constant`);
  const tabs = [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.match(src, /\[\.\.\.TABS, "Prospect Ratings"\]/, `${c}: Prospect Ratings rendered`);
  assert.deepEqual([...DASHBOARD_TABS[c]], [...tabs, "Prospect Ratings"], `${c}: manifest matches source`);
  for (const t of tabs) assert.ok(src.includes(`tab === "${t}"`), `${c}: ${t} has a panel`);
  assert.match(src, new RegExp(`<DashboardHelp client="${c}" currentTab=\\{tab\\}`), `${c}: Help button mounted`);
}

// 2. Every rendered tab has exactly one section topic; no topic for a tab the client doesn't have.
for (const c of CLIENTS) {
  const secs = sectionTopicsFor(c);
  assert.deepEqual(secs.map((t) => t.tab), [...DASHBOARD_TABS[c]], `${c}: one section topic per tab, in tab order`);
  for (const t of DASHBOARD_TABS[c]) assert.equal(topicForTab(c, t)?.tab, t);
}
assert.equal(topicForTab("pvas", "Feasibility"), undefined);
assert.equal(topicForTab("jag", "Portfolio"), undefined);
assert.equal(topicForTab("wcbhc", "Board"), undefined);

// 3. Required shared how-tos exist everywhere.
for (const c of CLIENTS) {
  const ids = taskTopicsFor(c).map((t) => t.id);
  for (const id of ["record", "gifts-pledges", "documents", "merge-delete", "reports-build", "shared-lists", "downloads", "troubleshooting"]) assert.ok(ids.includes(id), `${c}: ${id}`);
}

// 4. Related links resolve; ids unique.
const ids = ALL_HELP_TOPICS.map((t) => t.id);
assert.equal(new Set(ids).size, ids.length);
for (const t of ALL_HELP_TOPICS) for (const r of t.related ?? []) assert.ok(ids.includes(r), `${t.id} -> ${r}`);

// 5. Search: titles, body text and steps; every word must match; no-results case.
assert.ok(searchTopics("jag", "merge").some((t) => t.id === "merge-delete"));
assert.ok(searchTopics("jag", "MM/DD/YYYY").some((t) => t.id === "reports"));
assert.ok(searchTopics("pvas", "givebutter").some((t) => t.id === "givebutter"));
assert.ok(!searchTopics("jag", "givebutter").some((t) => t.id === "givebutter"));
assert.ok(searchTopics("baq", "void reason").some((t) => t.id === "campaign-donors"));
assert.deepEqual(searchTopics("csnf", "zzqx nothing"), []);
assert.equal(searchTopics("csnf", "  ").length, sectionTopicsFor("csnf").length + taskTopicsFor("csnf").length);

// 6. Safety: no unavailable promises, secrets or internal implementation details.
const text = JSON.stringify(ALL_HELP_TOPICS).toLowerCase();
for (const bad of ["mg score", "major gift score", "multiple review lists", "password is", "api key", "sql", "vercel", "bearer", "azure", "engage", "localstorage"]) assert.ok(!text.includes(bad), `forbidden: ${bad}`);
// Prospect Ratings is one list per dashboard and kept distinct from report lists.
const pr = ALL_HELP_TOPICS.find((t) => t.id === "prospect-ratings")!;
assert.ok(pr.steps.join(" ").includes("one review list"));
assert.ok(pr.notes!.join(" ").includes("separate from saved report lists"));
assert.ok(ALL_HELP_TOPICS.find((t) => t.id === "shared-lists")!.notes!.join(" ").includes("separate from the Prospect Ratings"));

console.log("dashboard-help tests passed");
