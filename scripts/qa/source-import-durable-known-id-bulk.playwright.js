// Rendered local QA for F2b known-ID mode, BULK orchestration (ACTUAL component, local dev server, desktop viewport).
// All data is FICTIONAL and comes from test-only Playwright interception of durableGift* ops in THIS script (no
// application fixtures, no real backend; plan/recovery/proof/commit replies use stub signatures and are NOT valid
// server-signed packets). Every origin other than exactly http://localhost:3100 is aborted. Waits are events only.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const ORIGIN = "http://localhost:3100";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const canon = (x) => (Array.isArray(x) ? x.map(canon) : isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
const U = (n) => `0000${String(n).padStart(4, "0")}-0000-4000-8000-00000000abcd`;
const N = 606, CAP = 18, BR = 29;
const cell = (i) => (i % 10 === 0 ? "" : i % 10 === 3 ? U(i).toUpperCase() : i % 10 === 4 ? "PROV-0123456789abcdef0123456789abcdef" : i === 7 || i === 17 || i === 507 ? U(7) : U(i));
const CSV = "Donor,Amount,Type,Known\r\n" + Array.from({ length: N }, (_, i) => `${7000 + i},1,Gift,${cell(i)}`).join("\r\n") + "\r\n";
const ORD = Array.from({ length: N }, (_, i) => i);
const LOCAL = new Map(ORD.map((i) => [i, i % 10 === 0 ? "blank" : i % 10 === 3 || i % 10 === 4 ? "invalid" : [7, 17, 507].includes(i) ? "dup" : null]));
const SENT = ORD.filter((i) => !LOCAL.get(i)); // distinct valid file IDs that may be previewed
const PAIR = { 5: 9001, 6: 9001, 55: 9002, 595: 9002 }; // two file IDs -> one gift row (second pair spans chunks/pages)
const kind = (o) => (PAIR[o] ? "pair" : o % 50 === 8 ? "donor" : o % 50 === 9 ? "drift" : o % 50 === 11 ? "identity" : o % 50 === 12 ? "manual" : null);
const ELIG = SENT.filter((o) => !kind(o));
const locOf = (o) => PAIR[o] ?? 5000 + o;
const SRC = { present: true, provenance: "source", equalsCurrent: true };
const rowFor = (loc) => { const o = loc === 9001 ? 5 : loc === 9002 ? 55 : loc - 5000;
  return { locator: loc, person: o % 50 === 8 ? 1 : 7000 + o, personReadable: true, values: { Gift_Amount: { v: "5", readable: true }, Record_Type: { v: "Gift", readable: true } }, giftId: U(o),
    identityConflict: o % 50 === 11, donorMismatch: o % 50 === 9, baseline: { Gift_Amount: o % 50 === 12 ? { present: true, provenance: "manual", equalsCurrent: true } : SRC, Record_Type: o % 50 === 15 ? { present: true, provenance: null, equalsCurrent: null } : SRC } }; };
const ordOf = (u) => Number(u.slice(4, 8));
const JOB = "e".repeat(64); const rid = (i) => sha(`${JOB}:${i}`).slice(0, 32);
(async () => {
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const blocked = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" }, acceptDownloads: true });
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
  const log = []; let TABLE = ""; let PL = null; let abortBatch = 3; const committed = new Set();
  await p.route("**" + API, async (route) => {
    const bd = bdy(route.request()); if (!String(bd.op || "").startsWith("durableGift")) return route.continue();
    log.push(bd); const J = (o, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(o) });
    if (bd.op === "durableGiftContext") { TABLE = bd.table; return J({ available: true, lookupAvailable: true, configured: true, saveAvailable: true, registrationId: "fict_gifts", columns: ["Gift_Amount", "Record_Type"], colDefs: [{ col: "Gift_Amount", ty: "decimal", len: null, p: 19, s: 4 }, { col: "Record_Type", ty: "nvarchar", len: -1, p: null, s: null }], required: [], rowCap: CAP, newAllowed: true }); }
    if (bd.op === "durableGiftPreview") { const q = bd.query;
      if (q.kind === "persons") return J({ persons: q.persons.map((x) => ({ person: x, masterMatches: 1, portalOverlay: false, portalProspect: false })), giftOverridesActive: false });
      if (q.kind === "gifts") { const locs = [...new Set(q.giftIds.map((g) => locOf(ordOf(g))))]; return J({ gifts: q.giftIds.map((g) => ({ giftId: g, found: true, locator: locOf(ordOf(g)) })), rows: locs.map(rowFor), giftOverridesActive: false }); }
      if (q.kind === "locators") return J({ rows: q.locators.map(rowFor), giftOverridesActive: false }); }
    if (bd.op === "durableGiftPlan") { // mirrors the owning server shape: decided rows in ordinal order, 29-row batches
      const rows = bd.decisions.filter((d) => d.d === "correct").map((d) => ({ ordinal: d.o, action: "correct", giftId: d.giftId, person: 7000 + d.o, values: { Gift_Amount: "1" }, expected: d.expected }));
      const parts = []; for (let i = 0; i < rows.length; i += BR) parts.push(rows.slice(i, i + BR));
      const hash = parts.map((rs) => sha(JSON.stringify(rs.map((r) => sha(JSON.stringify(canon(r)))))));
      const manifest = { batches: hash.map((h, i) => ({ first: i * BR, last: Math.min(rows.length - 1, i * BR + BR - 1), hash: h })), decided: rows.map((r) => ({ o: r.ordinal, a: "correct", t: r.giftId, l: null, p: r.person, h: sha(JSON.stringify(canon(r))) })), held: bd.decisions.filter((d) => d.d === "held").map((d) => d.o), totalOrdinals: N, batchCount: parts.length, batchRows: BR };
      const header = { v: 1, type: "durable-gift-recovery/v1", client: "jag", table: TABLE, registrationId: "fict_gifts", registrationVersion: 1, registrationDigest: "d".repeat(64), jobId: JOB, manifest, mapping: bd.mapping, mappingDigest: "f".repeat(64), fileDigest: sha(CSV), fileName: "known-bulk.csv", fileDate: null, actor: "Pat Example", batchRows: BR, batchCount: parts.length, partHashes: hash, createdAt: 1 };
      PL = { rows, parts }; return J({ token: "tok", jobId: JOB, recovery: { header, headerMac: "A".repeat(43) }, manifest, batches: parts, summary: { batches: parts.length, decided: rows.length, held: N - rows.length, total: N } }); }
    if (bd.op === "durableGiftRenew") return J({ token: "renewed.tok", jobId: JOB });
    if (bd.op === "durableGiftProof") return committed.has(bd.batchIndex) ? J({ confirmed: true, proof: `proof-${bd.batchIndex}`, requestId: rid(bd.batchIndex) }) : J({ confirmed: false, state: "pending", requestId: rid(bd.batchIndex) });
    if (bd.op === "durableGiftCommit") { const i = bd.batchIndex; const rs = PL.parts[i];
      if (i === abortBatch) { abortBatch = -1; return route.abort(); } // lost reply: nothing recorded here (Engage did not commit)
      committed.add(i);
      return J({ committed: true, requestId: rid(i), outcome: { requestId: rid(i), client: "jag", registrationId: "fict_gifts", committed: true, counts: { new: 0, adopt: 0, correct: rs.length }, rows: rs.map((r) => ({ ordinal: r.ordinal, action: "correct", giftId: r.giftId, locator: locOf(r.ordinal) })) } }); }
    return J({ error: "unknown" }, 400);
  });
  let w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
  const sec = p.locator("[data-testid=durable-gift]"); await sec.waitFor(); await sec.locator("summary").click();
  await sec.locator("input[aria-label='Durable gift export']").setInputFiles({ name: "known-bulk.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
  await sec.locator("select[aria-label='Map Donor']").waitFor();
  for (const [h, v] of [["Donor", "@person"], ["Amount", "Gift_Amount"], ["Type", "Record_Type"], ["Known", "@giftId"]]) await sec.locator(`select[aria-label='Map ${h}']`).selectOption(v);
  await sec.locator("input[aria-label='Your name']").fill("Pat Example");
  const next = sec.locator("button", { hasText: "Next rows" }), prev = sec.locator("button", { hasText: "Previous rows" });
  let page = 0; const go = async (pg) => { while (page < pg) { await next.click(); page++; } while (page > pg) { await prev.click(); page--; } };
  for (let pg = 0; pg * 25 < N; pg++) { await go(pg); for (let o = pg * 25; o < Math.min(N, pg * 25 + 25); o++) await sec.locator(`select[aria-label='Decision row ${o + 1}']`).selectOption("correct"); }
  await go(0);
  const n0 = log.length;
  const lastGifts = (() => { let cnt = 0; const need = Math.ceil(SENT.length / CAP); return p.waitForResponse((r) => isOp(r.request(), "durableGiftPreview") && bdy(r.request()).query.kind === "gifts" && ++cnt === need, { timeout: 120000 }); })();
  await sec.locator("button", { hasText: "Check decisions" }).click(); await lastGifts; await sec.locator("text=eligible (advisory)").first().waitFor({ timeout: 60000 });
  const gq = log.slice(n0).filter((x) => x.op === "durableGiftPreview" && x.query.kind === "gifts").map((x) => x.query.giftIds);
  const sent = gq.flat();
  ok(gq.length === Math.ceil(SENT.length / CAP) && gq.length >= 20 && gq.every((c) => c.length <= CAP) && sent.length === SENT.length && new Set(sent).size === sent.length && SENT.every((o) => sent.includes(U(o))),
    `bulk: all 606 rows selected; ${SENT.length} distinct valid file IDs previewed in ${gq.length} gifts chunks of <=${CAP}; no blank/uppercase/PROV/duplicate ID sent`);
  const pairChunks = [5, 6, 55, 595].map((o) => gq.findIndex((c) => c.includes(U(o))));
  ok(pairChunks[0] === pairChunks[1] && pairChunks[2] !== pairChunks[3], `bulk: two-IDs-one-row pairs cover same-chunk (rows 6/7) and cross-chunk/cross-page (rows 56/596) cases`);
  const txt = async (o) => { await go(Math.floor(o / 25)); return sec.locator("[data-testid=durable-rows] tbody tr").nth(o % 25).locator("td").last().innerText(); };
  const RE = { blank: /blank Catapult Gift ID/, invalid: /not a valid Catapult Gift ID/, dup: /duplicate Catapult Gift ID/, pair: /two IDs point to one gift row/, donor: /file donor|donor differs/, drift: /drift/, identity: /conflicting identities/, manual: /Gift_Amount changes but has no source-owned baseline/ };
  const probe = [0, 3, 4, 5, 6, 7, 17, 507, 8, 9, 11, 12, 55, 595, 258, 259, 261, 262, 500, 503, 504, 600, 1, 15, 265, 601, 605];
  let bad = 0; for (const o of probe) { const k = LOCAL.get(o) || kind(o); const t = await txt(o); if (k ? !RE[k].test(t) : !/eligible/.test(t)) { bad++; console.log("row", o + 1, k, t); } }
  ok(bad === 0, `bulk: holds (blank, invalid, duplicate incl. row 508 on page 21, two-IDs-one-row, donor, drift, identity, manual) and eligible rows correct on first, middle and last pages`);
  await go(0);
  w = resp("durableGiftPlan"); await sec.locator("button", { hasText: "Plan save" }).click(); const pr = bdy((await w).request());
  const corr = pr.decisions.filter((d) => d.d === "correct");
  ok(pr.decisions.length === N && corr.map((d) => d.o).join() === ELIG.join() && corr.every((d) => d.giftId === U(d.o) && JSON.stringify(d.expected) === JSON.stringify({ Gift_Amount: "5", Record_Type: "Gift" })) && pr.decisions.every((d) => d.d === "correct" || d.d === "held") && pr.mapping.Known === "@giftId",
    `bulk: plan sends exactly the ${ELIG.length} eligible corrections (own file IDs, exact current snapshots), the other ${N - ELIG.length} held; no new/adopt`);
  const plan = sec.locator("[data-testid=durable-plan]"); await plan.waitFor();
  ok(PL.parts.length === Math.ceil(ELIG.length / BR) && PL.parts.length >= 10, `bulk: ${PL.parts.length} batches of <=${BR} rows`);
  const dl = p.waitForEvent("download"); await plan.locator("button", { hasText: "Download recovery file" }).click(); const rec = fs.readFileSync(await (await dl).path());
  // reload + restore: renew, then status for EVERY batch before any commit
  await p.reload({ waitUntil: "load" }); await frames(); if (await nb.count()) await nb.first().click();
  w = resp("durableGiftContext"); await outer.selectOption("jag"); await w; await frames();
  const s2 = p.locator("[data-testid=durable-gift]"); await s2.locator("summary").click();
  const nR = log.length; const lastP = p.waitForResponse((r) => isOp(r.request(), "durableGiftProof") && bdy(r.request()).batchIndex === PL.parts.length - 1, { timeout: 120000 });
  await s2.locator("input[aria-label='Restore from recovery file']").setInputFiles({ name: "known-bulk-recovery.json", mimeType: "application/json", buffer: rec }); await lastP;
  await s2.locator("[role=status]", { hasText: "Restored" }).waitFor();
  const seq = log.slice(nR).filter((x) => ["durableGiftRenew", "durableGiftProof", "durableGiftCommit"].includes(x.op));
  ok(seq[0].op === "durableGiftRenew" && seq.length === PL.parts.length + 1 && seq.slice(1).every((x, i) => x.op === "durableGiftProof" && x.batchIndex === i && x.token === "renewed.tok"), `bulk restore: renew then status for ALL ${PL.parts.length} batches, no commit`);
  const li = (i) => s2.locator("[data-testid=durable-batches] li").nth(i);
  const confirm = s2.locator("input[aria-label='Confirm whole-file save']"), save = s2.locator("button", { hasText: "Save batches" });
  // save: batch 4 reply lost (aborted) => unconfirmed, loop stops, later batches not sent
  await confirm.check(); w = p.waitForRequest((r) => isOp(r, "durableGiftCommit") && bdy(r).batchIndex === 3); await save.click(); await w;
  await s2.locator("[role=alert]", { hasText: "unconfirmed" }).waitFor();
  const c1 = log.filter((x) => x.op === "durableGiftCommit");
  ok(c1.map((x) => x.batchIndex).join() === "0,1,2,3" && await li(3).getAttribute("data-state") === "unconfirmed" && await li(4).getAttribute("data-state") === "pending" && await save.isDisabled(), `bulk save: batches 1-3 saved, batch 4 lost reply => unconfirmed, batch 5+ not sent, Save blocked`);
  w = resp("durableGiftProof"); await li(3).locator("button", { hasText: "Check status" }).click(); await w; await li(3).and(p.locator("[data-state=pending]")).waitFor();
  await confirm.check().catch(() => {});
  const lastC = p.waitForResponse((r) => isOp(r.request(), "durableGiftCommit") && bdy(r.request()).batchIndex === PL.parts.length - 1, { timeout: 120000 });
  await save.click(); await lastC; await s2.locator("[role=status]", { hasText: "All batches committed" }).waitFor();
  const commits = log.filter((x) => x.op === "durableGiftCommit");
  const b3 = commits.filter((x) => x.batchIndex === 3);
  ok(commits.map((x) => x.batchIndex).join() === [0, 1, 2, 3, ...PL.parts.map((_, i) => i).slice(3)].join() && b3.length === 2 && JSON.stringify(b3[0]) === JSON.stringify(b3[1]), `bulk replay: after status=pending only batch 4.. sent again; batch 4 resent byte-identical (same derived request id), saved batches never resent`);
  const recRows = JSON.parse(rec.toString()).parts.map((x) => x.rows);
  ok(PL.parts.every((rs, i) => JSON.stringify(commits.filter((x) => x.batchIndex === i).pop().rows) === JSON.stringify(rs) && JSON.stringify(recRows[i]) === JSON.stringify(rs)) && commits.every((x) => x.token === "renewed.tok" && x.rows.every((r) => ELIG.includes(r.ordinal) && r.giftId === U(r.ordinal) && r.action === "correct")),
    `bulk: every committed batch equals its recovery part (exact targets + snapshots), renewed token, only eligible ordinals`);
  ok((await Promise.all(PL.parts.map((_, i) => li(i).getAttribute("data-state")))).every((s) => s === "saved"), `bulk: every batch saved (verified replies)`);
  await ctx.close();
  console.log("blocked external origins:", JSON.stringify([...new Set(blocked)]), "count", blocked.length);
  await b.close();
})();
