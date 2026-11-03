// Rendered-page race QA: local dev server, demo mode, fictional data, all /api calls intercepted (no Engage/SQL/network).
const { chromium } = require("playwright"); const crypto = require("crypto");
const assert = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("PASS", m); };
(async () => {
  const cookie = crypto.createHash("sha256").update("localpw:localsec").digest("hex");
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await ctx.addCookies([{ name: "catapult_research_auth", value: cookie, url: "http://localhost:3100" }]);
  const p = await ctx.newPage(); const log = []; const ext = []; const held = [];
  p.on("request", (r) => { if (!r.url().startsWith("http://localhost:3100")) ext.push(r.url()); });
  await p.route("**/api/research-source-import", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}"); log.push({ op: body.op, client: body.client, table: body.table, fileName: body.fileName });
    if (globalThis.__hold && globalThis.__hold(body)) { await new Promise((res) => held.push({ body, res })); }
    await route.continue();
  });
  await p.addInitScript(() => { const orig = File.prototype.text; window.__pending = []; File.prototype.text = function () { return new Promise((res) => window.__pending.push(() => orig.call(this).then(res))); }; });
  await p.goto("http://localhost:3100/research/source-import?demo=1", { waitUntil: "networkidle", timeout: 180000 });
  const nb = p.locator("text=Necessary Only"); if (await nb.count()) await nb.first().click();
  const sel = (i) => p.locator("select").nth(i);
  await sel(0).selectOption("pvas"); await p.waitForTimeout(1500); await sel(1).selectOption("donorsearch_results"); await p.waitForTimeout(1500);
  // 1) deferred file read, scope change while pending
  await p.locator("input[type=file]").setInputFiles({ name: "old-pvas.csv", mimeType: "text/csv", buffer: Buffer.from("CPTID,DS_Rating\n9001,A\n") });
  await p.waitForFunction(() => window.__pending.length === 1);
  await sel(0).selectOption("csnf"); await p.waitForTimeout(1500);
  const before = log.length; await p.evaluate(() => window.__pending.shift()()); await p.waitForTimeout(1500);
  const txt = await p.innerText("body");
  assert(!txt.includes("old-pvas.csv"), "deferred file read after client change: old filename not installed");
  assert(!txt.includes("DS_Rating"), "deferred file read: old headers/mapping not installed");
  assert(!log.slice(before).some((l) => l.op === "inspect" || l.op === "preview"), "deferred file read: no inspect/preview dispatched for old file");
  // 2) deferred fields response for old table after scope change
  globalThis.__hold = (bd) => bd.op === "fields" && bd.client === "pvas";
  await sel(0).selectOption("pvas"); await p.waitForTimeout(1500); await sel(1).selectOption("donorsearch_results");
  await p.waitForTimeout(1500); assert(held.length === 1, "pvas fields response held");
  globalThis.__hold = null; await sel(0).selectOption("wcbhc"); await p.waitForTimeout(1500);
  held.shift().res(); await p.waitForTimeout(1500);
  const sv = await p.evaluate(() => [...document.querySelectorAll("select")].map((s) => s.value));
  assert(sv[0] === "wcbhc" && !(await p.innerText("body")).includes("DS_Rating"), "deferred pvas API response after scope change does not alter wcbhc selection");
  // 3) deferred preview response after scope change
  await sel(0).selectOption("pvas"); await p.waitForTimeout(1500); await sel(1).selectOption("donorsearch_results"); await p.waitForTimeout(1500);
  await p.click("text=Load fictional demo file"); await p.waitForTimeout(1500);
  globalThis.__hold = (bd) => bd.op === "preview";
  await p.click("button:has-text('Preview')"); await p.waitForTimeout(1000); assert(held.length === 1, "preview response held");
  assert(!(await sel(0).isEnabled()) && !(await sel(1).isEnabled()), "scope selectors disabled while preview pending (scope cannot change mid-request)");
  globalThis.__hold = null; held.shift().res(); await p.waitForTimeout(2000);
  assert(await sel(0).isEnabled(), "controls re-enabled after preview completes in same scope");
  console.log("requests:", JSON.stringify(log)); console.log("external:", JSON.stringify(ext));
  await b.close();
})();
