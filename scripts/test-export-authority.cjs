// Actual six handlers, isolated synthetic reconstruction and renderer seams.
// Browser data/footnotes must never survive authoritative reconstruction.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const load=Module._load;let authed=true,rebuilds=0;
Module._load=function(name,parent,isMain){
 if(name==='@react-pdf/renderer')return {Document:'Document',Page:'Page',View:'View',Text:'Text',renderToBuffer:async doc=>Buffer.from(JSON.stringify(doc))};
 if(/^@\/lib\/\w+-data-auth$/.test(name))return new Proxy({},{get:()=>async()=>authed});
 if(/^@\/lib\/\w+-brand-pdf$/.test(name))return {BrandHeader:'BrandHeader',BrandFooter:'BrandFooter',registerBrandFonts:()=>{},preparedOn:()=>'',bs:{}};
 if(/^@\/lib\/\w+-brand-xlsx$/.test(name))return {buildBrandedXlsx:async payload=>Buffer.from(JSON.stringify(payload))};
 if(name==='@/lib/portal-v2/dashboard-export.server')return {ExportIntentError:class extends Error{},reconstructDashboardExport:async(_client,intent)=>{rebuilds++;return {title:'SERVER TITLE',cols:[{label:'SERVER COLUMN'}],sections:[{rows:[['SERVER ROW']]}],...(intent.kind==='report'?{notes:['SERVER REPORT NOTE']}:{} )};}};
 return load.call(this,name.startsWith('@/')?path.join(process.cwd(),name.slice(2)):name,parent,isMain);
};
(async()=>{
 for(const client of ['jag','csnf','pvas','wcbhc','baq','imas']){
  const {POST}=require(`../app/api/${client}-data-export/route.tsx`);
  authed=false;const before=rebuilds;
  assert.equal((await POST({json:()=>{throw Error('must auth first');}})).status,401);assert.equal(rebuilds,before);authed=true;
  for(const format of ['pdf','xlsx'])for(const intent of [{kind:'index',ids:[1]},{kind:'table',table:'Pyramid.0'},{kind:'portfolio',solicitor:'',summary:true},{kind:'report',query:{fields:['name']}}]){
   const response=await POST({json:async()=>({format,intent,title:'FORGED TITLE',cols:[{label:'FORGED COLUMN'}],sections:[{rows:[['FORGED ROW']]}],notes:['FORGED BROWSER FOOTNOTE']})});
   assert.equal(response.status,200);const body=await response.text();
   assert.ok(!body.includes('FORGED'),`${client}/${format}/${intent.kind}: no browser report data/notes`);
   assert.ok(body.includes('SERVER ROW'));if(format==='xlsx')assert.ok(body.includes('SERVER COLUMN'));
   assert.equal(body.includes('SERVER REPORT NOTE'),intent.kind==='report','server-generated notes retained exactly when supplied');
  }
 }
 console.log('PASS all-six PDF/XLSX handlers discard forged index/table/summary footnotes and preserve server report notes; auth precedes reconstruction');
})().catch(e=>{console.error(e);process.exitCode=1;});
