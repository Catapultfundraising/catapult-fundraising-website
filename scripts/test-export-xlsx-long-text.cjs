// Synthetic only: actual all-six workbook bytes, no provider or donor access.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, f);
const proofDir = process.env.EXPORT_RENDER_PROOF_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'export-render-proof-'));
const load = Module._load;
Module._load = function(n, p, main) { return load.call(this, n.startsWith('@/') ? path.join(process.cwd(), n.slice(2)) : n, p, main); };
global.fetch = async () => { throw new Error('No network in workbook fixture'); };
const ExcelJS = require('exceljs');
const { SaxesParser } = require('saxes');
function fullText(wb, sheet, address) {
  const rows = [];
  for (const sh of wb.worksheets) if (sh.getCell('A1').value === 'Source sheet') sh.eachRow((r,n) => { if(n>1 && r.getCell(1).value === sheet && r.getCell(2).value === address) rows.push(r); });
  rows.forEach((r,i)=>{ assert.equal(r.getCell(6).value,i+1); assert.equal(r.getCell(7).value,rows.length); });
  return rows.map(r=>r.getCell(8).value).join('');
}
const clients = ['jag', 'csnf', 'pvas', 'wcbhc', 'baq', 'imas'];
async function check(client) {
  const { buildBrandedXlsx, xmlSafe } = require(`../lib/${client}-brand-xlsx.ts`);
  const notes = ['x'.repeat(32001), 'y'.repeat(32767), 'z'.repeat(32766) + '🌱\r\nJosé — 中文\n' + 'Full note\n'.repeat(4200) + 'FINAL_SENTINEL'];
  if (xmlSafe) {
    assert.equal(xmlSafe('valid-hyphen\u0000\u0001\u0008\u000b\u000c\u000e\u001f\ufffe\uffff\ud800X\udc00\t\r\n🌱'), 'valid-hyphenX\t\r\n🌱');
    assert.ok(xmlSafe(notes[1]) === notes[1], 'XML sanitizer must not truncate');
  }
  const opts = { title: 'Synthetic roster', subtitle: 'Fixture', client: 'Synthetic', cols: [{label:'CPTID'}, {label:'Name'}, {label:'Prospect Notes'}, {label:'Ask',kind:'usd'}], sections: [{heading:'Assigned',rows:notes.map((n,i)=>[900001+i,'Fictional Person',n,1000])}], notes: ['Short footnote'] };
  opts.notes.push('REPORT_LONG\r\n' + 'é\n'.repeat(18000) + 'REPORT_FINAL');
  const original = JSON.stringify(opts);
  const buf = await buildBrandedXlsx(opts);
  assert.equal(JSON.stringify(opts), original);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  assert.equal(ws.getCell('C7').value, notes[0]);
  assert.equal(ws.getCell('C8').value, notes[1]);
  const continuation = wb.worksheets.find(s => s.name.startsWith('Text continuation'));
  assert.ok(continuation, `${client}: must preserve over-limit text on continuation sheet`);
  assert.match(ws.getCell('C9').value, /Text continuation/);
  let full = '', part = 0;
  continuation.eachRow((row, rn) => {
    if (rn === 1) return;
    if(row.getCell(2).value !== 'C9') return;
    assert.equal(row.getCell(1).value, ws.name); assert.equal(row.getCell(2).value, 'C9');
    assert.equal(String(row.getCell(3).value), '900003'); assert.equal(row.getCell(4).value, 'Fictional Person');
    assert.equal(row.getCell(5).value, 'Prospect Notes'); assert.equal(row.getCell(6).value, ++part);
    const chunk = row.getCell(8).value; assert.ok(chunk.length <= 32767);
    assert.ok(!/[\uD800-\uDBFF]$/.test(chunk)); assert.ok(!/^[\uDC00-\uDFFF]/.test(chunk)); full += chunk;
  });
  if (full !== notes[2]) { let at=0; while(full[at]===notes[2][at]) at++; throw new Error(`${client}: roundtrip mismatch index ${at}; lengths ${full.length}/${notes[2].length}; code ${full.charCodeAt(at)}/${notes[2].charCodeAt(at)}`); }
  for (const sheet of wb.worksheets) sheet.eachRow(row => row.eachCell(cell => { if (typeof cell.value === 'string') assert.ok(cell.value.length <= 32767); }));
  const reportPointer=[]; ws.eachRow(r=>r.eachCell(c=>{ if((!c.isMerged || c.master===c) && typeof c.value==='string' && c.value.includes('[Full text:') && c.address!=='C9') reportPointer.push(c.address); }));
  assert.equal(reportPointer.length,1); assert.ok(fullText(wb,ws.name,reportPointer[0]) === opts.notes[1], 'long report footnote preserved');
  const zip=await require('jszip').loadAsync(buf);
  for(const n of Object.keys(zip.files).filter(n=>n.endsWith('.xml'))) { const parser=new SaxesParser(); parser.write(await zip.file(n).async('string')).close(); }
  fs.mkdirSync(proofDir,{recursive:true}); fs.writeFileSync(`${proofDir}/${client}.xlsx`,buf);
  assert.equal(ws.getCell('D7').numFmt, '"$"#,##0'); assert.equal(ws.views[0].ySplit, 5);
  console.log(`PASS ${client}: <=limit unchanged; ${notes[2].length} code units in ${part} lossless parts`);
}
(async () => {
  for (const client of clients) await check(client);
  const {buildBrandedXlsx}=require('../lib/jag-brand-xlsx.ts');
  const extra='a'.repeat(32766)+'🌱\r\n'+'b'.repeat(32768)+'EXTRA_FINAL';
  const opts={title:'Text continuation',subtitle:'Fixture',client:'Synthetic',cols:[{label:'Name'}],sections:[{rows:[['Short']]}],extraSheets:[{name:'Text continuation 2',cols:[{label:'CPTID'},{label:'Name'},{label:'Notes'}],rows:[[900999,'Extra Fictional',extra]]}]};
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(await buildBrandedXlsx(opts));
  assert.equal(wb.worksheets.length,3); assert.equal(wb.worksheets[2].name,'Text continuation 3');
  assert.ok(fullText(wb,'Text continuation 2','C2')===extra,'extra sheet Unicode boundary survives');
  assert.match(wb.worksheets[1].getCell('C2').value,/Text continuation 3/);
  const helper=require('../lib/brand-xlsx-text.ts');
  for(const text of ['', 'a'.repeat(32767), 'a'.repeat(32768), 'a'.repeat(32766)+'🌱', 'a'.repeat(32767)+'🌱']) {
    const parts=helper.splitXlsxText(text);assert.ok(parts.join('')===text); assert.ok(parts.every(p=>p.length<=32767 && !/[\uD800-\uDBFF]$/.test(p)));
  }
  console.log('PASS JAG extra-sheet continuation, name collisions and exact UTF-16 boundaries');
})().catch(e => { console.error(e); process.exitCode=1; });
