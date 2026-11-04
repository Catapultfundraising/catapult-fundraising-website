// Rendered late SAVE / STATUS QA. Local dev server, demo mode, fictional data. Test-only Playwright interception:
// preview response augmented with a synthetic token/applyAvailable; apply/status answered by mocks (never reach Engage).
// Every request to an origin other than exactly http://localhost:3100 is aborted. No sleeps.
const { chromium } = require("playwright"); const crypto = require("crypto");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import";
(async () => {
  const cookie = crypto.createHash("sha256").update("localpw:localsec").digest("hex");
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await ctx.addCookies([{ name: "catapult_research_auth", value: cookie, url: "http://localhost:3100" }]);
  const ext = []; const sent = [];
  await ctx.route((u) => new URL(u.href).origin !== "http://localhost:3100", (r) => { ext.push(new URL(r.request().url()).origin); return r.abort(); });
  const p = await ctx.newPage();
  const gates = {}; const waiters = {};
  const gate = (op) => new Promise((res) => { gates[op] = res; });
  const arrived = (op) => new Promise((res) => { waiters[op] = res; });
  const reply = {};
  await p.route("**" + API, async (route) => {
    const bd = JSON.parse(route.request().postData() || "{}"); sent.push({ op: bd.op, client: bd.client, table: bd.table });
    if (bd.op === "preview") { const r = await route.fetch(); const j = await r.json(); return route.fulfill({ json: { ...j, token: "synthetic-test-token", applyAvailable: true, requestId: "f".repeat(32) } }); }
    if (bd.op === "apply" || bd.op === "status") {
      if (waiters[bd.op]) waiters[bd.op]();
      if (reply[bd.op].hold) await gate(bd.op);
      return route.fulfill({ json: reply[bd.op].json });
    }
    return route.continue();
  });
  await p.goto("http://localhost:3100/research/source-import?demo=1", { waitUntil: "load", timeout: 180000 });
  const sel = (i) => p.locator("select").nth(i);
  const bdy = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
  const resp = (op) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r).op === op, { timeout: 120000 });
  await sel(0).locator("option[value=pvas]").waitFor({ state: "attached", timeout: 120000 });
  const nb = p.locator("text=Necessary Only"); if (await nb.count()) await nb.first().click();
  const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const pick = async (client, table) => { if ((await sel(0).inputValue()) === client) { await sel(0).selectOption(""); await frames(); } let w = resp("tables"); await sel(0).selectOption(client); await w; if (table) { await sel(1).locator(`option[value=${table}]`).waitFor({ state: "attached" }); w = resp("fields"); await sel(1).selectOption(table); await w; } };
  const toSave = async () => {
    await pick("pvas", "donorsearch_results"); await p.click("text=Load fictional demo file");
    const w = resp("preview"); await p.locator("button", { hasText: /^Preview$/ }).click(); await w;
    await p.locator("input[placeholder^='Recorded as author']").last().fill("Pat Example (fictional)");
    return p.locator("button", { hasText: /^Save \d+ values$/ });
  };
  // A) late SAVE: scope controls locked while pending; late success renders for the same scope only
  reply.apply = { hold: true, json: { records: 2, values: 4, replayed: false } };
  let save = await toSave(); let a = arrived("apply"); await save.click(); await a;
  const locked = await p.evaluate(() => [...document.querySelectorAll("select, input[type=file], input[type=date]")].every((e) => e.disabled));
  ok(locked, "save pending: client/table/file/date/mapping controls disabled (scope cannot change mid-save)");
  gates.apply(); await p.locator("text=Saved 2 records (4 values).").waitFor(); ok(true, "late save success rendered for unchanged scope");
  // B) lost save reply -> unconfirmed + Check status; deferred STATUS returns after client change -> must not render
  reply.apply = { hold: false, json: { unconfirmed: true } };
  save = await toSave(); await save.click(); await p.locator("text=Save not confirmed").waitFor();
  ok(await p.locator("button", { hasText: "Check status" }).isVisible(), "unconfirmed save shows Check status (no new upload)");
  reply.status = { hold: true, json: { found: true } }; a = arrived("status");
  await p.locator("button", { hasText: "Check status" }).click(); await a;
  await pick("wcbhc");
  const statusDone = resp("status"); gates.status(); await statusDone; await frames();
  const t = await p.innerText("body");
  ok(!t.includes("Saved: this request committed.") && (await sel(0).inputValue()) === "wcbhc", "deferred status after client change: not rendered into new selection");
  // C) deferred status for unchanged scope does render
  save = await toSave(); await save.click(); await p.locator("text=Save not confirmed").waitFor();
  reply.status = { hold: true, json: { found: false } }; a = arrived("status");
  await p.locator("button", { hasText: "Check status" }).click(); await a; gates.status();
  await p.locator("text=Still unconfirmed").waitFor(); ok(true, "deferred not-found status for same scope: stays unconfirmed, request kept");
  // D) apply fetch rejection -> unconfirmed (not 'not saved')
  await p.unroute("**" + API);
  await p.route("**" + API, async (route) => { const bd = JSON.parse(route.request().postData() || "{}"); sent.push({ op: bd.op, client: bd.client }); if (bd.op === "preview") { const r = await route.fetch(); const j = await r.json(); return route.fulfill({ json: { ...j, token: "synthetic-test-token", applyAvailable: true, requestId: "f".repeat(32) } }); } if (bd.op === "apply") return route.abort("connectionreset"); return route.continue(); });
  save = await toSave(); await save.click(); await p.locator("text=Save not confirmed").waitFor();
  ok(await p.locator("button", { hasText: "Check status" }).isVisible(), "save network failure: unconfirmed + Check status");
  console.log("requests", JSON.stringify(sent.filter((s) => ["apply", "status"].includes(s.op))));
  console.log("external blocked", ext.length, [...new Set(ext)]);
  await b.close();
})();
