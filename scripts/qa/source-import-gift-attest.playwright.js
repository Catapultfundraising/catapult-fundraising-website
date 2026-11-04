// Rendered local QA for the READ-ONLY gift baseline attestation preview (DG). ACTUAL component on the local dev server.
// All data is FICTIONAL and comes from test-only Playwright interception of durableGiftAttest* ops in THIS script; no real
// backend. Every origin other than exactly http://localhost:3100 is aborted. Waits are request/response/locator events.
// MODE=before|after for matched captures (before = a0290cc, which has no attestation section).
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const ORIGIN = "http://localhost:3100"; const OUT = process.env.OUT || "/tmp/qa-attest"; fs.mkdirSync(OUT, { recursive: true });
const MODE = process.env.MODE || "after"; const CAPTURE = process.env.CAPTURE || "";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const U = (n) => `0000${String(n).padStart(4, "0")}-0000-4000-8000-00000000abcd`;
const CSV = "Donor,Amount,Date,Type\r\n7001,5,2026-01-05T00:00:00,Gift\r\n7002,6,2026-01-06T00:00:00,\r\n7003,7,2026-01-07T00:00:00,Gift\r\n7004,8,2026-01-08T00:00:00,Gift\r\n";
const MAPPED = ["Gift_Amount", "Gift_Date", "Record_Type"]; const IDX = { Gift_Amount: 1, Gift_Date: 2, Record_Type: 3 };
const GRID = CSV.trim().split("\r\n").map((l) => l.split(","));
const cell = (o, c) => { const v = GRID[o + 1][IDX[c]]; return v === "" ? null : v; };
const PLAN = () => ({ planDigest: "d".repeat(64), candidates: [0, 1, 2].map((o) => ({ o, giftId: U(o + 1), locator: 501 + o, person: 7001 + o })),
  rows: [...MAPPED.map((c) => ({ o: 0, key: `gift:${U(1)}`, col: c, value: cell(0, c) })), ...["Gift_Date", "Record_Type"].map((c) => ({ o: 1, key: `gift:${U(2)}`, col: c, value: cell(1, c) }))],
  held: [{ o: 1, col: "Gift_Amount", reason: "current differs from attested prior export (possible manual edit)" }, { o: 2, reason: "portal edit exists for this donor (protected)" }, { o: 3, reason: "no committed association for the attested file" }],
  counts: { candidates: 3, eligible: 5, held: 3, outOfScopeAssociated: 2, "current differs from attested prior export (possible manual edit)": 1, "portal edit exists for this donor (protected)": 1, "no committed association for the attested file": 1 } });
const CAPS = fs.existsSync("lib/portal-v2/gift-attest-golden.json") ? JSON.parse(fs.readFileSync("lib/portal-v2/gift-attest-golden.json", "utf8")).capsByMappedCount : [];
const CTX = { available: true, lookupAvailable: true, configured: true, registrationId: "fict_gifts", registrationVersion: 1, columns: MAPPED.map((col) => ({ col, ty: "nvarchar", len: -1, p: null, s: null })), capsByMappedCount: CAPS, maxFileBytes: 2800000 };
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
    await frames(); const nb = p.locator("button", { hasText: "Necessary Only" }); if (await nb.count()) { await nb.first().click(); await nb.first().waitFor({ state: "detached" }); }
    const outer = p.locator("select").first(); await outer.locator("option[value=jag]").waitFor({ state: "attached", timeout: 120000 });
    // explicit cookie-banner dismissal right before every capture: wait for the hydrated button, click, require it detached
    const dismiss = async () => { const nb2 = p.getByRole("button", { name: "Necessary Only" }); if (await nb2.count()) { await nb2.first().click(); await nb2.first().waitFor({ state: "detached" }); }
      await frames(); if (await p.getByRole("button", { name: "Necessary Only" }).count()) throw new Error("cookie banner still present"); };
    const shot = async (loc, path) => { await dismiss(); await p.addStyleTag({ content: "header, [class*='sticky'] { position: static !important; } nextjs-portal { display: none !important; }" }); await frames(); await loc.screenshot({ path }); };
    const tsel = p.locator("select").nth(1);
    const pick = async (client, op) => { await outer.selectOption(client); const o = tsel.locator("option:not([value=''])").first(); await o.waitFor({ state: "attached", timeout: 120000 }); const w = resp(op); await tsel.selectOption(await o.getAttribute("value")); const r = await w; await frames(); return r; };
    if (MODE === "after") { // production state: actual route (transport unconfigured locally) => section hidden entirely
      const real = await (await pick("jag", "durableGiftAttestContext")).json();
      ok(real.available === false && real.lookupAvailable === false && await p.locator("[data-testid=gift-attest]").count() === 0, `${vp.name}: actual route, unconfigured => no attestation section`);
      await outer.selectOption(""); await frames();
    }
    let ctxReply = CTX; let planReply = PLAN(); let hold = null; const log = []; let expMut = (x) => x; let shaReply = sha(CSV);
    const mkExport = (bd, plan) => expMut(JSON.stringify({ kind: "gift-attest-proposal/v1", note: "Metadata only. Not an approval; applying needs a separate reviewed approval.", packet: { client: bd.client, table: bd.table, registrationId: "fict_gifts", registrationVersion: 1, registrationDigest: "a".repeat(64), mapping: bd.draft.mapping, priorFile: { name: "prior-source-export.csv", sha256: sha(Buffer.from(bd.fileB64, "base64")), sourceDate: bd.draft.sourceDate }, provenanceStatement: bd.draft.statement, approvedBy: bd.draft.approvedBy, approvedAt: bd.draft.approvedAt, approvalRef: bd.draft.approvalRef }, ordinalFrom: bd.draft.ordinalFrom, ordinalTo: bd.draft.ordinalTo, planDigest: plan.planDigest, counts: plan.counts }, null, 1));
    await p.route("**" + API, async (route) => {
      const bd = bdy(route.request());
      if (bd.op === "durableGiftContext") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ available: false, lookupAvailable: false }) });
      if (!String(bd.op || "").startsWith("durableGiftAttest")) return route.continue();
      log.push(bd); const J = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
      if (bd.op === "durableGiftAttestContext") return J(ctxReply);
      if (bd.op === "durableGiftAttestPreview") { if (hold) { const g = hold; hold = null; await g.p; } return J({ plan: planReply, fileSha256: shaReply, export: mkExport(bd, planReply) }); }
      if (bd.op === "durableGiftAttestStatus") return J(bd.requestId === "a".repeat(32) ? { requestId: bd.requestId, found: true, state: "committed", result: { client: bd.client, table: bd.table, registrationId: "fict_gifts", registrationVersion: 1, planDigest: "c".repeat(64), approvalRef: "FICT-1", priorSourceDate: "2025-06-30", counts: { records: 3, values: 9 } } } : { requestId: "f".repeat(32), found: false, state: "unconfirmed" });
      return J({ error: "unknown" }, 400);
    });
    let w; await pick("jag", MODE === "after" ? "durableGiftAttestContext" : "durableGiftContext");
    if (MODE === "before") {
      const host = p.locator("[data-testid=durable-gift], [data-testid=baseline-attest]").last().locator("xpath=..");
      await p.addStyleTag({ content: "header, [class*='sticky'] { position: static !important; } nextjs-portal { display: none !important; }" }); await p.evaluate(() => window.scrollTo(0, 0)); await frames();
      ok(await p.locator("[data-testid=gift-attest]").count() === 0, `${vp.name}: before (a0290cc): no gift attestation section`);
      if (CAPTURE) await shot(host, `${OUT}/before-${vp.name}-panels.png`);
      await ctx.close(); continue;
    }
    const sec = p.locator("[data-testid=gift-attest]"); await sec.waitFor(); await sec.locator("summary").click();
    await sec.locator("input[aria-label='Original source export']").setInputFiles({ name: "fict-original.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
    await sec.locator("select[aria-label='Attest map Donor']").waitFor();
    for (const [h, v] of [["Donor", "@person"], ["Amount", "Gift_Amount"], ["Date", "Gift_Date"], ["Type", "Record_Type"]]) await sec.locator(`select[aria-label='Attest map ${h}']`).selectOption(v);
    const fill = async () => { for (const [l, v] of [["From row", "1"], ["To row", "4"], ["Source export date", "2025-06-30"], ["Reference", "FICT-1"], ["Provenance statement", "This prior source export is the file originally loaded into the raw gift table (fictional)."], ["Attested by", "Pat Example"], ["Attestation time", "2026-11-03T12:00:00Z"]]) await sec.locator(`[aria-label='${l}']`).fill(v); await sec.locator("input[aria-label='Confirm original export']").check(); };
    await fill();
    ok(await sec.locator("button", { hasText: /save|apply/i }).count() === 0, `${vp.name}: no save/apply control exists`);
    w = resp("durableGiftAttestPreview"); await sec.locator("button", { hasText: "Preview attestation" }).click(); const sent = bdy((await w).request());
    await sec.locator("[data-testid=gift-attest-plan]").waitFor();
    ok(sent.draft.ordinalFrom === 0 && sent.draft.ordinalTo === 3 && sent.fileB64 === Buffer.from(CSV).toString("base64") && sent.draft.mapping.Type === "Record_Type", `${vp.name}: exact file bytes, 0-based range and mapping sent`);
    const txt = await sec.locator("[data-testid=gift-attest-plan]").innerText();
    ok(/5\s*values eligible/.test(txt) && /3\s*held/.test(txt) && /manual edit/.test(txt) && /portal edit exists/.test(txt) && /no committed association/.test(txt), `${vp.name}: summary + per-row holds rendered`);
    if (CAPTURE) { await p.addStyleTag({ content: "header, [class*='sticky'] { position: static !important; } nextjs-portal { display: none !important; }" }); await p.evaluate(() => window.scrollTo(0, 0)); await frames();
      await shot(sec, `${OUT}/after-${vp.name}-attest.png`);
      const host = sec.locator("xpath=.."); await shot(host, `${OUT}/after-${vp.name}-panels.png`);
      const tbl = sec.locator("[data-testid=gift-attest-rows]"); await tbl.scrollIntoViewIfNeeded(); await frames(); await shot(tbl, `${OUT}/after-${vp.name}-rows.png`);
      if (vp.name === "mobile390") { await tbl.evaluate((e) => { const th = e.querySelectorAll("th"); e.scrollLeft = th[th.length - 1].offsetLeft - 8; }); await frames(); await shot(tbl, `${OUT}/after-${vp.name}-rows-heldcolumn.png`); } }
    // actual downloaded proposal: exact metadata-only schema, bound to this file/draft/plan, no cell values
    const dl = p.waitForEvent("download"); await sec.locator("button", { hasText: "Download proposal" }).click(); const got = JSON.parse(fs.readFileSync(await (await dl).path(), "utf8"));
    ok(JSON.stringify(Object.keys(got).sort()) === JSON.stringify(["counts", "kind", "note", "ordinalFrom", "ordinalTo", "packet", "planDigest"]) && got.packet.priorFile.sha256 === sha(CSV) && got.planDigest === "d".repeat(64) && got.ordinalTo === 3 && !JSON.stringify(got).includes("7001") && !JSON.stringify(got).includes("2026-01-05"), `${vp.name}: downloaded proposal is the exact metadata-only schema bound to the file digest/plan (no cells)`);
    // corrupted export / mismatched digest are refused (no proposal shown)
    for (const [name, mut] of [["export with wrong file sha", () => { expMut = (x) => x.replace(sha(CSV), "0".repeat(64)); }], ["export with extra cells", () => { expMut = (x) => JSON.stringify({ ...JSON.parse(x), rows: [["7001", "5"]] }); }], ["reply fileSha256 mismatch", () => { shaReply = "1".repeat(64); }]]) {
      mut(); w = resp("durableGiftAttestPreview"); await sec.locator("button", { hasText: "Preview attestation" }).click(); await w;
      await sec.locator("[role=alert]", { hasText: "failed validation" }).waitFor();
      ok(await sec.locator("[data-testid=gift-attest-plan]").count() === 0, `${vp.name}: ${name} refused; no proposal shown`);
      expMut = (x) => x; shaReply = sha(CSV);
    }
    // malformed upstream plan (value differs from the file cell) is refused in the browser too
    planReply = PLAN(); planReply.rows[0].value = "999";
    w = resp("durableGiftAttestPreview"); await sec.locator("button", { hasText: "Preview attestation" }).click(); await w;
    await sec.locator("[role=alert]", { hasText: "failed validation" }).waitFor();
    ok(await sec.locator("[data-testid=gift-attest-plan]").count() === 0, `${vp.name}: browser re-validation refuses a plan whose value differs from the file`);
    // deferred preview reply after a client change cannot install into the new scope
    planReply = PLAN(); let rel; hold = { p: new Promise((r) => { rel = r; }) };
    const rq = p.waitForRequest((r) => isOp(r, "durableGiftAttestPreview")); await sec.locator("button", { hasText: "Preview attestation" }).click(); await rq;
    ctxReply = { available: false, lookupAvailable: true };
    await pick("csnf", "durableGiftAttestContext");
    const done = resp("durableGiftAttestPreview"); rel(); await done; await frames(); await frames();
    ok(await p.locator("[data-testid=gift-attest-plan]").count() === 0 && await p.locator("[data-testid=gift-attest-lookup-only]").count() === 1, `${vp.name}: stale deferred preview ignored after client change; lookup-only shown when registration absent`);
    const sec2 = p.locator("[data-testid=gift-attest]"); await sec2.locator("summary").click();
    await sec2.locator("input[aria-label='Gift attestation request id']").fill("a".repeat(32));
    w = resp("durableGiftAttestStatus"); await sec2.locator("button", { hasText: "Check status" }).click(); await w;
    await sec2.locator("[role=status]", { hasText: "Committed attestation found" }).waitFor();
    if (CAPTURE) { await p.evaluate(() => window.scrollTo(0, 0)); await frames(); await shot(sec2, `${OUT}/after-${vp.name}-lookup-only.png`); }
    await sec2.locator("input[aria-label='Gift attestation request id']").fill("b".repeat(32));
    w = resp("durableGiftAttestStatus"); await sec2.locator("button", { hasText: "Check status" }).click(); await w;
    await sec2.locator("[role=status]", { hasText: "Status unavailable" }).waitFor();
    ok(true, `${vp.name}: lookup-only status committed for the asked id; reply for another id => unavailable (never confirmed)`);
    await ctx.close();
  }
  console.log("blocked external origins:", JSON.stringify([...new Set(blocked)]), "count", blocked.length);
  await b.close();
})();
