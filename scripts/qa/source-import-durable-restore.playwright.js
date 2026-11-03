// Rendered local QA for F1b restore (ACTUAL component, local dev server). All durable gift data is FICTIONAL and comes
// from test-only Playwright interception of durableGift* ops in THIS script (no application fixtures, no real backend).
// Every origin other than exactly http://localhost:3100 is aborted. Waits are request/response/locator events only.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const ORIGIN = "http://localhost:3100"; const OUT = process.env.OUT || "/tmp/qa-restore"; fs.mkdirSync(OUT, { recursive: true });
const CAPTURE = process.env.CAPTURE || "";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const canon = (x) => (Array.isArray(x) ? x.map(canon) : isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
// fictional 606-row original file with a UTF-8 BOM and CRLF; recovery file built like the server does (exact parts)
const ORIG = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("Donor,Amount\r\n" + Array.from({ length: 606 }, (_, i) => `${8000 + i},1`).join("\r\n") + "\r\n")]);
const ROWS = Array.from({ length: 606 }, (_, i) => ({ ordinal: i, action: "new", person: 8000 + i, values: { Gift_Amount: "1", Record_Type: "Gift é" }, expected: null }));
const BR = 29; const PARTS = []; for (let i = 0; i < ROWS.length; i += BR) PARTS.push(ROWS.slice(i, i + BR));
const HASH = PARTS.map((rows) => sha(JSON.stringify(rows.map((r) => sha(JSON.stringify(canon(r)))))));
const JOB = "c".repeat(64); const rid = (i) => sha(`${JOB}:${i}`).slice(0, 32);
const TABLES = {}; // the table the page actually sends for this client (taken from its own context request)
const header = (client) => ({ v: 1, type: "durable-gift-recovery/v1", client, table: TABLES[client] ?? "", registrationId: "fict_gifts", registrationVersion: 1, registrationDigest: "d".repeat(64), jobId: JOB, manifest: { batches: HASH.map((hash, i) => ({ first: i * BR, last: Math.min(605, i * BR + BR - 1), hash })), decided: ROWS.map((r) => ({ o: r.ordinal })), held: [], totalOrdinals: 606, batchCount: PARTS.length, batchRows: BR }, mapping: { Donor: "@person", Amount: "Gift_Amount" }, mappingDigest: "e".repeat(64), fileDigest: sha(ORIG), fileName: "fictional-606.csv", fileDate: null, actor: "Pat Example", batchRows: BR, batchCount: PARTS.length, partHashes: HASH, createdAt: 1 });
const FILE = (client = "jag") => ({ header: header(client), headerMac: "A".repeat(43), jobToken: "old.tok", parts: PARTS.map((rows, index) => ({ index, rows })) });
const buf = (o) => ({ name: "fictional-606-recovery.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(o)) });
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
    let w = resp("durableGiftContext"); await outer.selectOption("jag"); const real = await (await w).json(); await frames();
    ok(real.available === false && real.lookupAvailable === false && await p.locator("[data-testid=durable-gift], [data-testid=durable-lookup-only]").count() === 0, `${vp.name}: actual route, empty registry + unconfigured transport => nothing rendered (production state)`);
    const log = []; let renewMode = "ok"; let deferRenew = null; const proofPlan = {}; let commitN = 0;
    await p.route("**" + API, async (route) => {
      const bd = bdy(route.request()); if (!String(bd.op || "").startsWith("durableGift")) return route.continue();
      log.push(bd);
      const J = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
      if (bd.op === "durableGiftContext") TABLES[bd.client] = bd.table;
      if (bd.op === "durableGiftContext") return bd.client === "jag" ? J({ available: true, lookupAvailable: true, configured: true, saveAvailable: true, registrationId: "fict_gifts", columns: ["Gift_Amount", "Record_Type"], colDefs: [], required: [], rowCap: 18, newAllowed: true }) : J({ available: false, lookupAvailable: true });
      if (bd.op === "durableGiftRenew") { if (deferRenew) { const g = deferRenew; deferRenew = null; await g.p; }
        if (renewMode === "drift") return J({ error: "changed" }, 409);
        if (renewMode === "bad200") return J({ token: "", jobId: JOB });
        if (renewMode === "wrongjob") return J({ token: "t", jobId: "b".repeat(64) });
        return J({ token: "renewed.tok", jobId: JOB }); }
      if (bd.op === "durableGiftProof") { const k = proofPlan[bd.batchIndex] ?? "pending";
        if (k === "saved") return J({ confirmed: true, proof: `proof-${bd.batchIndex}`, requestId: rid(bd.batchIndex) });
        if (k === "wrongid") return J({ confirmed: false, state: "pending", requestId: rid(0) });
        if (k === "unavailable") return J({ confirmed: false, state: "unavailable", requestId: rid(bd.batchIndex) }, 502);
        return J({ confirmed: false, state: "pending", requestId: rid(bd.batchIndex) }); }
      if (bd.op === "durableGiftCommit") { commitN++; const i = bd.batchIndex; const rows = PARTS[i];
        return J({ committed: true, requestId: rid(i), outcome: { requestId: rid(i), client: "jag", registrationId: "fict_gifts", committed: true, counts: { new: rows.length, adopt: 0, correct: 0 }, rows: rows.map((r, k) => ({ ordinal: r.ordinal, action: "new", giftId: `${String(i).padStart(4, "0")}${String(k).padStart(4, "0")}-0000-4000-8000-000000000000`, locator: 1000 + r.ordinal })) } }); }
      if (bd.op === "durableGiftJobLookup") return J({ jobId: bd.jobId, client: bd.client, confirmed: true, state: "partial", batchCount: PARTS.length, committedBatches: [1], missingBatches: Array.from({ length: PARTS.length }, (_, i) => i).filter((i) => i !== 1), heldRows: 0, decidedRows: 606, note: "Partial." });
      if (bd.op === "durableGiftExport") return J({ fileName: "fictional-606-catapult-gift-ids.csv", csv: "x", proven: PARTS[1].length, held: 0, unconfirmed: 606 - PARTS[1].length });
      return J({ error: "unknown" }, 400);
    });
    w = resp("durableGiftContext"); await outer.selectOption("csnf"); await w; await frames();
    const lo = p.locator("[data-testid=durable-lookup-only]"); await lo.waitFor();
    await lo.locator("summary").click(); await lo.locator("input[aria-label='Recovery file for lookup']").setInputFiles(buf(FILE("csnf")));
    await lo.locator("text=Job ID filled from the recovery file").waitFor();
    ok(await lo.locator("input[aria-label='Job ID to look up']").inputValue() === JOB && !log.some((x) => x.op === "durableGiftRenew" || x.op === "durableGiftProof"), `${vp.name}: available:false + lookupAvailable => read-only lookup only; recovery file fills the job ID locally (no renew/proof)`);
    w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
    const sec = p.locator("[data-testid=durable-gift]"); await sec.waitFor(); await sec.locator("summary").click();
    const restoreIn = sec.locator("input[aria-label='Restore from recovery file']");
    // local refusals: nothing is sent
    const n0 = log.length;
    for (const [what, f, msg] of [["added states", { ...FILE(), states: ["saved"] }, "unexpected or missing"], ["tampered part", (() => { const x = JSON.parse(JSON.stringify(FILE())); x.parts[3].rows[0].values.Gift_Amount = "9"; return x; })(), "part 4"], ["other client", FILE("pvas"), "is for PVAS"]]) {
      await restoreIn.setInputFiles(buf(f)); await sec.locator("[role=alert]", { hasText: msg }).waitFor({ timeout: 8000 }).catch(async (e) => { console.log("ALERT:", await sec.locator("[role=alert]").allInnerTexts()); throw e; }); ok(log.length === n0, `${vp.name}: ${what} refused locally, nothing sent`); }
    if (vp.name === "desktop") { await restoreIn.setInputFiles({ name: "big.json", mimeType: "application/json", buffer: Buffer.alloc(8_000_001, 32) }); await sec.locator("[role=alert]", { hasText: "8 MB" }).waitFor(); ok(log.length === n0, `${vp.name}: recovery file over 8 MB refused locally`);
      for (const m of ["bad200", "wrongjob"]) { renewMode = m; w = resp("durableGiftRenew"); await restoreIn.setInputFiles(buf(FILE())); await w; await sec.locator("[role=alert]", { hasText: "Not restored" }).waitFor();
        ok(!log.some((x) => x.op === "durableGiftProof") && await sec.locator("[data-testid=durable-restored]").count() === 0, `${vp.name}: renew 200 ${m} => not restored, no proof/commit`); }
      renewMode = "drift"; w = resp("durableGiftRenew"); await restoreIn.setInputFiles(buf(FILE())); await w; await sec.locator("[data-testid=durable-drift]").waitFor();
      ok(await sec.locator("input[aria-label='Job ID to look up']").inputValue() === JOB && !log.some((x) => x.op === "durableGiftProof") && await sec.locator("button", { hasText: "Save batches" }).count() === 0, `${vp.name}: renew 409 => drift message, lookup prefilled, no proof/save controls`);
      w = resp("durableGiftJobLookup"); await sec.locator("button", { hasText: "Look up job status" }).click(); await w; await sec.locator("[data-testid=durable-lookup-result]").waitFor();
      ok(/partial/.test(await sec.locator("[data-testid=durable-lookup-result]").innerText()), `${vp.name}: drift => registration-independent read-only lookup works`); }
    // restore: renew (expired token), then EVERY batch status before any commit
    renewMode = "ok"; Object.assign(proofPlan, { 1: "saved", 2: "unavailable", 4: "wrongid" });
    let relR; deferRenew = { p: new Promise((r) => { relR = r; }) };
    const rq = p.waitForRequest((r) => isOp(r, "durableGiftRenew")); await restoreIn.setInputFiles(buf(FILE())); await rq; await frames();
    ok(await outer.isDisabled() && await restoreIn.isDisabled(), `${vp.name}: during restore the client selector and file inputs are locked`);
    const lastProof = p.waitForResponse((r) => isOp(r.request(), "durableGiftProof") && bdy(r.request()).batchIndex === PARTS.length - 1, { timeout: 120000 });
    relR(); await lastProof; await sec.locator("[role=status]", { hasText: "Restored" }).waitFor();
    const seq = log.filter((x) => ["durableGiftRenew", "durableGiftProof", "durableGiftCommit"].includes(x.op)).slice(-(PARTS.length + 1));
    ok(seq[0].op === "durableGiftRenew" && seq.slice(1).every((x, i) => x.op === "durableGiftProof" && x.batchIndex === i && x.token === "renewed.tok") && commitN === 0, `${vp.name}: renew then status for ALL ${PARTS.length} batches (renewed token) before any commit`);
    const li = (i) => sec.locator("[data-testid=durable-batches] li").nth(i);
    const st = async () => Promise.all(Array.from({ length: PARTS.length }, (_, i) => li(i).getAttribute("data-state")));
    let s = await st();
    ok(s[0] === "pending" && s[1] === "saved" && s[2] === "unconfirmed" && s[4] === "unconfirmed" && s[3] === "pending", `${vp.name}: canonical pending => pending; proof => saved; 502 unavailable and wrong-ID pending => unconfirmed`);
    const saveBtn = sec.locator("button", { hasText: "Save batches" });
    ok(await saveBtn.isDisabled() && await sec.locator("input[aria-label='Confirm whole-file save']").isDisabled() && await outer.isDisabled() && await restoreIn.isDisabled(), `${vp.name}: unconfirmed batches => no save, scope and file inputs locked`);
    ok(await sec.locator("[data-testid=durable-restored]").count() === 1 && await sec.locator("select[aria-label^='Decision row'], select[aria-label^='Map '], input[aria-label='Durable gift export']").count() === 0, `${vp.name}: restored job is read-only (no decision/mapping/CSV inputs)`);
    proofPlan[2] = "pending"; proofPlan[4] = "pending";
    for (const i of [2, 4]) { w = resp("durableGiftProof"); await li(i).locator("button", { hasText: "Check status" }).click(); await w; await li(i).and(p.locator("[data-state=pending]")).waitFor(); }
    await sec.locator("input[aria-label='Confirm whole-file save']").check();
    ok(!(await outer.isDisabled()) && !(await saveBtn.isDisabled()), `${vp.name}: after per-batch checks (usable under lock) the lock lifts and Save is allowed (recovery file counts as backup)`);
    const lastC = p.waitForResponse((r) => isOp(r.request(), "durableGiftCommit") && bdy(r.request()).batchIndex === PARTS.length - 1, { timeout: 120000 });
    await saveBtn.click(); await lastC; await sec.locator("[role=status]", { hasText: "All batches committed" }).waitFor();
    const commits = log.filter((x) => x.op === "durableGiftCommit");
    ok(commits.length === PARTS.length - 1 && !commits.some((x) => x.batchIndex === 1) && commits.every((x) => x.token === "renewed.tok" && JSON.stringify(x.rows) === JSON.stringify(PARTS[x.batchIndex])), `${vp.name}: only pending batches sent (batch 0 included, saved batch 1 skipped), byte-identical original rows under the renewed token`);
    // export needs the original file; digest-bound
    const expBtn = sec.locator("button", { hasText: "Download review copy" });
    ok(await expBtn.isDisabled(), `${vp.name}: export disabled until the original CSV is supplied`);
    const ne = log.filter((x) => x.op === "durableGiftExport").length;
    await sec.locator("input[aria-label='Original CSV']").setInputFiles({ name: "x.csv", mimeType: "text/csv", buffer: ORIG.subarray(3) });
    await sec.locator("[role=alert]", { hasText: "not the planned original" }).waitFor();
    ok(await expBtn.isDisabled() && log.filter((x) => x.op === "durableGiftExport").length === ne, `${vp.name}: BOM-stripped copy of the original refused by byte digest, nothing sent`);
    await sec.locator("input[aria-label='Original CSV']").setInputFiles({ name: "fictional-606.csv", mimeType: "text/csv", buffer: ORIG });
    await expBtn.and(p.locator(":not([disabled])")).waitFor();
    w = resp("durableGiftExport"); const dl = p.waitForEvent("download"); await expBtn.click(); const ex = bdy((await w).request()); await dl;
    ok(ex.csv.charCodeAt(0) === 0xfeff && ex.token === "renewed.tok", `${vp.name}: exact original (BOM kept) accepted; export sent with renewed token`);
    if (CAPTURE) { // capture-only CSS (disclosed): cookie banner dismissed, sticky header static, dev overlay hidden
      const nb3 = p.locator("button", { hasText: "Necessary Only" }); if (await nb3.count()) { await nb3.first().click({ force: true }); await nb3.first().waitFor({ state: "detached" }); }
      await p.addStyleTag({ content: "header, [class*='sticky'] { position: static !important; } nextjs-portal { display: none !important; }" });
      await p.evaluate(() => window.scrollTo(0, 0)); await frames(); await sec.screenshot({ path: `${OUT}/${vp.name}-restored.png` }); }
    await ctx.close();
  }
  console.log("blocked external origins:", JSON.stringify([...new Set(blocked)]), "count", blocked.length);
  await b.close();
})();
