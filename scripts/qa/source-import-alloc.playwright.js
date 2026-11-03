// Rendered QA for the reserved first load UI (fictional new client). The page talks ONLY to Playwright-mocked
// /api/research-source-import responses (test-only interception; no Engage, no SQL); every non-localhost:3100 origin is aborted.
const { chromium } = require("playwright"); const crypto = require("crypto");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import";
const CTX = { allocatorDigest: "a".repeat(64), preparedDigest: "b".repeat(64), identityConfigDigest: "c".repeat(64), keyCol: "CPTID", externalKeyCol: "Source_ID", identityCols: ["Source_ID", "Account_Name"], sourceSystem: "fictional_crm", batchRows: 2 };
const DESTS = ["CPTID", "Source_ID", "Account_Name", "City"].map((c) => ({ col: c, ty: c === "CPTID" ? "int" : "nvarchar", st: "candidate", why: "prepared destination", key: c === "CPTID" ? "CPTID" : "" }));
const csv = (dup) => "Source_ID,Account_Name,City\n" + ["S-1", "S-2", "S-3", "S-4", dup ? "S-1" : "S-5"].map((s, i) => `${s},Org ${i + 1},Springfield`).join("\n") + "\n";
(async () => {
  const cookie = crypto.createHash("sha256").update("localpw:localsec").digest("hex");
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await ctx.addCookies([{ name: "catapult_research_auth", value: cookie, url: "http://localhost:3100" }]);
  const ext = []; const sent = [];
  await ctx.route((u) => new URL(u.href).origin !== "http://localhost:3100", (r) => { ext.push(new URL(r.request().url()).origin); return r.abort(); });
  const p = await ctx.newPage();
  const gates = {}; const waiters = {}; const plan = { reserve: [] , status: { hold: false, json: { found: true } } };
  const gate = (op) => new Promise((res) => { gates[op] = res; });
  const arrived = (op) => new Promise((res) => { waiters[op] = res; });
  await p.route("**" + API, async (route) => {
    const bd = JSON.parse(route.request().postData() || "{}"); sent.push({ op: bd.op, client: bd.client, batchIndex: bd.batchIndex, jobId: bd.jobId });
    if (waiters[bd.op]) { const w = waiters[bd.op]; delete waiters[bd.op]; w(); }
    const J = (json, status = 200) => route.fulfill({ status, json });
    switch (bd.op) {
      case "clients": return J({ clients: ["fictional_x", "pvas"], prepared: ["fictional_x"] });
      case "tables": return J({ registry: { rev: "r-fictional" }, applyEnabled: false, tables: bd.client === "fictional_x" ? [{ table: "master", candidate: 3 }] : [{ table: "master_pvas", candidate: 1 }] });
      case "provenance": return J({ summary: "unknown", rows: [] });
      case "fields": return J({ fields: DESTS });
      case "allocConfig": return bd.client === "fictional_x" ? J(CTX) : J({ error: "none" }, 404);
      case "jobStatus": return J({ found: false });
      case "allocReserve": { const r = plan.reserve.shift() || { json: { rows: [] } }; if (r.hold) await gate("allocReserve"); return J(r.json, r.status || 200); }
      case "allocPreview": return J({ token: "synthetic-token-" + bd.batchIndex, requestId: "e".repeat(32), job: { heldRows: 0 }, result: { counts: {} } });
      case "apply": return J({ records: 2, values: 4 });
      case "allocReserveStatus": { if (plan.status.hold) await gate("allocReserveStatus"); return J(plan.status.json); }
      default: return J({ error: "unexpected op " + bd.op }, 400);
    }
  });
  const bdy = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
  const resp = (op) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r).op === op, { timeout: 120000 });
  const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.goto("http://localhost:3100/research/source-import", { waitUntil: "load", timeout: 180000 });
  const sel = (i) => p.locator("select").nth(i);
  await sel(0).locator("option[value=fictional_x]").waitFor({ state: "attached", timeout: 120000 });
  const nb = p.locator("text=Necessary Only"); if (await nb.count()) await nb.first().click();
  const pick = async (client, table) => { let w = resp("tables"); await sel(0).selectOption(client); await w; if (table) { await sel(1).locator(`option[value=${table}]`).waitFor({ state: "attached" }); w = resp("fields"); const w2 = client === "fictional_x" ? resp("allocConfig") : null; await sel(1).selectOption(table); await w; if (w2) await w2; } };
  const load = async (dup) => { await p.locator("input[type=file]").setInputFiles({ name: dup ? "dup.csv" : "initial.csv", mimeType: "text/csv", buffer: Buffer.from(csv(dup)) }); await p.locator("text=Column mapping").waitFor(); await p.locator("input[placeholder^='Recorded as author']").first().fill("Pat Example (fictional)"); };
  await pick("fictional_x", "master");
  // A) duplicate source ID: stopped in the browser before any reservation
  await load(true); await p.locator("button", { hasText: /^Preview whole file/ }).click();
  await p.locator("text=appear more than once").waitFor();
  ok(!sent.some((s) => s.op === "allocReserve"), "duplicate source ID in file: refused before any reservation request");
  // B) plan -> confirm -> reserve batch 0 (deferred: scope locked) -> saved; batch 1 reservation unconfirmed -> stop
  await pick("pvas"); await pick("fictional_x", "master"); await load(false);
  await p.locator("button", { hasText: /^Preview whole file/ }).click(); await p.getByRole("heading", { name: "Whole-file plan" }).waitFor();
  ok(!sent.some((s) => s.op === "allocReserve"), "plan shown without reserving anything");
  plan.reserve = [{ hold: true, json: { rows: [] } }, { json: { unconfirmed: true, reserveRequestId: "d".repeat(32) }, status: 202 }];
  await p.locator("text=I reviewed the whole-file plan").click();
  const a = arrived("allocReserve"); await p.locator("button", { hasText: "Reserve CPTIDs and save ready batches" }).click(); await a;
  const locked = await p.evaluate(() => [...document.querySelectorAll("select, input[type=file], input[type=date]")].every((e) => e.disabled));
  ok(locked, "reservation pending: client/table/file/date/mapping controls disabled");
  const unconf = resp("allocReserve"); gates.allocReserve(); await unconf; await p.locator("text=Not confirmed").first().waitFor(); await frames();
  const order = sent.filter((s) => ["allocReserve", "allocPreview", "apply"].includes(s.op)).map((s) => s.op + (s.batchIndex ?? ""));
  ok(JSON.stringify(order) === JSON.stringify(["allocReserve0", "allocPreview0", "apply", "allocReserve1"]), "batch 0 reserve->preview->save; batch 1 unconfirmed reservation stops the run (no preview/save/next batch): " + order.join(","));
  ok(await p.locator("button", { hasText: "Check status" }).isVisible(), "unconfirmed reservation shows Check status (no new file/upload)");
  // C) check status (found) -> batch 1 ready again; re-run sends the SAME job/batch (server derives the same request id)
  let w = resp("allocReserveStatus"); await p.locator("button", { hasText: "Check status" }).click(); await w; await frames();
  ok((await p.innerText("body")).includes("Reservation confirmed; Save continues with the same CPTIDs"), "confirmed reservation: batch resumes with the same CPTIDs");
  const jobs = new Set(sent.filter((s) => s.op === "allocReserve").map((s) => s.jobId));
  plan.reserve = [{ json: { rows: [] } }, { json: { rows: [] } }];
  w = resp("apply"); await p.locator("button", { hasText: "Reserve CPTIDs and save ready batches" }).click(); await w;
  await p.locator("text=All 3 batches saved").waitFor({ timeout: 30000 }).catch(() => undefined);
  const r1 = sent.filter((s) => s.op === "allocReserve" && s.batchIndex === 1);
  ok(r1.length === 2 && r1[0].jobId === r1[1].jobId && jobs.size === 1, "resume re-sends batch 1 under the same job identity (no regenerated job, no new reservation identity)");
  await p.evaluate(() => window.scrollTo(0, 0)); await frames();
  await p.screenshot({ path: "/tmp/alloc-desktop.png", fullPage: true });
  // D) deferred reservation status that returns after a client change does not render into the new selection
  await pick("pvas"); await pick("fictional_x", "master"); await load(false);
  await p.locator("button", { hasText: /^Preview whole file/ }).click(); await p.getByRole("heading", { name: "Whole-file plan" }).waitFor();
  plan.reserve = [{ json: { unconfirmed: true, reserveRequestId: "d".repeat(32) }, status: 202 }];
  await p.locator("text=I reviewed the whole-file plan").click();
  w = resp("allocReserve"); await p.locator("button", { hasText: "Reserve CPTIDs and save ready batches" }).click(); await w; await p.locator("text=Not confirmed").first().waitFor();
  plan.status = { hold: true, json: { found: true } }; const s0 = arrived("allocReserveStatus");
  await p.locator("button", { hasText: "Check status" }).click(); await s0;
  await pick("pvas");
  const sd = resp("allocReserveStatus"); gates.allocReserveStatus(); await sd; await frames();
  ok(!(await p.innerText("body")).includes("Reservation confirmed") && (await sel(0).inputValue()) === "pvas", "deferred reservation status after client change: not rendered into the new selection");
  console.log("requests", JSON.stringify(sent.filter((s) => s.op.startsWith("alloc") || s.op === "apply")));
  console.log("external blocked", ext.length, [...new Set(ext)]);
  await b.close();
})();
