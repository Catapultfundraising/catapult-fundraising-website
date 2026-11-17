// Synthetic-only PVAS SQL cutover regression. No SQL, Blob, or external IO.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const Module = require("node:module"), ts = require("typescript"), original = Module._load;
const root = process.cwd();
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, f);
let commonMock, builderMock, gatewayMock, canonicalEnabled=true;
Module._load = function(name, parent, isMain) {
  if (name === "server-only") return {};
  if(name.endsWith("/pvas-canonical")||name==="./pvas-canonical")return {pvasCanonicalEnabled:client=>client==="pvas"&&canonicalEnabled,PVAS_CANONICAL_ACCEPTED:false};
  if (name === "@vercel/blob") return { get: async () => { throw new Error("Unexpected Blob read"); }, put: async () => { throw new Error("Unexpected Blob write"); } };
  if (name === "./common" && parent.filename.endsWith("/portal-refresh/pvas.ts") && commonMock) return commonMock;
  if (name === "../portal-v2/pvas-native-gifts.server" && parent.filename.endsWith("/portal-refresh/pvas.ts"))
    return {readPvasNativeGiftsV2:async(lane,view)=>{assert.equal(lane,"history");assert.equal(view,"current");if(giftFails)throw Error("unavailable");return {v:2,lane,view,records:[structuredClone(nativeHistory)]};}};
  if (name === "./portal-refresh/pvas" && builderMock) return { buildPvas: builderMock };
  if ((name === "./portal-v2/server" || name === "@/lib/portal-v2/server" || name === "./server") && gatewayMock) return gatewayMock;
  if (name.startsWith("@/")) name = path.join(root, name.slice(2));
  return original.call(this, name, parent, isMain);
};
global.fetch = async () => { throw new Error("Unexpected external request"); };
const load = name => require(path.join(root, name));
const common = load("lib/portal-refresh/common.ts");
const fixture = {
  portfolio: [{ row_id: 1, CPTID: 12984, Account_Name: "ZZTEST old name", Campaign_Ask: 1234, Primary_Solicitor: "ZZTEST SQL primary", Secondary_Solicitor: "" , Address: "ZZTEST old street", City: "ZZTEST old city", Email1: "old@example.invalid", Phone1: "9565551234" }],
  giving_history_overview: [{ CPTID: 12984, Total_Gift_Amount: 100, Total_of_Gifts: 1, Largest_Gift_Amount: 100 }],
  calendar_year_giving: [{ CPTID: 12984, Calendar_Year: 2025, SumOfGift_Amount: 100 }],
  notes: [{ CPTID: 12984, Date: "2026-11-16", Note: "ZZTEST canonical note", Note_Order_Newest_to_Oldest: 1 }],
};
let giftFails = false, contactsFail = false, aggregateFails = false;
const aggregateQueries = [];
const eventGift = { cptid:12984, date:"2024-02-03", amount:"777.77", status:"received", campaign:"Fictional", fund:"", type:"", year:2024,
  _canonicalGift:{gift:{giftId:7,cptid:12984,version:1,amount:"777.77",currency:"USD",date:"2024-02-03",year:2024,kind:"gift",status:"received",scope:"historical",credit:"hard",campaign:"Fictional",fund:null,type:null,note:null,donorName:null,voidReason:null},source:{system:"client_gift_history",key:"7"}} };
const historySource={system:"client_gift_history",key:"7"};
const nativeHistory={giftId:7,cptid:12984,version:1,order:"7",sources:[historySource],representation:"native-history",source:historySource,
  native:{amount:"777.77",date:"2024-02-03",year:2024,status:"received",campaign:"Fictional",fund:"",type:"",recordType:"gift",note:null,loadedAt:"2026-11-17T00:00:00.1234567"},
  legacy:{id:"7",cptid:12984,date:"2024-02-03",amount:"777.77",status:"received",campaign:"Fictional",fund:"",type:"",year:2024,note:null,record_type:"gift"}};
const canonicalFields=Object.fromEntries("fullName firstName middleName lastName street street2 city state zip phone phone2 email email2 spouseFirstName spouseMiddleName spouseLastName ask primarySolicitor secondarySolicitor phone3 phone4 dsRating wealthCapacity majorGiftScore realEstate stock status outcome".split(" ").map(k=>[k,null]));
Object.assign(canonicalFields,{fullName:"ZZTEST canonical name",street:"ZZTEST SQL street",city:"",phone:"",phone2:"9565559876",email:"",ask:1234,primarySolicitor:"ZZTEST SQL primary",secondarySolicitor:"",status:"Active"});
const profile={cptid:12984,clientId:null,presence:{},fields:canonicalFields,extras:{},identity:{isProspect:false,deleted:false,deleteReason:null,mergedInto:null,version:0,createdBy:null,createdAt:null}};
const financials={v:1,donors:[{cptid:12984,lifetime:"100.00",receivedCount:1,undatedReceived:"0.00",undatedCount:0,undatedPledged:"0.00",firstDate:null,lastDate:null,largestGift:"100.00",years:[{year:2025,received:"100.00",receivedCount:1,pledged:"0.00"}]}],totals:{received:"100.00",pledged:"0.00"}};
commonMock = { ...common, rows: async query => { aggregateQueries.push(query); if(aggregateFails&&query.includes("[giving_history_overview]"))throw Error("Aggregate read unavailable"); return structuredClone(fixture[query.match(/pvas\.\[([a-z_]+)\]/)?.[1]] ?? []); },
  loadedAsOf: async () => "2026-11-16", pirLinks: async () => ({}),
  engagePvasFinancials:async()=>structuredClone(financials),
  engageClientGifts: async () => { throw Error("Retired v1 gift read must not be called"); },
  engageClientContacts: async () => { if (contactsFail) throw Error("unavailable"); return [{ cptid: 12984, name: "ZZTEST canonical name", street: "ZZTEST SQL street", city: "", email: "", phone: "", phone2: "9565559876",_canonicalContact:structuredClone(profile) }]; },
};
(async () => {
  const { buildPvas } = load("lib/portal-refresh/pvas.ts");
  const built = await buildPvas(), r = built.records.records["12984"];
  assert.equal(r.portfolio.ask, 1234, "SQL ask replaces old hardcoded override");
  assert.equal(built.snapshot.pool[0].ask, 1234);
  assert.equal(built.snapshot.portfolio[0].ask, 1234);
  assert.equal(r.name, "ZZTEST canonical name");
  assert.equal(r.contact.street, "ZZTEST SQL street");
  assert.equal(r.contact.city, "", "explicit canonical clear retained");
  assert.equal(r.contact.email, "");
  assert.equal(r.contact.phone, "");
  assert.equal(r.contact.phone2, "(956) 555-9876", "canonical slot not shifted into primary");
  assert.deepEqual(r.notes,[],"canonical note history appears once through SQL tracking, never raw baseline");
  assert.deepEqual(r._canonicalContact,profile,"unformatted expected values preserved");
  assert.equal(Object.hasOwn(built.snapshot,"financials"),false,"event analytics are not aggregate presentation");
  assert.equal(Object.hasOwn(built.snapshot,"undatedFinancials"),false);
  assert.equal(Object.hasOwn(r,"financials"),false);
  assert.equal(built.snapshot.kpi.total, 100, "SQL totals retained");
  assert.equal(r.summary.lifetime,100,"contradictory777.77 event never replaces/adds to overview100");
  assert.equal(r.nativeGiftHistory.records[0].native.amount,"777.77","original individual decimal string remains independent");
  assert.equal(Object.hasOwn(r,"gifts"),false,"no empty old-history disguise or fabricated legacy Number rows");
  assert.deepEqual(r.years,[{year:2025,amount:100}],"calendar years are not event years");
  assert.deepEqual(built.snapshot.fys,[{fy:2025,total:100,gifts:1,donors:1}]);
  for (const table of ["giving_history_overview","calendar_year_giving"])
    assert.ok(aggregateQueries.includes(`SELECT * FROM pvas.[${table}] ORDER BY row_id`),"fixed original aggregate read owner");
  const originalOverview=structuredClone(fixture.giving_history_overview),originalCalendar=structuredClone(fixture.calendar_year_giving);
  try {
    // SQL-only aggregate edits reach the same canonical live builder without any
    // event-feed delta, fallback, opening balance or recomputed aggregate row.
    fixture.giving_history_overview=[{CPTID:12984,Total_Gift_Amount:875.25,Total_of_Gifts:9,Largest_Gift_Amount:207.5,First_Gift_Date:"2020-01-02",Last_Gift_Date:"2025-03-04"}];
    fixture.calendar_year_giving=[{CPTID:12984,Calendar_Year:2022,SumOfGift_Amount:25},{CPTID:12984,Calendar_Year:2022,SumOfGift_Amount:50},{CPTID:12984,Calendar_Year:2023,SumOfGift_Amount:0},{CPTID:12984,Calendar_Year:2024,SumOfGift_Amount:null}];
    const changed=await buildPvas(),cr=changed.records.records["12984"];
    assert.equal(changed.snapshot.kpi.total,875.25);assert.equal(changed.snapshot.kpi.gifts,9);
    assert.equal(cr.summary.lifetime,875.25);assert.equal(cr.summary.largest,207.5);
    assert.equal(cr.summary.first,"2020-01-02");assert.equal(cr.summary.last,"2025-03-04");
    assert.deepEqual(cr.years,[{year:2022,amount:75}]);
    assert.deepEqual(changed.snapshot.fys,[{fy:2022,total:75,gifts:1,donors:1}],"original calendar donor-count/chart selection, never event count");
    assert.equal(cr.nativeGiftHistory.records[0].native.amount,"777.77");
    for (const total of [null,0]) {
      fixture.giving_history_overview=[{CPTID:12984,Total_Gift_Amount:total,Total_of_Gifts:99,Largest_Gift_Amount:777}];
      fixture.calendar_year_giving=[{CPTID:12984,Calendar_Year:2024,SumOfGift_Amount:total}];
      const empty=await buildPvas(),er=empty.records.records["12984"];
      assert.equal(empty.snapshot.kpi.total,0);assert.equal(empty.snapshot.kpi.gifts,0);
      assert.equal(er.summary.lifetime,0);assert.equal(er.summary.ghoTotal,null);
      assert.equal(er.summary.largest,0);assert.equal(er.summary.first,"");assert.equal(er.summary.last,"");
      assert.deepEqual(empty.snapshot.fys,[]);assert.equal(er.years,undefined);
      assert.equal(er.nativeGiftHistory.records[0].native.amount,"777.77","null/zero aggregate never falls back to nonzero history detail");
    }
    commonMock.engagePvasFinancials=async()=>{throw Error("Event analytics must not be queried for aggregate presentation");};
    await buildPvas();
    aggregateFails=true;
    await assert.rejects(buildPvas,/Aggregate read unavailable/,"aggregate failures never fall back to events or legacy client");
    aggregateFails=false;
  } finally {aggregateFails=false;fixture.giving_history_overview=originalOverview;fixture.calendar_year_giving=originalCalendar;}
  console.log("PASS fixed live GHO/CYG ownership, direct SQL edit projection, null/zero and independent contradictory events");
  giftFails = true; await assert.rejects(buildPvas); giftFails = false;
  contactsFail = true; await assert.rejects(buildPvas); contactsFail = false;
  console.log("PASS builder SQL ask/contact/clear/note/total and unavailable-feed checks");

  let builds = 0, unavailable = false, now = 0, release;
  const realNow = Date.now; Date.now = () => now;
  builderMock = async () => { builds++; if (unavailable) throw Error("unavailable"); if (release) await new Promise(resolve => { release.resolve = resolve; }); return structuredClone(built); };
  process.env.PVAS_LOCAL_DIR = "/nonexistent/retired-fixture";
  const store = load("lib/pvas-data-store.ts");
  release = {}; const requests = [store.getPvasRecords(), store.getPvasSnapshot()];
  await Promise.resolve(); release.resolve(); release = null;
  const [records, snapshot] = await Promise.all(requests);
  assert.equal(builds, 1, "single flight shares SQL generation");
  records.records["12984"].name = "ZZTEST mutation";
  snapshot.pool[0].ask = -1;
  assert.equal((await store.getPvasRecords()).records["12984"].name, "ZZTEST canonical name");
  assert.equal((await store.getPvasSnapshot()).pool[0].ask, 1234, "cached data not mutable by callers");
  now = 299999; await store.getPvasRecords(); assert.equal(builds, 1);
  now = 300000; await store.getPvasSnapshot(); assert.equal(builds, 2, "expires at five minutes");
  now = 600000; unavailable = true;
  assert.equal(await store.getPvasRecords(), null, "never stale-on-error");
  unavailable = false; assert.ok(await store.getPvasSnapshot()); assert.equal(builds, 4, "failed promise not cached");
  store.invalidatePvasDataCache();release={};const older=store.getPvasRecords(),oldRelease=release;
  store.invalidatePvasDataCache();release={};const newer=store.getPvasSnapshot(),newRelease=release;
  await Promise.resolve();oldRelease.resolve();await older;
  const beforeJoin=builds,joined=store.getPvasRecords();
  assert.equal(builds,beforeJoin,"older pending completion cannot clear newer single-flight");
  newRelease.resolve();release=null;await Promise.all([newer,joined]);
  await store.getPvasRecords();assert.equal(builds,beforeJoin,"newest generation supplies cache");
  Date.now = realNow;
  console.log("PASS SQL cache single-flight/TTL/immutability/failure recovery; no local/blob fallback");

  let response, calls = [];
  gatewayMock = { engageCall: async (...args) => { calls.push(args); return response; } };
  const tracking = { revision:"a".repeat(64),prospects: { "12984": { status: "Active", _canonicalTracking:{objectPresent:true,statusPresent:true}, solicitor: "ZZTEST canonical primary", solicitor2: "", solicitorEdited: true, updatedAt: "", by: "" } }, activity: [], removed: [], pirs: {} };
  response = { status: 200, body: { configured: true, state: tracking } };
  const tracker = load("lib/pvas-tracking.ts");
  assert.deepEqual(await tracker.getPvasTracking(), tracking);
  assert.deepEqual(calls[0], ["pvas", "getTracking"]);
  const strictReader = load("lib/portal-v2/direct-tracking-reader.server.ts");
  assert.equal((await strictReader.strictTrackingFor("pvas")).kind, "present", "strict conflict reader uses SQL too");
  const rawNote={noteId:7,rowId:-2,cptid:12984,version:0,text:"ZZTEST legacy note",date:"Spring 2009",source:null,order:1.25,deleted:false};
  const noteView={...tracking,activity:[{id:"sql:7",cptid:12984,date:"",sourceDate:"Spring 2009",kind:"Note",note:"ZZTEST legacy note",by:"",at:"",_canonical:rawNote}]};
  response={status:200,body:{configured:true,state:noteView}};
  assert.deepEqual((await tracker.getPvasTracking()).activity[0]._canonical,rawNote,"raw free-text date/float order and signed rowId preserved");
  assert.equal((await strictReader.strictTrackingFor("pvas")).kind,"present");
  response={status:200,body:{configured:true,state:{...noteView,activity:[{...noteView.activity[0],_canonical:{...rawNote,noteId:"7"}}]}}};
  await assert.rejects(tracker.getPvasTracking,"no canonical ID coercion");
  const action={requestId:"b".repeat(32),by:"ZZTEST reviewer"};
  response = { status: 200, body: { ok: true,requestId:action.requestId,revision:tracking.revision,changed:true,replayed:false } };
  await tracker.savePvasTracking(tracking,action);
  assert.deepEqual(calls.at(-1), ["pvas", "setTracking", { data: tracking,...action }]);
  response={status:200,body:{ok:true,requestId:"c".repeat(32),revision:tracking.revision}};
  await assert.rejects(()=>tracker.savePvasTracking(tracking,action),"wrong original receipt ID is unconfirmed, not success");
  response = { status: 200, body: { configured: false } };
  await assert.rejects(tracker.getPvasTracking);
  await assert.rejects(() => tracker.savePvasTracking(tracking,action));
  assert.equal((await strictReader.strictTrackingFor("pvas")).kind, "unavailable");
  response = { status: 200, body: { configured: true, state: { ...tracking, activity: null } } };
  await assert.rejects(tracker.getPvasTracking);
  console.log("PASS tracking get/set wire contract, strict SQL adapter and failure-closed checks");

  const reads = load("lib/portal-v2/direct-source-state.server.ts");
  const deps = { enabled: () => true, state: async () => { throw Error("Retired direct state called"); }, tracking: async () => { throw Error("Retired tracking called"); }, sql: async () => { throw Error("Retired manual projection called"); } };
  assert.equal(await reads.directData("pvas", built.records, "records", deps), built.records);
  assert.equal(await reads.directTrackingView("pvas", tracking, deps), tracking);
  assert.equal(await reads.currentTracking("pvas", async () => tracking), tracking);
  assert.throws(() => reads.requireCurrentSql("pvas", { configured: false }));
  reads.requireCurrentSql("pvas", { updates: [], prospects: [] });
  const { currentDashboardSnapshot } = load("lib/portal-v2/current-dashboard-snapshot.ts");
  const directView = { revision: "retired", values: [{ cptid: 12984, field: "ask", value: "99999", source: true }] };
  assert.equal(currentDashboardSnapshot("pvas", built.snapshot, null, undefined, [], directView).pool[0].ask, 1234);
  assert.equal(currentDashboardSnapshot("jag", built.snapshot, null, undefined, [], directView).pool[0].ask, 99999, "other clients retain direct layer");
  assert.equal(await reads.observeDirect("jag", { ...deps, enabled: () => false }), null);
  console.log("PASS PVAS direct/manual composition bypass; other-client behavior retained");

  const sqlState = { updates: [], prospects: [], gifts: [], batches: [] };
  gatewayMock.portalCampaignStateSafe = async () => sqlState;
  gatewayMock.portalStateSafe = async () => sqlState;
  response = { status: 200, body: { configured: true, state: tracking } };
  const { reconstructDashboardExport } = load("lib/portal-v2/dashboard-export.server.ts");
  for (const intent of [
    { kind: "index", ids: [12984] }, { kind: "record", id: 12984 },
    { kind: "report", query: { fields: ["name", "solicitor"], filters: [], sort: { field: "name", dir: 1 } } },
    { kind: "table", table: "Portfolio.1", parameters: {} },
  ]) {
    const exported = await reconstructDashboardExport("pvas", intent, { title: "ZZTEST" });
    assert.ok(JSON.stringify(exported).includes("ZZTEST canonical"), intent.kind);
    assert.equal(JSON.stringify(exported).includes("ZZTEST old"), false);
  }
  await assert.rejects(() => reconstructDashboardExport("pvas", undefined, {}));
  response = { status: 503, body: { error: "unavailable" } };
  await assert.rejects(() => reconstructDashboardExport("pvas", { kind: "index", ids: [12984] }, {}));
  console.log("PASS canonical server index/record/report/table exports and unavailable-tracking hold");

  gatewayMock.secondarySolicitors = async () => { throw Error("Retired assignment overlay called"); };
  gatewayMock.saveSecondarySolicitor = async () => { throw Error("Split assignment write called"); };
  gatewayMock.logHistoryAudit = async () => {};
  const { trackingRoute } = load("lib/tracking-route.ts"), { NextRequest } = require("next/server");
  let stored = structuredClone(tracking), saves = 0;
  const route = trackingRoute("pvas", async () => true, async () => structuredClone(stored), async state => { saves++; stored = structuredClone(state); });
  const status = await route.POST(new NextRequest("https://fixture.invalid", { method: "POST", body: JSON.stringify({
    type: "status", cptid: 12984, by: "ZZTEST reviewer", status: "Assigned", solicitor: "", solicitor2: "ZZTEST SQL secondary",
    requestId:action.requestId,revision:tracking.revision,actionAt:"2026-11-16T20:00:00.000Z",
  }) }));
  assert.equal(status.status, 200); assert.equal(saves, 1, "assignment/status saved together through SQL tracking");
  assert.equal(stored.prospects["12984"].solicitor, "");
  assert.equal(stored.prospects["12984"].solicitor2, "ZZTEST SQL secondary");
  const postTracking=(route,body)=>route.POST(new NextRequest("https://fixture.invalid",{method:"POST",body:JSON.stringify({cptid:12984,by:action.by,requestId:action.requestId,revision:tracking.revision,actionAt:"2026-11-16T20:00:00.000Z",...body})}));
  stored=structuredClone(noteView);
  assert.equal((await postTracking(route,{type:"editActivity",id:"sql:7",date:"",note:"ZZTEST edited"})).status,200);
  assert.deepEqual(stored.activity[0]._canonical,rawNote,"note edit retains ORIGINAL exact expected metadata");
  assert.equal(stored.activity[0].date,"","undated date not manufactured on edit");
  assert.equal((await postTracking(route,{type:"deleteActivity",id:"sql:7"})).status,200);
  assert.deepEqual(stored.removed[0]._canonical,rawNote,"tombstone retains ORIGINAL metadata");
  const beforeSaves=saves;
  assert.equal((await postTracking(route,{type:"purgeTest"})).status,403);assert.equal(saves,beforeSaves);
  assert.equal((await postTracking(route,{type:"status",status:"Active",revision:"c".repeat(64)})).status,409);
  const conflict=trackingRoute("pvas",async()=>true,async()=>structuredClone(tracking),async()=>{throw new tracker.PvasTrackingSaveError(409);});
  assert.equal((await postTracking(conflict,{type:"status",status:"Active"})).status,409,"backend atomic409 retained");
  const failing = trackingRoute("pvas", async () => true, async () => { throw Error("unavailable"); }, async () => { throw Error("not reached"); });
  assert.equal((await failing.GET(new NextRequest("https://fixture.invalid"))).status, 503);
  console.log("PASS PVAS tracking HTTP canonical assignment save and unavailable read");

  delete process.env.PORTAL_WRITE_SECRET;
  await assert.rejects(() => common.engageClientGifts("pvas"));
  await assert.rejects(() => common.engageClientContacts("pvas"));
  assert.deepEqual(await common.engageClientContacts("jag"), []);
  process.env.PORTAL_WRITE_SECRET = "ZZTEST synthetic";
  global.fetch = async () => ({ ok: true, json: async () => ({ rows: [], next: null, done: false }) });
  await assert.rejects(() => common.engageClientGifts("pvas"));
  await assert.rejects(() => common.engageClientContacts("pvas"));
  global.fetch = async () => ({ ok: true, json: async () => ({ rows: [], next: 1, done: false }) });
  await assert.rejects(() => common.engageClientContacts("pvas"), "nonadvancing pagination fails closed");
  let pages=0;
  global.fetch=async()=>{pages++;return {ok:true,json:async()=>({rows:[{id:pages,cptid:pages}],next:pages,done:pages===45})};};
  assert.equal((await common.engageClientContacts("pvas")).length,45,"follows backend cursor beyond old40-page ceiling");
  pages=0;global.fetch=async()=>{pages++;return {ok:true,json:async()=>({rows:[],next:pages,done:false})};};
  await assert.rejects(()=>common.engageClientContacts("pvas"),"budget exhaustion is a hold, not partial success");assert.equal(pages,4096);
  console.log("PASS PVAS configuration and incomplete pagination failure guards");
  const money=load("lib/portal-v2/pvas-financials.ts");
  assert.deepEqual(money.validatePvasFinancials(financials),financials);
  const undated=structuredClone(financials);undated.donors[0].years=[];undated.donors[0].undatedReceived="100.00";undated.donors[0].undatedCount=1;undated.donors[0].undatedPledged="12.34";undated.totals.pledged="12.34";
  assert.deepEqual(money.validatePvasFinancials(undated),undated);
  const mismatch=structuredClone(undated);mismatch.donors[0].undatedReceived="99.99";assert.throws(()=>money.validatePvasFinancials(mismatch));
  assert.throws(()=>money.displayMoney("90071992547409.92"));
  assert.throws(()=>money.moneyCents(0.10));
  assert.equal(money.centsMoney(money.moneyCents("0.10")+money.moneyCents("0.20")),"0.30");
  const contact=load("lib/portal-v2/pvas-contact-wire.ts");
  const changes=contact.pvasContactChanges(profile,{street:"",mobile:"",ask:0});
  assert.deepEqual(changes,[{field:"street",expected:"ZZTEST SQL street",value:""},{field:"mobile",expected:null,value:"",expectedPresent:false},{field:"ask",expected:1234,value:0}]);
  assert.deepEqual(contact.pvasIdentityCommand(profile,"deleteRecord","Reason"),{operation:"contact-state",cptid:12984,expected:{deleted:false,deleteReason:null,mergedInto:null,version:0},value:{deleted:true,deleteReason:"Reason",mergedInto:null}});
  const secondProfile={...structuredClone(profile),cptid:12985};
  const merge=contact.pvasMergeStates({"12984":profile,"12985":secondProfile},12984,[12985]);
  assert.equal(merge.length,2,"atomic merge includes unchanged survivor expected/version guard");
  assert.equal(merge[1].value.mergedInto,12984);
  assert.throws(()=>contact.pvasMergeStates({"12984":profile},12984,[12984]));
  const prospectProfile={...structuredClone(profile),identity:{...profile.identity,isProspect:true}};
  assert.deepEqual(contact.pvasProspectChanges(prospectProfile,{clientId:"",address1:"",orgName:"Test"}),{operation:"contact-prospect-edit",cptid:12984,changes:[{field:"street",expected:"ZZTEST SQL street",value:""},{field:"orgName",expected:null,value:"Test",expectedPresent:false}],clientId:{expected:null,value:""}});
  const stateWire=load("lib/portal-v2/pvas-state-wire.ts");
  const gift={giftId:1,cptid:12984,version:1,amount:"0.10",currency:"USD",date:null,year:null,kind:"gift",status:"received",scope:"campaign",credit:"hard",campaign:null,fund:null,type:null,note:null,donorName:null,voidReason:null};
  const {voidReason,giftId:unusedGiftId,cptid:unusedCptid,version:unusedVersion,...event}=gift;
  const nativeEvent={giftId:1,cptid:12984,version:1,order:"1",sources:[{system:"manual",key:"fixture"}],representation:"admitted-event",event,voidReason};
  const rawState={giftWireVersion:2,nativeCampaignPage:{v:2,lane:"campaign",view:"current",records:[nativeEvent],next:null,done:true},prospects:[],batches:[],updates:[{id:1,field:"ask"},{id:2,field:"contact:street"},{id:3,field:"merged_into"}]};
  const canonicalState=stateWire.canonicalPvasState(rawState,undefined,[nativeEvent]);
  assert.deepEqual(canonicalState.updates,[{id:3,field:"merged_into"}]);assert.equal(canonicalState.gifts[0].amount,0.1);
  assert.equal(Object.hasOwn(canonicalState.gifts[0],"amountExact"),false);
  assert.equal(Object.hasOwn(canonicalState,"giftOverrides"),false);
  const identityState=stateWire.canonicalPvasState({...rawState,updates:[{id:1,field:"merged_into"},{id:2,field:"deleted"}]},{"12984":{_canonicalContact:profile}},[]);
  assert.deepEqual(identityState.updates,[],"historical identity flags cannot override current raw identity");
  const eur={...nativeEvent,event:{...event,currency:"EUR"}};
  const eurState=stateWire.canonicalPvasState({...rawState,updates:[]},undefined,[eur]);
  assert.deepEqual(eurState.gifts,[]);assert.deepEqual(eurState.nativeCampaignInventory,[eur],"non-USD retained typed in complete inventory, never converted or lost");
  assert.throws(()=>stateWire.canonicalPvasState({...rawState,gifts:[]},undefined,[]),"old gifts array rejected, not interpreted as v2 empty");
  assert.throws(()=>stateWire.canonicalPvasState(rawState),"complete native stream required");
  console.log("PASS exact-string financial/undated reconciliation, raw contact presence and retired overlay guards");
  canonicalEnabled=false;
  const beforeBuilds=builds;
  assert.equal(await store.getPvasSnapshot(),null,"false gate restores original Blob owner (mock absent)");
  assert.equal(builds,beforeBuilds);
  assert.deepEqual((await tracker.getPvasTracking()).prospects,{});
  console.log("PASS acceptance=false retains old owners rather than activating canonical data");
  console.log("All PVAS SQL-source synthetic checks passed");
})().catch(e => { console.error(e); process.exitCode = 1; });
