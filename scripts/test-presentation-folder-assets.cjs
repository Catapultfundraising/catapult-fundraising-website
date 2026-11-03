const assert = require('node:assert/strict');
const fs = require('node:fs');
const {PDFDocument} = require('pdf-lib');
(async () => {
  const source = fs.readFileSync('components/one-sheets.tsx', 'utf8');
  const card = source.match(/title: "Presentation Folder",([\s\S]*?)\n  },/)[1];
  const href = card.match(/href: "([^"]+)"/)[1];
  assert.equal(href, '/one-sheets/print/Catapult-Presentation-Folder-Artwork-2026-11-03.pdf');
  assert.match(card, /Printer handles the folder template, pockets and business-card slits/);
  assert.doesNotMatch(card, /interior spread/);
  const bytes = fs.readFileSync('public' + href);
  assert.equal(bytes.subarray(0,4).toString(), '%PDF');
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 3, 'Printer notes followed by front and back covers');
  for (const page of doc.getPages().slice(1)) {
    const trim = page.getTrimBox(), bleed = page.getBleedBox();
    assert.equal(trim.width, 648); assert.equal(trim.height, 864);
    assert.equal(bleed.width, 666); assert.equal(bleed.height, 882);
  }
  console.log('Presentation folder asset: link, description, PDF signature, page order/count, trim and bleed pass.');
})().catch(e => { console.error(e); process.exit(1); });
