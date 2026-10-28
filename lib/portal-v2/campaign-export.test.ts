import { campaignRecords } from "./campaign-records";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { campaignByLevel, PORTAL_V2, PORTAL_V2_CLIENTS, type PortalGift } from "./clients";
import { campaignExportModel, campaignDownload } from "./campaign-export";

const gift = (id: number, cptid: number | null, kind: "gift" | "pledge", amount: number, donor_name = `Test donor ${cptid}`): PortalGift => ({
  id, cptid, donor_name, kind, amount, client_id: null, gift_date: null, note: null, source: "manual", batch_id: null, created_by: "Test", created_at: "",
});
const gifts = [
  gift(1, 1, "pledge", 100000), gift(2, 1, "gift", 25000),
  gift(3, 2, "gift", 15000), gift(4, 3, "pledge", 500),
  gift(5, 4, "pledge", 10000), gift(6, 4, "gift", 12000),
  gift(7, null, "pledge", 300, "Unmatched test donor"),
];
async function main() {
  await mkdir("/tmp/campaign-qa", { recursive: true });
  const records = campaignRecords(gifts);
  assert.equal(records.size, 4); // Unlinked names do not get invented CPTIDs.
  assert.equal(records.get(1)!.summary.lifetime, 0);
  assert.equal(records.get(1)!.givebutter.length, 2);
  assert.equal(records.get(3)!.givebutter[0].type, "pledge");
  for (const client of PORTAL_V2_CLIENTS) {
    const goal = PORTAL_V2[client].goal;
    const m = campaignExportModel(client, goal, gifts);
    assert.equal(m.c.raised, 127800);
    assert.equal(m.c.totalPledges, 110800);
    assert.equal(m.c.totalGifts, 52000);
    assert.equal(m.c.donors.length, 5);
    assert.equal(m.c.levels.reduce((s, l) => s + l.securedValue, 0) + m.c.belowValue, m.c.raised);
    assert.equal(m.summary.at(-1)![5], m.c.raised);
    assert.equal(m.donors.reduce((s, d) => s + Number(d[5]), 0), m.c.raised);
    assert.equal(campaignByLevel(PORTAL_V2[client].chart(goal), []).raised, 0);
    const res = await campaignDownload(client, goal, gifts, "xlsx");
    assert.equal(res.status, 200);
    const bytes = Buffer.from(await res.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as unknown as ExcelJS.Buffer);
    assert.equal(wb.worksheets.length, 2);
    const sh = wb.getWorksheet("Donors by level")!;
    assert.equal(sh.rowCount, 6);
    let credit = 0; sh.eachRow((row, n) => { if (n > 1) credit += Number(row.getCell(6).value); });
    assert.equal(credit, 127800);
    assert.match(res.headers.get("content-disposition")!, new RegExp(client.toUpperCase()));
    await writeFile(`/tmp/campaign-qa/${client}.xlsx`, bytes);
    console.log(`${client}: aggregation, below-chart gifts, pledges, payment deduplication, Excel OK`);
  }
  const pdf = await campaignDownload("wcbhc", 12000000, gifts, "pdf");
  const buf = Buffer.from(await pdf.arrayBuffer());
  assert.equal(buf.subarray(0, 4).toString(), "%PDF");
  await writeFile("/tmp/campaign-qa/wcbhc.pdf", buf);
  // Multi-page donor detail, repeated headers and long names.
  const many = Array.from({length: 130}, (_, i) => gift(i + 1, i + 1, "pledge", 1000, `Sample foundation ${i + 1} with a longer donor name for layout verification`));
  await writeFile("/tmp/campaign-qa/long.pdf", Buffer.from(await (await campaignDownload("pvas", 10000000, many, "pdf")).arrayBuffer()));
  await writeFile("/tmp/campaign-qa/empty.pdf", Buffer.from(await (await campaignDownload("baq", 25000000, [], "pdf")).arrayBuffer()));
  console.log("PDF normal, multi-page, empty OK");
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
