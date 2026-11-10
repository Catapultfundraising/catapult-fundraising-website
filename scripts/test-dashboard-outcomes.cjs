// Fully mocked gateway + client stores. Never connects to SQL, Blob or a deployed API.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const Module = require('node:module'), ts = require('typescript');
const root = process.cwd(), clients = ['jag', 'csnf', 'pvas', 'wcbhc', 'baq'];
let authClient = null, failState = false, failWrite = false, seq = 0, writes = [];
const ledger = Object.fromEntries(clients.map(c => [c, []]));
let bases = Object.fromEntries(clients.map(c => [c, fixture(c)]));
function fixture(c) {
 const record = { cptid: 123, name: `Fixture ${c}`, contact: {city: 'Fixture City'}, gifts: [], calls: [{result:'Existing calling result'}], summary: {lifetime:0} };
 return { index: [{ cptid:123, name:record.name, city:'Fixture City', lifetime:0, gifts:0, largest:0, last:'', years:0, band:'', capMin:0 }], records: {'123':record} };
}
const original = Module._load;
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true}}).outputText, filename);
Module._load = function(name, parent, isMain) {
 if (name.endsWith('-data-auth')) { const c = name.split('/').pop().split('-')[0]; return new Proxy({}, {get:()=>async()=>authClient === c}); }
 if (name.endsWith('-data-store')) { const c = name.split('/').pop().split('-')[0]; return new Proxy({}, {get:(_, key)=>async()=>String(key).includes('Records') ? bases[c] : ({givebutter:{transactions:[], pledges:[]}})}); }
 if (name === '@/lib/research-profiles-store') return {listProfiles:async()=>[], getProfile:async()=>null};
 if (name.startsWith('@/')) name = path.join(root, name.slice(2));
 return original.call(this, name, parent, isMain);
};
process.env.ENGAGE_PORTAL_URL = 'https://fixture.invalid/portal';
process.env.PORTAL_WRITE_SECRET = 'fixture-only';
global.fetch = async (url, options) => {
 assert.equal(url, 'https://fixture.invalid/portal', 'no real network calls');
 const b = JSON.parse(options.body); assert.ok(clients.includes(b.client));
 if (b.op === 'state') {
  if (failState) return Response.json({error:'Fixture state unavailable'}, {status:503});
  return Response.json({updates:ledger[b.client], prospects:[{cptid:124,full_name:'Fixture added'}], gifts:[{cptid:125,donor_name:'Fixture campaign',kind:'pledge',amount:1}], batches:[]});
 }
 assert.equal(b.op,'applyBatch', 'only manual overlay batch may be written');
 assert.deepEqual(b.newRows,[]); assert.deepEqual(b.gifts,[]); assert.equal(b.updates.length,1);
 assert.equal(b.updates[0].field,'dashboard:outcome');
 if (failWrite) return Response.json({error:'Fixture write failure'},{status:500});
 writes.push(b);
 for (const u of b.updates) ledger[b.client].push({id:++seq,cptid:u.cptid,field:u.field,old_value:u.oldValue,new_value:u.newValue,created_by:b.by,created_at:'2026-11-10T12:00:00Z'});
 return Response.json({batchId:seq});
};
const {NextRequest} = require('next/server');
const {validateOutcome, readOutcome, OUTCOME_OPTIONS, OUTCOME_NOTE_LIMIT} = require('../lib/portal-v2/outcome.ts');
const {buildOverlay, OVERLAY_FIELD} = require('../lib/portal-v2/record-overlay.ts');
const {portalV2Route} = require('../lib/portal-v2/server.ts');
const {recordsRoute} = require('../lib/portal-v2/records-route.ts');
const req = (c,b) => new NextRequest(`https://fixture.invalid/api/${c}-data-v2`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});
(async()=>{
 assert.deepEqual(OUTCOME_OPTIONS,['Deceased','Not interested','Moved','Can’t afford','Committed elsewhere','Other']);
 assert.deepEqual(validateOutcome('',''),{value:'',note:''});
 assert.deepEqual(validateOutcome('Moved','ignored'),{value:'Moved',note:''});
 assert.deepEqual(validateOutcome('Other','  Short explanation  '),{value:'Other',note:'Short explanation'});
 assert.equal(validateOutcome('Other','x'.repeat(OUTCOME_NOTE_LIMIT)).note.length,300);
 for (const [v,n] of [[null,''],[[], ''],['Bad',''],["Can't afford",''],['Other',' '],['Other',null],['Other','x'.repeat(301)],['Moved','x'.repeat(301)]]) assert.throws(()=>validateOutcome(v,n));
 assert.deepEqual(readOutcome('invalid'),{value:'',note:''});
 assert.equal(OVERLAY_FIELD('dashboard:outcome'),true);
 assert.equal(OVERLAY_FIELD('calling:outcome'),false);
 console.log('PASS validation: exact options, blank, strict types, Other required, 300-character boundary, normalization');
 for (const c of clients) {
  const route = portalV2Route(c);
  const records = recordsRoute(c,async()=>authClient===c,async()=>bases[c]);
  const post = (b) => route.POST(req(c,{op:'setOutcome',cptid:123,by:'Fixture Staff',value:'Moved',note:'',...b}));
  const get = async(id=123)=>records.GET(new NextRequest(`https://fixture.invalid/api/${c}-data-records${id===null?'':`?id=${id}`}`));
  authClient=null; let prior=writes.length;
  assert.equal((await post({})).status,401); assert.equal((await get()).status,401); assert.equal(writes.length,prior);
  authClient=clients[(clients.indexOf(c)+1)%clients.length]; assert.equal((await post({client:authClient})).status,401);
  authClient=c;
  assert.equal((await get()).status,200); assert.deepEqual((await (await get()).json()).outcome,{value:'',note:''});
  assert.equal((await post({value:'',note:''})).status,200); assert.equal(writes.length,prior,'untouched blank writes nothing');
  for (const b of [{value:'Bad'},{value:null},{note:[]},{by:''},{by:'x'.repeat(201)},{cptid:0},{cptid:1.5},{cptid:'123'},{cptid:Number.MAX_SAFE_INTEGER+1},{value:'Other',note:''},{value:'Other',note:'x'.repeat(301)}]) assert.equal((await post(b)).status,400,JSON.stringify(b));
  assert.equal((await post({cptid:999})).status,404); assert.equal(writes.length,prior,'invalid inputs cannot write');
  for (const value of OUTCOME_OPTIONS) {
   const note=value==='Other'?'Fixture explanation':'';
   assert.equal((await post({value,note,client:clients[(clients.indexOf(c)+1)%clients.length],current:'untrusted'})).status,200);
   assert.equal(writes.at(-1).client,c,'client comes from authenticated route, not body');
   let r=await (await get()).json(); assert.equal(r.outcome.value,value); assert.equal(r.outcome.note,note);
   assert.deepEqual(r.calls,[{result:'Existing calling result'}]); assert.equal(r.deleted,undefined);
   assert.ok((await (await get(null)).json()).index.some(x=>x.cptid===123),'every outcome retains index membership');
   bases[c]=fixture(c); bases[c].records['123'].name='Refreshed fixture';
   r=await (await get()).json(); assert.equal(r.name,'Refreshed fixture'); assert.equal(r.outcome.value,value,'base refresh preserves manual value');
  }
  assert.equal((await post({value:'',note:'discard stale explanation'})).status,200);
  let r=await (await get()).json(); assert.equal(r.outcome.value,''); assert.equal(r.outcome.note,'');
  assert.equal((await recordsRoute(c,async()=>true,async()=>fixture(c)).GET(new NextRequest('https://fixture.invalid/?id=123'))).status,200);
  assert.equal((await (await get()).json()).outcome.value,'','new request retains cleared blank');
  assert.equal((await post({cptid:124,value:'Other',note:'x'.repeat(300)})).status,200,'portal-added prospects');
  assert.equal((await post({cptid:125,value:'Moved'})).status,200,'campaign-only donor');
  failState=true; prior=writes.length; assert.equal((await post({value:'Deceased'})).status,500); assert.equal(writes.length,prior); failState=false;
  failWrite=true; assert.equal((await post({value:'Moved'})).status,500); failWrite=false; assert.equal((await (await get()).json()).outcome.value,'','failed write does not claim saved');
  ledger[c].push({id:++seq,cptid:123,field:'merged_into',new_value:'124'});
  assert.equal((await post({})).status,409);
  ledger[c].push({id:++seq,cptid:123,field:'merged_into',new_value:''},{id:++seq,cptid:123,field:'deleted',new_value:'Fixture reason'});
  assert.equal((await post({})).status,409);
  console.log(`PASS ${c}: auth/IDOR, client isolation, all options, reload/base refresh, index visibility, clear, added/campaign records, failure and stale-record guards`);
 }
 const o=buildOverlay([{id:2,cptid:1,field:'dashboard:outcome',new_value:'{"value":"","note":""}'},{id:1,cptid:1,field:'dashboard:outcome',new_value:'{"value":"Other","note":"older"}'}]);
 assert.equal(o.outcome.get(1).value,''); assert.equal(o.deleted.size,0);assert.equal(o.mergedInto.size,0);assert.equal(o.log.length,0);
 for (const c of clients) {
  const src=fs.readFileSync(`components/${c}-data-crm.tsx`,'utf8');
  assert.equal((src.match(new RegExp(`<OutcomeSection client="${c}"`,'g'))||[]).length,1);
  assert.ok(src.includes(`key={\`record:${c}/\${recId}\`}`));
  assert.ok(src.includes('return () => { active = false; };'));
  assert.ok(fs.readFileSync(`app/api/${c}-data-v2/route.ts`,'utf8').includes(`portalV2Route("${c}")`));
 }
 console.log('PASS latest-row clear, no merge/delete side effects, five shared mounts + route bindings and scoped modal request cleanup');
 console.log(`PASS all outcome regressions (${writes.length} mocked batches, zero external requests)`);
})().catch(e=>{console.error(e);process.exitCode=1});
