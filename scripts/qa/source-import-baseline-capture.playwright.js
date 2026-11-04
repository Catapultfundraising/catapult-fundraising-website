// Matched before/after capture (UI mock; fictional; default-deny external). Same mocked state on both heads.
const { chromium } = require("playwright"); const crypto = require("crypto");
const PORT = process.env.PORT, OUT = process.env.OUT, BASE = `http://localhost:${PORT}`, API = "/api/research-source-import";
const CSV = "ID,Town,Region\n7,Springfield,North\n8,Shelbyville,South\n";
(async () => {
  const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome" });
  for (const vp of [{ n: "desktop", w: 1440, h: 1000 }, { n: "mobile390", w: 390, h: 844 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
    await ctx.addCookies([{ name: "catapult_research_auth", value: crypto.createHash("sha256").update("localpw:localsec").digest("hex"), url: BASE }]);
    let blocked = 0; await ctx.route((u) => new URL(u.href).origin !== BASE, (r) => { blocked++; return r.abort(); });
    const p = await ctx.newPage();
    await p.route("**" + API, (route) => { const bd = JSON.parse(route.request().postData() || "{}"); const J = (j, s = 200) => route.fulfill({ status: s, json: j });
      switch (bd.op) {
        case "clients": return J({ clients: ["fictional_y"], prepared: [] });
        case "tables": return J({ registry: { rev: "r" }, applyEnabled: false, tables: [{ table: "master", candidate: 3 }] });
        case "provenance": return J({ summary: "unknown", rows: [] }); case "fields": return J({ fields: [] }); case "allocConfig": return J({ error: "none" }, 404);
        case "baselineContext": return J({ available: true, configured: true, key: "CPTID", keyKind: "int", columns: ["CPTID", "City", "Region"], personRequired: false, linkRequired: false });
        case "inspect": return J({ headers: ["ID", "Town", "Region"], rows: 2 });
        case "baselinePreview": return J({ plan: { planDigest: "d".repeat(64), eligible: 3, held: 1, reasons: [{ reason: "current differs from attested prior export (possible manual edit)", count: 1 }] }, priorRows: 2, fileSha256: crypto.createHash("sha256").update(CSV).digest("hex"), export: "{}\n" });
        default: return J({ error: "x" }, 400); } });
    const bdy = (r) => { try { return JSON.parse(r.request().postData() || "{}"); } catch { return {}; } };
    const resp = (op) => p.waitForResponse((r) => r.url().endsWith(API) && bdy(r).op === op, { timeout: 120000 });
    const frames = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.goto(BASE + "/research/source-import", { waitUntil: "load", timeout: 180000 });
    await p.locator("select").nth(0).locator("option[value=fictional_y]").waitFor({ state: "attached", timeout: 120000 });
    const nb = p.locator("text=Necessary Only"); if (await nb.count()) await nb.first().click();
    let w = resp("tables"); await p.locator("select").nth(0).selectOption("fictional_y"); await w;
    await p.locator("select").nth(1).locator("option[value=master]").waitFor({ state: "attached" });
    w = resp("fields"); await p.locator("select").nth(1).selectOption("master"); await w;
    const sec = p.locator("[data-testid=baseline-attest]");
    if (await sec.count()) {
      await sec.locator("summary").click(); const fi = sec.locator("input[aria-label='Prior source export']");
      w = resp("inspect"); await fi.setInputFiles({ name: "prior-export.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) }); await w;
      await sec.locator("select[aria-label='Map ID']").selectOption("CPTID"); await sec.locator("select[aria-label='Map Town']").selectOption("City");
      await sec.locator("input[placeholder='YYYY-MM-DD']").fill("2025-06-30"); await sec.locator("textarea").fill("This prior source export is the file originally loaded into this table.");
      await sec.locator("label:has-text('Attested by') input").fill("Pat Example (fictional)"); await sec.locator("input[placeholder='YYYY-MM-DDTHH:MM:SSZ']").fill("2026-11-03T12:00:00Z");
      await sec.locator("input[placeholder='ticket or document id']").fill("TICKET-0001"); await sec.locator("input[type=checkbox]").check();
      w = resp("baselinePreview"); await sec.locator("button", { hasText: "Preview attestation" }).click(); await w; await sec.locator("[data-testid=baseline-plan]").waitFor();
      await frames(); await sec.screenshot({ path: `${OUT}/${vp.n}-section.png` });
    }
    // same viewport position on both heads: bottom of the page content just above the footer, header at top
    await p.evaluate(() => { const f = document.querySelector("footer"); window.scrollTo(0, Math.max(0, (f ? f.offsetTop : document.body.scrollHeight) - window.innerHeight)); });
    await frames(); await frames(); await p.screenshot({ path: `${OUT}/${vp.n}-view.png` });
    console.log(vp.n, "blocked", blocked); await ctx.close();
  }
  await b.close();
})();
