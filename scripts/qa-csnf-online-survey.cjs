// Local production server only. All submit requests are intercepted in-memory.
// Usage: NODE_PATH=/workspace/qa/node_modules node scripts/qa-csnf-online-survey.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
(async () => {
  fs.mkdirSync("/workspace/csnf-proof", { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || "/opt/viktor-playwright-browsers/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell", headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await context.route("**/*", async route => {
    const u = new URL(route.request().url());
    if (!["localhost", "127.0.0.1"].includes(u.hostname)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://localhost:3100/csnf-survey");
  await page.getByRole("heading", { name: "CSNF Survey", exact: true }).waitFor();
  // Dismiss the site's existing consent overlay without enabling tracking.
  const reject = page.getByRole("button", { name: /reject|necessary only|decline/i });
  if (await reject.count()) await reject.first().click();
  assert.equal(await page.locator('input[type="radio"]').count(), 34);
  assert.equal(await page.locator('input[type="checkbox"]').count(), 7);
  assert.equal(await page.locator("textarea").count(), 10);
  assert.ok(!/interview|calendly|schedule/i.test(await page.locator("main").first().innerText()));
  assert.equal(await page.locator('a[href="/csnf#case-for-support"]').count(), 1);
  assert.equal(await page.locator('a[href="/csnf#faq"]').count(), 1);
  assert.ok(await page.getByRole("button", { name: "Submit survey", exact: true }).isEnabled());
  await page.screenshot({ path: "/workspace/csnf-proof/survey-desktop.png", fullPage: true });
  await page.screenshot({ path: "/workspace/csnf-proof/survey-desktop-top.png" });
  await page.getByText("4. Which elements", { exact: false }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/workspace/csnf-proof/survey-desktop-questions.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3100/csnf-survey");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no mobile horizontal overflow");
  await page.screenshot({ path: "/workspace/csnf-proof/survey-mobile.png", fullPage: true });
  await page.screenshot({ path: "/workspace/csnf-proof/survey-mobile-top.png" });
  await page.getByText("4. Which elements", { exact: false }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/workspace/csnf-proof/survey-mobile-questions.png" });
  const sent = [];
  await page.route("**/api/csnf-survey", async route => {
    sent.push(JSON.parse(route.request().postData()));
    return route.fulfill({ status: sent.length === 1 ? 503 : 200, contentType: "application/json", body: sent.length === 1 ? JSON.stringify({ error: "Fixture ambiguous failure; retry safely." }) : JSON.stringify({ ok: true, id: sent.at(-1).id }) });
  });
  await page.locator('input[name="q1"][value="Good"]').check();
  await page.locator('input[name="q4"][value="Other"]').check();
  await page.locator("#survey-q1_comments").fill("Fixture comment, never sent to a provider.");
  await page.getByRole("button", { name: "Submit survey", exact: true }).click();
  await page.getByRole("alert").waitFor();
  assert.ok(await page.locator('input[name="q1"][value="Good"]').isDisabled(), "answers frozen on ambiguous failure");
  await page.getByRole("button", { name: "Retry saving response" }).click();
  await page.getByRole("heading", { name: "Thank you for sharing your perspective." }).waitFor();
  assert.deepEqual(sent[1], sent[0], "same UUID and actual payload on retry");
  await page.screenshot({ path: "/workspace/csnf-proof/survey-success-mobile.png" });
  // New page load is an intentionally new response, not an automatic replay.
  await page.reload();
  assert.ok(await page.getByRole("button", { name: "Submit survey", exact: true }).isEnabled());
  await page.goto("http://localhost:3100/csnf#case-for-support");
  assert.equal(await page.locator("#case-for-support").count(), 1);
  assert.equal(await page.locator("#faq").count(), 1);
  const cookie = createHash("sha256").update("fixture-password:fixture-secret").digest("hex");
  await context.addCookies([{ name: "catapult_csnf_auth", value: cookie, domain: "localhost", path: "/" }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3100/csnf-dashboard");
  await page.getByRole("heading", { name: "Survey Results", exact: true }).waitFor();
  await page.screenshot({ path: "/workspace/csnf-proof/report-empty-desktop.png" });
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("PASS browser: desktop/mobile, 10 questions + 10 comment fields, multi-select, source links, no overflow or scheduling text, no JS errors, stable retry ID/payload, disabled edits, confirmed success, separate report empty state.");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
