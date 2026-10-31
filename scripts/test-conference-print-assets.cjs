// Verified conference download wiring and exact reviewed-PDF integrity.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const source = fs.readFileSync("components/one-sheets.tsx", "utf8");
const assets = [
  {
    "name": "All Services",
    "href": "/one-sheets/print/Catapult-All-Services-Print-2026-10-30.pdf",
    "sha256": "81bb5dcc4d47699744e9684f5c7b63094c0962be610771fda2232a9b8094064f",
    "pages": 1
  },
  {
    "name": "Capital Campaign",
    "href": "/one-sheets/print/Catapult-Capital-Campaign-Print-2026-10-30.pdf",
    "sha256": "441775e7ae3703b7d2b6aafe208960c380e748d2cfa8928ebd6f896544422a8d",
    "pages": 1
  },
  {
    "name": "Legacy Call",
    "href": "/one-sheets/print/Catapult-Legacy-Call-Print-2026-10-30.pdf",
    "sha256": "38a150f8384623b95800872041c4054aca90cfa6c4de584731a321af4b5bd651",
    "pages": 1
  },
  {
    "name": "Donor Engagement",
    "href": "/one-sheets/print/Catapult-Donor-Engagement-Print-2026-10-30.pdf",
    "sha256": "9a81bb665b8fd6734393dd95ff2161ec71cc6a1f2cca239fadc36d4c3a136096",
    "pages": 1
  },
  {
    "name": "Annual Fund Calling",
    "href": "/one-sheets/print/Catapult-Annual-Fund-Calling-Print-2026-10-30.pdf",
    "sha256": "61f24292044e50e9a03523e1e9dc0b1ac74347169c660e646e7daabd0a64daa9",
    "pages": 1
  },
  {
    "name": "Frequently Asked Questions",
    "href": "/one-sheets/print/Catapult-Frequently-Asked-Questions-Print-2026-10-30.pdf",
    "sha256": "8a218d93509d672a34eadd1ca46c16a9cd05fad8249a67cc2e454697481719d3",
    "pages": 1
  },
  {
    "name": "Trifold Brochure",
    "href": "/one-sheets/print/Catapult-Trifold-Brochure-Print-2026-10-30.pdf",
    "sha256": "603d1ff4dfbe01b4914f107e6593485e5778617638240389d7cc8aa18a09f2c2",
    "pages": 2
  }
];
for (const asset of assets) {
  const start = source.indexOf(`title: "${asset.name}"`);
  assert(start >= 0, `Missing card: ${asset.name}`);
  const end = source.indexOf("  },", start);
  assert(source.slice(start, end).includes(`href: "${asset.href}"`), asset.name);
  const bytes = fs.readFileSync(`public${asset.href}`);
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.name);
}
assert.equal(assets.length, 7);
console.log("PASS: seven conference cards point to the exact reviewed print PDFs.");
