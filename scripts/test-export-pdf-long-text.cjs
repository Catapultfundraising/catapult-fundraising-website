// Actual generic renderer and six POST handlers. Synthetic data; auth/source
// boundaries stubbed locally, never private providers or deployed endpoints.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, f);
const proofDir = process.env.EXPORT_RENDER_PROOF_DIR || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'export-render-proof-'));
const load = Module._load;
let authoritative, authed = true, rebuilds = 0, reconstructionError;
class ExportIntentError extends Error {}
Module._load = function(n, p, main) {
  if (/^@\/lib\/[a-z]+-data-auth$/.test(n)) return new Proxy({}, {get:()=>async()=>authed});
  if (n === '@/lib/portal-v2/direct-registration.server') return {directLaneEnabled:()=>false};
  if (n === '@/lib/portal-v2/pvas-canonical') return {pvasCanonicalEnabled:()=>false};
  if (n === '@/lib/portal-v2/dashboard-export.server') return {ExportIntentError, reconstructDashboardExport:async()=>{ rebuilds++; if(reconstructionError) throw reconstructionError; return authoritative; }};
  return load.call(this, n.startsWith('@/') ? path.join(process.cwd(), n.slice(2)) : n, p, main);
};
const lines = Array.from({length:125},(_,i)=>`LINE${String(i).padStart(4,'0')} Complete fictional prospect note with multiple words and detail. José café.`);
const long = lines.join('\n')+'\nFINAL_SENTINEL';
assert.ok(long.length > 5000);
const cols = [{label:'CPTID'},{label:'Name'},{label:'Prospect Notes'}, ...Array.from({length:9},(_,i)=>({label:`Context ${i}`}))];
const rows = Array.from({length:16},(_,i)=>[900100+i,`Fictional ${i}`,'Short context','A','B','C','D','E','F','G','H','I']);
rows.push([900999,'Fictional Long',long,'A','B','C','D','E','F','G','H','I']);
rows.push([901000,'Fictional Last','AFTER_ROW_SENTINEL','A','B','C','D','E','F','G','H','I']);
authoritative = {title:'Synthetic roster',cols,sections:[{heading:'Assigned prospects',rows}],notes:['REPORT_NOTE_SENTINEL']};
async function verify(bytes, label) {
  const {getDocumentProxy} = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  assert.ok(pdf.numPages > 1, `${label}: must paginate`);
  let text = '';
  for(let n=1;n<=pdf.numPages;n++) {
    const page = await pdf.getPage(n), viewport = page.getViewport({scale:1});
    const {items} = await page.getTextContent();
    const words = items.filter(i=>i.str?.trim());
    assert.ok(words.some(i=>i.str.includes('catapultfr.com')), `${label} page ${n}: footer present`);
    const footer = words.filter(i=>i.str.includes('catapultfr.com'));
    assert.ok(footer.every(i=>i.transform[5] < 34), `${label}: footer remains in footer band`);
    for(const item of words) {
      assert.ok(item.transform[4] >= 35 && item.transform[4]+item.width <= viewport.width-35, `${label} page ${n}: horizontal page bounds ${item.str} x=${item.transform[4]} width=${item.width}`);
      if (/LINE\d|FINAL_SENTINEL|AFTER_ROW_SENTINEL/.test(item.str)) assert.ok(item.transform[5] >= 57, `${label} page ${n}: note/footer overlap, y=${item.transform[5]}`);
      assert.ok(item.transform[5] >= 0 && item.transform[5]+item.height <= viewport.height, `${label}: vertical page bounds`);
    }
    text += words.map(i=>i.str).join(' ');
  }
  for(let i=0;i<lines.length;i++) {
    const token=`LINE${String(i).padStart(4,'0')}`;
    assert.equal(text.split(token).length-1,1,`${label}: complete, nonduplicated ${token}`);
  }
  for(const word of ['Complete','fictional','prospect','note','with','multiple','words','and','detail','José','café']) assert.equal(text.split(/[\s.,]+/).filter(w=>w===word).length,125,`${label}: all note words (${word})`);
  for(const token of ['FINAL_SENTINEL','AFTER_ROW_SENTINEL','REPORT_NOTE_SENTINEL']) assert.ok(text.includes(token),`${label}: missing ${token}`);
  fs.mkdirSync(proofDir,{recursive:true}); fs.writeFileSync(`${proofDir}/${label}.pdf`,bytes);
  console.log(`PASS ${label}: ${pdf.numPages} pages, ${long.length} note characters, all line tokens + final/next-row sentinels, page/footer bounds`);
  await pdf.cleanup();
}
(async()=>{
  const only=process.argv[2];
  if(!only || only==='generic') {
    const {renderTablePdf}=require('../lib/brand-table-pdf.tsx');
    for(const landscape of [false,true]) await verify(await renderTablePdf({...authoritative,...(!landscape ? {cols:cols.slice(0,3),sections:authoritative.sections.map(s=>({...s,rows:s.rows.map(r=>r.slice(0,3))}))} : {}),eyebrow:'Synthetic',subtitle:'Fixture',client:'Synthetic',landscape}),`generic-${landscape?'landscape':'portrait'}`);
  }
  if(!only || only==='generic') {
    const {renderTablePdf}=require('../lib/brand-table-pdf.tsx');
    const sections=[{heading:'Record notes',cols:[{label:'Notes and activity'}],rows:[[long],['AFTER_ROW_SENTINEL']]}];
    await verify(await renderTablePdf({...authoritative,sections,eyebrow:'Synthetic',subtitle:'Fixture',client:'Synthetic'}),'generic-record-section');
  }
  if(only==='generic') return;
  for(const client of ['jag','csnf','pvas','wcbhc','baq','imas']) {
    if(only && only!==client) continue;
    const {POST}=require(`../app/api/${client}-data-export/route.tsx`);
    authed=false; const deniedRebuilds=rebuilds; const denied=await POST({json:()=>{throw new Error('must authenticate first')}}); assert.equal(denied.status,401); assert.equal(rebuilds,deniedRebuilds);
    authed=true;
    const request=()=>({json:async()=>({format:'pdf',intent:{type:'synthetic'},cols:[],sections:[]})});
    reconstructionError=new ExportIntentError('Invalid synthetic intent'); assert.equal((await POST(request())).status,400);
    reconstructionError=new Error('Synthetic source unavailable'); assert.equal((await POST(request())).status,503);
    reconstructionError=undefined;
    const before=rebuilds;
    const response=await POST({json:async()=>({format:'pdf',intent:{type:'synthetic'},cols:[],sections:[]})});
    assert.equal(response.status,200); assert.equal(rebuilds,before+1);
    await verify(Buffer.from(await response.arrayBuffer()),client);
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
