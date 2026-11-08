/* Local-only browser QA. Install playwright separately and set NODE_PATH if needed.
 * Requires an already built checkout and private FEASIBILITY_SAMPLE_LOCAL_DIR.
 * Generates synthetic credentials in memory; never prints credentials or cookies.
 */
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const { randomBytes, createHash } = require("node:crypto");
const { mkdirSync, writeFileSync } = require("node:fs");
const assert = require("node:assert/strict");
const path = "/samples/feasibility-study";
const origin = "http://localhost:3097";
const out = process.env.QA_OUTPUT || "/tmp/flipbook-evidence";
const password = randomBytes(24).toString("hex");
const cron = randomBytes(32).toString("hex");
const checks = [];
let browser;
const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", "3097"], {
  env: { ...process.env, DECKS_PASSWORD: password, DECKS_AUTH_SECRET: randomBytes(32).toString("hex"), CRON_SECRET: cron },
  stdio: ["ignore", "pipe", "pipe"],
});
async function main() {
  mkdirSync(out, { recursive: true });
  await new Promise((resolve, reject) => {
    server.stdout.on("data", b => { if (b.toString().includes("Ready")) resolve(); });
    server.on("exit", code => reject(new Error(`Server exited ${code}`)));
    setTimeout(() => reject(new Error("Server startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  const page = await context.newPage();
  async function shot(name) {
    await page.waitForFunction(() => [...document.querySelectorAll('img[src*="/media/"]')].every(i => i.complete && i.naturalWidth));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  }
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(origin + path);
  await page.getByRole("button", { name: "Necessary Only", exact: true }).click();
  assert.ok(page.url().endsWith("/login"));
  await shot("login-desktop");
  for (const name of ["page-001.webp", "document.pdf", "asset-manifest.json", "page-127.webp"]) {
    assert.equal((await context.request.get(origin + path + "/media/" + name)).status(), 401);
  }
  assert.equal((await context.request.post(origin + "/api/feasibility-sample-upload", { data: { op: "prepare", name: "document.pdf" } })).status(), 401);
  checks.push("unauthenticated page redirects; all media and provisioning denied");
  assert.equal((await context.request.post(origin + path + "/session", { data: { password } })).status(), 403);
  const tlsOrigin = origin.replace("http:", "https:");
  assert.equal((await context.request.post(origin + path + "/session", { headers: { Origin: tlsOrigin }, data: { password: "wrong" } })).status(), 401);
  // Local HTTP QA emulates Vercel TLS termination, matching x-forwarded-proto.
  await page.route("**/feasibility-study/session", async route => {
    const response = await route.fetch({ headers: { ...route.request().headers(), origin: tlsOrigin } });
    await route.fulfill({ response });
  });
  await page.getByLabel("Sales-library password").fill(password);
  await page.getByRole("button", { name: "Open the sample" }).click();
  await page.waitForURL(origin + path);
  await page.getByRole("button", { name: "Next page" }).waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector('[aria-label="Next page"]').disabled);
  await page.locator("img[src*='page-001.webp']").waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('img[src*="/media/"]')].every(i => i.complete && i.naturalWidth));
  assert.ok(await page.locator('img[src*="/media/"]').count() <= 7);
  const cookie = (await context.cookies()).find(c => c.name === "catapult_feasibility_sample");
  assert.ok(cookie.httpOnly && cookie.secure && cookie.sameSite === "Strict" && cookie.path === path);
  checks.push("scoped Secure HttpOnly Strict session; initial full-resolution images <= 7");
  await shot("reader-desktop");
  await page.getByRole("button", { name: "Next page" }).click();
  assert.ok(await page.getByRole("button", { name: "Go", exact: true }).isDisabled());
  assert.ok(await page.getByLabel("Zoom", { exact: true }).isDisabled());
  await page.screenshot({ path: `${out}/animated-turn-desktop.png` });
  await page.getByText("Page 2 of 126", { exact: false }).waitFor();
  await shot("spread-desktop");
  await page.getByLabel("Page", { exact: true }).fill("63");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await page.getByText("Page 62 of 126", { exact: false }).waitFor(); // library normalizes to spread start
  await page.getByLabel("Zoom", { exact: true }).selectOption("2");
  const region = page.getByRole("region", { name: "Feasibility study reader", exact: true });
  assert.ok(await region.evaluate(el => el.scrollWidth > el.clientWidth));
  await shot("zoom-desktop");
  await region.focus(); await page.keyboard.press("End");
  await page.getByText("Page 126 of 126", { exact: false }).waitFor();
  await region.focus(); await page.keyboard.press("Home");
  await page.getByText("Page 1 of 126", { exact: false }).waitFor();
  checks.push("animated turn, jump/spread normalization, 200% scrollable zoom, Home/End keyboard");
  const pdf = await context.request.get(origin + path + "/media/document.pdf?download=1");
  assert.equal(pdf.status(), 200);
  assert.ok(pdf.headers()["content-disposition"].startsWith("attachment"));
  assert.ok(pdf.headers()["cache-control"].includes("no-store"));
  assert.equal(createHash("sha256").update(await pdf.body()).digest("hex"), "18cd8d1f5cbdf10e8d18575ec1c33a94ac95623aa34b93a63364ae752d0372f9");
  for (const name of ["page-000.webp", "page-127.webp", "asset-manifest.json"]) assert.equal((await context.request.get(origin + path + "/media/" + name)).status(), 404);
  const internal = await context.request.get(origin + "/research", { maxRedirects: 0 });
  assert.equal(internal.status(), 307);
  checks.push("byte-identical PDF download; invalid media rejected; sample session cannot open research");
  assert.equal((await context.request.post(origin + "/api/feasibility-sample-upload", { data: { op: "prepare", name: "document.pdf" } })).status(), 401);
  for (const name of ["../document.pdf", "document.pdf/x", "page-127.webp", "asset-manifest.json"]) {
    assert.equal((await context.request.post(origin + "/api/feasibility-sample-upload", { headers: { Authorization: `Bearer ${cron}` }, data: { op: "prepare", name } })).status(), 400);
  }
  checks.push("sales session cannot provision; admin rejects nonallowlisted paths");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.getByLabel("Zoom", { exact: true }).selectOption("1");
  await page.waitForFunction(() => {
    const el = document.querySelector('[aria-label="Feasibility study reader"]');
    return el && el.scrollWidth === el.clientWidth;
  });
  await shot("reader-tablet");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[aria-label="Feasibility study reader"]');
    return el && el.scrollWidth === el.clientWidth;
  });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth));
  await shot("reader-small-mobile");
  checks.push("Fit without horizontal overflow at 320px and 768px");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => !document.querySelector('[aria-label="Next page"]').disabled);
  await shot("reader-mobile");
  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByText("Page 2 of 126", { exact: false }).waitFor();
  await page.getByLabel("Page", { exact: true }).fill("126"); await page.getByRole("button", { name: "Go", exact: true }).click();
  await page.getByText("Page 126 of 126", { exact: false }).waitFor();
  checks.push("mobile single-page turn and last-page jump");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByText("Reduced motion:", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Previous page" }).click();
  await page.getByText("Page 125 of 126", { exact: false }).waitFor();
  await shot("reduced-motion-mobile");
  checks.push("reduced-motion static single-page navigation");
  await page.route("**/media/page-*.webp", route => route.abort());
  await page.getByLabel("Page", { exact: true }).fill("42");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await page.getByRole("heading", { name: "Prefer a different way to read?" }).waitFor();
  await shot("pdf-fallback");
  checks.push("image-load failure shows native PDF open/download fallback");
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/qa-results.json`, JSON.stringify({ ok: true, checks, browserErrors: errors }, null, 2));
  console.log(JSON.stringify({ ok: true, checks }));
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.kill(); });
