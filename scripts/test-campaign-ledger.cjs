const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText, filename);
const original = Module._load;
Module._load = function(name, parent, isMain) { return original.call(this, name.startsWith("@/") ? path.join(process.cwd(), name.slice(2)) : name, parent, isMain); };
const { buildDashboardExportModel, tableExportPayload } = require("../lib/portal-v2/dashboard-export-types.ts");
const { campaignByLevel, PORTAL_V2, PORTAL_V2_CLIENTS } = require("../lib/portal-v2/clients.ts");
// Fictional effective ledger: corrected source gift, Stewardship pledge, manual
// pledge/payment and name-only gift. Voided/replaced source rows are NOT active.
const gift = (id,cptid,kind,amount,extra={}) => ({id,cptid,donor_name:`Fixture ${cptid??id}`,kind,amount,gift_date:"2026-11-24",source:"manual",...extra});
const gifts = [gift(-1,1,"gift",125,{source:"database",corrected:{by:"Fixture",at:"",from:999}}),
  gift(-2,2,"pledge",1000,{source:"database",created_by:"Stewardship"}),
  gift(10,3,"pledge",400),gift(11,3,"gift",100),gift(12,null,"gift",25)];
for (const client of PORTAL_V2_CLIENTS) {
  const snapshot = {campaignGifts:gifts,givebutter:{transactions:[{name:"Stale provider",amount:999}],pledges:[],byCampaign:[]}};
  const before = JSON.stringify(snapshot);
  const model = table => buildDashboardExportModel(client,{table,snapshot,index:[],tracking:{}});
  const received = model("Campaign.2"), pledges = model("Campaign.1"), sources = model("Campaign.0");
  assert.equal(received.rows.length,3); assert.equal(pledges.rows.length,2);
  const sum = rows => rows.reduce((s,r)=>s+Number(r.amount),0);
  const c = campaignByLevel(PORTAL_V2[client].chart(PORTAL_V2[client].goal), gifts);
  assert.equal(sum(received.rows),c.totalGifts); assert.equal(sum(pledges.rows),c.totalPledges);
  assert.equal(c.raised,1550); assert.equal(c.totalGifts,250); assert.equal(c.totalPledges,1400);
  assert.equal(sources.rows.reduce((s,r)=>s+Number(r.total),0),250);
  assert.ok(!JSON.stringify(received).includes("Stale provider"));
  const payload = tableExportPayload(received,{kind:"table",table:"Campaign.2",search:"Fixture 3",sort:{key:"amount",dir:-1}});
  assert.equal(payload.sections[0].rows.length,1);
  assert.ok(payload.sections[0].rows[0].includes(100));
  assert.equal(JSON.stringify(snapshot),before);
  if (client !== "pvas") for (const n of [0,1,2])
    assert.deepEqual(model(`Givebutter.${n}`),model(`Campaign.${n}`),"legacy open-tab export selects the effective ledger");
  assert.throws(()=>buildDashboardExportModel(client,{table:"Campaign.2",snapshot:{},index:[],tracking:{}}),/ledger unavailable/i);
  console.log(`PASS ${client}: effective gifts $250 / pledges $1,400 / secured $1,550; filtered export agrees; stale/void rows absent`);
}
const empty = buildDashboardExportModel("baq",{table:"Campaign.2",snapshot:{campaignGifts:[]},index:[],tracking:{}});
assert.equal(empty.rows.length,0);
const provider = {transactions:[{name:"Provider-only fixture",amount:77}],pledges:[],byCampaign:[]};
const pvas = buildDashboardExportModel("pvas",{table:"Givebutter.2",snapshot:{campaignGifts:gifts,givebutter:provider},index:[],tracking:{}});
assert.deepEqual(pvas.rows,provider.transactions);
// Exact canonical cents, deliberately different numeric compatibility value.
const exact = [gift(20,20,"gift",999,{amountExact:"0.10"}),gift(21,21,"gift",999,{amountExact:"0.20"})];
for (const table of ["Campaign.0","Campaign.2"]) {
  const m = buildDashboardExportModel("pvas",{table,snapshot:{campaignGifts:exact},index:[],tracking:{}});
  assert.equal(m.rows.reduce((s,r)=>s+Number(r.total??r.amount),0).toFixed(2),"0.30");
}
assert.throws(()=>buildDashboardExportModel("pvas",{table:"Campaign.0",snapshot:{campaignGifts:[exact[0],gifts[0]]},index:[],tracking:{}}),/Incomplete exact/);
// Render the actual shared UI with a table adapter using the actual shared
// model. Only the already-tested progress owner is stubbed at this boundary.
const React = require("react"), {renderToStaticMarkup} = require("react-dom/server");
const loader = Module._load;
Module._load = function(name,parent,isMain) {
  if (name === "@/components/portal-v2") return { CampaignProgress: () => React.createElement("div",null,"Effective progress owner") };
  return loader.call(this,name,parent,isMain);
};
const {CampaignGifts} = require("../components/campaign-gifts.tsx");
for (const client of PORTAL_V2_CLIENTS) {
  const Table = ({exportSource}) => {
    const model = buildDashboardExportModel(client,{...exportSource,index:[],tracking:{}});
    return React.createElement("table",null,React.createElement("tbody",null,model.rows.map((r,i)=>React.createElement("tr",{key:i},model.cols.map(c=>React.createElement("td",{key:c.key},c.fmt?c.fmt(r[c.key],r):String(r[c.key]??"")))))));
  };
  const html = renderToStaticMarkup(React.createElement(CampaignGifts,{snapshot:{campaignGifts:gifts,givebutter:provider},Table}));
  assert.match(html,/\$250\.00/); assert.match(html,/\$1,400\.00/);
  assert.match(html,/Fixture 2/); assert.doesNotMatch(html,/Provider-only fixture/);
  assert.equal((html.match(/<table>/g)??[]).length,3);
}
console.log("PASS actual shared UI rendering for six adapters, canonical cents and partial-exact rejection");
const ui = fs.readFileSync("components/portal-v2.tsx","utf8");
assert.match(ui,/campaignGifts:\s*state\.gifts/);
const server = fs.readFileSync("lib/portal-v2/dashboard-export.server.ts","utf8");
assert.match(server,/campaignGifts:\s*state\.gifts/);
for (const client of PORTAL_V2_CLIENTS) {
  const source = fs.readFileSync(`components/${client}-data-dashboard.tsx`,"utf8");
  assert.match(source,/"Campaign Gifts"/); assert.match(source,/<CampaignGifts /);
}
console.log("PASS all six dashboard routes, authoritative server/browser ledger wiring, empty ledger and PVAS provider isolation");

// Exercise the actual authenticated export reconstruction boundary; only its
// storage/gateway IO and unrelated record/report projection are fictional.
(async () => {
  let state = {gifts,updates:[],prospects:[],batches:[]};
  const revision = "fixture-revision", tracking = {prospects:{},activity:[],pirs:{},directSourceRevision:revision};
  const load = Module._load;
  Module._load = function(name,parent,isMain) {
    if (name === "server-only") return {};
    if (name === "./server" && parent?.filename.endsWith("dashboard-export.server.ts"))
      return {portalCampaignStateSafe:async()=>state};
    if (name === "./direct-source-state.server" && parent?.filename.endsWith("dashboard-export.server.ts"))
      return {currentTracking:async()=>tracking,directTrackingView:(_,t)=>t,directData:async(_,s)=>s,requireCurrentSql:()=>{}};
    if (name === "./records-route" && parent?.filename.endsWith("dashboard-export.server.ts"))
      return {currentRecordProjection:()=>({index:[]})};
    if (name === "./report-route" && parent?.filename.endsWith("dashboard-export.server.ts")) return {};
    if (/^\.\.\/(pvas|jag|csnf|wcbhc|baq|imas)-data-store$/.test(name))
      return new Proxy({},{get:(_,key)=>key==="then"?undefined:async()=>String(key).includes("Snapshot")?{directSourceRevision:revision,pool:[],board:[],portfolio:[]}:{records:{},index:[],directSourceRevision:revision}});
    if (/^\.\.\/(pvas|jag|csnf|wcbhc|baq|imas)-tracking$/.test(name))
      return new Proxy({},{get:(_,key)=>key==="then"?undefined:async()=>tracking});
    return load.call(this,name,parent,isMain);
  };
  const {reconstructDashboardExport} = require("../lib/portal-v2/dashboard-export.server.ts");
  for (const client of PORTAL_V2_CLIENTS) {
    const intent = {kind:"table",table:"Campaign.2",search:"Fixture 3",sort:{key:"amount",dir:-1}};
    const out = await reconstructDashboardExport(client,intent,{});
    assert.deepEqual(out,tableExportPayload(buildDashboardExportModel(client,{table:"Campaign.2",snapshot:{campaignGifts:gifts},index:[],tracking}),intent));
    // Saving/reloading a changed ledger must affect the server-built export,
    // without relying on the browser's previous gift amounts or rows.
    state = {...state,gifts:[gift(50,3,"gift",7)]};
    const changed = await reconstructDashboardExport(client,intent,{});
    assert.ok(changed.sections[0].rows[0].includes(7)); assert.equal(changed.sections[0].rows.length,1);
    state = {...state,gifts};
    console.log(`PASS ${client}: actual server export reconstruction and changed-ledger refresh`);
  }
})().catch(e=>{console.error(e);process.exitCode=1});
