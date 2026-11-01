// @ts-nocheck -- local QA script; playwright installed outside the app.
// Synthetic-only browser QA for the dashboard Help panel via /dev/dashboard-help-harness.
// Run: next dev -p 3100, then NODE_PATH=<playwright dir> npx tsx scripts/qa-dashboard-help.ts
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { DASHBOARD_TABS } from "../lib/dashboard-help";

const BASE = process.env.QA_BASE ?? "http://localhost:3100";
const OUT = process.env.QA_OUT ?? "/tmp/help-qa";
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  const page = await ctx.newPage();
  const external: string[] = [];
  page.on("request", (r) => { if (r.url().startsWith(`${BASE}/api/`)) external.push(r.url()); });
  const go = async (q: string) => {
    await page.goto(`${BASE}/dev/dashboard-help-harness?${q}`, { waitUntil: "networkidle" });
    const nec = page.getByRole("button", { name: "Necessary Only" });
    if (await nec.isVisible().catch(() => false)) await nec.click();
  };
  const dlg = () => page.getByTestId("dashboard-help");

  // Before (no button) and after nav.
  await go("client=jag&tab=Reports&help=0");
  await page.locator("main nav").screenshot({ path: `${OUT}/01-before-nav.png` });
  await go("client=jag&tab=Reports");
  await page.locator("main nav").screenshot({ path: `${OUT}/02-after-nav.png` });

  for (const c of ["jag", "csnf", "pvas", "wcbhc", "baq"]) {
    for (const tab of DASHBOARD_TABS[c]) {
      await go(`client=${c}&tab=${encodeURIComponent(tab)}`);
      const btn = page.getByRole("button", { name: `Help for ${tab}` });
      await btn.click();
      await dlg().waitFor();
      // Opens on the current section.
      assert.equal(await page.locator("#help-topic-title").innerText(), tab, `${c}/${tab} default topic`);
      // Index lists exactly this client's tabs.
      const sec = await dlg().getByRole("navigation", { name: "Help topics" }).locator("ul").first().locator("button").allInnerTexts();
      assert.deepEqual(sec, [...DASHBOARD_TABS[c]], `${c} index`);
      await page.keyboard.press("Escape");
      await dlg().waitFor({ state: "detached" });
      // Focus returns to the Help button.
      assert.equal(await btn.evaluate((el) => el === document.activeElement), true, `${c}/${tab} focus restored`);
    }
  }

  // Index navigation, search, no-results, focus trap (PVAS).
  await go("client=pvas&tab=Reports");
  await page.getByRole("button", { name: "Help for Reports" }).click();
  await dlg().waitFor();
  assert.equal(await dlg().evaluate((el) => el.contains(document.activeElement)), true, "focus moved into dialog");
  await page.screenshot({ path: `${OUT}/03-reports-topic.png` });
  await dlg().getByRole("button", { name: "Merge, delete and restore" }).click();
  assert.equal(await page.locator("#help-topic-title").innerText(), "Merge, delete and restore");
  await dlg().getByRole("button", { name: "Add + Upload" }).first().click();
  assert.equal(await page.locator("#help-topic-title").innerText(), "Add + Upload");
  for (let i = 0; i < 80; i++) { await page.keyboard.press("Tab"); assert.equal(await dlg().evaluate((el) => el.contains(document.activeElement)), true, "focus trapped"); }
  const search = dlg().getByRole("searchbox", { name: "Search help" });
  await search.fill("pledge");
  const found = await dlg().getByRole("navigation", { name: "Help topics" }).locator("button").allInnerTexts();
  assert.ok(found.includes("Gifts versus pledges") && found.includes("Campaign Donors"), `search: ${found}`);
  await page.screenshot({ path: `${OUT}/04-search.png` });
  await dlg().getByRole("button", { name: "Gifts versus pledges" }).click();
  assert.equal(await page.locator("#help-topic-title").innerText(), "Gifts versus pledges");
  await search.fill("zzqx nothing");
  await dlg().getByText("No help topics match. Try a different word.").waitFor();
  await page.screenshot({ path: `${OUT}/05-no-results.png` });
  await dlg().getByRole("button", { name: "Close help" }).click();
  await dlg().waitFor({ state: "detached" });

  // Mobile.
  await page.setViewportSize({ width: 390, height: 844 });
  await go("client=baq&tab=Campaign%20Donors");
  await page.getByRole("button", { name: "Help for Campaign Donors" }).click();
  await dlg().waitFor();
  assert.equal(await page.locator("#help-topic-title").innerText(), "Campaign Donors");
  const box = await dlg().boundingBox();
  assert.ok(box && box.width <= 390 && box.x >= 0, "full width on mobile");
  await page.screenshot({ path: `${OUT}/06-mobile-topic.png` });
  await dlg().getByRole("button", { name: "All topics" }).click();
  await dlg().getByRole("button", { name: "Committee" }).click();
  assert.equal(await page.locator("#help-topic-title").innerText(), "Committee");
  await dlg().getByRole("button", { name: "All topics" }).click();
  await page.screenshot({ path: `${OUT}/07-mobile-index.png` });
  await page.keyboard.press("Escape");
  await dlg().waitFor({ state: "detached" });

  assert.deepEqual(external, [], "Help makes no API calls");
  await browser.close();
  console.log(`dashboard help QA passed: 5 clients, ${Object.values(DASHBOARD_TABS).flat().length} tab openings; screenshots in ${OUT}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
