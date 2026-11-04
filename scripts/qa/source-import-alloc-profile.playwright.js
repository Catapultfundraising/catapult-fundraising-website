// UI MOCK coverage (not actual-route coverage): mapping profile download/load for a FICTIONAL allocator-registered
// new client. The page talks ONLY to Playwright-mocked /api/research-source-import responses (test-only interception;
// no Engage, no SQL, no app test hooks). Actual server validation of allocator profiles is covered separately by the
// synthetic actual-route test in scripts/test-source-mapping-profile.ts. Every origin other than exactly
// http://localhost:3100 is aborted. No sleeps.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const OUT = process.env.QA_OUT || "/tmp/qa-alloc-profile"; fs.mkdirSync(OUT, { recursive: true });
const CTX = { allocatorDigest: "a".repeat(64), preparedDigest: "b".repeat(64), identityConfigDigest: "c".repeat(64), keyCol: "CPTID", externalKeyCol: "Source_ID", identityCols: ["Source_ID", "Account_Name"], sourceSystem: "fictional_crm", batchRows: 2, columns: ["Source_ID", "Account_Name", "City"], masterTable: "master", saveAvailable: false };
const DESTS = ["CPTID", "Source_ID", "Account_Name", "City"].map((c) => ({ col: c, ty: c === "CPTID" ? "int" : "nvarchar", st: "candidate", why: "prepared destination", key: c === "CPTID" ? "CPTID" : "" }));
const CSV = "Source_ID,Account_Name,City\nS-1,Org 1,Springfield\nS-2,Org 2,\n";
(async () => {
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" }, acceptDownloads: true });
  await ctx.addCookies([{ name: "catapult_research_auth", value: crypto.createHash("sha256").update("localpw:localsec").digest("hex"), url: "http://localhost:3100" }]);
  const ext = []; const sent = [];
  await ctx.route((u) => new URL(u.href).origin !== "http://localhost:3100", (r) => { ext.push(new URL(r.request().url()).origin); return r.abort(); });
  const p = await ctx.newPage();
  await p.route("**" + API, async (route) => {
    const bd = JSON.parse(route.request().postData() || "{}"); sent.push(bd);
    const J = (json, status = 200) => route.fulfill({ status, json });
    switch (bd.op) {
      case "clients": return J({ clients: ["fictional_x"], prepared: ["fictional_x"] });
      case "tables": return J({ registry: { rev: "r-fictional" }, applyEnabled: false, tables: [{ table: "master", candidate: 3 }] });
      case "provenance": return J({ summary: "unknown", rows: [] });
      case "fields": return J({ fields: DESTS });
      case "allocConfig": return J(CTX);
      case "jobStatus": return J({ found: false });
      case "mappingProfile": {
        // mocked metadata-only server replies, shaped like the real op (server-owned external key)
        if (bd.action === "build") return J({ profile: { kind: "catapult-source-mapping-profile", v: 1, client: bd.client, table: bd.table, registryRev: "1".repeat(64), keyCol: "Source_ID", keyKind: "external", destsDigest: "2".repeat(64), ctx: { prepared: "b".repeat(64), allocator: "a".repeat(64), insertPolicy: null }, headers: bd.headers, mapping: Object.entries(bd.mapping).filter(([, d]) => d), profileHash: "3".repeat(64) } });
        if (bd.action === "check") { const pj = JSON.parse(bd.profile); const m = Object.fromEntries(bd.headers.map((h) => [h, ""])); for (const [h, d] of pj.mapping) m[h] = d; return J({ mapping: m, unmapped: [], held: [] }); }
        return J({ error: "unknown action" }, 400);
      }
      default: return J({ error: "unexpected op " + bd.op }, 400);
    }
  });
  const bdy = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
  const resp = (op, action) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r).op === op && (!action || bdy(r).action === action), { timeout: 120000 });
  const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.goto("http://localhost:3100/research/source-import", { waitUntil: "load", timeout: 180000 });
  const sel = (i) => p.locator("select").nth(i);
  await sel(0).locator("option[value=fictional_x]").waitFor({ state: "attached", timeout: 120000 });
  const nb = p.locator("text=Necessary Only"); if (await nb.count()) await nb.first().click();
  let w = resp("tables"); await sel(0).selectOption("fictional_x"); await w;
  await sel(1).locator("option[value=master]").waitFor({ state: "attached" });
  w = resp("fields"); const w2 = resp("allocConfig"); await sel(1).selectOption("master"); await w; await w2;
  await p.locator("input[type=file]").first().setInputFiles({ name: "initial.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
  await p.locator("text=Column mapping").waitFor(); await frames();
  const maps = p.locator("section:has(h2:text('Column mapping')) select");
  const vals = async () => { const o = []; for (let i = 0; i < await maps.count(); i++) o.push(await maps.nth(i).inputValue()); return o; };
  const orig = await vals();
  await p.locator("input[placeholder^='Recorded as author']").first().fill("Pat Example (fictional)");
  ok(JSON.stringify(orig) === JSON.stringify(["Source_ID", "Account_Name", "City"]) && await p.locator("button", { hasText: /^Preview whole file/ }).isEnabled(), "allocator client: external-identity mapping without CPTID; preview enabled");
  const dl = p.waitForEvent("download"); w = resp("mappingProfile", "build"); await p.click("text=Download mapping profile"); const br = await w;
  const d = await dl; const path = OUT + "/alloc-profile.json"; await d.saveAs(path); const prof = fs.readFileSync(path, "utf8"); const pj = JSON.parse(prof);
  const buildReq = bdy(br);
  ok(br.status() === 200 && !Object.values(buildReq.mapping).includes("CPTID") && buildReq.mapping.Source_ID === "Source_ID" && pj.keyCol === "Source_ID" && !/"S-1"|Org 1|Springfield/.test(prof), "download: build sent without CPTID; profile keyed on external Source_ID, no row values");
  ok(!(await p.locator("[role=alert]", { hasText: /CPTID|\S/ }).count()), "no 'Map a column to the key CPTID' error");
  await maps.nth(0).selectOption(""); await maps.nth(1).selectOption("");
  w = resp("mappingProfile", "check"); await p.locator("input[aria-label='Load mapping profile']").setInputFiles({ name: "alloc-profile.json", mimeType: "application/json", buffer: Buffer.from(prof) }); await w;
  await p.locator("text=Mapping profile applied").waitFor();
  ok(JSON.stringify(await vals()) === JSON.stringify(orig) && !(await p.locator("[role=alert]", { hasText: /CPTID|\S/ }).count()) && await p.locator("button", { hasText: /^Preview whole file/ }).isEnabled(), "load: external identity mapping restored (Source_ID, Account_Name, City), no CPTID demanded");
  ok(!sent.some((s) => ["allocReserve", "allocPreview", "apply"].includes(s.op)), "no reservation/preview/save requests sent by profile actions");
  await p.screenshot({ path: OUT + "/desktop-alloc-profile.png" });
  console.log("ops", JSON.stringify(sent.map((s) => s.op + (s.action ? ":" + s.action : ""))));
  console.log("external blocked", ext.length, [...new Set(ext)]);
  await b.close();
})();
