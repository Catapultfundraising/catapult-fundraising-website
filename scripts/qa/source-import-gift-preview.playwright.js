// Rendered local QA for the review-only JAG provisional gift-ID preview. Uses the ACTUAL local dev routes
// (giftContext/giftStage/giftExport are local staging only: no SQL, no Engage). FICTIONAL data. Every origin other
// than exactly http://localhost:3100 is aborted. One test-only interception defers a giftStage reply to prove stale
// replies are ignored. Inside the section, file/mapping inputs are locked while a preview is pending; the OUTER
// client/table selectors stay interactive, so outer-table changes are tested to reset the section and drop late replies. No sleeps: readiness via responses/locators/animation frames.
const { chromium } = require("playwright"); const crypto = require("crypto"); const fs = require("fs");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const OUT = process.env.OUT || "/tmp/qa-gift"; fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = "http://localhost:3100";
const rows = Array.from({ length: 606 }, (_, i) => `${7000 + (i % 40)},${(i % 7) * 5 + 10}.00,${2020 + (i % 6)},Fictional appeal ${i % 3}`);
rows[1] = "7001,=1+1,2024,formula test"; rows[2] = ",10.00,2024,blank donor";
const CSV = "Donor No,Amount,Year,Appeal\r\n" + rows.join("\r\n") + "\r\n";
(async () => {
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const blocked = [];
  for (const vp of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile390", width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, extraHTTPHeaders: { "x-forwarded-proto": "https" }, acceptDownloads: true });
    await ctx.addCookies([{ name: "catapult_research_auth", value: crypto.createHash("sha256").update("localpw:localsec").digest("hex"), url: ORIGIN }]);
    await ctx.route((u) => new URL(u.href).origin !== ORIGIN, (r) => { blocked.push(new URL(r.request().url()).origin); return r.abort(); });
    const p = await ctx.newPage();
    let gate = null; const sent = [];
    await p.route("**" + API, async (route) => { const bd = JSON.parse(route.request().postData() || "{}"); sent.push(bd.op); if (bd.op === "giftStage" && gate) { const g = gate; gate = null; await g.p; } return route.continue(); });
    const bdy = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
    const resp = (op) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r).op === op, { timeout: 120000 });
    const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.goto(ORIGIN + "/research/source-import", { waitUntil: "load", timeout: 180000 });
    const nb = p.locator("text=Necessary Only"); await frames(); if (await nb.count()) await nb.first().click();
    const sel0 = p.locator("select").first(); await sel0.locator("option[value=jag]").waitFor({ state: "attached", timeout: 120000 });
    let w = resp("giftContext"); const wt = resp("tables"); await sel0.selectOption("jag"); await w; await wt; await frames();
    const sec = p.locator("[data-testid=gift-preview]"); await sec.locator("summary").click();
    const fileIn = sec.locator("input[aria-label='Gift history export']");
    w = resp("inspect"); await fileIn.setInputFiles({ name: "jag-gifts-fictional.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) }); await w;
    await sec.locator("select[aria-label='Map Donor No'] option[value=CPTID]").waitFor({ state: "attached" });
    const btn = sec.locator("button", { hasText: "Preview provisional IDs" });
    ok(await btn.isDisabled(), `${vp.name}: preview disabled until the CPTID column is mapped explicitly`);
    await sec.locator("select[aria-label='Map Donor No']").selectOption("CPTID"); await sec.locator("select[aria-label='Map Amount']").selectOption("Gift_Amount"); await sec.locator("select[aria-label='Map Year']").selectOption("Calendar_Year");
    // while a preview is pending, file/mapping inputs are locked (scope cannot change under an in-flight reply)
    let rel; gate = { p: new Promise((r) => { rel = r; }) };
    w = resp("giftStage"); const rq = p.waitForRequest((r) => r.url().endsWith(API) && JSON.parse(r.postData() || "{}").op === "giftStage"); await btn.click(); await rq;
    ok(await sec.locator("select[aria-label='Map Appeal']").isDisabled() && await fileIn.isDisabled(), `${vp.name}: file and mapping inputs locked while preview is pending`);
    rel(); await w; await sec.locator("[data-testid=gift-stage]").waitFor();
    await sec.locator("select[aria-label='Map Appeal']").selectOption("Campaign_Appeal"); await frames();
    ok(await sec.locator("[data-testid=gift-stage]").count() === 0, `${vp.name}: mapping change after preview drops the preview/session in this browser`);
    w = resp("giftStage"); await btn.click(); await w; const stg = sec.locator("[data-testid=gift-stage]"); await stg.waitFor();
    const txt = await stg.innerText();
    ok(/606\s+rows, 606\s+held/.test(txt) && /0 new, 0 existing/.test(txt), `${vp.name}: all 606 rows held, zero automatic proposals`);
    ok(/Page 1 of 25/.test(txt), `${vp.name}: 25-row pagination`);
    await sec.locator("select[aria-label='Rows per page']").selectOption("50"); ok(/Page 1 of 13/.test(await stg.innerText()), `${vp.name}: 50-row pagination`);
    await sec.locator("select[aria-label='Proposal line 2']").selectOption("proposed-new"); await frames();
    const row2 = stg.locator("tbody tr").first(); ok(/HELD/.test(await row2.innerText()) && /1 new/.test(await stg.innerText()), `${vp.name}: proposal recorded as not-recorded proposal; row status stays HELD`);
    if (vp.name === "mobile390") { await stg.locator(".overflow-x-auto").evaluate((e) => { e.scrollLeft = e.scrollWidth; }); await frames(); }
    await p.evaluate(() => window.scrollTo(0, 0)); await frames();
    const nb2 = p.locator("button", { hasText: "Necessary Only" }); if (await nb2.count()) { await nb2.first().click({ force: true }); await nb2.first().waitFor({ state: "detached" }).catch(() => {}); }
    await stg.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 200)); await frames();
    await p.screenshot({ path: `${OUT}/${vp.name}-view.png` });
    w = resp("giftExport"); const dl = p.waitForEvent("download"); await sec.locator("button", { hasText: "Download review copy" }).click(); await w; const d = await dl;
    const out = fs.readFileSync(await d.path(), "utf8"); const lines = out.split("\r\n");
    ok(lines[0].startsWith('"Donor No","Amount","Year","Appeal","Provisional Preview ID"') && lines.length === 608 && lines.slice(1, 607).every((l) => l.includes("HELD - pending reconciliation (not recorded)") && l.includes("PROVISIONAL preview ID")) && lines[2].includes("\"'=1+1\""), `${vp.name}: review copy has header row first, warnings on every row, formula escaped`);
    // outer page table selector is NOT locked by this section: changing it must reset the section and drop late replies
    const outer = p.locator("select").nth(1); await outer.locator("option[value=constituents]").waitFor({ state: "attached" });
    w = resp("giftContext"); await outer.selectOption("constituents"); await w; await frames();
    ok(await sec.locator("[data-testid=gift-stage]").count() === 0 && await sec.locator("select[aria-label='Map Donor No']").count() === 0, `${vp.name}: outer table change resets the gift section (no old preview/file/mapping)`);
    if (!(await sec.getAttribute("open")) && !(await sec.evaluate((e) => e.open))) await sec.locator("summary").click();
    w = resp("inspect"); await fileIn.setInputFiles({ name: "jag-gifts-fictional.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) }); await w;
    await sec.locator("select[aria-label='Map Donor No'] option[value=CPTID]").waitFor({ state: "attached" });
    await sec.locator("select[aria-label='Map Donor No']").selectOption("CPTID");
    let rel2; gate = { p: new Promise((r) => { rel2 = r; }) };
    w = resp("giftStage"); const rq2 = p.waitForRequest((r) => r.url().endsWith(API) && JSON.parse(r.postData() || "{}").op === "giftStage"); await btn.click(); await rq2;
    const w2 = resp("giftContext"); await outer.selectOption("raw_master_giving_history"); await w2; rel2(); await w; await frames();
    ok(await sec.locator("[data-testid=gift-stage]").count() === 0 && await sec.locator("select[aria-label='Map Donor No']").count() === 0, `${vp.name}: deferred preview released after outer table change is ignored`);
    ok(await p.locator("[data-testid=gift-preview]").count() === 1 && await p.locator("[data-testid=baseline-attest]").count() === 1, `${vp.name}: exactly one baseline and one gift section after table changes (unique sibling keys)`);
    ok(sent.every((o) => o !== "apply" && o !== "preview"), `${vp.name}: no apply/source preview ops sent`);
    await ctx.close();
  }
  console.log("blocked external origins:", [...new Set(blocked)].join(",") || "none", "count", blocked.length);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
