// Rendered PLAN-N QA (test-only stub). Local dev server, demo mode, fictional data. Playwright interception turns the demo
// preview reply into the shape Engage+website return when an active dashboard gift correction exists (overrideHold, held rows,
// no token) and answers apply with Engage's 409 gift_override_active. Never reaches Engage. Every request to an origin other than
// exactly http://localhost:3100 is aborted. No sleeps. NOT real SQL and NOT a server-side proof (server logic is unit-tested).
const { chromium } = require("playwright"); const crypto = require("crypto");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const OUT = process.env.OUT || "/tmp/qa-n"; const CAP = !!process.env.CAPTURE;
const TEXT = "Held: a dashboard gift correction/void exists for this client; gift source updates are held. Nothing was saved.";
(async () => {
  require("fs").mkdirSync(OUT, { recursive: true });
  const cookie = crypto.createHash("sha256").update("localpw:localsec").digest("hex");
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ext = []; const sent = [];
  async function run(vw, name, mode) {
    const ctx = await b.newContext({ viewport: vw, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
    await ctx.addCookies([{ name: "catapult_research_auth", value: cookie, url: "http://localhost:3100" }]);
    await ctx.route((u) => new URL(u.href).origin !== "http://localhost:3100", (r) => { ext.push(new URL(r.request().url()).origin); return r.abort(); });
    const p = await ctx.newPage();
    await p.route("**" + API, async (route) => {
      const bd = JSON.parse(route.request().postData() || "{}"); sent.push({ op: bd.op, client: bd.client, table: bd.table });
      if (bd.op === "preview") {
        const fr = await route.fetch(); const j = await fr.json(); if (!j.result) { console.log("preview reply", fr.status(), JSON.stringify(j).slice(0, 400)); return route.fulfill({ status: fr.status(), json: j }); }
        if (mode === "hold") {
          const res = j.result; for (const r of res.rows) if (r.outcome === "update" || r.outcome === "insert") { res.counts[r.outcome]--; res.counts.held++; r.outcome = "held"; r.reason = TEXT; for (const f of r.fields) if (f.outcome === "apply") { f.outcome = "held"; f.reason = TEXT; res.counts.applyValues--; res.counts.heldValues++; } }
          return route.fulfill({ json: { ...j, overrideHold: true, token: null, applyAvailable: true } });
        }
        return route.fulfill({ json: { ...j, overrideHold: false, token: "synthetic-test-token", applyAvailable: true, requestId: "f".repeat(32) } });
      }
      if (bd.op === "apply") return route.fulfill({ status: 409, json: { error: TEXT, code: "gift_override_active" } });
      if (bd.op === "status") return route.fulfill({ json: { found: false } });
      return route.continue();
    });
    await p.goto("http://localhost:3100/research/source-import?demo=1", { waitUntil: "load", timeout: 180000 });
    const sel = (i) => p.locator("select").nth(i);
    const bdy = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
    const resp = (op) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r).op === op, { timeout: 120000 });
    await sel(0).locator("option[value=pvas]").waitFor({ state: "attached", timeout: 120000 });
    const nb = p.locator("text=Necessary Only"); if (await nb.count()) { await nb.first().click(); await nb.first().waitFor({ state: "detached" }).catch(() => {}); }
    const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    let w = resp("tables"); await sel(0).selectOption("pvas"); await w;
    await sel(1).locator("option[value=donorsearch_results]").waitFor({ state: "attached" }); w = resp("fields"); await sel(1).selectOption("donorsearch_results"); await w;
    await p.click("text=Load fictional demo file");
    w = resp("preview"); await p.locator("button", { hasText: /^Preview$/ }).click(); await w; await frames();
    if (mode === "hold") {
      await p.locator("text=Held: a dashboard gift correction or void exists").waitFor();
      ok(true, `${name}: hold banner rendered`);
      ok(!(await p.locator("button", { hasText: /^Save \d+ values$/ }).count()), `${name}: no Save button without token`);
      ok((await p.locator(`text=${TEXT}`).count()) >= 1, `${name}: held rows show fixed reason`);
      if (CAP) { await p.evaluate(() => window.scrollTo(0, 0)); await frames(); ok(!(await p.locator("text=Necessary Only").count()), `${name}: cookie banner gone before capture`); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); }
    } else {
      await p.locator("input[placeholder^='Recorded as author']").last().fill("Pat Example (fictional)");
      const aw = resp("apply"); await p.locator("button", { hasText: /^Save \d+ values$/ }).click(); await aw; await frames();
      await p.locator("text=After the corrections are reconciled").waitFor();
      const t = await p.innerText("body");
      ok(t.includes(TEXT), `${name}: 409 gift_override_active message rendered`);
      ok(!t.includes("Save not confirmed") && !(await p.locator("button:visible", { hasText: "Check status" }).count()), `${name}: definitive refusal, not shown as unconfirmed, no Check status`);
      ok(await p.locator("button", { hasText: /^Save \d+ values$/ }).isVisible(), `${name}: same preview kept (may be resent while unexpired)`);
      if (CAP) { await p.evaluate(() => window.scrollTo(0, 0)); await frames(); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); }
    }
    await ctx.close();
  }
  await run({ width: 1440, height: 1000 }, "n-hold-desktop", "hold");
  await run({ width: 390, height: 844 }, "n-hold-mobile390", "hold");
  await run({ width: 1440, height: 1000 }, "n-apply409-desktop", "apply409");
  console.log("requests", JSON.stringify(sent.filter((s) => s.op === "apply" || s.op === "status")));
  console.log("external blocked", ext.length, [...new Set(ext)]);
  await b.close();
})();
