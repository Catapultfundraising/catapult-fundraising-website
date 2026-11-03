// Rendered mapping-profile QA. Local dev server, demo mode, fictional data, real local route for mappingProfile.
// Test-only interception: preview augmented with a synthetic token to prove reset; selected requests deferred.
// Every request to an origin other than exactly http://localhost:3100 is aborted. No sleeps.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const OUT = process.env.QA_OUT || "/tmp/qa-profile";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const cookie = crypto.createHash("sha256").update("localpw:localsec").digest("hex");
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" }, acceptDownloads: true });
  await ctx.addCookies([{ name: "catapult_research_auth", value: cookie, url: "http://localhost:3100" }]);
  const ext = []; const sent = [];
  await ctx.route((u) => new URL(u.href).origin !== "http://localhost:3100", (r) => { ext.push(new URL(r.request().url()).origin); return r.abort(); });
  const p = await ctx.newPage();
  let holdCheck = null; let checkArrived = null;
  await p.route("**" + API, async (route) => {
    const bd = JSON.parse(route.request().postData() || "{}"); sent.push({ op: bd.op, action: bd.action, client: bd.client, table: bd.table });
    if (bd.op === "preview") { const r = await route.fetch(); const j = await r.json(); return route.fulfill({ json: { ...j, token: "synthetic-test-token", applyAvailable: true, requestId: "f".repeat(32) } }); }
    if (bd.op === "mappingProfile" && bd.action === "check" && holdCheck) { const h = holdCheck; holdCheck = null; if (checkArrived) checkArrived(); const r = await route.fetch(); await h; return route.fulfill({ response: r }); }
    return route.continue();
  });
  await p.goto("http://localhost:3100/research/source-import?demo=1", { waitUntil: "load", timeout: 180000 });
  const sel = (i) => p.locator("select").nth(i);
  const bdy = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
  const resp = (op, action) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r).op === op && (!action || bdy(r).action === action), { timeout: 120000 });
  await sel(0).locator("option[value=pvas]").waitFor({ state: "attached", timeout: 120000 });
  const nb = p.locator("text=Necessary Only"); if (await nb.count()) await nb.first().click();
  const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const pick = async (client, table) => { if ((await sel(0).inputValue()) === client) { await sel(0).selectOption(""); await frames(); } let w = resp("tables"); await sel(0).selectOption(client); await w; if (table) { await sel(1).locator(`option[value=${table}]`).waitFor({ state: "attached" }); w = resp("fields"); await sel(1).selectOption(table); await w; } };
  const loadDemo = async () => { const w = resp("inspect"); await p.click("text=Load fictional demo file"); await w; await p.locator("text=Column mapping").waitFor(); await frames(); };
  const mapSelects = () => p.locator("section:has(h2:text('Column mapping')) select");
  const mapVals = async () => { const n = await mapSelects().count(); const o = []; for (let i = 0; i < n; i++) o.push(await mapSelects().nth(i).inputValue()); return o; };
  const profIn = p.locator("input[aria-label='Load mapping profile']");
  const fileOf = (name, text) => ({ name, mimeType: "application/json", buffer: Buffer.from(text) });

  // 1) download: server-built metadata-only profile
  await pick("pvas", "donorsearch_results"); await loadDemo();
  const orig = await mapVals();
  const dl = p.waitForEvent("download"); const bw = resp("mappingProfile", "build"); await p.click("text=Download mapping profile"); await bw;
  const d = await dl; const path = OUT + "/profile.json"; await d.saveAs(path); const prof = fs.readFileSync(path, "utf8"); const pj = JSON.parse(prof);
  const demoCsvValues = await p.evaluate(() => document.body.innerText); void demoCsvValues;
  ok(pj.kind === "catapult-source-mapping-profile" && pj.client === "pvas" && pj.table === "donorsearch_results" && !/token|actor|requestId|rows/.test(Object.keys(pj).join(",")) && /^[a-f0-9]{64}$/.test(pj.profileHash), "download: server-built profile, metadata keys only");
  await p.screenshot({ path: OUT + "/desktop-profile.png", fullPage: false });

  // 2) preview (synthetic token) then load profile: token/save reset, mapping restored, message shown
  await mapSelects().nth(1).selectOption(""); 
  let w = resp("preview"); await p.locator("button", { hasText: /^Preview$/ }).click(); await w;
  ok(await p.locator("button", { hasText: /^Save \d+ values$/ }).isVisible(), "precondition: synthetic token shows Save");
  w = resp("mappingProfile", "check"); await profIn.setInputFiles(fileOf("profile.json", prof)); await w; await p.locator("text=Mapping profile applied").waitFor();
  ok(!(await p.locator("button", { hasText: /^Save \d+ values$/ }).count()) && JSON.stringify(await mapVals()) === JSON.stringify(orig), "load: preview/token cleared, mapping restored from profile");
  await p.screenshot({ path: OUT + "/desktop-profile-applied.png", fullPage: false });

  // 3) edited body with old hash refused; same file can be re-chosen (input value reset)
  const ed = JSON.parse(prof); ed.mapping = ed.mapping.slice(0, -1);
  w = resp("mappingProfile", "check"); await profIn.setInputFiles(fileOf("edited.json", JSON.stringify(ed))); await w;
  ok(await p.locator("[role=alert]", { hasText: "integrity check failed" }).isVisible(), "edited profile with old hash refused");
  w = resp("mappingProfile", "check"); await profIn.setInputFiles(fileOf("edited.json", JSON.stringify(ed))); await w;
  ok(await p.locator("[role=alert]", { hasText: "integrity check failed" }).isVisible(), "same file chosen again is re-checked (input reset)");

  // 4) wrong table refused
  await pick("pvas", "board_info"); await loadDemo();
  w = resp("mappingProfile", "check"); await profIn.setInputFiles(fileOf("profile.json", prof)); await w;
  ok(await p.locator("[role=alert]", { hasText: "This profile is for pvas/donorsearch_results" }).isVisible(), "profile for another table refused");

  // 5) deferred server reply after client change does not install old mapping
  await pick("pvas", "donorsearch_results"); await loadDemo();
  let release; holdCheck = new Promise((r) => { release = r; }); const arrived = new Promise((r) => { checkArrived = r; });
  const late = resp("mappingProfile", "check");
  await profIn.setInputFiles(fileOf("profile.json", prof)); await arrived;
  await pick("wcbhc"); release(); await late; await frames();
  ok((await sel(0).inputValue()) === "wcbhc" && !(await p.locator("text=Mapping profile applied").count()) && !(await mapSelects().count()), "deferred profile check after client change: not applied to new selection");

  // 6) deferred FILE READ after client change: no check request sent, nothing installed
  await pick("pvas", "donorsearch_results"); await loadDemo();
  await p.evaluate(() => { const o = File.prototype.text; window.__rel = null; File.prototype.text = function () { const f = this; return new Promise((res) => { window.__rel = () => { File.prototype.text = o; o.call(f).then(res); }; }); }; });
  const before = sent.filter((s) => s.op === "mappingProfile" && s.action === "check").length;
  await profIn.setInputFiles(fileOf("profile.json", prof)); await p.waitForFunction(() => typeof window.__rel === "function");
  await pick("baq"); await p.evaluate(() => window.__rel()); await frames(); await frames();
  const after = sent.filter((s) => s.op === "mappingProfile" && s.action === "check").length;
  ok(after === before && (await sel(0).inputValue()) === "baq" && !(await p.locator("text=Mapping profile applied").count()), "deferred profile file read after client change: no check sent, nothing installed");


  // 7) same scope, delayed READ: token/Save cleared at once, preview/save/profile controls disabled, then applied
  await pick("pvas", "donorsearch_results"); await loadDemo();
  let w2 = resp("preview"); await p.locator("button", { hasText: /^Preview$/ }).click(); await w2;
  await p.evaluate(() => { const o = File.prototype.text; window.__rel = null; File.prototype.text = function () { const f = this; return new Promise((res) => { window.__rel = () => { File.prototype.text = o; o.call(f).then(res); }; }); }; });
  await profIn.setInputFiles(fileOf("profile.json", prof)); await p.waitForFunction(() => typeof window.__rel === "function"); await frames();
  const duringRead = { save: await p.locator("button", { hasText: /^Save \d+ values$/ }).count(), preview: await p.locator("button", { hasText: /^Preview$/ }).isDisabled(), prof: await profIn.isDisabled(), map: await mapSelects().first().isDisabled() };
  w2 = resp("mappingProfile", "check"); await p.evaluate(() => window.__rel()); await w2; await p.locator("text=Mapping profile applied").waitFor();
  ok(duringRead.save === 0 && duringRead.preview && duringRead.prof && duringRead.map && !(await profIn.isDisabled()), "same-scope delayed read: old token cleared immediately; preview/save/profile/mapping locked until done (no overlap)");

  // 8) same scope, delayed CHECK vs preview/save: preview locked while checking; reply applies without a stale token
  w2 = resp("preview"); await p.locator("button", { hasText: /^Preview$/ }).click(); await w2;
  let rel2; holdCheck = new Promise((r) => { rel2 = r; }); const arr2 = new Promise((r) => { checkArrived = r; });
  const late2 = resp("mappingProfile", "check"); await profIn.setInputFiles(fileOf("profile.json", prof)); await arr2; await frames();
  const duringCheck = { save: await p.locator("button", { hasText: /^Save \d+ values$/ }).count(), preview: await p.locator("button", { hasText: /^Preview$/ }).isDisabled() };
  rel2(); await late2; await p.locator("text=Mapping profile applied").waitFor();
  ok(duringCheck.save === 0 && duringCheck.preview && !(await p.locator("button", { hasText: /^Save \d+ values$/ }).count()) && !(await p.locator("button", { hasText: /^Preview$/ }).isDisabled()), "same-scope delayed check: no preview/save during check; applied mapping has no stale token");

  // mobile capture
  await p.setViewportSize({ width: 390, height: 900 }); await pick("pvas", "donorsearch_results"); await loadDemo();
  w = resp("mappingProfile", "check"); await profIn.setInputFiles(fileOf("profile.json", prof)); await w; await p.locator("text=Mapping profile applied").waitFor();
  await p.evaluate(() => window.scrollTo(0, 0)); await frames();
  await p.locator("text=Mapping profile applied").scrollIntoViewIfNeeded(); await frames();
  await p.screenshot({ path: OUT + "/mobile-profile-applied.png", fullPage: false });
  console.log("profile ops", JSON.stringify(sent.filter((s) => s.op === "mappingProfile")));
  console.log("external blocked", ext.length, [...new Set(ext)]);
  await b.close();
})();
