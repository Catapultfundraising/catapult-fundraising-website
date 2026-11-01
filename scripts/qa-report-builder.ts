// @ts-nocheck -- local QA script; playwright is installed outside the app (see Run line).
// Synthetic-only browser QA for the shared ReportBuilder.
// Run: start `next dev -p 3100` with CRON_SECRET=qa-local (requests send x-forwarded-proto: https to skip the HTTPS redirect), then
//   NODE_PATH=<dir with playwright> npx tsx scripts/qa-report-builder.ts
// The dev-only /api/qa-report-fixture/{jag|pvas} route serves synthetic fixtures through the real reportRoute (pvas = campaign SQL unavailable); PDF uses the real
// /api/jag-data-export route (local CRON_SECRET auth); Excel uses the real JAG branded builder. Real dashboards and data are never touched.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import ExcelJS from "exceljs";
import { chromium } from "playwright";
import { runReport, sanitizeQuery } from "../lib/portal-v2/report-fields";
import { buildReportRows } from "../lib/portal-v2/report-route";
import type { PortalState } from "../lib/portal-v2/clients";
import { QA_DATA, QA_STATE, QA_TRACKING } from "../lib/portal-v2/report-qa-fixture";

const BASE = process.env.QA_BASE ?? "http://localhost:3100";
const OUT = process.env.QA_OUT ?? "/tmp/report-qa";
mkdirSync(OUT, { recursive: true });
const expected = (q: unknown, st: PortalState | null = QA_STATE) => runReport(buildReportRows(QA_DATA as never, st, QA_TRACKING), sanitizeQuery(q));

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true, extraHTTPHeaders: { "x-forwarded-proto": "https" } });
  await ctx.route("**/api/*-data-export", (route) => route.continue({ headers: { ...route.request().headers(), authorization: "Bearer qa-local" } }));
  const page = await ctx.newPage();
  const log: string[] = [];
  page.on("dialog", (d) => { log.push(`dialog: ${d.message()}`); d.accept(); });
  const shot = async (path: string) => {
    const nec = page.getByRole("button", { name: "Necessary Only" });
    if (await nec.isVisible().catch(() => false)) await nec.click();
    // Site chrome is sticky; unstick it so element screenshots show only the builder.
    await page.addStyleTag({ content: "header, .sticky, .fixed, [class*='sticky'], [class*='fixed'] { position: static !important; } nextjs-portal { display: none !important; }" });
    await page.waitForFunction(() => !document.querySelector("[data-testid=report-builder] span[aria-live]")?.textContent?.includes("updating"));
    await page.locator("[data-testid=report-builder]").screenshot({ path });
  };
  const count = async () => (await page.locator("[data-testid=report-builder] span[aria-live]").innerText());
  const headers = async () => page.locator("[data-testid=report-builder] thead th").allTextContents();

  await page.goto(`${BASE}/dev/report-builder-harness?client=jag`);
  await page.getByText(/records/).first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=report-builder] tbody tr").length > 5);
  const all = expected({});
  assert.match(await count(), new RegExp(`^${all.length} records`));
  assert.equal(all.length, 38, "40 synthetic minus 1 merged minus 1 deleted");
  await shot(`${OUT}/01-default.png`);

  // Field picker: add Campaign pledges + DS rating, remove Phone, move Lifetime left.
  await page.getByRole("button", { name: /Choose fields/ }).click();
  await page.getByLabel(/Campaign pledges/).check();
  await page.getByLabel(/^DS rating/).check();
  await page.getByLabel(/^Phone$/).uncheck();
  await shot(`${OUT}/02-field-picker.png`);
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Move Lifetime giving left" }).click();
  const h = (await headers()).map((x) => x.replace(/[ ▲▼]+$/, ""));
  const order = ["CPTID", "Name", "Record type", "City", "State", "Lifetime giving", "Email", "Last gift date", "Campaign pledges", "DS rating"];
  assert.deepEqual(h, order, `field order ${h}`);

  // Filters: malformed number shows error and is not run; valid filters match server-side expectation.
  await page.getByRole("button", { name: "Add filter" }).click();
  await page.getByLabel("Filter value").fill("abc");
  await page.getByRole("alert").filter({ hasText: "enter a number" }).waitFor();
  assert.match(await count(), /Fix the highlighted filter/);
  assert.ok(await page.getByRole("button", { name: /Excel/ }).isDisabled());
  await shot(`${OUT}/03-invalid-filter.png`);
  await page.getByLabel("Filter value").fill("$15,000");
  await page.getByRole("button", { name: "Add filter" }).click();
  await page.getByLabel("Filter field").nth(1).selectOption("city");
  await page.getByLabel("Filter condition").nth(1).selectOption("equals");
  await page.getByLabel("Filter value").nth(1).fill("las vegas");
  const q = { fields: ["cptid", "name", "kind", "city", "state", "lifetime", "email", "last", "campaignPledged", "ds"], filters: [{ field: "lifetime", op: "gte", value: "$15,000" }, { field: "city", op: "equals", value: "las vegas" }] };
  const exp = expected(q);
  await page.waitForFunction((n) => document.querySelector("[data-testid=report-builder] span[aria-live]")?.textContent?.startsWith(`${n} records`), exp.length);
  assert.ok(exp.length > 0 && exp.length < 38, `filtered ${exp.length}`);
  const firstCells = await page.locator("[data-testid=report-builder] tbody tr").first().locator("td").allInnerTexts();
  assert.equal(firstCells[1], String(exp[0].name), "sorted by lifetime desc");
  assert.equal(firstCells[8], "$250,000", "campaign pledge shown, separate from lifetime");
  await shot(`${OUT}/04-filtered.png`);

  // Excel: full filtered list through the real branded builder.
  const [xd] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Excel/ }).click()]);
  const xp = `${OUT}/${xd.suggestedFilename()}`; await xd.saveAs(xp);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(xp);
  const ws = wb.worksheets[0]; const cells: string[][] = [];
  ws.eachRow((r) => cells.push((r.values as unknown[]).slice(1).map((v) => String((v as { richText?: unknown })?.richText ? "" : v ?? ""))));
  const hdr = cells.findIndex((r) => r[0] === "CPTID");
  assert.ok(hdr >= 0, "header row present"); assert.deepEqual(cells[hdr], order, "Excel column order = chosen field order");
  const body = cells.slice(hdr + 1).filter((r) => /^\d+$/.test(r[0]));
  assert.equal(body.length, exp.length, "Excel row count");
  assert.deepEqual(body.map((r) => Number(r[0])), exp.map((r) => r.cptid));
  assert.ok(cells.some((r) => r.join(" ").includes("does not include campaign pledges")), "pledge note present");
  log.push(`excel ${xd.suggestedFilename()} rows=${body.length}`);

  // PDF: real JAG export route.
  const [pd] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.getByRole("button", { name: /^PDF/ }).click()]);
  const pp = `${OUT}/${pd.suggestedFilename()}`; await pd.saveAs(pp);
  const text = execFileSync("pdftotext", ["-layout", pp, "-"]).toString();
  assert.match(text, new RegExp(`${exp.length} rows`)); for (const r of exp) assert.ok(text.includes(String(r.name)), `PDF has ${r.name}`);
  assert.ok(!text.includes(String(expected({}).find((r) => !exp.includes(r))?.name)), "PDF excludes filtered-out rows");
  execFileSync("pdftoppm", ["-png", "-r", "60", "-f", "1", "-l", "1", pp, `${OUT}/05-pdf-page`]);
  log.push(`pdf ${pd.suggestedFilename()} rows=${exp.length}`);

  // Saved list round-trip, per-client namespace.
  await page.getByPlaceholder(/Las Vegas/).fill("QA Vegas 15K");
  await page.getByRole("button", { name: "Save list" }).click();
  await page.getByText("Saved on this browser only.").waitFor();
  await page.reload();
  await page.getByLabel("Saved lists").selectOption({ label: "QA Vegas 15K" });
  await page.waitForFunction((n) => document.querySelector("[data-testid=report-builder] span[aria-live]")?.textContent?.startsWith(`${n} records`), exp.length);
  assert.deepEqual((await headers()).map((x) => x.replace(/[ ▲▼]+$/, "")), order, "restored field order");
  assert.equal(await page.getByLabel("Filter value").nth(1).inputValue(), "las vegas");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  assert.deepEqual(keys.filter((k) => k.startsWith("catapult-report-lists:")), ["catapult-report-lists:jag"]);
  await shot(`${OUT}/06-saved-list-restored.png`);

  // Other client: separate namespace; campaign source unavailable -> blanks + one warning, campaign filter refused.
  await page.goto(`${BASE}/dev/report-builder-harness?client=pvas`);
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=report-builder] tbody tr").length > 5);
  assert.equal(await page.getByLabel("Saved lists").locator("option").count(), 1, "PVAS sees no JAG lists");
  await page.getByRole("button", { name: /Choose fields/ }).click();
  await page.getByLabel(/Campaign pledges/).check();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByText(/unknown, not \$0/).waitFor();
  assert.equal(await page.getByText(/unknown, not \$0/).count(), 1, "one warning");
  assert.ok(await page.getByRole("button", { name: /Excel/ }).isDisabled(), "downloads paused while SQL overlays are unavailable");
  const col = (await headers()).findIndex((x) => x.startsWith("Campaign pledges"));
  const vals = await page.locator(`[data-testid=report-builder] tbody tr td:nth-child(${col + 1})`).allInnerTexts();
  assert.ok(vals.every((v) => v === ""), "unknown campaign values are blank, not $0");
  await shot(`${OUT}/07-campaign-unavailable.png`);
  await page.getByRole("button", { name: "Add filter" }).click();
  await page.getByLabel("Filter field").selectOption("campaignPledged");
  await page.getByLabel("Filter value").fill("1");
  await page.getByText(/campaign filters and sorting cannot run/).waitFor();
  await browser.close();
  console.log(log.join("\n")); console.log("browser QA passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
