// Rendered W0 QA (test-only stub). Local dev server, CSV_UPDATES_DEMO=1 fictional harness page. Playwright FULFILLS every
// /api/wcbhc-data-v2 request with fictional data (never reaches Engage/SQL). Every non-http://localhost:3100 origin aborted.
// No sleeps. NOT real SQL and NOT a server-side proof (backend/website logic is unit-tested separately).
const { chromium } = require("playwright"); const crypto = require("crypto");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/wcbhc-data-v2"; const OUT = process.env.OUT || "/tmp/qa-w0"; const CAP = !!process.env.CAPTURE;
const BEFORE = process.env.BEFORE === "1"; /* BEFORE=1: same fictional state + actions on accepted 4495b54 (no W0); captures + legacy checks only */
const UI = "Corrections to client-database gifts are unavailable for this client right now.";
const gift = (o) => ({ cptid: 7011, client_id: null, donor_name: "Avery Fictional", kind: "gift", amount: 250, gift_date: "2026-01-05", note: null, source: "database", batch_id: null, created_by: "Client database", created_at: "2026-01-05", ...o });
const state = (avail) => ({ prospects: [], updates: [], batches: [], giftOverrides: [], voidedGifts: [], ...(avail === undefined ? {} : { databaseGiftEditsAvailable: avail }),
  gifts: [gift({ id: 0, key: "db:fict:1" }), gift({ id: 42, source: "portal", donor_name: "Blair Example", cptid: 7012, created_by: "Pat Example", amount: 100 })] });
(async () => {
  require("fs").mkdirSync(OUT, { recursive: true });
  const cookie = crypto.createHash("sha256").update("localpw:localsec").digest("hex");
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ext = []; const posts = [];
  async function run(vw, name, avail, post409) {
    const ctx = await b.newContext({ viewport: vw, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
    await ctx.addCookies([{ name: "catapult_research_auth", value: cookie, url: "http://localhost:3100" }]);
    await ctx.route((u) => new URL(u.href).origin !== "http://localhost:3100", (r) => { ext.push(new URL(r.request().url()).origin); return r.abort(); });
    const p = await ctx.newPage();
    await p.route("**" + API + "*", async (route) => {
      const rq = route.request();
      if (rq.method() === "GET") return route.fulfill({ json: new URL(rq.url()).search ? { total: 0, groups: [], items: [] } : state(avail) });
      const bd = JSON.parse(rq.postData() || "{}"); if (bd.op !== "editGift" && bd.op !== "voidGift") return route.fulfill({ json: { total: 0, groups: [], items: [], matches: [], log: [], merges: [], deleted: [], notDuplicates: [] } }); posts.push({ name, op: bd.op, gift: bd.gift });
      if (post409) return route.fulfill({ status: 409, json: { error: UI + " Dashboard-entered gifts can still be edited.", code: "database_gift_edits_unavailable" } });
      return route.fulfill({ json: { changed: 1 } });
    });
    const got = p.waitForResponse((r) => r.url().endsWith(API) && r.request().method() === "GET");
    await p.goto("http://localhost:3100/research/gift-edit-demo", { waitUntil: "load", timeout: 180000 });
    await got;
    const row = (n) => p.locator("tr", { hasText: n });
    await row("Blair Example").waitFor().catch(async (e) => { await p.screenshot({ path: OUT + "/fail.png" }); console.log((await p.content()).slice(0, 1500)); throw e; });
    const nb = p.locator("text=Necessary Only"); if (await nb.count()) { await nb.first().click(); await nb.first().waitFor({ state: "detached" }); }
    return { p, ctx, row };
  }
  async function cap(p, row, file, mobile) {
    await p.evaluate(() => window.scrollTo(0, 0)); await row("Avery Fictional").scrollIntoViewIfNeeded();
    if (mobile) await row("Avery Fictional").evaluate((el) => { const sc = el.closest(".overflow-auto"); if (sc) sc.scrollLeft = sc.scrollWidth; });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.screenshot({ path: `${OUT}/${file}` });
  }
  if (BEFORE) {
    for (const [vw, nm] of [[{ width: 1280, height: 900 }, "desktop"], [{ width: 390, height: 844 }, "mobile-scrolled"]]) {
      const { ctx, row, p } = await run(vw, "before-" + nm, false);
      ok(await row("Avery Fictional").getByRole("button", { name: "Edit" }).count() === 1, `BEFORE ${nm}: legacy UI shows database-key Edit even with databaseGiftEditsAvailable=false (field unknown pre-W0)`);
      if (CAP) await cap(p, row, `w0-BEFORE-4495b54-${nm}.png`, nm !== "desktop");
      await ctx.close();
    }
    console.log("external origins attempted/blocked:", ext.length, JSON.stringify([...new Set(ext)])); await b.close(); return;
  }
  for (const [label, avail] of [["missing", undefined], ["malformed", "true"], ["false", false]]) {
    const { ctx, row, p } = await run({ width: 1280, height: 900 }, label, avail);
    ok(await row("Avery Fictional").getByRole("button", { name: "Edit" }).count() === 0 && await row("Avery Fictional").getByText("Edits unavailable").count() === 1, `${label}: database-key row shows no Edit/Void (fail closed)`);
    ok(await row("Blair Example").getByRole("button", { name: "Edit" }).count() === 1, `${label}: portal SQL-id row keeps Edit/Void`);
    ok(await p.getByText(UI, { exact: false }).count() >= 1, `${label}: explanation shown`);
    if (CAP && label === "false") await cap(p, row, "w0-AFTER-desktop.png", false);
    await ctx.close();
  }
  { const { ctx, row, p } = await run({ width: 390, height: 844 }, "mobile", false);
    ok(await row("Avery Fictional").getByText("Edits unavailable").count() === 1, "390px: unavailable label rendered");
    if (CAP) { await cap(p, row, "w0-AFTER-mobile.png", false); await cap(p, row, "w0-AFTER-mobile-scrolled.png", true); }
    await ctx.close(); }
  { const { ctx, row, p } = await run({ width: 1280, height: 900 }, "true", true);
    ok(await row("Avery Fictional").getByRole("button", { name: "Edit" }).count() === 1, "literal true: database-key Edit available (legacy unchanged)");
    if (CAP) await cap(p, row, "w0-AFTER-projection-true-desktop.png", false); /* same-head policy-true state; NOT a before baseline */
    await ctx.close(); }
  { const { ctx, row, p } = await run({ width: 1280, height: 900 }, "refused", true, true);
    await row("Avery Fictional").getByRole("button", { name: "Void" }).click();
    await p.getByLabel("Your name (required for this change)").fill("Pat Example");
    const reason = p.locator("[role=dialog] input").nth(1); await reason.fill("duplicate");
    const done = p.waitForResponse((r) => r.url().includes(API) && r.request().method() === "POST");
    await p.locator("[role=dialog]").getByRole("button", { name: /void/i }).last().click(); await done;
    await p.locator("[role=dialog]").getByText(UI, { exact: false }).or(p.getByText(UI, { exact: false }).last()).first().waitFor();
    const pst = posts.filter((x) => x.name === "refused");
    ok(pst.length === 1 && pst[0].op === "voidGift" && pst[0].gift.key === "db:fict:1" && pst[0].gift.id === undefined, "stale-available void sends key only once; typed 409 refusal message shown (no retry)");
    if (CAP) await p.screenshot({ path: `${OUT}/w0-refused-desktop.png` });
    await ctx.close(); }
  ok(posts.filter((x) => x.name !== "refused").length === 0, "no gift writes sent in display-only cases");
  console.log("external origins attempted/blocked:", ext.length, JSON.stringify([...new Set(ext)]));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
