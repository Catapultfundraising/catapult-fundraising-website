// Local-only mounted REAL dashboard + CRM + shared ready owner. Every API is intercepted.
// QA_PLAYWRIGHT_MODULE=/path/to/playwright node scripts/qa-campaign-prospects-tab.cjs
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict"),{spawn}=require("node:child_process");
if(process.env.VERCEL||process.env.NODE_ENV==="production")throw Error("Local synthetic QA only");
const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE||"playwright");
const clients=["jag","csnf","pvas","wcbhc","baq","imas"],before=process.env.QA_BEFORE==="1";
const root=process.cwd(),port=Number(process.env.QA_PORT)||3138,out=process.env.QA_OUT||fs.mkdtempSync(path.join(os.tmpdir(),"campaign-tab-"));
const dir=path.join(root,"app/dev/campaign-tab-qa"),fixture=path.join(dir,"page.tsx");
assert.ok(!fs.existsSync(fixture),"Refuse to overwrite fixture");fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(fixture,`"use client";
import {useEffect,useState} from "react";
${clients.map(c=>`import {${c[0].toUpperCase()+c.slice(1)}DataDashboard} from "@/components/${c}-data-dashboard";`).join("\n")}
const data={client:"SYNTHETIC Campaign Prospects QA",asOf:"2026-11-25",builtAt:"2026-11-25",source:"Fictional only",
kpi:{total:0,gifts:0,donors:0,avg:0,lifetime:0,gho:0},health:{dsScreened:0},pool:[],portfolio:[],board:[],fys:[],retention:[],stages:[],dsRating:[],capacity:[],pyramid:[],
highWealth:[],highWealthCount:0,midLevel:[],midLevelCount:0,legacy:[],legacyCount:0,lapsed:[],lapsedCount:0,top:[],committed:[],unrated:[],notSeated:[],
givebutter:{transactions:[],pledges:[]},batches:[],feasibility:{people:[]}};
const dashboards={${clients.map(c=>`${c}:${c[0].toUpperCase()+c.slice(1)}DataDashboard`).join(",")}};
export default function Page(){const [client,setClient]=useState("");useEffect(()=>setClient(new URLSearchParams(location.search).get("client")||"jag"),[]);const Dashboard=dashboards[client as keyof typeof dashboards];return Dashboard?<Dashboard data={data as never}/>:null;}
`);
const server=spawn(process.execPath,[require.resolve("next/dist/bin/next"),"dev","-p",String(port)],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:"1"},detached:true,stdio:["ignore","pipe","pipe"]});
const log=fs.createWriteStream(path.join(out,"server.log"));server.stdout.pipe(log);server.stderr.pipe(log);
const ready=new Promise((resolve,reject)=>{server.stdout.on("data",b=>{if(b.toString().includes("Ready"))resolve()});server.on("exit",c=>reject(Error("Server exit "+c)));server.on("error",reject)});
let browser;
const row=(id,name,solicitor="",solicitor2="")=>({cptid:id,name,kind:"Individual",city:"Fictional City",lifetime:id,gifts:1,largest:id,last:"2026-01-01",years:1,band:"",capMin:0,ds:"",capacity:"",solicitor,solicitor2,_canonicalAsk:{cptid:id,ask:null}});
// All these records are OUTSIDE every screened, portfolio and GC2P array.
const index=[row(101,"Fictional Primary","Fictional Lead"),row(102,"Fictional Secondary","","Fictional Second"),row(103,"Fictional Both","Fictional Lead","Fictional Second"),
 row(104,"Fictional Neither"),row(105,"Fictional Unassigned"," Unassigned ","unassigned"),
 row(106,"Fictional Cleared","Fictional Old"),row(107,"Fictional Legacy Clear","Fictional Old"),
 row(108,"Fictional Disqualified","Fictional Lead"),row(109,"Fictional Committed","","Fictional Second"),
 {...row(110,"Fictional Conflict"),assignmentConflict:true},
 {...row(111,"Fictional Conflict Resolved","","Fictional Second"),assignmentConflict:true},
 row(112,"Fictional Secondary Cleared"),row(113,"Fictional Primary Cleared Secondary Kept","Fictional Old","Fictional Second")];
const tracking={prospects:{"106":{solicitor:"",solicitorEdited:true},"107":{updatedAt:"2026-11-25"},"108":{status:"Disqualified",solicitorEdited:false},
 "109":{status:"Committed",solicitorEdited:false},"113":{solicitor:"",solicitorEdited:true}},activity:[],pirs:{},removed:[]};
const expected=[101,102,103,108,109,111,113];
const record=id=>({...index.find(r=>r.cptid===id),contact:{},summary:{lifetime:id,gifts:1,largest:id,years:1},gifts:[],flags:[],board:[],calling:[],calls:[],notes:[],committees:[],wealth:null,assignment:{solicitor:"",solicitor2:"Fictional Second"}});
const state=g=>({configured:true,dashboardGeneration:g,goal:1000,prospects:[],updates:[],gifts:[],batches:[],dashboardFreshness:{verifiedAt:Date.now(),stale:false}});
async function scenario(client,mode="ok"){
 const page=await browser.newPage({viewport:{width:1560,height:1100},extraHTTPHeaders:{"x-forwarded-proto":"https"}});
 const errors=[],requests=[],exports=[];let fail=mode==="unavailable";
 page.on("pageerror",e=>errors.push(e.stack));
 await page.route("**/*",async route=>{
  const req=route.request(),url=new URL(req.url());if(url.hostname!=="localhost")return route.abort();if(!url.pathname.startsWith("/api/"))return route.continue();requests.push({path:url.pathname,method:req.method(),op:req.method()==="POST"?JSON.parse(req.postData()||"{}").op:undefined});
  if(url.pathname==="/api/dashboard-ready")return route.fulfill({status:fail?503:200,contentType:"application/json",body:JSON.stringify(fail?{error:"Fictional read outage"}:{generation:"fictional-pair",index,tracking,state:state("fictional-pair")})});
  if(url.pathname.endsWith("-data-export")){exports.push(JSON.parse(req.postData()));return route.fulfill({status:200,contentType:"application/octet-stream",headers:{"content-disposition":'attachment; filename="fictional.xlsx"'},body:"synthetic export response"});}
  if(url.pathname.endsWith("-data-records")&&url.searchParams.has("id"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({...record(Number(url.searchParams.get("id"))),dashboardGeneration:"fictional-pair"})});
  // Everything else is read-only fictional metadata; no live requests escape.
  assert.ok(req.method()==="GET" || url.pathname.endsWith("-data-v2") && requests.at(-1).op==="getAsk", "Only read operations permitted");
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({documents:[],prospects:{},activity:[],pirs:{},removed:[]})});
 });
 await page.goto(`http://localhost:${port}/dev/campaign-tab-qa?client=${client}&tab=Donor%20Lookup`,{waitUntil:"domcontentloaded"});
 const necessary=page.getByRole("button",{name:"Necessary Only",exact:true});if(await necessary.isVisible())await necessary.click();
 if(mode==="unavailable"){
  await page.getByRole("alert").filter({hasText:"Donor records and assignments are unavailable"}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Campaign Prospects",exact:true}).count(),0);
  assert.equal(await page.locator("tbody tr").count(),0);console.log(`PASS ${client}: initial unavailable read has no invented list`);await page.close();return;
 }
 try{await page.getByRole("cell",{name:"Fictional Primary",exact:true}).waitFor();}catch(e){console.log(client,await page.locator("body").innerText(),errors,requests);throw e;}
 const tab=page.getByRole("button",{name:"Campaign Prospects",exact:true});
 if(before){
  const exists=await tab.count();
  if(["jag","csnf","pvas"].includes(client)){assert.equal(exists,0);console.log(`REPRODUCED ${client}: Campaign Prospects navigation MISSING`);}
  else{assert.equal(exists,1);await tab.click();assert.equal(await page.getByRole("cell",{name:"Fictional Secondary",exact:true}).count(),0);console.log(`REPRODUCED ${client}: existing source-only tab omits assigned full-index records`);}
  await page.screenshot({path:path.join(out,`${client}-before.png`),fullPage:true});await page.close();return;
 }
 assert.equal(await tab.count(),1);const nav=await page.locator("nav button").allTextContents();assert.equal(nav[nav.indexOf("Prospects")+1],"Campaign Prospects");
 await tab.click();assert.equal(new URL(page.url()).searchParams.get("tab"),"Campaign Prospects");
 await page.getByRole("heading",{name:"Campaign Prospects",exact:true}).waitFor();
 const ids=async()=>page.locator("tbody tr td:first-child").allTextContents();
 assert.deepEqual(new Set(await ids()),new Set(index.filter(r=>expected.includes(r.cptid)).map(r=>r.name)));
 await page.getByText("7 assigned prospects",{exact:true}).waitFor();
 await page.getByRole("columnheader",{name:"Primary Solicitor",exact:true}).waitFor();await page.getByRole("columnheader",{name:"Secondary Solicitor",exact:true}).waitFor();
 await page.getByLabel("Solicitor", {exact:true}).selectOption("Fictional Lead");
 assert.deepEqual(new Set(await ids()),new Set(["Fictional Primary","Fictional Both","Fictional Disqualified"]));
 await page.getByRole("button",{name:"Excel",exact:true}).click();
 assert.equal(exports.length,1);assert.equal(exports[0].intent.kind,"index");assert.deepEqual(new Set(exports[0].intent.ids),new Set([101,103,108]));
 await page.getByLabel("Solicitor", {exact:true}).selectOption("");
 const filter=page.getByPlaceholder("Filter this list...");await filter.fill("Fictional Secondary");
 assert.deepEqual(await ids(),["Fictional Secondary"]);await filter.fill("");
 await page.getByRole("columnheader",{name:"Name",exact:true}).click();
 const names=await ids();assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:"base"})));
 await page.screenshot({path:path.join(out,`${client}-after.png`),fullPage:true});
 await page.getByRole("cell",{name:"Fictional Secondary",exact:true}).click();
 await page.getByText("CPTID 102",{exact:false}).waitFor();
 assert.equal(new URL(page.url()).searchParams.get("rec"),"102");
 assert.equal(await page.getByText("Campaign Prospect",{exact:true}).count(),1,"Existing record badge retained");
 await page.screenshot({path:path.join(out,`${client}-record.png`),fullPage:true});
 // Do not click Reload SQL. Retry the existing read owner by its presentation-only event.
 await page.getByRole("button",{name:"Close",exact:true}).last().click();
 fail=true;await page.evaluate(()=>window.dispatchEvent(new Event("crm-index-refresh")));
 await page.getByText("Showing the retained last validated view, not current data.",{exact:false}).waitFor();
 assert.deepEqual(new Set(await ids()),new Set(names),"Retain prior paired list, not source fallback");
 assert.equal(requests.filter(r=>r.method!=="GET"&&!r.path.endsWith("-data-export")&&r.op!=="getAsk").length,0);
 assert.deepEqual(errors,[]);console.log(`PASS mounted ${client}: actual nav click, all 7 full-index assigned records/status/clears/conflicts, solicitor filter, search/sort, current index export, record 102 + badge, retained read hold; no live APIs`);
 await page.close();
}
(async()=>{await ready;browser=await chromium.launch({headless:true});for(const c of clients){await scenario(c);if(!before)await scenario(c,"unavailable");}fs.writeFileSync(path.join(out,"result.json"),JSON.stringify({passed:true,synthetic:true,before,clients,expectedIds:expected,liveRequests:0},null,2));console.log("ARTIFACTS "+out);})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();try{process.kill(-server.pid,"SIGTERM")}catch{}fs.unlinkSync(fixture);fs.rmdirSync(dir);log.end();});
