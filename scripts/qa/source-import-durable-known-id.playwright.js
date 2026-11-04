// Rendered local QA for F2b known-ID mode (ACTUAL component, local dev server). All data is FICTIONAL and comes from
// test-only Playwright interception of durableGift* ops in THIS script (no application fixtures, no real backend; the
// mocked plan/recovery packet uses stub signatures and is NOT a valid server-signed packet). Every origin other than
// exactly http://localhost:3100 is aborted. Waits are request/response/locator events only.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const ORIGIN = "http://localhost:3100"; const OUT = process.env.OUT || "/tmp/qa-known"; fs.mkdirSync(OUT, { recursive: true });
const CAPTURE = process.env.CAPTURE || "";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const canon = (x) => (Array.isArray(x) ? x.map(canon) : isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
const U = (n) => `0000${String(n).padStart(4, "0")}-0000-4000-8000-00000000abcd`;
const N = 606;
const cell = (i) => (i % 10 === 0 ? "" : i % 10 === 3 ? U(i).toUpperCase() : i % 10 === 4 ? "PROV-0123456789abcdef0123456789abcdef" : i === 7 || i === 17 ? U(7) : U(i));
const CSV = "Donor,Amount,Type,Known\r\n" + Array.from({ length: N }, (_, i) => `${7000 + i},1,Gift,${cell(i)}`).join("\r\n") + "\r\n";
const VALID = new Set(Array.from({ length: N }, (_, i) => cell(i)).filter((u, i, a) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u) && a.indexOf(u) === a.lastIndexOf(u)));
const ordOf = (u) => Number(u.slice(4, 8));
const SRC = { present: true, provenance: "source", equalsCurrent: true };
const locOf = (o) => (o === 5 || o === 6 ? 9999 : 5000 + o);
const rowFor = (loc) => { const o = loc === 9999 ? 5 : loc - 5000;
  return { locator: loc, person: o === 8 ? 1 : 7000 + o, personReadable: true, values: { Gift_Amount: { v: "5", readable: true }, Record_Type: { v: "Gift", readable: true } }, giftId: loc === 9999 ? U(5) : U(o),
    identityConflict: o === 11, donorMismatch: o === 9, baseline: { Gift_Amount: o === 12 ? { present: true, provenance: "manual", equalsCurrent: true } : SRC, Record_Type: o === 15 ? { present: true, provenance: null, equalsCurrent: null } : SRC } }; };
const PICK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 601];
(async () => {
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const blocked = [];
  for (const vp of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile390", width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, extraHTTPHeaders: { "x-forwarded-proto": "https" }, acceptDownloads: true });
    await ctx.addCookies([{ name: "catapult_research_auth", value: sha("localpw:localsec"), url: ORIGIN }]);
    await ctx.route((u) => new URL(u.href).origin !== ORIGIN, (r) => { blocked.push(new URL(r.request().url()).origin); return r.abort(); });
    const p = await ctx.newPage();
    const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const bdy = (r) => { try { return JSON.parse(r.postData() || "{}"); } catch { return {}; } };
    const isOp = (r, op) => r.url().endsWith(API) && bdy(r).op === op;
    const resp = (op) => p.waitForResponse((r) => isOp(r.request(), op), { timeout: 120000 });
    await p.goto(ORIGIN + "/research/source-import", { waitUntil: "load", timeout: 180000 });
    await frames(); const nb = p.locator("button", { hasText: "Necessary Only" }); if (await nb.count()) await nb.first().click();
    const outer = p.locator("select").first(); await outer.locator("option[value=jag]").waitFor({ state: "attached", timeout: 120000 });
    const log = []; let planned = null; let TABLE = "";
    await p.route("**" + API, async (route) => {
      const bd = bdy(route.request()); if (!String(bd.op || "").startsWith("durableGift")) return route.continue();
      log.push(bd); const J = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
      if (bd.op === "durableGiftContext") { TABLE = bd.table; return J({ available: true, lookupAvailable: true, configured: true, saveAvailable: true, registrationId: "fict_gifts", columns: ["Gift_Amount", "Record_Type"], colDefs: [{ col: "Gift_Amount", ty: "decimal", len: null, p: 19, s: 4 }, { col: "Record_Type", ty: "nvarchar", len: -1, p: null, s: null }], required: [], rowCap: 18, newAllowed: true }); }
      if (bd.op === "durableGiftPreview") { const q = bd.query;
        if (q.kind === "persons") return J({ persons: q.persons.map((x) => ({ person: x, masterMatches: 1, portalOverlay: false, portalProspect: false })), giftOverridesActive: false });
        if (q.kind === "gifts") { const locs = [...new Set(q.giftIds.map((g) => locOf(ordOf(g))))]; return J({ gifts: q.giftIds.map((g) => ({ giftId: g, found: true, locator: locOf(ordOf(g)) })), rows: locs.map(rowFor), giftOverridesActive: false }); }
        if (q.kind === "locators") return J({ rows: q.locators.map(rowFor), giftOverridesActive: false }); }
      if (bd.op === "durableGiftPlan") {
        const rows = bd.decisions.filter((d) => d.d === "correct").map((d) => ({ ordinal: d.o, action: "correct", giftId: d.giftId, person: 7000 + d.o, values: { Gift_Amount: "1" }, expected: d.expected }));
        const hash = sha(JSON.stringify(rows.map((r) => sha(JSON.stringify(canon(r))))));
        const JOB = "d".repeat(64); const manifest = { batches: [{ first: 0, last: rows.length - 1, hash }], decided: rows.map((r) => ({ o: r.ordinal, a: "correct", t: r.giftId, l: null, p: r.person, h: sha(JSON.stringify(canon(r))) })), held: bd.decisions.filter((d) => d.d === "held").map((d) => d.o), totalOrdinals: N, batchCount: 1, batchRows: 29 };
        const header = { v: 1, type: "durable-gift-recovery/v1", client: "jag", table: TABLE, jobId: JOB, manifest, partHashes: [hash], batchCount: 1, batchRows: 29, fileDigest: sha(CSV), fileName: "known.csv", fileDate: null, actor: "Pat Example" };
        planned = { rows, JOB }; return J({ token: "tok", jobId: JOB, recovery: { header, headerMac: "A".repeat(43) }, manifest, batches: [rows], summary: { batches: 1, decided: rows.length, held: N - rows.length, total: N } }); }
      if (bd.op === "durableGiftRenew") return J({ token: "renewed", jobId: planned.JOB });
      if (bd.op === "durableGiftProof") return J({ confirmed: false, state: "pending", requestId: sha(`${planned.JOB}:${bd.batchIndex}`).slice(0, 32) });
      return J({ error: "unknown" }, 400);
    });
    let w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
    const sec = p.locator("[data-testid=durable-gift]"); await sec.waitFor(); await sec.locator("summary").click();
    await sec.locator("input[aria-label='Durable gift export']").setInputFiles({ name: "known.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
    await sec.locator("select[aria-label='Map Donor']").waitFor();
    for (const [h, v] of [["Donor", "@person"], ["Amount", "Gift_Amount"], ["Type", "Record_Type"], ["Known", "@giftId"]]) await sec.locator(`select[aria-label='Map ${h}']`).selectOption(v);
    await sec.locator("input[aria-label='Your name']").fill("Pat Example");
    const opts = await sec.locator("select[aria-label='Decision row 1'] option").allInnerTexts();
    ok(opts.join("|") === "Held|Correct existing ID (from file)" && (await sec.locator("[data-testid=durable-rows] tbody tr").allInnerTexts()).every((t) => /held/.test(t)), `${vp.name}: @giftId mode => every row starts held; only held/correct offered`);
    const next = sec.locator("button", { hasText: "Next rows" }), prev = sec.locator("button", { hasText: "Previous rows" });
    for (const o of PICK.filter((x) => x < 25)) await sec.locator(`select[aria-label='Decision row ${o + 1}']`).selectOption("correct");
    ok(await sec.locator("input[aria-label='Target row 2']").inputValue() === U(1) && !(await sec.locator("input[aria-label='Target row 2']").isEditable()), `${vp.name}: target filled read-only from the row's own file ID`);
    for (let k = 0; k < 24; k++) await next.click();
    await sec.locator("select[aria-label='Decision row 602']").selectOption("correct");
    for (let k = 0; k < 24; k++) await prev.click();
    const n0 = log.length;
    const lastPrev = p.waitForResponse((r) => isOp(r.request(), "durableGiftPreview") && bdy(r.request()).query.kind === "locators", { timeout: 120000 }).catch(() => null);
    await sec.locator("button", { hasText: "Check decisions" }).click(); await sec.locator("text=eligible (advisory)").first().waitFor({ timeout: 15000 }).catch(async (e) => { console.log("ALERT", await sec.locator("[role=alert]").allInnerTexts(), (await sec.locator("[data-testid=durable-rows] tbody tr td:last-child").allInnerTexts()).slice(0, 16)); throw e; }); void lastPrev;
    const sentIds = log.slice(n0).filter((x) => x.op === "durableGiftPreview" && x.query.kind === "gifts").flatMap((x) => x.query.giftIds);
    const expectIds = [1, 2, 5, 6, 8, 9, 11, 12, 15, 601].map(U);
    ok(sentIds.length === expectIds.length && expectIds.every((u) => sentIds.includes(u)) && sentIds.every((u) => VALID.has(u)), `${vp.name}: only distinct valid file IDs previewed (no blank/uppercase/PROV/duplicate sent)`);
    const cellTxt = async (o) => (await sec.locator("[data-testid=durable-rows] tbody tr").nth(o % 25).locator("td").last().innerText());
    const want = { 0: /blank Catapult Gift ID/, 1: /eligible/, 2: /eligible/, 3: /not a valid Catapult Gift ID/, 4: /not a valid Catapult Gift ID/, 5: /two IDs point to one gift row/, 6: /two IDs point to one gift row/, 7: /duplicate Catapult Gift ID/, 8: /file donor|donor differs/, 9: /drift/, 11: /conflicting identities/, 12: /Gift_Amount changes but has no source-owned baseline/, 15: /eligible/ };
    let allOk = true; for (const [o, re] of Object.entries(want)) { const t = await cellTxt(Number(o)); if (!re.test(t)) { allOk = false; console.log("row", Number(o) + 1, t); } }
    ok(allOk, `${vp.name}: fixed holds: blank, invalid, two-IDs-one-row, duplicate, donor mismatch, drift, identity conflict, manual baseline on changed column; untouched unknown baseline allowed`);
    if (CAPTURE) { const nb3 = p.locator("button", { hasText: "Necessary Only" }); if (await nb3.count()) { await nb3.first().click({ force: true }); await nb3.first().waitFor({ state: "detached" }); }
      await p.addStyleTag({ content: "header, [class*='sticky'] { position: static !important; } nextjs-portal { display: none !important; }" });
      const tbl = sec.locator("[data-testid=durable-rows]"); await tbl.scrollIntoViewIfNeeded(); await frames();
      if (vp.name === "mobile390") { await tbl.evaluate((e) => { const th = e.querySelectorAll("th"); e.scrollLeft = th[th.length - 1].offsetLeft - 8; }); await frames(); await tbl.screenshot({ path: `${OUT}/${vp.name}-known-id-checkcolumn.png` }); await tbl.evaluate((e) => { e.scrollLeft = 0; }); }
      else await tbl.screenshot({ path: `${OUT}/${vp.name}-known-id-rows.png` }); }
    for (let k = 0; k < 24; k++) await next.click();
    ok(/eligible/.test(await cellTxt(601)), `${vp.name}: later-page (row 602) correction checked and eligible`);
    for (let k = 0; k < 24; k++) await prev.click();
    w = resp("durableGiftPlan"); await sec.locator("button", { hasText: "Plan save" }).click(); const pr = bdy((await w).request());
    const corr = pr.decisions.filter((d) => d.d === "correct");
    ok(pr.decisions.length === N && corr.map((d) => d.o).join() === "1,2,15,601" && corr.every((d) => d.giftId === U(d.o) && d.expected.Gift_Amount === "5") && !pr.decisions.some((d) => d.d === "new" || d.d === "adopt") && pr.mapping.Known === "@giftId", `${vp.name}: plan sends exactly the 4 eligible corrections (own file IDs, exact snapshots), everything else held; no duplicate slipped in`);
    const plan = sec.locator("[data-testid=durable-plan]"); await plan.waitFor();
    const dl = p.waitForEvent("download"); await plan.locator("button", { hasText: "Download recovery file" }).click(); const d = await dl; const recPath = await d.path(); const rec = fs.readFileSync(recPath);
    if (CAPTURE) { const nb3 = p.locator("button", { hasText: "Necessary Only" }); if (await nb3.count()) { await nb3.first().click({ force: true }); await nb3.first().waitFor({ state: "detached" }); }
      await p.addStyleTag({ content: "header, [class*='sticky'] { position: static !important; } nextjs-portal { display: none !important; }" }); await p.evaluate(() => window.scrollTo(0, 0)); await frames(); await sec.screenshot({ path: `${OUT}/${vp.name}-known-id.png` }); }
    // restore the downloaded known-ID job on a fresh page: same targets, status before anything
    await p.reload({ waitUntil: "load" }); await frames(); if (await nb.count()) await nb.first().click();
    w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
    const s2 = p.locator("[data-testid=durable-gift]"); await s2.locator("summary").click();
    const lp = resp("durableGiftProof"); await s2.locator("input[aria-label='Restore from recovery file']").setInputFiles({ name: "known-recovery.json", mimeType: "application/json", buffer: rec }); await lp;
    await s2.locator("[role=status]", { hasText: "Restored" }).waitFor();
    const restoredRows = JSON.parse(rec.toString()).parts[0].rows;
    ok(restoredRows.map((r) => `${r.ordinal}:${r.giftId}`).join() === planned.rows.map((r) => `${r.ordinal}:${r.giftId}`).join() && await s2.locator("[data-testid=durable-batches] li").first().getAttribute("data-state") === "pending", `${vp.name}: restore keeps the same row-target bindings; status checked before any send`);
    await ctx.close();
  }
  console.log("blocked external origins:", JSON.stringify([...new Set(blocked)]), "count", blocked.length);
  await b.close();
})();
