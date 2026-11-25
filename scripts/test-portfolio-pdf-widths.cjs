// Exact current all-six Portfolio schema; entirely fictional, isolated data.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
for (const ext of ['.ts','.tsx']) require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const proofDir=process.env.EXPORT_RENDER_PROOF_DIR||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'portfolio-width-proof-'));
const load=Module._load;
let authoritative;
Module._load=function(n,p,main){
 if(/^@\/lib\/[a-z]+-data-auth$/.test(n))return new Proxy({},{get:()=>async()=>true});
 if(n==='@/lib/portal-v2/pvas-canonical')return {pvasCanonicalEnabled:()=>false};
 if(n==='@/lib/portal-v2/dashboard-export.server')return {ExportIntentError:class extends Error{},reconstructDashboardExport:async()=>authoritative};
 return load.call(this,n.startsWith('@/')?path.join(process.cwd(),n.slice(2)):n,p,main);
};
const note=Array.from({length:100},(_,i)=>`NOTE${String(i).padStart(3,'0')} Full fictional multiline prospect history, author Example Advisor, 2026-11-25.`).join('\n')+'\nFINAL_NOTE_SENTINEL';
const people=[{cptid:901234567,name:'Alexandra Montgomery-Wellington Philanthropic Family Foundation',kind:'Organization',city:'Rancho Santa Margarita',lifetime:12345678,gifts:12345,largest:3456789,last:'11/25/2026',solicitor:'Elizabeth Montgomery-Wellington',solicitor2:'Christopher Alexander Fitzgerald',ds:'DS1-1',capacity:'$10,000,000 - $24,999,999'},
{cptid:901234568,name:'Fictional Followup Person',kind:'Individual',city:'North Las Vegas',lifetime:2345678,gifts:789,largest:456789,last:'12/31/2025',solicitor:'Example Primary Advisor',solicitor2:'Example Secondary Advisor',ds:'DS1-2',capacity:'$1,000,000 - $2,499,999'},
{cptid:901234569,name:'FictionalUnbrokenOrganizationIdentity'.repeat(4),kind:'Organization',city:'FictionalCity',lifetime:0,gifts:0,largest:0,last:'01/01/2024',solicitor:'ExampleUnbrokenAdvisorIdentity'.repeat(4),solicitor2:'Example Secondary Advisor',ds:'DS1-3',capacity:'CapacityReferenceIdentifier'.repeat(4)}];
const url='https://example.org/fictional-prospect/'+ 'UnbrokenSourcePath'.repeat(12)+'?record=901234569';
async function verify(bytes,label){
 fs.mkdirSync(proofDir,{recursive:true});fs.writeFileSync(path.join(proofDir,label+'.pdf'),bytes);
 const {getDocumentProxy}=await import('unpdf');const pdf=await getDocumentProxy(new Uint8Array(bytes));let text='';
 for(let n=1;n<=pdf.numPages;n++){
  const page=await pdf.getPage(n),vp=page.getViewport({scale:1}),{items}=await page.getTextContent();
  const ink=items.filter(i=>i.str?.trim());
  for(const a of ink){
   assert.ok(a.transform[4]>=35&&a.transform[4]+a.width<=vp.width-35,`${label} page${n} horizontal bounds: ${a.str}`);
   if(!a.str.includes('catapultfr.com')&&!a.str.includes('Growing your donor'))assert.ok(a.transform[5]>=55,`${label} page${n} footer overlap: ${a.str}`);
  }
  for(let i=0;i<ink.length;i++)for(let j=i+1;j<ink.length;j++){
   const a=ink[i],b=ink[j];
   const overlap=Math.min(a.transform[4]+a.width,b.transform[4]+b.width)-Math.max(a.transform[4],b.transform[4]);
   const baseline=Math.abs(a.transform[5]-b.transform[5]);
   assert.ok(!(overlap>0.6&&baseline<Math.min(a.height,b.height)*0.7),`${label} page${n} adjacent text collision: ${a.str} / ${b.str} (${overlap.toFixed(2)}pt)`);
  }
  text+=' '+ink.map(i=>i.str).join(' ');
 }
 const compact=text.replace(/\s+/g,'');
 for(const token of ['901234567','Alexandra','Montgomery-Wellington','$12,345,678','12,345','$3,456,789','11/25/2026','Elizabeth','Christopher','Fitzgerald','DS1-1','$10,000,000','$24,999,999','$1,234,567','Explicitly cleared','FINAL_NOTE_SENTINEL','AFTER_ROW_SENTINEL',people[2].name,people[2].solicitor,people[2].capacity,url])assert.ok(compact.includes(token.replace(/\s+/g,'')),`${label} missing ${token}`);
 for(let i=0;i<100;i++)assert.equal(text.split(`NOTE${String(i).padStart(3,'0')}`).length-1,1,`${label} complete note line ${i}`);
 console.log(`PASS ${label}: exact15-column schema, ${pdf.numPages} pages, all values/notes, no text collisions or footer/page overflow`);
 await pdf.cleanup();
}
(async()=>{
 const only=process.argv[2];
 const {registerBrandFonts}=require('../lib/jag-brand-pdf.tsx');registerBrandFonts();
 const {loadBoundedPdfText,isWideProspectTable}=require('../lib/brand-wide-prospect-pdf.tsx');
 const bound=await loadBoundedPdfText();
 const identity='VeryLongIdentity'+ 'José_é_🌱_'.repeat(20)+'\r\nUNCHANGED_LINE';
 const wrapped=bound(identity,112);assert.equal(wrapped.replace(/\s/g,''),identity.replace(/\s/g,''));assert.ok(wrapped.includes('\r\n'));assert.equal(wrapped.split('-').length,identity.split('-').length);assert.ok(!/\ud83c\n/.test(wrapped));
 assert.ok(!isWideProspectTable([{label:'Solicitor'},{label:'Prospects'}]));
 for(const client of ['jag','csnf','pvas','wcbhc','baq','imas']){
  if(only&&only!==client)continue;
  const {indexPayload}=require(`../lib/portal-v2/${client}-export-model.ts`);
  const base=indexPayload('Portfolio prospects','Synthetic all assigned',people);
  authoritative={...base,cols:[...base.cols,{label:'Campaign Ask',kind:'usd'},{label:'Campaign Ask review'},{label:'Prospect Notes'}],sections:base.sections.map(s=>({...s,rows:s.rows.map((r,i)=>[...r,i?null:1234567,i?'Explicitly cleared':'',i===2?'Source URL: '+url+'\r\nUnicode author: José café.':i?'AFTER_ROW_SENTINEL':note])}))};
  const unchanged=JSON.stringify(authoritative);assert.equal(authoritative.cols.length,15);fs.mkdirSync(proofDir,{recursive:true});fs.writeFileSync(path.join(proofDir,client+'-payload.json'),JSON.stringify(authoritative,null,2));
  const {POST}=require(process.env.PORTFOLIO_PDF_ROUTE_SOURCE || `../app/api/${client}-data-export/route.tsx`),response=await POST({json:async()=>({format:'pdf',intent:{kind:'portfolio',solicitor:''}})});
  assert.equal(response.status,200);await verify(Buffer.from(await response.arrayBuffer()),client);assert.equal(JSON.stringify(authoritative),unchanged);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
