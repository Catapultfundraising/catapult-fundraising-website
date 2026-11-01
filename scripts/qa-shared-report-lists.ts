// @ts-nocheck -- local QA script; playwright is installed outside the app.
// Synthetic-only browser QA for shared saved report lists. The lists API is mocked in the browser with an in-memory,
// per-client store that follows the Engage contract (409 name/version, 503 unavailable). Route/SQL logic is covered by unit tests.
// Run: CRON_SECRET=qa-local next dev -p 3100, then NODE_PATH=<playwright> npx tsx scripts/qa-shared-report-lists.ts
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:3100";
const OUT = process.env.QA_OUT ?? "/tmp/lists-qa";
mkdirSync(OUT, { recursive: true });
const db: Record<string, any[]> = {}; let seq = 0; let down = false;
const log: string[] = [];

async function mockLists(ctx) {
  await ctx.route("**/api/qa-report-lists/*", async (route) => {
    const req = route.request(); const client = req.url().split("/").pop().split("?")[0];
    const live = (db[client] ??= []).filter((l) => !l.deleted);
    const send = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (down) return send(503, { error: "Saved lists are unavailable right now. Nothing was changed; please try again shortly." });
    const b = req.postData() ? JSON.parse(req.postData()) : {};
    const now = new Date("2026-11-02T15:00:00Z").toISOString();
    const clash = (n, id) => live.some((l) => l.name.toLowerCase() === n.toLowerCase() && l.id !== id);
    if (req.method() === "GET") return send(200, { lists: live.map(({ deleted, importKey, ...l }) => l) });
    if (req.method() === "POST") {
      const prev = b.importKey && db[client].find((l) => l.importKey === b.importKey); if (prev) return send(200, { list: prev, alreadyImported: true });
      if (clash(b.name)) return send(409, { error: `A saved list named "${b.name}" already exists. Choose another name or open that list.`, code: "name_taken" });
      const l = { id: ++seq, name: b.name, query: b.query, version: 1, created_by: b.by, updated_by: b.by, created_at: now, updated_at: now, importKey: b.importKey };
      db[client].push(l); return send(200, { list: l });
    }
    const l = live.find((x) => x.id === b.id); if (!l) return send(404, { error: "This saved list no longer exists.", code: "not_found" });
    if (l.version !== b.expectedVersion) return send(409, { error: `This list was changed by ${l.updated_by} since you opened it. Reload it before saving.`, code: "version_conflict" });
    if (req.method() === "DELETE") { l.deleted = true; l.version++; return send(200, { deleted: l.id }); }
    if (b.name && clash(b.name, l.id)) return send(409, { error: "taken", code: "name_taken" });
    Object.assign(l, b.name ? { name: b.name } : {}, b.query ? { query: b.query } : {}, { version: l.version + 1, updated_by: b.by, updated_at: now });
    return send(200, { list: l });
  });
}
async function open(browser, client = "jag", local?: any[]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await mockLists(ctx);
  if (local) await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [`catapult-report-lists:${client}`, JSON.stringify(local)]);
  const page = await ctx.newPage();
  page.on("dialog", (d) => { log.push(`dialog: ${d.message()}`); d.type() === "prompt" ? d.accept("Imported copy") : d.accept(); });
  await page.goto(`${BASE}/dev/report-builder-harness?client=${client}`);
  await page.getByTestId("report-builder").waitFor();
  const nec = page.getByRole("button", { name: "Necessary Only" }); if (await nec.count()) await nec.click();
  await page.getByText(/records/).first().waitFor();
  return { ctx, page };
}
const lists = (page) => page.getByLabel("Saved lists").locator("option").allTextContents();

(async () => {
  const browser = await chromium.launch();
  // Computer 1: save a list
  const a = await open(browser);
  await a.page.getByPlaceholder("e.g. Las Vegas $10K+ donors").fill("Top lifetime donors");
  await a.page.getByRole("button", { name: "Save as new list" }).click();
  await a.page.getByText("Enter your name first").waitFor(); // attribution required
  await a.page.getByPlaceholder("Shown as saved by").fill("QA Staff A");
  await a.page.getByLabel("Top rows").fill("3");
  await a.page.getByRole("button", { name: "Save as new list" }).click();
  await a.page.getByText(/Saved "Top lifetime donors" for everyone/).waitFor();
  await a.page.screenshot({ path: `${OUT}/01-saved-shared.png` });
  assert.equal(db.jag.length, 1); assert.equal(db.jag[0].query.top, 3); assert.equal(db.jag[0].created_by, "QA Staff A");
  // Computer 2 (fresh browser context, empty localStorage) sees and restores it
  const b = await open(browser);
  assert.deepEqual((await lists(b.page)).slice(1), ["Top lifetime donors"]);
  await b.page.getByLabel("Saved lists").selectOption({ label: "Top lifetime donors" });
  assert.equal(await b.page.getByLabel("Top rows").inputValue(), "3");
  await b.page.getByText(/Last changed by QA Staff A/).waitFor();
  // Concurrent edit: A updates first, B (still on version 1) is refused, list reloads, nothing overwritten
  await a.page.getByLabel("Saved lists").selectOption({ label: "Top lifetime donors" });
  await a.page.getByLabel("Top rows").fill("2");
  await a.page.getByRole("button", { name: "Update list" }).click();
  await a.page.getByText('Updated "Top lifetime donors".').waitFor();
  await b.page.getByPlaceholder("Shown as saved by").fill("QA Staff B");
  await b.page.getByLabel("Top rows").fill("5");
  await b.page.getByRole("button", { name: "Update list" }).click();
  await b.page.getByText(/changed by QA Staff A since you opened it/).waitFor();
  await b.page.screenshot({ path: `${OUT}/02-conflict.png` });
  assert.equal(db.jag[0].query.top, 2); assert.equal(db.jag[0].version, 2);
  // Duplicate name is refused, not overwritten
  await b.page.getByLabel("Saved lists").selectOption("");
  await b.page.getByPlaceholder("e.g. Las Vegas $10K+ donors").fill("top lifetime DONORS");
  await b.page.getByRole("button", { name: "Save as new list" }).click();
  await b.page.getByText(/already exists/).waitFor();
  assert.equal(db.jag.length, 1);
  // Rename + delete
  await a.page.reload(); await a.page.getByText(/records/).first().waitFor();
  await a.page.getByLabel("Saved lists").selectOption({ label: "Top lifetime donors" });
  await a.page.getByPlaceholder("e.g. Las Vegas $10K+ donors").fill("Top 2 lifetime");
  await a.page.getByRole("button", { name: "Rename" }).click(); await a.page.getByText('Renamed to "Top 2 lifetime".').waitFor();
  await a.page.getByRole("button", { name: "Delete list" }).click(); await a.page.getByText('Deleted "Top 2 lifetime".').waitFor();
  assert.equal(db.jag[0].deleted, true);
  // Per-client isolation: PVAS harness never sees JAG lists
  const p = await open(browser, "pvas");
  db.jag.push({ id: ++seq, name: "JAG only", query: db.jag[0].query, version: 1, created_by: "x", updated_by: "x", created_at: "", updated_at: "" });
  await p.page.reload(); await p.page.getByTestId("report-builder").waitFor();
  assert.ok(!(await lists(p.page)).includes("JAG only"));
  // Legacy browser-only lists: shown with explicit Import, kept locally, name clash prompts
  const legacy = [{ id: "1730000000000", name: "JAG only", query: { fields: ["cptid", "name"], filters: [], top: 4 }, savedAt: "" }, { id: "1730000000001", name: "Old browser list", query: { fields: ["cptid", "name", "lifetime"], filters: [] }, savedAt: "" }];
  const c = await open(browser, "jag", legacy);
  await c.page.getByTestId("local-lists").waitFor();
  await c.page.screenshot({ path: `${OUT}/03-legacy-import-offer.png` });
  assert.equal(db.jag.filter((l) => !l.deleted).length, 1, "nothing imported automatically");
  await c.page.getByPlaceholder("Shown as saved by").fill("QA Staff C");
  await c.page.getByTestId("local-lists").getByRole("button", { name: "Import" }).first().click();
  await c.page.getByText(/Imported "Imported copy"/).waitFor();
  await c.page.getByTestId("local-lists").getByRole("button", { name: "Import" }).first().click();
  await c.page.getByText(/Imported "Old browser list"/).waitFor();
  assert.equal(await c.page.getByTestId("local-lists").count(), 0);
  assert.equal(JSON.parse(await c.page.evaluate(() => localStorage.getItem("catapult-report-lists:jag"))).length, 2, "browser copy kept");
  assert.deepEqual(db.jag.filter((l) => !l.deleted).map((l) => l.name).sort(), ["Imported copy", "JAG only", "Old browser list"]);
  await c.page.screenshot({ path: `${OUT}/04-imported.png` });
  // Unavailable SQL: saving paused, report still loads
  down = true; await c.page.reload(); await c.page.getByText(/Shared lists could not be loaded/).waitFor();
  assert.ok(await c.page.getByRole("button", { name: "Save as new list" }).isDisabled());
  await c.page.screenshot({ path: `${OUT}/05-lists-unavailable.png` });
  console.log("shared report lists browser QA passed"); console.log(log.join("\n"));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
