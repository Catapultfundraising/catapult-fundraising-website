const fs=require('fs'), ts=require(process.cwd()+'/node_modules/typescript'), Module=require('module'), assert=require('node:assert/strict');
const {NextRequest}=require(process.cwd()+'/node_modules/next/server');
const {PDFDocument}=require(process.cwd()+'/node_modules/pdf-lib');
(async()=>{
 let reads=0,deletes=0,saves=0,failSQL=false,failState=false,authClient='pvas'; const saved=[],blobs=new Map();
 const idx=[{cptid:123},{cptid:456},{cptid:789}], updates=[];
 const actualLoad=Module._load;
 const fakeEngage=async(c,op,b={})=>{
  if(op==='state'){if(failState)throw new Error('SQL unavailable');return {updates,prospects:[]}}
  if(op==='listDocuments')return {documents:saved.filter(d=>d.client===c&&b.cptids.includes(d.cptid))};
  if(op==='documentByPath')return {document:saved.find(d=>d.client===c&&d.blob_path===b.pathname)||null};
  if(op==='getDocument')return {document:saved.find(d=>d.client===c&&d.id===b.id)||null};
  if(op==='addDocument'){if(failSQL)throw new Error('SQL unavailable');saves++;const d={...b.document,id:saved.length+1,client:c,uploaded_at:'2026-10-29T00:00:00Z'};saved.push(d);return{document:d}}
  throw new Error(op)
 };
 Module._load=function(name,parent,isMain){
  if(name==='@vercel/blob')return {issueSignedToken:async opts=>({delegationToken:"test",clientSigningToken:"test",validUntil:opts.validUntil}),get:async p=>{reads++;const v=blobs.get(p);return v?{statusCode:200,blob:{size:v.length},stream:new ReadableStream({start(c){c.enqueue(v);c.close()}})}:null},del:async p=>{deletes++;blobs.delete(p)}};
  if(name==='@vercel/blob/client')return {handleUploadPresigned:async opts=>{await opts.getSignedToken(opts.body.payload.pathname,opts.body.payload.clientPayload,false);return {ok:true}}};
  if(name.endsWith('-data-auth')){const c=name.split('/').pop().split('-')[0];return new Proxy({}, {get:()=>async()=>authClient===c})}
  if(name.endsWith('-data-store'))return new Proxy({}, {get:()=>async()=>({index:idx})});
  if(name==='@/lib/portal-v2/server')return{engage:fakeEngage};
  if(name==='@/lib/portal-v2/record-overlay'){
   const p=process.cwd()+'/lib/portal-v2/record-overlay.ts';const m=new Module(p,module);m.filename=p;m.paths=Module._nodeModulePaths(process.cwd());m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,p);return m.exports;
  }
  return actualLoad.call(this,name,parent,isMain)
 };
 const path=process.cwd()+'/lib/portal-v2/documents-route.ts';const mod=new Module(path,module);mod.filename=path;mod.paths=Module._nodeModulePaths(process.cwd());
 mod._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,path);
 const routes=Object.fromEntries(['pvas','jag','csnf','wcbhc','baq'].map(c=>[c,mod.exports.documentsRoute(c)]));
 const req=(c,q='',body)=>new NextRequest(`https://test.local/api/${c}-data-documents${q}`,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined);
 const meta={cptid:123,filename:'Meeting notes.pdf',by:'QA'};
 const post=(c,b)=>routes[c].POST(req(c,'',b));const get=(c,q)=>routes[c].GET(req(c,q));
 const pdf=await PDFDocument.create();pdf.addPage();const good=await pdf.save();
 for(const c of Object.keys(routes)){
  authClient=null;assert.equal((await get(c,'?cptid=123')).status,401);assert.equal((await post(c,{op:'prepare',...meta})).status,401);
  authClient=c;const prep=await post(c,{op:'prepare',...meta});assert.equal(prep.status,200);const p=(await prep.json()).pathname;assert.match(p,new RegExp(`^prospect-notes/${c}/123/`));
  blobs.set(p,good);let r=await post(c,{op:'complete',pathname:p,...meta});assert.equal(r.status,200,JSON.stringify(await r.clone().json()));let d=(await r.json()).document;assert.equal(d.blob_path,undefined);
  const before=reads;assert.equal((await post(c,{op:'complete',pathname:p,...meta})).status,200);assert.equal(reads,before);
  r=await get(c,`?cptid=123&id=${d.id}`);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.ok(!r.headers.get('content-security-policy').includes('sandbox'));assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
  assert.equal((await get(c,`?cptid=789&id=${d.id}`)).status,404);
  const badPath=p.replace(/[^/]+\.pdf$/,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf');blobs.set(badPath,Buffer.from('not pdf'));r=await post(c,{op:'complete',pathname:badPath,...meta});assert.equal(r.status,400);assert.equal(blobs.has(badPath),false);
 }
 authClient='pvas';assert.equal((await get('csnf','?cptid=123')).status,401);
 updates.push({id:1,cptid:123,field:'merged_into',old_value:null,new_value:'456'});
 let r=await get('pvas','?cptid=456');assert.equal(r.status,200);assert.equal((await r.json()).documents.length,1);
 r=await get('pvas','?cptid=456&id=1');assert.equal(r.status,200);
 const prep=await post('pvas',{op:'prepare',...meta});const p=(await prep.json()).pathname;blobs.set(p,good);failSQL=true;
 assert.equal((await post('pvas',{op:'complete',pathname:p,...meta})).status,503);assert.equal(blobs.has(p),true);failSQL=false;
 assert.equal((await post('pvas',{op:'complete',pathname:p,...meta})).status,200);
 failState=true;assert.equal((await get('pvas','?cptid=123')).status,503);failState=false;
 r=await post('pvas',{op:'complete',pathname:p.replace('/123/','/789/'),...meta});assert.equal(r.status,400);
 r=await get('pvas','?cptid=0');assert.equal(r.status,400);
 console.log(`PASS: all five clients auth/list/upload/open, PDF validation, idempotent completion, IDOR blocked, cross-client blocked, merge-safe, transient SQL retry, fail-closed, no sandbox PDF header; saves=${saves}, rejected cleanup=${deletes}`);
})().catch(e=>{console.error(e);process.exit(1)});
