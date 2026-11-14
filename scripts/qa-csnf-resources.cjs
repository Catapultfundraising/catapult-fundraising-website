// Local-only before/after proof. No forms or private providers are submitted.
// EXPECT_RESOURCE=0 captures original invitations; default1 checks resource mode.
const { chromium } = require("playwright");
const assert = require("node:assert/strict"), fs = require("node:fs");
(async () => {
  const resource = process.env.EXPECT_RESOURCE !== "0";
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || "/opt/viktor-playwright-browsers/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell", headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await page.addInitScript(() => localStorage.setItem("catapult_cookie_consent", "necessary"));
  await page.route("**/*", route => new URL(route.request().url()).hostname === "localhost" ? route.continue() : route.abort());
  // VIP still renders the exact original shared invitation layout, so it is
  // also a stable before-state reference without another production build.
  const url = resource ? "/csnf" : "/csnfvip";
  await page.goto(`http://localhost:3100${url}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Bringing higher education home to the Northwest Community" }).waitFor();
  const necessary = page.getByRole("button", { name: "Necessary Only", exact: true });
  if (await necessary.count()) await necessary.click();
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.locator("section img").first().evaluate(img => img.decode().catch(() => {}));
  assert.equal(await page.getByRole("link", { name: "Schedule your interview", exact: true }).count(), resource ? 0 : 2);
  if (resource) assert.ok(!/interview|calendly/i.test(await page.locator("main").innerText()));
  fs.mkdirSync("/workspace/csnf-proof", { recursive: true });
  await page.screenshot({ path: `/workspace/csnf-proof/csnf-resource-${resource ? "after" : "before"}-desktop.png` });
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/workspace/csnf-proof/csnf-resource-${resource ? "after" : "before"}-faq.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://localhost:3100${url}`, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (resource) {
    const hero = await page.locator("main section").first().boundingBox();
    const label = await page.locator("main section").first().locator("p").first().boundingBox();
    assert.ok(label.y >= hero.y, "mobile campaign label stays inside hero, not clipped under masthead");
  }
  await page.screenshot({ path: `/workspace/csnf-proof/csnf-resource-${resource ? "after" : "before"}-mobile.png` });
  if (resource) {
    await page.goto("http://localhost:3100/csnfvip", { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByRole("link", { name: "Schedule your interview", exact: true }).count(), 2);
    assert.equal(await page.getByText("Will I be asked to make a gift during my interview?", { exact: true }).count(), 1);
  }
  await browser.close();
  console.log(`PASS CSNF ${resource ? "resource mode and unchanged VIP" : "original invitation before-state"} desktop/mobile/FAQ proof.`);
})().catch(e => { console.error(e); process.exit(1); });
