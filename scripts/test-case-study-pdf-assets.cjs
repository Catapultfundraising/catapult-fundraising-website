// Preserve approved case-study bytes, page geometry and existing download links.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { PDFDocument } = require("pdf-lib");
const assets = require("./case-study-pdf-assets.json");
async function main() {
  const cards = fs.readFileSync("components/one-sheets.tsx", "utf8");
  assert.equal(assets.length, 11);
  const paths = new Set();
  for (const asset of assets) {
    assert(!paths.has(asset.href), `Duplicate URL: ${asset.href}`);
    paths.add(asset.href);
    assert(cards.includes(`href: "${asset.href}"`), `Missing original download URL: ${asset.title}`);
    const bytes = fs.readFileSync(`public${asset.href}`);
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),
      asset.approved_sha256, `Unapproved file bytes: ${asset.title}`);
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 1, asset.title);
    const page = pdf.getPage(0);
    assert.deepEqual(page.getTrimBox(), {x:0, y:0, width:612, height:792}, asset.title);
    assert.deepEqual(page.getBleedBox(), {x:-9, y:-9, width:630, height:810}, asset.title);
  }
  console.log("PASS: all 11 original case-study links serve exact approved PDFs with Letter trim and 0.125-inch bleed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
