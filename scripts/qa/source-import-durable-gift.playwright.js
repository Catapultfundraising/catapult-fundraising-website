// Rendered local QA for the review-only durable Catapult Gift ID panel (ACTUAL component, local dev server).
// Production state is checked first against the ACTUAL route (empty registry => panel absent). All durable gift data
// after that is FICTIONAL and comes from test-only Playwright interception of durableGift* ops in THIS script (no
// application fixtures). Every origin other than exactly http://localhost:3100 is aborted. No sleeps or polling loops:
// waits are request/response/locator events.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const OUT = process.env.OUT || "/tmp/qa-durable"; fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = "http://localhost:3100"; const CAPTURE = process.env.CAPTURE || "";
const CSV = "Donor,Amount,Date,Type\r\n7001,100.00,2026-01-05,Gift\r\n7002,5,2026-01-06,Gift\r\n7003,7,2026-01-07,Pledge\r\n7004,9,2026-01-08,Gift\r\n7005,3,2026-01-09,Gift\r\n";
const UUID = "0000aaaa-0000-4000-8000-00000000abcd", UUID2 = "0000eeee-0000-4000-8000-00000000abcd";
const JOB = "f".repeat(64); const rid = (i) => crypto.createHash("sha256").update(`${JOB}:${i}`).digest("hex").slice(0, 32);
const VALUES = { Gift_Amount: { v: "7", readable: true }, Gift_Date: { v: "2026-01-07T00:00:00", readable: true }, Record_Type: { v: "Gift", readable: true } };
const SRC = { present: true, provenance: "source", equalsCurrent: true }, UNK = { present: true, provenance: null, equalsCurrent: null }, MAN = { present: true, provenance: "manual", equalsCurrent: true };
const BATCHES = [[{ ordinal: 0, action: "new" }, { ordinal: 1, action: "correct", giftId: UUID }], [{ ordinal: 2, action: "adopt", locator: 41 }]];
const outcome = (i) => ({ committed: true, requestId: rid(i), outcome: { requestId: rid(i), client: "jag", registrationId: "fict_gifts", committed: true, counts: { new: BATCHES[i].filter((r) => r.action === "new").length, adopt: BATCHES[i].filter((r) => r.action === "adopt").length, correct: BATCHES[i].filter((r) => r.action === "correct").length }, rows: BATCHES[i].map((r, k) => ({ ...r, giftId: r.giftId ?? `0000bbb${k}-0000-4000-8000-00000000000${i}`, locator: r.locator ?? (r.action === "correct" ? 12 : 90 + i) })) } });
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
    const isOp = (r, op) => r.url().endsWith(API) && bdy(r).op === op;
    const resp = (op) => p.waitForResponse((r) => isOp(r.request(), op), { timeout: 120000 });
    await p.goto(ORIGIN + "/research/source-import", { waitUntil: "load", timeout: 180000 });
    await frames(); const nb = p.locator("button", { hasText: "Necessary Only" }); if (await nb.count()) await nb.first().click();
    const sel0 = p.locator("select").first(); await sel0.locator("option[value=jag]").waitFor({ state: "attached", timeout: 120000 });
    if (CAPTURE === "collapsed") {
      const wt = resp("tables"); await sel0.selectOption("jag"); await wt; await frames(); await p.evaluate(() => window.scrollTo(0, 0)); await frames();
      await p.screenshot({ path: `${OUT}/${vp.name}-collapsed-view.png` }); await ctx.close(); continue; }
    // 1) production state: actual route, empty registry => no durable panel
    let w = resp("durableGiftContext"); await sel0.selectOption("jag"); const real = await (await w).json(); await frames();
    ok(real.available === false && await p.locator("[data-testid=durable-gift]").count() === 0, `${vp.name}: actual route with empty registry => durable panel absent (production state)`);
    // 2) fictional mocked registration (test-only interception)
    const sent = []; let inFlight = 0, maxInFlight = 0; let deferPersons = null, deferCommit = null; const faults = []; let deferLook = null; let proofReply = { confirmed: false, requestId: rid(1) };
    await p.route("**" + API, async (route) => {
      const bd = bdy(route.request()); if (!String(bd.op || "").startsWith("durableGift")) return route.continue();
      sent.push(bd);
      const J = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
      if (bd.client !== "jag") return J({ available: false });
      if (bd.op === "durableGiftContext") return J({ available: true, configured: true, saveAvailable: true, registrationId: "fict_gifts", columns: ["Gift_Amount", "Gift_Date", "Record_Type"], colDefs: [{ col: "Gift_Amount", ty: "decimal", len: null, p: 19, s: 4 }, { col: "Gift_Date", ty: "datetime2", len: null, p: null, s: null }, { col: "Record_Type", ty: "nvarchar", len: -1, p: null, s: null }], required: ["Gift_Amount", "Gift_Date"], rowCap: 18, newAllowed: true });
      if (bd.op === "durableGiftPreview") {
        const q = bd.query;
        if (q.kind === "persons") { if (deferPersons) { const g = deferPersons; deferPersons = null; await g.p; } return J({ persons: q.persons.map((x) => ({ person: x, masterMatches: x === 7004 ? 0 : 1, portalOverlay: false, portalProspect: false })), giftOverridesActive: false }); }
        if (q.kind === "history") { const first = q.after === undefined;
          return J({ rows: first ? [{ locator: 41, person: q.person, personReadable: true, values: VALUES, giftId: null, baseline: null }] : [{ locator: 77, person: q.person, personReadable: true, values: VALUES, giftId: UUID, baseline: null }], hasMore: first, next: first ? 41 : null, giftOverridesActive: false }); }
        if (q.kind === "locators") return J({ rows: [{ locator: 41, person: 7003, personReadable: true, values: VALUES, giftId: null, donorMismatch: false, baseline: null }], giftOverridesActive: false });
        if (q.kind === "gifts") return J({ gifts: q.giftIds.map((g) => ({ giftId: g, found: true, locator: g === UUID ? 12 : 13 })), rows: [
          { locator: 12, person: 7002, personReadable: true, values: { ...VALUES, Gift_Amount: { v: "4", readable: true }, Gift_Date: { v: "2026-01-06T00:00:00", readable: true } }, giftId: UUID, baseline: { Gift_Amount: SRC, Gift_Date: UNK, Record_Type: UNK } },
          { locator: 13, person: 7005, personReadable: true, values: { ...VALUES, Gift_Amount: { v: "3", readable: true }, Record_Type: { v: "Pledge", readable: true } }, giftId: UUID2, baseline: { Gift_Amount: SRC, Gift_Date: SRC, Record_Type: MAN } }], giftOverridesActive: false });
      }
      if (bd.op === "durableGiftPlan") return J({ token: "tok", jobId: JOB, manifest: { batches: [{}, {}] }, batches: BATCHES, summary: { batches: 2, decided: 3, held: 2, total: 5 } });
      if (bd.op === "durableGiftCommit") {
        inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
        try {
          if (bd.batchIndex === 0 && deferCommit) { const g = deferCommit; deferCommit = null; await g.p; }
          await new Promise((r) => setImmediate(r));
          if (bd.batchIndex === 1 && faults.length) { const f = faults.shift();
            if (f === "abort") return route.abort("failed");
            if (f === "500text") return route.fulfill({ status: 500, contentType: "text/plain", body: "Internal Server Error" });
            if (f === "200empty") return J({});
            if (f === "200forged") return J({ ...outcome(1), requestId: rid(0) });
            const o = outcome(1);
            if (f === "200badcounts") return J({ ...o, outcome: { ...o.outcome, counts: { new: -99, adopt: 0, correct: 0 } } });
            if (f === "200baduuid") return J({ ...o, outcome: { ...o.outcome, rows: o.outcome.rows.map((r) => ({ ...r, giftId: "not-a-uuid" })) } });
            if (f === "200badlocator") return J({ ...o, outcome: { ...o.outcome, rows: o.outcome.rows.map((r) => ({ ...r, locator: 0 })) } }); }
          return J(outcome(bd.batchIndex));
        } finally { inFlight--; }
      }
      if (bd.op === "durableGiftProof") return J(proofReply);
      if (bd.op === "durableGiftJobStatus") { if (deferLook) { const g = deferLook; deferLook = null; await g.p; } return J({ jobId: bd.jobId, client: "jag", confirmed: true, state: "partial", batchCount: 2, committedBatches: [0], missingBatches: [1], heldRows: 2, decidedRows: 3, note: "Partial: 1 of 2 batches committed; missing batches are not confirmed either way. 2 rows held." }); }
      if (bd.op === "durableGiftExport") return J({ fileName: "fictional-gifts-catapult-gift-ids.csv", csv: "x", proven: 3, held: 2, unconfirmed: 0 });
      return J({ error: "unknown" }, 400);
    });
    const outer = p.locator("select").first();
    w = resp("durableGiftContext"); await outer.selectOption("csnf"); await w; w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
    let sec = p.locator("[data-testid=durable-gift]"); await sec.waitFor();
    ok(!(await sec.evaluate((e) => e.open)), `${vp.name}: mocked registration => durable panel rendered collapsed`);
    const load = async (s, csv = CSV) => {
      await s.locator("input[aria-label='Durable gift export']").setInputFiles({ name: "fictional gifts_2026.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
      await s.locator("select[aria-label='Map Donor']").waitFor();
      for (const [h, v] of [["Donor", "@person"], ["Amount", "Gift_Amount"], ["Date", "Gift_Date"], ["Type", "Record_Type"]]) await s.locator(`select[aria-label='Map ${h}']`).selectOption(v);
      await s.locator("input[aria-label='Your name']").fill("Pat Example");
    };
    const decide = async (s, row, d, target) => { await s.locator(`select[aria-label='Decision row ${row}']`).selectOption(d); if (target) await s.locator(`input[aria-label='Target row ${row}']`).fill(target); };
    await sec.locator("summary").click(); await load(sec);
    ok((await sec.locator("[data-testid=durable-rows] tbody tr").allInnerTexts()).every((t) => /held/.test(t)), `${vp.name}: every row starts held`);
    await decide(sec, 1, "new"); await decide(sec, 2, "correct", UUID); await decide(sec, 4, "new");
    // 3) scope change while a read is pending drops the late reply
    let rel; deferPersons = { p: new Promise((r) => { rel = r; }) };
    const rq = p.waitForRequest((r) => isOp(r, "durableGiftPreview"));
    await sec.locator("button", { hasText: "Check decisions" }).click(); await rq;
    w = resp("durableGiftContext"); await outer.selectOption("csnf"); await w; rel(); await frames(); await frames();
    ok(await p.locator("[data-testid=durable-gift]").count() === 0 && await p.locator("text=eligible (advisory)").count() === 0, `${vp.name}: client change during a pending READ is allowed and the late reply is ignored`);
    w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
    sec = p.locator("[data-testid=durable-gift]"); await sec.locator("summary").click(); await load(sec);
    await decide(sec, 1, "new"); await decide(sec, 2, "correct", UUID); await decide(sec, 3, "adopt"); await decide(sec, 4, "new"); await decide(sec, 5, "correct", UUID2);
    // 4) history picker: exact donor, cursor pages, explicit pick
    w = resp("durableGiftPreview"); await sec.locator("button", { hasText: "Show this donor's gifts" }).nth(1).click(); const hq = bdy((await w).request()).query;
    const hist = sec.locator("[data-testid=durable-history]"); await hist.waitFor();
    w = resp("durableGiftPreview"); await hist.locator("button", { hasText: "More gifts" }).click(); const hq2 = bdy((await w).request()).query; await hist.locator("text=77").first().waitFor();
    ok(hq.kind === "history" && hq.person === 7003 && hq.after === undefined && hq2.after === 41 && await hist.locator("button[aria-label='Pick locator 77']").isDisabled(), `${vp.name}: history picker queries the exact donor with cursor pages; a row that already has an ID cannot be adopted`);
    await hist.locator("button[aria-label='Pick locator 41']").click();
    ok(await sec.locator("input[aria-label='Target row 3']").inputValue() === "41", `${vp.name}: operator pick fills the adopt locator explicitly`);
    w = resp("durableGiftPreview"); await sec.locator("button", { hasText: "Check decisions" }).click(); await w;
    await sec.locator("text=eligible (advisory)").first().waitFor();
    const cells = await sec.locator("[data-testid=durable-rows] tbody tr td:last-child").allInnerTexts(); if (process.env.DEBUG) console.log(cells);
    ok(/eligible/.test(cells[0]) && /eligible/.test(cells[1]) && /eligible/.test(cells[2]) && /not found exactly once/.test(cells[3]) && /Record_Type changes but has no source-owned baseline/.test(cells[4]) && !/Gift_Date/.test(cells[4]), `${vp.name}: correct needs ownership only for CHANGED mapped columns (untouched unknown ok row 2; changed manual blocked row 5); unknown donor held`);
    let wp = resp("durableGiftPlan"); await sec.locator("button", { hasText: "Plan save" }).click(); const planReq = bdy((await wp).request());
    ok(planReq.decisions.map((d) => d.d).join(",") === "new,correct,adopt,held,held" && planReq.decisions[1].expected.Gift_Amount === "4" && planReq.decisions[1].expected.Record_Type === "Gift" && planReq.decisions[2].expected.Gift_Amount === "7", `${vp.name}: ineligible rows sent as held; full exact snapshots carried unchanged`);
    const plan = sec.locator("[data-testid=durable-plan]"); await plan.waitFor();
    ok(await plan.locator("input[aria-label='Job ID']").inputValue() === JOB && /will be saved/.test(await plan.innerText()), `${vp.name}: full job ID shown; confirmation is future tense`);
    const saveBtn = plan.locator("button", { hasText: "Save batches" });
    ok(await saveBtn.isDisabled(), `${vp.name}: save needs the whole-file confirmation`);
    await plan.locator("input[aria-label='Confirm whole-file save']").check();
    const commits = () => sent.filter((x) => x.op === "durableGiftCommit");
    const li = (i) => plan.locator("[data-testid=durable-batches] li").nth(i);
    const idle = () => plan.locator("button:has-text('Save batches'):not([disabled]), li[data-state=unconfirmed] button:has-text('Check status'):not([disabled])").first().waitFor();
    if (vp.name === "desktop") {
      // 5) deferred commit: scope locked while a write is in flight; batch shows unconfirmed (never "not sent") before reply
      let relC; deferCommit = { p: new Promise((r) => { relC = r; }) }; faults.push("abort");
      const cq = p.waitForRequest((r) => isOp(r, "durableGiftCommit")); await saveBtn.dblclick(); await cq; await frames();
      ok(await outer.isDisabled() && await li(0).getAttribute("data-state") === "unconfirmed", `${vp.name}: during a dispatched save the client selector is locked and the batch is already unconfirmed`);
      const fq = p.waitForEvent("requestfailed", (r) => isOp(r, "durableGiftCommit")); relC(); await fq;
      await li(1).locator("button:has-text('Check status'):not([disabled])").waitFor();
      ok(maxInFlight === 1 && commits().length === 2 && await li(0).getAttribute("data-state") === "saved" && await li(1).getAttribute("data-state") === "unconfirmed" && !/not sent|nothing saved/.test(await li(1).innerText()), `${vp.name}: double-click single flight; aborted batch 2 => unconfirmed (not "not sent")`);
      ok(await saveBtn.isDisabled() && await outer.isDisabled(), `${vp.name}: unconfirmed => no resend before status, scope stays locked`);
      const body1 = JSON.stringify(commits()[1]);
      for (const f of ["500text", "200empty", "200forged", "200badcounts", "200baduuid", "200badlocator"]) {
        w = resp("durableGiftProof"); await li(1).locator("button", { hasText: "Check status" }).click(); await w; await li(1).and(p.locator("[data-state=pending]")).waitFor(); await idle();
        faults.push(f); w = resp("durableGiftCommit"); await saveBtn.click(); await w;
        await li(1).locator("button:has-text('Check status'):not([disabled])").waitFor();
        const c = commits();
        ok(await li(1).getAttribute("data-state") === "unconfirmed" && JSON.stringify(c[c.length - 1]) === body1 && c.filter((x) => x.batchIndex === 0).length === 1 && await saveBtn.isDisabled(), `${vp.name}: ${f} => unconfirmed (no "nothing saved"); resend only after status, identical body; saved batch never resent`);
      }
      for (const wrong of [{ confirmed: true, proof: "proof-x", requestId: rid(0) }, { confirmed: false, requestId: rid(0) }, { confirmed: true, proof: "proof-y" }]) {
        proofReply = wrong; w = resp("durableGiftProof"); await li(1).locator("button", { hasText: "Check status" }).click(); await w;
        await p.locator("[role=alert]", { hasText: "not for this batch" }).waitFor(); await li(1).locator("button:has-text('Check status'):not([disabled])").waitFor();
        ok(await li(1).getAttribute("data-state") === "unconfirmed" && await saveBtn.isDisabled() && await outer.isDisabled(), `${vp.name}: status reply ${JSON.stringify(wrong)} (wrong/missing request id) => still unconfirmed, no resend, scope locked`);
      }
      proofReply = { confirmed: true, proof: "proof-1", requestId: rid(1) };
      w = resp("durableGiftProof"); await li(1).locator("button", { hasText: "Check status" }).click(); await w; await li(1).and(p.locator("[data-state=saved]")).waitFor();
      ok(!(await outer.isDisabled()), `${vp.name}: once every sent batch is confirmed the scope lock is released`);
      // 6) job lookup by full ID
      const lk = sec.locator("input[aria-label='Job ID to look up']"); await lk.fill(JOB);
      let relL; deferLook = { p: new Promise((r) => { relL = r; }) };
      const lq = p.waitForRequest((r) => isOp(r, "durableGiftJobStatus")); w = resp("durableGiftJobStatus"); await sec.locator("button", { hasText: "Look up job status" }).click(); await lq; await frames();
      ok(await lk.isDisabled(), `${vp.name}: job ID input locked while a lookup is pending (old reply cannot install under a new ID)`);
      relL(); await w; await sec.locator("[data-testid=durable-lookup-result]").waitFor();
      const lt = await sec.locator("[data-testid=durable-lookup-result]").innerText();
      ok(lt.includes(JOB) && /\(JAG\)/.test(lt) && /partial: Partial: 1 of 2/.test(lt) && await lk.inputValue() === JOB, `${vp.name}: job status result labelled with the exact requested job ID/client`);
    } else {
      w = resp("durableGiftCommit"); const w2 = p.waitForResponse((r) => isOp(r.request(), "durableGiftCommit") && bdy(r.request()).batchIndex === 1); await saveBtn.click(); await w; await w2;
      await li(1).and(p.locator("[data-state=saved]")).waitFor();
      ok(await li(0).getAttribute("data-state") === "saved" && /All batches committed/.test(await plan.innerText()), `${vp.name}: validated bound replies => saved`);
      await p.evaluate(() => window.scrollTo(0, 0));
    }
    if (CAPTURE === "expanded") { // capture-only CSS (disclosed): cookie banner dismissed, sticky site header static, dev overlay hidden
      const nb3 = p.locator("button", { hasText: "Necessary Only" }); if (await nb3.count()) { await nb3.first().click({ force: true }); await nb3.first().waitFor({ state: "detached" }); }
      await p.addStyleTag({ content: "header, [class*='sticky'] { position: static !important; } nextjs-portal { display: none !important; }" });
      const tbl = sec.locator("[data-testid=durable-rows]");
      await tbl.evaluate((e) => { e.scrollLeft = 0; }); await p.evaluate(() => window.scrollTo(0, 0)); await frames();
      await sec.screenshot({ path: `${OUT}/${vp.name}-panel-expanded.png` });
      if (vp.name === "mobile390") { await tbl.scrollIntoViewIfNeeded(); await frames(); await tbl.screenshot({ path: `${OUT}/${vp.name}-rows-leftedge.png` });
        await tbl.evaluate((e) => { const th = e.querySelectorAll("th"); e.scrollLeft = th[th.length - 1].offsetLeft - 8; }); await frames(); await tbl.screenshot({ path: `${OUT}/${vp.name}-rows-checkcolumn.png` }); }
    }
    if (vp.name === "desktop") {
      w = resp("durableGiftExport"); const dl = p.waitForEvent("download"); await plan.locator("button", { hasText: "Download review copy" }).click(); const ex = bdy((await w).request()); const d = await dl;
      ok(d.suggestedFilename() === "fictional-gifts-catapult-gift-ids.csv" && ex.proofs.length === 1 && ex.proofs[0] === "proof-1", `${vp.name}: export sends only server proofs; hyphenated filename`);
      // 7) 606-row file: every row reachable via pages; later-page edits keep original ordinals
      const big = "Donor,Amount,Date,Type\r\n" + Array.from({ length: 606 }, (_, i) => `${8000 + i},1,2026-02-01,Gift`).join("\r\n") + "\r\n";
      await load(sec, big); await sec.locator("[data-testid=durable-pager]").waitFor();
      for (let k = 0; k < 24; k++) await sec.locator("button", { hasText: "Next rows" }).click();
      await decide(sec, 606, "new"); await decide(sec, 601, "new");
      ok(/Rows 601–606 of 606/.test(await sec.locator("[data-testid=durable-pager]").innerText()) && await sec.locator("button", { hasText: "Next rows" }).isDisabled(), `${vp.name}: 606 rows paginated; last page reaches row 606`);
      await sec.locator("button", { hasText: "Previous rows" }).click(); await sec.locator("button", { hasText: "Next rows" }).click();
      ok(await sec.locator("select[aria-label='Decision row 606']").inputValue() === "new", `${vp.name}: later-page choice preserved across page changes`);
      w = resp("durableGiftPreview"); await sec.locator("button", { hasText: "Check decisions" }).click(); const pq = bdy((await w).request()).query; await sec.locator("text=eligible (advisory)").first().waitFor();
      wp = resp("durableGiftPlan"); await sec.locator("button", { hasText: "Plan save" }).click(); const bp = bdy((await wp).request());
      ok(pq.persons.join() === "8600,8605" && bp.decisions.length === 606 && bp.decisions[605].d === "new" && bp.decisions[600].d === "new" && bp.decisions.filter((d) => d.d !== "held").length === 2, `${vp.name}: later-page decisions sent with original ordinals (600, 605) out of 606`);
    }
    await ctx.close();
  }
  console.log("blocked external origins:", JSON.stringify([...new Set(blocked)]), "count", blocked.length);
  await b.close();
})();
