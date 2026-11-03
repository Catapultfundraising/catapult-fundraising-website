// Rendered local QA for the review-only durable Catapult Gift ID panel (ACTUAL component, local dev server).
// Production state is checked first against the ACTUAL route (empty registry => panel absent). All durable gift data
// after that is FICTIONAL and comes from test-only Playwright interception of durableGift* ops in THIS script (no
// application fixtures). Every origin other than exactly http://localhost:3100 is aborted. No sleeps.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const OUT = process.env.OUT || "/tmp/qa-durable"; fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = "http://localhost:3100"; const CAPTURE = process.env.CAPTURE || "";
const CSV = "Donor,Amount,Date,Type\r\n7001,100.00,2026-01-05,Gift\r\n7002,5,2026-01-06,Gift\r\n7003,7,2026-01-07,Pledge\r\n7004,9,2026-01-08,Gift\r\n";
const UUID = "0000aaaa-0000-4000-8000-00000000abcd";
const VALUES = { Gift_Amount: { v: "7", readable: true }, Gift_Date: { v: "2026-01-07T00:00:00", readable: true }, Record_Type: { v: "Gift", readable: true } };
(async () => {
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const blocked = [];
  for (const vp of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile390", width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, extraHTTPHeaders: { "x-forwarded-proto": "https" }, acceptDownloads: true });
    await ctx.addCookies([{ name: "catapult_research_auth", value: crypto.createHash("sha256").update("localpw:localsec").digest("hex"), url: ORIGIN }]);
    await ctx.route((u) => new URL(u.href).origin !== ORIGIN, (r) => { blocked.push(new URL(r.request().url()).origin); return r.abort(); });
    const p = await ctx.newPage();
    const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const bdy = (r) => { try { return JSON.parse(r.postData() || "{}"); } catch { return {}; } };
    const resp = (op) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r.request()).op === op, { timeout: 120000 });
    await p.goto(ORIGIN + "/research/source-import", { waitUntil: "load", timeout: 180000 });
    await frames(); const nb = p.locator("button", { hasText: "Necessary Only" }); if (await nb.count()) await nb.first().click();
    const sel0 = p.locator("select").first(); await sel0.locator("option[value=jag]").waitFor({ state: "attached", timeout: 120000 });
    if (CAPTURE === "collapsed") { // identical steps on both heads (before head has no durable op): jag selected, nothing loaded
      const wt = resp("tables"); await sel0.selectOption("jag"); await wt; await frames(); await p.evaluate(() => window.scrollTo(0, 0)); await frames();
      await p.screenshot({ path: `${OUT}/${vp.name}-collapsed-view.png` }); await ctx.close(); continue; }
    // 1) production state: actual route, empty registry => no durable panel
    let w = resp("durableGiftContext"); await sel0.selectOption("jag"); const real = await (await w).json(); await frames();
    ok(real.available === false && await p.locator("[data-testid=durable-gift]").count() === 0, `${vp.name}: actual route with empty registry => durable panel absent (production state)`);
    // 2) fictional mocked registration (test-only interception)
    const sent = []; let commitsInFlight = 0, maxInFlight = 0; let deferPersons = null; let batch1Calls = 0; let proofCalls = 0;
    await p.route("**" + API, async (route) => {
      const bd = bdy(route.request()); if (!String(bd.op || "").startsWith("durableGift")) return route.continue();
      sent.push(bd);
      const J = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
      if (bd.client !== "jag") return J({ available: false });
      if (bd.op === "durableGiftContext") return J({ available: true, configured: true, saveAvailable: true, registrationId: "fict_gifts", columns: ["Gift_Amount", "Gift_Date", "Record_Type"], required: ["Gift_Amount", "Gift_Date"], rowCap: 18, newAllowed: true });
      if (bd.op === "durableGiftPreview") {
        if (bd.query.kind === "persons") { if (deferPersons) { const g = deferPersons; deferPersons = null; await g.p; } return J({ persons: bd.query.persons.map((x) => ({ person: x, masterMatches: x === 7004 ? 0 : 1, portalOverlay: false, portalProspect: false })), giftOverridesActive: false }); }
        if (bd.query.kind === "locators") return J({ rows: [{ locator: 41, person: 7003, personReadable: true, values: VALUES, giftId: null, donorMismatch: false, baseline: null }], giftOverridesActive: false });
        if (bd.query.kind === "gifts") return J({ gifts: [{ giftId: UUID, found: true, locator: 12 }], rows: [{ locator: 12, person: 7002, personReadable: true, values: { ...VALUES, Gift_Amount: { v: "4", readable: true } }, giftId: UUID, donorMismatch: false, baseline: { Gift_Amount: { present: true, provenance: "source", equalsCurrent: true }, Gift_Date: { present: true, provenance: "source", equalsCurrent: true }, Record_Type: { present: true, provenance: null, equalsCurrent: null } } }], giftOverridesActive: false });
      }
      if (bd.op === "durableGiftPlan") return J({ token: "tok", jobId: "f".repeat(64), manifest: { batches: [{}, {}] }, batches: [[{ ordinal: 0 }], [{ ordinal: 2 }]], summary: { batches: 2, decided: 2, held: 2, total: 4 } });
      if (bd.op === "durableGiftCommit") {
        commitsInFlight++; maxInFlight = Math.max(maxInFlight, commitsInFlight);
        await new Promise((r) => setImmediate(r)); commitsInFlight--;
        if (bd.batchIndex === 1) { batch1Calls++; if (batch1Calls === 1) return J({ error: "Save outcome unconfirmed.", code: "unconfirmed", requestId: "a".repeat(32) }, 502); }
        return J({ committed: true });
      }
      if (bd.op === "durableGiftProof") { proofCalls++; return J(proofCalls === 1 ? { confirmed: false, requestId: "a".repeat(32) } : { confirmed: true, proof: `proof-${bd.batchIndex}`, requestId: "b".repeat(32) }); }
      if (bd.op === "durableGiftExport") return J({ fileName: "fictional-gifts-catapult-gift-ids.csv", csv: "x", proven: 1, held: 2, unconfirmed: 1 });
      return J({ error: "unknown" }, 400);
    });
    const outer = p.locator("select").first();
    w = resp("durableGiftContext"); await outer.selectOption("csnf"); await w; w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
    const sec = p.locator("[data-testid=durable-gift]"); await sec.waitFor();
    ok(!(await sec.evaluate((e) => e.open)), `${vp.name}: mocked registration => durable panel rendered collapsed`);
    await sec.locator("summary").click();
    await sec.locator("input[aria-label='Durable gift export']").setInputFiles({ name: "fictional gifts_2026.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
    await sec.locator("select[aria-label='Map Donor']").waitFor();
    for (const [h, v] of [["Donor", "@person"], ["Amount", "Gift_Amount"], ["Date", "Gift_Date"], ["Type", "Record_Type"]]) await sec.locator(`select[aria-label='Map ${h}']`).selectOption(v);
    await sec.locator("input[aria-label='Your name']").fill("Pat Example");
    const decide = async (line, d, target) => { await sec.locator(`select[aria-label='Decision line ${line}']`).selectOption(d); if (target) await sec.locator(`input[aria-label='Target line ${line}']`).fill(target); };
    ok((await sec.locator("[data-testid=durable-rows] tbody tr").allInnerTexts()).every((t) => /held/.test(t)), `${vp.name}: every row starts held`);
    await decide(2, "new"); await decide(3, "correct", UUID); await decide(4, "adopt", "41"); await decide(5, "new");
    // 3) scope change while a read is pending drops the late reply
    let rel; deferPersons = { p: new Promise((r) => { rel = r; }) };
    const rq = p.waitForRequest((r) => r.url().endsWith(API) && bdy(r).op === "durableGiftPreview");
    await sec.locator("button", { hasText: "Check decisions" }).click(); await rq;
    w = resp("durableGiftContext"); await outer.selectOption("csnf"); await w; rel(); await frames(); await frames();
    ok(await p.locator("[data-testid=durable-gift]").count() === 0 && await p.locator("text=eligible (advisory)").count() === 0 && await p.locator("text=not found exactly once").count() === 0, `${vp.name}: client change during a pending read => late reply ignored (no stale panel/state)`);
    w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
    const s2 = p.locator("[data-testid=durable-gift]"); await s2.locator("summary").click();
    await s2.locator("input[aria-label='Durable gift export']").setInputFiles({ name: "fictional gifts_2026.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
    for (const [h, v] of [["Donor", "@person"], ["Amount", "Gift_Amount"], ["Date", "Gift_Date"], ["Type", "Record_Type"]]) await s2.locator(`select[aria-label='Map ${h}']`).selectOption(v);
    await s2.locator("input[aria-label='Your name']").fill("Pat Example");
    const d2 = async (line, d, target) => { await s2.locator(`select[aria-label='Decision line ${line}']`).selectOption(d); if (target) await s2.locator(`input[aria-label='Target line ${line}']`).fill(target); };
    await d2(2, "new"); await d2(3, "correct", UUID); await d2(4, "adopt", "41"); await d2(5, "new");
    const btnCheck = s2.locator("button", { hasText: "Check decisions" }); await btnCheck.click();
    await s2.locator("text=eligible (advisory)").first().waitFor();
    const cells = await s2.locator("[data-testid=durable-rows] tbody tr td:last-child").allInnerTexts();
    ok(/eligible/.test(cells[0]) && /no source-owned baseline/.test(cells[1]) && /eligible/.test(cells[2]) && /not found exactly once/.test(cells[3]), `${vp.name}: picker reasons: new ok, correct held (manual baseline), adopt ok, unknown donor held`);
    let wp = resp("durableGiftPlan"); await s2.locator("button", { hasText: "Plan save" }).click(); const planReq = bdy((await wp).request());
    ok(planReq.decisions.map((d) => d.d).join(",") === "new,held,adopt,held" && planReq.decisions[2].expected.Gift_Amount === "7", `${vp.name}: ineligible rows sent as held; adopt carries the exact preview snapshot`);
    const plan = s2.locator("[data-testid=durable-plan]"); await plan.waitFor();
    const saveBtn = plan.locator("button", { hasText: "Save batches" });
    ok(await saveBtn.isDisabled(), `${vp.name}: save needs the whole-file confirmation`);
    await plan.locator("input[aria-label='Confirm whole-file save']").check();
    // 4) double click => strictly sequential, single flight; batch 2 unconfirmed stops the run
    await saveBtn.dblclick(); await plan.locator("text=unconfirmed").first().waitFor(); await frames();
    const commits = () => sent.filter((x) => x.op === "durableGiftCommit");
    ok(maxInFlight === 1 && commits().length === 2, `${vp.name}: double-click => one request in flight, batches sent in order (${commits().length} sends)`);
    await saveBtn.click(); await frames(); await frames();
    ok(commits().length === 2, `${vp.name}: unconfirmed batch is NOT resent before a status check`);
    w = resp("durableGiftProof"); await plan.locator("button", { hasText: "Check status" }).last().click(); await w; await frames();
    w = resp("durableGiftCommit"); await saveBtn.click(); await w; await frames();
    const c = commits(); ok(c.length === 3 && c[2].batchIndex === 1 && JSON.stringify(c[2].rows) === JSON.stringify(c[1].rows) && c[2].token === c[1].token, `${vp.name}: after a non-confirming status check, THIS batch is resent with the same token/payload (same derived request id)`);
    for (let i = 0; i < 2; i++) { const bt = plan.locator("button", { hasText: "Check status" }).first(); if (await bt.count()) { w = resp("durableGiftProof"); await bt.click(); await w; await frames(); } }
    if (CAPTURE === "expanded") { // capture-only: dismiss cookie banner, make the sticky site header static (disclosed; app unchanged)
      const nb3 = p.locator("button", { hasText: "Necessary Only" }); if (await nb3.count()) { await nb3.first().click({ force: true }); await nb3.first().waitFor({ state: "detached" }); }
      await p.addStyleTag({ content: "header, [class*='sticky'] { position: static !important; } nextjs-portal { display: none !important; }" });
      await p.evaluate(() => window.scrollTo(0, 0)); await frames(); await s2.screenshot({ path: `${OUT}/${vp.name}-panel-expanded.png` }); if (vp.name === "mobile390") { await s2.locator(".overflow-x-auto").evaluate((e) => { e.scrollLeft = e.scrollWidth; }); await frames(); await s2.screenshot({ path: `${OUT}/${vp.name}-panel-scrolled.png` }); } }
    w = resp("durableGiftExport"); const dl = p.waitForEvent("download"); await plan.locator("button", { hasText: "Download review copy" }).click(); const ex = bdy((await w).request()); const d = await dl;
    ok(d.suggestedFilename() === "fictional-gifts-catapult-gift-ids.csv" && Array.isArray(ex.proofs) && ex.proofs.every((x) => /^proof-/.test(x)), `${vp.name}: export sends only server proofs; hyphenated filename`);
    await ctx.close();
  }
  console.log("blocked external origins:", JSON.stringify([...new Set(blocked)]), "count", blocked.length);
  await b.close();
})();
