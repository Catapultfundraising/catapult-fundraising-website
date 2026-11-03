// Rendered-page race QA: local dev server, demo mode, fictional data. /api calls intercepted; ALL non-localhost requests aborted.
// No fixed sleeps: every step waits on a response, promise or locator state.
const { chromium } = require("playwright"); const crypto = require("crypto");
const assert = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("PASS", m); };
const API = "/api/research-source-import";
(async () => {
  const cookie = crypto.createHash("sha256").update("localpw:localsec").digest("hex");
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await ctx.addCookies([{ name: "catapult_research_auth", value: cookie, url: "http://localhost:3100" }]);
  const ext = []; const log = []; let hold = null; let onHeld = null; const held = [];
  await ctx.route((u) => !u.href.startsWith("http://localhost:3100"), (route) => { ext.push(new URL(route.request().url()).origin); return route.abort(); });
  const p = await ctx.newPage();
  await p.route("**" + API, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}"); log.push({ op: body.op, client: body.client, table: body.table, fileName: body.fileName });
    if (hold && hold(body)) { await new Promise((res) => { held.push(res); if (onHeld) onHeld(); }); }
    await route.continue();
  });
  const body = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
  const resp = (op, client) => p.waitForResponse((r) => r.url().endsWith(API) && body(r).op === op && (!client || body(r).client === client), { timeout: 120000 });
  const nextHeld = () => new Promise((res) => { onHeld = res; });
  await p.addInitScript(() => { const orig = File.prototype.text; window.__pending = []; window.__readDone = null;
    File.prototype.text = function () { return new Promise((res) => window.__pending.push(() => { const d = orig.call(this).then((v) => { res(v); return v; }); window.__readDone = d; return d; })); }; });
  await p.goto("http://localhost:3100/research/source-import?demo=1", { waitUntil: "load", timeout: 180000 });
  const sel = (i) => p.locator("select").nth(i);
  await sel(0).locator("option[value=pvas]").waitFor({ state: "attached", timeout: 120000 });
  const nb = p.locator("text=Necessary Only"); if (await nb.count()) await nb.first().click();
  const pick = async (client, table) => {
    let w = resp("tables", client); await sel(0).selectOption(client); await w;
    if (table) { await sel(1).locator(`option[value=${table}]`).waitFor({ state: "attached" }); w = resp("fields", client); await sel(1).selectOption(table); await w; }
  };
  const settle = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await pick("pvas", "donorsearch_results");
  // 1) deferred file read, scope change while pending
  await p.locator("input[type=file]").setInputFiles({ name: "old-pvas.csv", mimeType: "text/csv", buffer: Buffer.from("CPTID,DS_Rating\n9001,A\n") });
  await p.waitForFunction(() => window.__pending.length === 1);
  await pick("csnf");
  const before = log.length;
  await p.evaluate(async () => { window.__pending.shift()(); await window.__readDone; await new Promise((r) => setTimeout(r, 0)); });
  await settle();
  const txt = await p.innerText("body");
  assert(!txt.includes("old-pvas.csv"), "deferred file read after client change: old filename not installed");
  assert(!txt.includes("DS_Rating"), "deferred file read: old headers/mapping not installed");
  assert(!log.slice(before).some((l) => l.op === "inspect" || l.op === "preview"), "deferred file read: no inspect/preview dispatched for old file");
  // 2) deferred fields response for old table after scope change
  await pick("pvas");
  hold = (bd) => bd.op === "fields" && bd.client === "pvas"; let h = nextHeld();
  const oldFields = resp("fields", "pvas");
  await sel(1).locator("option[value=donorsearch_results]").waitFor({ state: "attached" }); await sel(1).selectOption("donorsearch_results");
  await h; assert(held.length === 1, "pvas fields response held");
  hold = null; await pick("wcbhc");
  held.shift()(); await oldFields; await settle();
  const sv = await p.evaluate(() => [...document.querySelectorAll("select")].map((s) => s.value));
  assert(sv[0] === "wcbhc" && !(await p.innerText("body")).includes("DS_Rating"), "deferred pvas API response after scope change does not alter wcbhc selection");
  // 3) preview pending locks scope
  await pick("pvas", "donorsearch_results");
  await p.click("text=Load fictional demo file");
  const pv = p.locator("button:has-text('Preview')").first(); await pv.waitFor({ state: "visible" }); await p.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("Preview")); return b && !b.disabled; });
  hold = (bd) => bd.op === "preview"; h = nextHeld(); const pr = resp("preview");
  await pv.click(); await h; assert(held.length === 1, "preview response held");
  assert(!(await sel(0).isEnabled()) && !(await sel(1).isEnabled()), "scope selectors disabled while preview pending (scope cannot change mid-request)");
  hold = null; held.shift()(); await pr;
  await p.waitForFunction(() => !document.querySelectorAll("select")[0].disabled, null, { timeout: 30000 }).catch(() => {});
  assert(await sel(0).isEnabled(), "controls re-enabled after preview completes in same scope");
  console.log("requests:", JSON.stringify(log));
  console.log("blocked external:", ext.length, JSON.stringify([...new Set(ext)]));
  await b.close();
})();
