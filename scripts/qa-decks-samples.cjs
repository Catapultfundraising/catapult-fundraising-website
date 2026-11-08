// Local QA with synthetic in-memory credentials. No values/cookies are logged.
const { chromium } = require("playwright");
const { randomBytes } = require("node:crypto");
const { spawn } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const origin = "http://localhost:3097", sample = "/samples/feasibility-study";
const password = randomBytes(24).toString("hex");
const out = process.env.QA_OUTPUT || "/tmp/decks-addition-evidence";
const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", "3097"], {
  env: { ...process.env, DECKS_PASSWORD: password, DECKS_AUTH_SECRET: randomBytes(32).toString("hex") }, stdio: ["ignore", "pipe", "pipe"],
});
let browser;
const assert = require("node:assert/strict");
const checks = [];
async function main() {
  mkdirSync(out, { recursive: true });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", b => { if (b.toString().includes("Ready")) resolve(); });
    server.on("exit", code => reject(new Error(`Server exited ${code}`)));
    setTimeout(() => reject(new Error("Server startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const anon = await context.request.get(origin + "/decks", { maxRedirects: 0 });
  assert.equal(anon.status(), 307);
  assert.ok(anon.headers().location.includes("/decks/login"));
  const response = await context.request.post(origin + sample + "/session", { headers: { Origin: origin.replace("http:", "https:") }, data: { password } });
  assert.equal(response.status(), 200);
  assert.equal((await context.request.get(origin + "/decks", { maxRedirects: 0 })).status(), 307);
  assert.equal((await context.request.get(origin + "/research", { maxRedirects: 0 })).status(), 307);
  checks.push("anonymous and sample-only sessions cannot enter protected decks or research");
  await context.clearCookies();
  await page.goto(origin + "/decks");
  await page.getByRole("button", { name: "Necessary Only", exact: true }).click();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await page.waitForURL(origin + "/decks");
  const slugs = ["legacy-call", "capital-campaign", "annual-fund", "mid-level-engagement", "board-development"];
  for (const slug of slugs) {
    assert.equal(await page.locator(`a[href="/decks/${slug}"]`).filter({ hasText: "Present" }).count(), 1);
    assert.equal(await page.locator(`a[href="/decks/${slug}/deck.pdf"]`).count(), 1);
  }
  const study = page.locator(`a[href="${sample}"]`);
  const dashboard = page.locator('a[href="/demo-dashboard"]');
  assert.equal(await study.count(), 1); assert.equal(await dashboard.count(), 1);
  const panel = page.locator('section[aria-labelledby="sample-deliverables-heading"]');
  await panel.screenshot({ path: `${out}/library-samples-desktop.png` });
  checks.push("existing sales gate works; all five deck presentation/PDF links preserved; two sample cards visible");
  await study.click();
  await page.waitForURL(origin + sample);
  await page.getByRole("heading", { level: 1, name: "Campaign feasibility study", exact: true }).waitFor();
  assert.equal((await context.cookies()).filter(c => c.name === "catapult_feasibility_sample").length, 0);
  assert.equal((await context.request.get(origin + sample + "/media/page-001.webp")).status(), 200);
  assert.equal((await context.request.get(origin + sample + "/media/document.pdf")).status(), 200);
  assert.equal((await context.request.get(origin + "/research", { maxRedirects: 0 })).status(), 307);
  checks.push("existing deck cookie reads sample page/image/PDF without second password or new sample cookie; research remains closed");
  await page.goto(origin + "/decks");
  await page.locator('a[href="/demo-dashboard"]').click();
  await page.waitForURL(origin + "/demo-dashboard");
  await page.getByText("Sample dashboard · fictional data.", { exact: true }).waitFor();
  checks.push("dashboard card opens existing fictional dashboard");
  await page.goto(origin + "/decks");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('section[aria-labelledby="sample-deliverables-heading"]').screenshot({ path: `${out}/library-samples-mobile.png` });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth));
  checks.push("mobile sample cards fit without horizontal overflow");
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/qa-results.json`, JSON.stringify({ ok: true, checks, browserErrors: errors }, null, 2));
  console.log(JSON.stringify({ ok: true, checks }));
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.kill(); });
