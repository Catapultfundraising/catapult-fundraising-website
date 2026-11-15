// Local Chromium E2E. Synthetic credentials/rows only. No remote service, SQL or real donor data.
const { chromium } = require("playwright");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const BASE = process.env.QA_BASE || "http://127.0.0.1:3100";
const PATH = "/research/source-import/portfolio-preview";
const COOKIE = createHash("sha256").update("synthetic-preview-password:synthetic-preview-secret").digest("hex");
const sample = fs.readFileSync("/tmp/portfolio-sample.csv");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await context.addCookies([{ name: "catapult_research_auth", value: COOKIE, url: BASE }]);
  const page = await context.newPage();
  const errors = [], calls = [];
  page.on("pageerror", e => errors.push(e.message));
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    if (url.pathname.startsWith("/api/")) {
      calls.push(url.pathname);
      if (url.pathname !== "/api/research-source-import/portfolio-preview") return route.abort();
    }
    return route.continue();
  });
  await page.goto(BASE + PATH);
  if (await page.getByRole("button", { name: "Necessary Only", exact: true }).count()) await page.getByRole("button", { name: "Necessary Only", exact: true }).click();
  await page.getByLabel("Staff attribution", { exact: true }).waitFor({ state: "visible" });
  await page.getByLabel("Staff attribution", { exact: true }).fill("Fictional QA reviewer");
  await page.getByLabel("Source-as-of date", { exact: true }).fill("2026-10-19");
  await page.screenshot({ path: "/tmp/portfolio-evidence/01-initial-desktop.png", fullPage: true });
  for (const client of ["pvas", "csnf", "jag", "wcbhc", "baq"]) {
    console.log("Checking client", client);
    await page.getByLabel("Client scope", { exact: true }).selectOption(client);
    await page.waitForFunction(() => !document.querySelector('input[aria-label="Upload synthetic CSV"]').disabled);
    assert.equal(await page.locator("article li").count(), 1, "new client scope has no other client's appended notes");
    await page.getByLabel("Upload synthetic CSV", { exact: true }).setInputFiles({ name: "synthetic.csv", mimeType: "text/csv", buffer: sample });
    await page.getByRole("button", { name: "Preview changes", exact: true }).click();
    await page.getByText("5 proposed simulation changes.", { exact: false }).waitFor();
    assert.equal(await page.getByText("Held: supplied internal CPTID contradicts", { exact: false }).count(), 1);
    assert.equal(await page.getByText("Historical text - do not append", { exact: false }).count(), 0);
    await page.getByRole("button", { name: "Simulate approved changes — no SQL", exact: true }).click();
    await page.getByText("Simulation receipt — not an import receipt", { exact: true }).waitFor();
    assert.equal(await page.locator("article li").count(), 4);
    assert.match(await page.locator("article").first().innerText(), /Existing manual note — preserve verbatim/);
    assert.match(await page.locator("article").nth(1).innerText(), /2500.00 · Manual solicitor/);
    if (client === "pvas") {
      const downloaded = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download simulation receipt", exact: true }).click();
      const receiptDownload = await downloaded;
      await receiptDownload.saveAs("/tmp/portfolio-evidence/SIMULATION-receipt.json");
      assert.equal(JSON.parse(fs.readFileSync("/tmp/portfolio-evidence/SIMULATION-receipt.json")).sqlCommitted, false);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: "/tmp/portfolio-evidence/02-simulation-desktop.png", fullPage: true });
    }
    await page.getByRole("button", { name: "Preview changes", exact: true }).click();
    await page.getByText("0 proposed simulation changes.", { exact: false }).waitFor();
    assert.equal(await page.getByText("Duplicate note — no change", { exact: true }).count(), 3);
    assert.equal(await page.locator("article li").count(), 4);
    // Date and mapping changes each remove a prior approval.
    await page.getByLabel("Source-as-of date", { exact: true }).fill("2026-10-20");
    assert.equal(await page.getByRole("button", { name: "Simulate approved changes — no SQL", exact: true }).count(), 0);
    await page.getByLabel("Source-as-of date", { exact: true }).fill("2026-10-19");
    await page.getByRole("button", { name: "Preview changes", exact: true }).click();
    await page.getByText("0 proposed simulation changes.", { exact: false }).waitFor();
    await page.getByLabel("Map Campaign Ask", { exact: true }).selectOption("");
    assert.equal(await page.getByRole("button", { name: "Simulate approved changes — no SQL", exact: true }).count(), 0);
  }
  // Invalid replacement must not leave the old valid CSV available for preview.
  await page.getByLabel("Upload synthetic CSV", { exact: true }).setInputFiles({ name: "unsupported.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from("fictional") });
  await page.locator('p[role="alert"]').waitFor();
  assert.match(await page.locator('p[role="alert"]').innerText(), /UTF-8 CSV only/);
  assert.equal(await page.getByRole("button", { name: "Preview changes", exact: true }).count(), 0);
  assert.equal(await page.getByLabel("Map New Notes", { exact: true }).count(), 0);
  assert.equal(await page.getByText("Selected: synthetic.csv", { exact: false }).count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/portfolio-evidence/03-mobile.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  assert.ok(calls.length > 15);
  assert.equal(calls.every(p => p === "/api/research-source-import/portfolio-preview"), true);
  // Same built app, production env: authenticated page AND API refuse.
  const prod = "http://127.0.0.1:3101";
  assert.equal((await context.request.get(prod + PATH)).status(), 404);
  assert.equal((await context.request.post(prod + "/api/research-source-import/portfolio-preview", { data: { op: "context", client: "pvas" } })).status(), 404);
  // Logged-out preview API refuses without invoking any external service.
  const noAuth = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  assert.equal((await noAuth.request.post(BASE + "/api/research-source-import/portfolio-preview", { data: { op: "context", client: "pvas" } })).status(), 401);
  await noAuth.close();
  // The existing parent page is unmodified by this delta; capture the "before" workflow without live transport.
  const beforeContext = await browser.newContext({ viewport: { width: 1440, height: 1080 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await beforeContext.addCookies([{ name: "catapult_research_auth", value: COOKIE, url: BASE }]);
  await beforeContext.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  const beforePage = await beforeContext.newPage();
  await beforePage.goto(BASE + "/research/source-import");
  if (await beforePage.getByRole("button", { name: "Necessary Only", exact: true }).count()) await beforePage.getByRole("button", { name: "Necessary Only", exact: true }).click();
  await beforePage.getByRole("heading", { level: 1 }).waitFor();
  await beforePage.screenshot({ path: "/tmp/portfolio-evidence/00-before-source-import.png", fullPage: true });
  await beforeContext.close();
  fs.writeFileSync("/tmp/portfolio-evidence/browser-results.json", JSON.stringify({ passed: true, clients: ["pvas", "csnf", "jag", "wcbhc", "baq"], assertions: ["upload/map/preview/simulate", "exact-ID contradiction held", "manual protection", "old-note preservation", "repeat-note deduplication", "client-switch reset", "date/mapping invalidation", "invalid-upload replacement clears old file", "mobile no horizontal overflow", "no page errors", "no API outside simulation", "production page404", "production API404", "unauthenticated API401"], apiCalls: calls.length }, null, 2));
  console.log("PASS: five-client browser simulation, deduplication, binding invalidation, invalid replacement, mobile, production GET/API refusal.");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
