// Rendered PLAN-N QA (test-only stub). Local dev server, demo mode, fictional data. Playwright interception turns the demo
// preview reply into the shape Engage+website return when an active dashboard gift correction exists (overrideHold, held rows,
// no token) and answers apply with Engage's 409 gift_override_active. Never reaches Engage. Every request to an origin other than
// exactly http://localhost:3100 is aborted. No sleeps. NOT real SQL and NOT a server-side proof (server logic is unit-tested).
const { chromium } = require("playwright"); const crypto = require("crypto");
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const API = "/api/research-source-import"; const BEFORE = process.env.BEFORE === "1"; /* BEFORE=1: same fixture/actions on the parent head (no N), captures only */ const OUT = process.env.OUT || "/tmp/qa-n"; const CAP = !!process.env.CAPTURE;
const TEXT = "Held: a dashboard gift correction/void exists for this client; gift source updates are held. Nothing was saved.";
(async () => {
  require("fs").mkdirSync(OUT, { recursive: true });
  const cookie = crypto.createHash("sha256").update("localpw:localsec").digest("hex");
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  const ext = []; const sent = []; const applied = []; let jobReply = () => ({ status: 200, json: {} });
  async function run(vw, name, mode) {
    const ctx = await b.newContext({ viewport: vw, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
    await ctx.addCookies([{ name: "catapult_research_auth", value: cookie, url: "http://localhost:3100" }]);
    await ctx.route((u) => new URL(u.href).origin !== "http://localhost:3100", (r) => { ext.push(new URL(r.request().url()).origin); return r.abort(); });
    const p = await ctx.newPage();
    await p.route("**" + API, async (route) => {
      const bd = JSON.parse(route.request().postData() || "{}"); sent.push({ op: bd.op, client: bd.client, table: bd.table });
      if (bd.op === "preview") {
        const fr = await route.fetch(); const j = await fr.json(); if (!j.result) { console.log("preview reply", fr.status(), JSON.stringify(j).slice(0, 400)); return route.fulfill({ status: fr.status(), json: j }); }
        if (mode === "hold" && !BEFORE) {
          const res = j.result; for (const r of res.rows) if (r.outcome === "update" || r.outcome === "insert") { res.counts[r.outcome]--; res.counts.held++; r.outcome = "held"; r.reason = TEXT; for (const f of r.fields) if (f.outcome === "apply") { f.outcome = "held"; f.reason = TEXT; res.counts.applyValues--; res.counts.heldValues++; } }
          return route.fulfill({ json: { ...j, overrideHold: true, token: null, applyAvailable: true } });
        }
        return route.fulfill({ json: { ...j, overrideHold: false, token: "synthetic-test-token", applyAvailable: true, requestId: "f".repeat(32) } });
      }
      if (bd.op === "jobPreview") { const j = await (await route.fetch()).json(); return route.fulfill({ json: { ...j, token: `tok-${bd.batchIndex}`, requestId: String(bd.batchIndex).repeat(32).slice(0, 32), applyAvailable: true } }); }
      if (bd.op === "apply" && mode === "job") { applied.push(bd.token); const a = jobReply(bd.token); return route.fulfill({ status: a.status, json: a.json }); }
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
    const expectEnabled = (loc) => loc.evaluate((el) => new Promise((res) => { if (!el.disabled) return res(); const mo = new MutationObserver(() => { if (!el.disabled) { mo.disconnect(); res(); } }); mo.observe(el, { attributes: true, attributeFilter: ["disabled"] }); }));
    const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    let w = resp("tables"); await sel(0).selectOption("pvas"); await w;
    await sel(1).locator("option[value=donorsearch_results]").waitFor({ state: "attached" }); w = resp("fields"); await sel(1).selectOption("donorsearch_results"); await w;
    if (mode === "job") {
      await p.click("text=Load fictional 1,200-row demo file");
      const nm = p.locator("input[placeholder^='Recorded as author']").first(); if (!(await nm.inputValue())) await nm.fill("Pat Example (fictional)");
      await p.locator("button", { hasText: /^Preview whole file/ }).click();
      await p.locator("button", { hasText: "Save ready batches" }).waitFor({ timeout: 180000 }); await expectEnabled(p.locator("button", { hasText: /^Preview whole file/ }));
    } else {
      await p.click("text=Load fictional demo file");
      w = resp("preview"); await p.locator("button", { hasText: /^Preview$/ }).click(); await w; await frames();
    }
    if (BEFORE && mode !== "job") {
      if (mode === "apply409") { await p.locator("input[placeholder^='Recorded as author']").last().fill("Pat Example (fictional)"); const aw = resp("apply"); await p.locator("button", { hasText: /^Save \d+ values$/ }).click(); await aw; await frames(); }
      await p.evaluate(() => window.scrollTo(0, 0)); await frames(); ok(!(await p.locator("text=Necessary Only").count()), `${name}: cookie banner gone before capture`);
      if (CAP) await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    } else if (mode === "job") {
      const rowsText = async (i) => p.locator("section[aria-label='Large file plan'] tbody tr").nth(i).innerText();
      const status = async (i) => (await rowsText(i)).split("\t")[2] || (await rowsText(i));
      const n = await p.locator("section[aria-label='Large file plan'] tbody tr").count();
      ok(n >= 4, `${name}: whole-file plan has ${n} batches`);
      // click 1: batch0 saved, batch1 refused by an active override (409), later batches NOT sent
      jobReply = (tok) => tok === "tok-0" ? { status: 200, json: { records: 225, values: 225, replayed: false } } : { status: 409, json: { error: TEXT, code: "gift_override_active" } };
      await p.locator("text=I reviewed the whole-file plan").click();
      const saveBtn = p.locator("button", { hasText: "Save ready batches" });
      await saveBtn.click(); await p.locator("text=Earlier batches saved: 1 of").waitFor(); await expectEnabled(saveBtn);
      ok(JSON.stringify(applied) === JSON.stringify(["tok-0", "tok-1"]), `${name}: click1 sent ${JSON.stringify(applied)} (batch0 saved, batch1 refused, batch2+ not sent)`);
      ok((await rowsText(0)).includes("Saved") && (await rowsText(1)).includes(`Earlier batches saved: 1 of ${n}. File not complete.`), `${name}: batch0 Saved; batch1 shows 1 of ${n} (not 0)`);
      if (CAP) { await p.locator("section[aria-label='Large file plan']").scrollIntoViewIfNeeded(); await frames(); await p.locator("section[aria-label='Large file plan']").screenshot({ path: `${OUT}/${name}-refused.png` }); }
      // click 2 (override reconciled, mock): exact same batch1 token resent; batch2 expired, batch3 revision changed -> Failed (re-preview); batch0 never resent
      applied.length = 0;
      jobReply = (tok) => tok === "tok-2" ? { status: 409, json: { error: "Preview expired; preview the file again", code: "expired" } } : tok === "tok-3" ? { status: 400, json: { error: "registry revision mismatch; preview again", code: "invalid" } } : { status: 200, json: { records: 225, values: 225, replayed: false } };
      await saveBtn.click(); await p.locator("section[aria-label='Large file plan'] tbody tr").nth(3).locator("text=Failed").waitFor(); await expectEnabled(saveBtn).catch(() => {});
      ok(applied[0] === "tok-1" && !applied.includes("tok-0"), `${name}: click2 resent same batch1 token first, batch0 not resent: ${JSON.stringify(applied)}`);
      ok((await rowsText(1)).includes("Saved") && (await rowsText(2)).includes("Failed") && (await rowsText(3)).includes("Failed"), `${name}: batch1 Saved after same-body retry; expired + revision-changed batches Failed (need new preview)`);
    } else if (mode === "hold") {
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
  const pre = BEFORE ? "before" : "after";
  await run({ width: 1440, height: 1000 }, `${pre}-preview-desktop`, "hold");
  await run({ width: 390, height: 844 }, `${pre}-preview-mobile390`, "hold");
  await run({ width: 1440, height: 1000 }, `${pre}-apply409-desktop`, "apply409");
  await run({ width: 390, height: 844 }, `${pre}-apply409-mobile390`, "apply409");
  if (!BEFORE) await run({ width: 1440, height: 1000 }, "after-job", "job");
  console.log("requests", JSON.stringify(sent.filter((s) => s.op === "apply" || s.op === "status")));
  console.log("external blocked", ext.length, [...new Set(ext)]);
  await b.close();
})();
