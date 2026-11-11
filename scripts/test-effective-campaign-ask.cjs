// Fully isolated fixtures: no SQL, Blob, deployed APIs or donor source data.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const Module = require('node:module'), ts = require('typescript');
const root = process.cwd(), clients = ['jag', 'csnf', 'pvas', 'wcbhc', 'baq'];
let authClient = null, writes = [], seq = 100;
const ledger = Object.fromEntries(clients.map(c => [c, []]));
const record = (cptid, ask, extra = {}) => ({ cptid, name:`Fixture ${cptid}`, contact:{city:'Base City'}, gifts:[], summary:{lifetime:0}, ...(ask === undefined ? {} : {portfolio:{ask,solicitor:'Fixture solicitor',priority:'2026',task:'Fixture task'}}), ...extra });
const bases = Object.fromEntries(clients.map(c => [c, {index:[], records:{'1':record(1,5000000),'2':record(2,400000),'3':record(3,40000),'4':record(4,0),'5':record(5,undefined),'6':record(6,100000)}}]));
const original = Module._load;
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (m,filename) => m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
Module._load = function(name,parent,isMain) {
 if (name.endsWith('-data-auth')) {const c=name.split('/').pop().split('-')[0];return new Proxy({}, {get:()=>async()=>authClient === c});}
 if (name.endsWith('-data-store')) {const c=name.split('/').pop().split('-')[0];return new Proxy({}, {get:(_,key)=>async()=>String(key).includes('Records')?bases[c]:({givebutter:{transactions:[],pledges:[]}})});}
 if (name === '@/lib/research-profiles-store') return {listProfiles:async()=>[],getProfile:async()=>null};
 if (name.startsWith('@/')) name=path.join(root,name.slice(2));
 return original.call(this,name,parent,isMain);
};
process.env.ENGAGE_PORTAL_URL='https://fixture.invalid/portal';process.env.PORTAL_WRITE_SECRET='fixture-only';
global.fetch=async(url,options)=>{
 assert.equal(url,'https://fixture.invalid/portal','no external network');
 const b=JSON.parse(options.body);assert.ok(clients.includes(b.client));
 if(b.op==='state') return Response.json({updates:ledger[b.client],prospects:[],gifts:[],batches:[]});
 assert.equal(b.op,'applyBatch');assert.deepEqual(b.newRows,[]);assert.deepEqual(b.gifts,[]);assert.equal(b.updates.length,1);assert.equal(b.updates[0].field,'ask');
 writes.push(b);for(const u of b.updates) ledger[b.client].push({id:++seq,cptid:u.cptid,field:u.field,old_value:u.oldValue,new_value:u.newValue});
 return Response.json({batchId:seq});
};
const {NextRequest}=require('next/server');
const {buildOverlay}=require('../lib/portal-v2/record-overlay.ts');
const {askEdits,effectiveAsk,overlayCampaignAsks,campaignAskAmount}=require('../lib/portal-v2/effective-ask.ts');
const {recordsRoute}=require('../lib/portal-v2/records-route.ts');
const {portalV2Route}=require('../lib/portal-v2/server.ts');
const update=(id,cptid,field,new_value)=>({id,cptid,field,new_value,old_value:'0'});
(async()=>{
 for(const c of clients){
  const api=portalV2Route(c),route=recordsRoute(c,async()=>authClient===c,async()=>bases[c]);
  const get=async(id)=>{const r=await route.GET(new NextRequest(`https://fixture.invalid/?id=${id}`));return {status:r.status,body:await r.json()};};
  const post=async(body)=>{const r=await api.POST(new NextRequest('https://fixture.invalid/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({cptid:1,by:'Fixture Staff',...body})}));return {status:r.status,body:await r.json()};};
  authClient=null;assert.equal((await get(1)).status,401);assert.equal((await post({op:'getAsk'})).status,401);
  authClient=c;
  // Exact reported mismatch shapes: base 5M/400K/40K vs saved 2M/500K/100K.
  ledger[c]=[update(3,3,'ask','100000'),update(1,1,'ask','2000000'),update(2,2,'ask','500000')];
  const snapshot={pool:[{cptid:1,ask:5000000,rating:5000000},{cptid:2,ask:400000,rating:400000},{cptid:3,ask:40000,rating:40000}],portfolio:[{cptid:1,ask:5000000},{cptid:2,ask:400000},{cptid:3,ask:40000}],board:[{cptid:1,active:true,ask:5000000}],committed:[{cptid:1,ask:7000000}],givebutter:{pledges:[{amount:77}]}};
  const before=JSON.stringify(snapshot);
  let view=overlayCampaignAsks(snapshot,buildOverlay(ledger[c]),askEdits(ledger[c]),c!=='wcbhc'&&c!=='baq');
  assert.deepEqual(view.pool.map(p=>p.ask),[2000000,500000,100000]);assert.deepEqual(view.portfolio.map(p=>p.ask),[2000000,500000,100000]);
  assert.equal(view.board[0].ask,c==='wcbhc'||c==='baq'?5000000:2000000);assert.equal(view.committed[0].ask,7000000);assert.equal(JSON.stringify(snapshot),before,'cached snapshot untouched');assert.equal(view.givebutter,snapshot.givebutter);
  for(const [id,want] of [[1,2000000],[2,500000],[3,100000]]) {assert.equal((await get(id)).body.portfolio.ask,want);assert.equal((await post({op:'getAsk',cptid:id})).body.ask,want);}
  assert.equal((await get(6)).body.portfolio.ask,100000,'no override');
  ledger[c].push(update(7,1,'ask','0'));assert.equal((await get(1)).body.portfolio.ask,0);assert.equal((await post({op:'getAsk'})).body.ask,0);
  view=overlayCampaignAsks(snapshot,buildOverlay(ledger[c]),askEdits(ledger[c]),true);assert.equal(campaignAskAmount(view.pool[0]),0,'zero never falls back to rating');
  ledger[c].push(update(8,1,'ask',''));view=overlayCampaignAsks(snapshot,buildOverlay(ledger[c]),askEdits(ledger[c]),true);assert.equal(view.pool[0].ask,0);assert.equal((await get(1)).body.campaignAsk.ask,null);assert.equal((await post({op:'getAsk'})).body.ask,null);
  ledger[c].push(update(9,1,'ask','150000'));bases[c].records['1'].portfolio.ask=250000;assert.equal((await get(1)).body.portfolio.ask,150000,'new base cannot replace saved edit');
  ledger[c]=[update(10,1,'merged_into','5'),update(11,5,'merged_into','4')];
  let r=(await get(1)).body;assert.equal(r.cptid,4);assert.equal(r.portfolio.ask,250000);assert.equal(r.portfolio.solicitor,'Fixture solicitor');assert.equal(r.portfolio.task,'Fixture task');
  const mergedSnapshot={...snapshot,pool:[{cptid:1,ask:250000,rating:500000},{cptid:4,ask:0,rating:100000}],portfolio:[{cptid:1,name:'Source',ask:250000},{cptid:4,name:'Survivor',ask:0}]};
  view=overlayCampaignAsks(mergedSnapshot,buildOverlay(ledger[c]),askEdits(ledger[c]),true);assert.equal(view.pool.length,1);assert.equal(view.pool[0].cptid,4);assert.equal(view.pool[0].ask,250000);assert.equal(view.portfolio[0].name,'Survivor');
  ledger[c].push(update(12,1,'ask','500000'));assert.equal((await get(4)).body.portfolio.ask,500000);assert.equal((await post({op:'getAsk',cptid:4})).body.ask,500000,'panel inherits same source edit');
  bases[c].records['4'].portfolio.ask=600000;assert.equal((await get(4)).body.portfolio.ask,600000);assert.equal((await post({op:'getAsk',cptid:4})).body.edited,false,'source edit does not override meaningful survivor base');bases[c].records['4'].portfolio.ask=0;
  ledger[c].push(update(13,4,'ask','0'));assert.equal((await get(4)).body.portfolio.ask,0);assert.equal((await post({op:'getAsk',cptid:4})).body.ask,0);
  ledger[c].push(update(14,4,'ask',''));assert.equal((await get(4)).body.campaignAsk.ask,null);
  ledger[c]=[update(15,1,'merged_into','4'),update(16,2,'merged_into','4')];r=(await get(4)).body;assert.equal(r.campaignAsk.askConflict,true);assert.equal(r.portfolio.ask,0,'conflicting source asks never arbitrarily selected');
  assert.equal(campaignAskAmount({ask:0,rating:1000000,askConflict:true}),0);
  ledger[c].push(update(17,4,'contact:city','Manual City'),update(18,4,'wealth:capacity','Manual capacity'));r=(await get(4)).body;assert.equal(r.contact.city,'Manual City');assert.equal(r.wealth.edits.capacity.value,'Manual capacity');
  let n=writes.length;assert.equal((await post({op:'setAsk',cptid:1,amount:123})).status,409);assert.equal(writes.length,n,'cannot save stale merged record');
  assert.equal((await post({op:'setAsk',cptid:4,amount:0,current:5})).status,200);assert.equal((await get(4)).body.portfolio.ask,0);assert.equal((await get(4)).body.campaignAsk.askConflict,undefined,'saving zero explicitly resolves conflict');assert.equal(writes.length,n+1,'explicit equal zero is persisted, not discarded');
  ledger[c].push(update(++seq,4,'deleted','Fixture reason'));assert.equal((await post({op:'setAsk',cptid:4,amount:123})).status,409);
  console.log(`PASS ${c}: 5M→2M,400K→500K,40K→100K; zero/blank/no override/refresh; chain/source edit/survivor precedence/conflict; immutable snapshots, commitments/contact/wealth, auth and stale writes`);
 }
 // Every GC2P keeps explicit committee pins, while saved zero/blank never revives a capacity seat.
 for(const c of clients){
  const {seatGc2p}=require(`../lib/${c}-gc2p.ts`);
  const p={cptid:99,name:'Synthetic',lifetime:0,gifts:0,first:'',last:'',largest:0,years:0,ds:'',capacity:'',capMin:0,qs:'',rating:5000000,ask:0,askEdited:true,basis:'Fixture',solicitor:'Fixture',donorType:''};
  let result=seatGc2p(9000000,[p],{prospects:{},pirs:{},activity:[]});assert.equal(result.seated.flatMap(x=>x.people).length,0);assert.equal(result.below.length,0);
  result=seatGc2p(9000000,[{...p,ask:500000}],{prospects:{},pirs:{},activity:[]});assert.equal(result.seated.flatMap(x=>x.people).length,1);
  result=seatGc2p(9000000,[p],{prospects:{99:{level:500000,status:'Unassigned'}},pirs:{},activity:[]});assert.equal(result.seated.find(x=>x.people.length)?.level,500000,'explicit pin wins zero');
  console.log(`PASS ${c} GC2P: edited ask and zero + committee pin precedence`);
 }
 const {seatGc2p: curatedSeat}=require('../lib/wcbhc-gc2p.ts');
 const curated=curatedSeat(12000000,[{cptid:100,name:'Curated fixture',ask:500000,rating:1000000,lifetime:0}],{prospects:{},pirs:{},activity:[]});
 assert.equal(curated.seated.find(x=>x.people.length)?.level,1000000,'unedited WCBHC curated seat remains authoritative');
 console.log('PASS all effective campaign ask regressions; isolated fixtures only');
})().catch(e=>{console.error(e);process.exitCode=1});
