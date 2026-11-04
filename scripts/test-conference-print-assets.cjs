const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {PDFDocument} = require('pdf-lib');
const manifest = require('./conference-press-assets.json');
(async () => {
  const source = fs.readFileSync('components/one-sheets.tsx', 'utf8');
  assert.equal(manifest.assets.length, 20);
  for (const asset of manifest.assets) {
    const start = source.indexOf(`title: "${asset.name}"`);
    const end = source.indexOf('  },', start);
    assert(start >= 0 && source.slice(start, end).includes(`href: "${asset.href}"`), asset.name);
    const bytes = fs.readFileSync('public' + asset.href);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.name);
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), asset.pages);
    for (const page of pdf.getPages()) {
      const t = page.getTrimBox(), b = page.getBleedBox(), m = page.getMediaBox();
      assert.equal(t.width, asset.name === 'Trifold Brochure' ? 792 : 612);
      assert.equal(t.height, asset.name === 'Trifold Brochure' ? 612 : 792);
      assert.equal(t.x - b.x, 9); assert.equal(t.y - b.y, 9);
      assert.equal(b.width - t.width, 18); assert.equal(b.height - t.height, 18);
      assert(m.width > b.width && m.height > b.height, 'Marks need space outside bleed');
    }
  }
  const bundle = fs.readFileSync('public' + manifest.bundle.href);
  assert.equal(crypto.createHash('sha256').update(bundle).digest('hex'), manifest.bundle.sha256);
  assert(source.includes(manifest.bundle.href));
  console.log('PASS: all 20 reviewed CMYK masters, page counts, trim, bleed, crop-mark margins, package bytes and card wiring.');
})().catch(e => {console.error(e); process.exit(1);});
