// UI MOCK coverage (not actual-route coverage): review-only baseline attestation section with a FICTIONAL client.
// The page talks ONLY to Playwright-mocked /api/research-source-import responses (test-only interception; no Engage,
// no SQL, no app test hooks). Actual server packet/validation/sanitization is covered by the synthetic actual-route
// tests in scripts/test-source-baseline-attest.ts. Every origin other than exactly http://localhost:3100 is aborted.
// No sleeps: deferred mock responses are released explicitly and awaited by response/locator readiness.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const OUT = process.env.QA_OUT || "/tmp/qa-baseline"; fs.mkdirSync(OUT, { recursive: true });
const CSV = "ID,Town,Region\n7,Springfield,North\n8,Shelbyville,South\n";
const PLAN = { plan: { planDigest: "d".repeat(64), eligible: 3, held: 1, reasons: [{ reason: "current differs from attested prior export (possible manual edit)", count: 1 }] }, priorRows: 2, fileSha256: crypto.createHash("sha256").update(CSV).digest("hex"),
  export: JSON.stringify({ format: "catapult-baseline-attestation-proposal/v1", status: "proposed (review only; not an approval; nothing saved)", client: "fictional_y", table: "master", priorRows: 2, planDigest: "d".repeat(64), counts: { eligible: 3, held: 1 } }, null, 2) + "\n" };
(async () => {
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const results = {};
  for (const vp of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile390", width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, extraHTTPHeaders: { "x-forwarded-proto": "https" }, acceptDownloads: true });
    await ctx.addCookies([{ name: "catapult_research_auth", value: crypto.createHash("sha256").update("localpw:localsec").digest("hex"), url: "http://localhost:3100" }]);
    const ext = []; const sent = []; const gates = {}; const hold = (k) => new Promise((r) => { gates[k] = r; });
    let deferPreview = false, deferStatus = false;
    await ctx.route((u) => new URL(u.href).origin !== "http://localhost:3100", (r) => { ext.push(new URL(r.request().url()).origin); return r.abort(); });
    const p = await ctx.newPage();
    await p.route("**" + API, async (route) => {
      const bd = JSON.parse(route.request().postData() || "{}"); sent.push(bd);
      const J = (json, status = 200) => route.fulfill({ status, json });
      switch (bd.op) {
        case "clients": return J({ clients: ["fictional_y"], prepared: [] });
        case "tables": return J({ registry: { rev: "r-fictional" }, applyEnabled: false, tables: [{ table: "master", candidate: 3 }, { table: "notes", candidate: 2 }] });
        case "provenance": return J({ summary: "unknown", rows: [] });
        case "fields": return J({ fields: [] });
        case "allocConfig": return J({ error: "none" }, 404);
        case "baselineContext": return J(bd.table === "master" ? { available: true, configured: true, key: "CPTID", keyKind: "int", columns: ["CPTID", "City", "Region"], personRequired: false, linkRequired: false } : { available: true, configured: true, key: "ID", keyKind: "int", columns: ["ID", "Note"], personRequired: true, linkRequired: false });
        case "inspect": return J({ headers: bd.csv.split("\n")[0].split(","), rows: 2 });
        case "baselinePreview": if (deferPreview) await hold("preview"); return J(PLAN);
        case "baselineStatus": if (deferStatus) await hold("status"); return J({ found: false, status: null, message: "Unconfirmed: not committed yet, still in flight, or never received." });
        default: return J({ error: "unexpected op " + bd.op }, 400);
      }
    });
    const bdy = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
    const resp = (op) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r).op === op, { timeout: 120000 });
    const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.goto("http://localhost:3100/research/source-import", { waitUntil: "load", timeout: 180000 });
    const sel = (i) => p.locator("select").nth(i);
    await sel(0).locator("option[value=fictional_y]").waitFor({ state: "attached", timeout: 120000 });
    const nb = p.locator("text=Necessary Only"); if (await nb.count()) await nb.first().click();
    let w = resp("tables"); await sel(0).selectOption("fictional_y"); await w;
    await sel(1).locator("option[value=master]").waitFor({ state: "attached" });
    w = resp("baselineContext"); await sel(1).selectOption("master"); await w;
    const sec = p.locator("[data-testid=baseline-attest]"); await sec.locator("summary").click();
    const fileIn = sec.locator("input[aria-label='Prior source export']"); await fileIn.waitFor();
    const field = (ph) => sec.locator(`input[placeholder='${ph}']`);
    const blank = (await field("YYYY-MM-DD").inputValue()) === "" && (await field("YYYY-MM-DDTHH:MM:SSZ").inputValue()) === "" && (await field("ticket or document id").inputValue()) === "" && (await sec.locator("textarea").inputValue()) === "" && !(await sec.locator("input[type=checkbox]").isChecked());
    const btn = sec.locator("button", { hasText: "Preview attestation" });
    ok(blank && await btn.isDisabled(), `${vp.name}: provenance/attestor/time/reference blank, confirmation unchecked, preview disabled by default`);
    w = resp("inspect"); await fileIn.setInputFiles({ name: "prior-export.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) }); await w;
    await sec.locator("select[aria-label='Map ID']").waitFor();
    await sec.locator("select[aria-label='Map ID']").selectOption("CPTID"); await sec.locator("select[aria-label='Map Town']").selectOption("City"); await sec.locator("select[aria-label='Map Region']").selectOption("Region");
    await field("YYYY-MM-DD").fill("2025-06-30"); await sec.locator("textarea").fill("This prior source export is the file originally loaded into this table.");
    await sec.locator("label:has-text('Attested by') input").fill("Pat Example (fictional)"); await field("YYYY-MM-DDTHH:MM:SSZ").fill("2026-11-03T12:00:00Z"); await field("ticket or document id").fill("TICKET-0001");
    await sec.locator("input[type=checkbox]").check();
    w = resp("baselinePreview"); await btn.click(); const pr = await w; await sec.locator("[data-testid=baseline-plan]").waitFor();
    const pb = bdy(pr); const fileOk = Buffer.from(pb.fileB64, "base64").toString("utf8") === CSV;
    ok(fileOk && pb.draft.attestedBy === "Pat Example (fictional)" && pb.draft.attestedAt === "2026-11-03T12:00:00Z" && pb.draft.reference === "TICKET-0001" && pb.draft.confirmed === true && pb.draft.fileName === "prior-export.csv" && JSON.stringify(pb.draft.mapping) === JSON.stringify({ ID: "CPTID", Town: "City", Region: "Region" }), `${vp.name}: preview sends exact file bytes and only user-supplied attestation fields`);
    const txt = await sec.locator("[data-testid=baseline-plan]").innerText();
    ok(/3\s*values eligible/.test(txt) && /1\s*held/.test(txt) && /Proposed only; nothing saved/.test(txt) && !/approved|ready/i.test(txt), `${vp.name}: quiet summary with counts and reason categories, no approval claim`);
    await p.screenshot({ path: `${OUT}/${vp.name}-baseline.png`, fullPage: true });
    if (vp.name === "desktop") {
      const dl = p.waitForEvent("download"); await sec.locator("text=Download proposal (metadata only)").click(); const d = await dl; const path = OUT + "/proposal.json"; await d.saveAs(path);
      const s = fs.readFileSync(path, "utf8"); ok(s === PLAN.export && Buffer.byteLength(s) <= 65536 && !/Springfield|Shelbyville/.test(s), "download: exact server metadata-only bytes, no row values");
      // deferred status, then request id edit: late reply must not show
      const rid = sec.locator("input[aria-label='Attestation request id']");
      await rid.fill("a".repeat(32)); deferStatus = true; const sd = resp("baselineStatus"); const sq = p.waitForRequest((r) => r.url().endsWith(API) && JSON.parse(r.postData() || "{}").op === "baselineStatus"); await sec.locator("button", { hasText: "Check status" }).click(); await sq;
      await rid.fill("b".repeat(32)); gates.status(); await sd; await frames();
      ok(!(await sec.locator("[role=status]").count()), "late status reply after request id change is dropped");
      deferStatus = false; const sd2 = resp("baselineStatus"); await sec.locator("button", { hasText: "Check status" }).click(); await sd2; await sec.locator("[role=status]").waitFor();
      const st = await sec.locator("[role=status]").innerText(); ok(/Unconfirmed/.test(st) && !/not saved/i.test(st), "found:false shown as unconfirmed, never 'not saved'");
      // deferred preview: inputs are locked while it runs; a table change meanwhile drops the late reply
      deferPreview = true; w = resp("baselinePreview"); const before = sent.filter((x) => x.op === "baselinePreview").length;
      const rq = p.waitForRequest((r) => r.url().endsWith(API) && JSON.parse(r.postData() || "{}").op === "baselinePreview"); await btn.click(); await rq;
      const locked = await field("ticket or document id").isDisabled() && await fileIn.isDisabled();
      const wc = resp("baselineContext"); await sel(1).selectOption("notes"); await wc; gates.preview(); await w; await frames();
      ok(locked && sent.filter((x) => x.op === "baselinePreview").length === before + 1 && !(await p.locator("[data-testid=baseline-plan]").count()), "inputs locked during preview; late preview reply after table change is dropped (no stale plan)");
      deferPreview = false;
      await p.locator("[data-testid=baseline-attest] summary").click();
      // deferred file read, then table change: the old read must not inspect/install headers in the new scope
      await p.evaluate(() => { const orig = File.prototype.arrayBuffer; window.__release = null; File.prototype.arrayBuffer = function () { return new Promise((res) => { window.__release = () => res(orig.call(this)); }); }; });
      w = resp("baselineContext");
      const inspBefore = sent.filter((s) => s.op === "inspect").length;
      await p.locator("[data-testid=baseline-attest] input[aria-label='Prior source export']").setInputFiles({ name: "other.csv", mimeType: "text/csv", buffer: Buffer.from("ID,Town\n9,X\n") });
      await p.waitForFunction(() => typeof window.__release === "function");
      await sel(1).selectOption("master"); await w; await frames();
      await p.evaluate(() => window.__release()); await frames(); await frames();
      ok(sent.filter((s) => s.op === "inspect").length === inspBefore && !(await p.locator("[data-testid=baseline-attest] select[aria-label^='Map ']").count()), "deferred file read after table change: no inspect sent, no old headers installed");
    }
    ok(!sent.some((s) => s.op === "baselineApply" || s.op === "apply"), `${vp.name}: no apply/baselineApply request ever sent`);
    results[vp.name] = { ops: sent.map((s) => s.op), externalBlocked: ext.length, origins: [...new Set(ext)] };
    await ctx.close();
  }
  console.log(JSON.stringify(results));
  await b.close();
})();
