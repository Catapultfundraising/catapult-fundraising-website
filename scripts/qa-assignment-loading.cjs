// Local-only actual JAG/PVAS loading-race regression; no production data or network writes.
// Run with no other local Next build/dev job: QA_PLAYWRIGHT_MODULE=/path/to/playwright node scripts/qa-assignment-loading.cjs
// Creates a temporary synthetic page, starts localhost Next, intercepts every API, then removes the page.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict"),{spawn}=require("node:child_process");
if(process.env.VERCEL || process.env.NODE_ENV==="production")throw new Error("Local QA only");
const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE || "playwright");
const root=process.cwd(),port=Number(process.env.QA_PORT)||3137,out=process.env.QA_OUT||fs.mkdtempSync(path.join(os.tmpdir(),"assignment-loading-"));
const dir=path.join(root,"app/dev/assignment-loading-qa"),fixture=path.join(dir,"page.tsx");
assert.ok(!fs.existsSync(fixture),"Refuse to overwrite an existing fixture");
fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(fixture,`"use client";
import { useEffect, useState } from "react";
import { JagDataDashboard } from "@/components/jag-data-dashboard";
import { PvasDataDashboard } from "@/components/pvas-data-dashboard";
const row=(cptid:number,name:string,lifetime:number)=>({cptid,name,lifetime,gifts:1,first:"2020-01-01",last:"2026-01-01",largest:lifetime,years:1,ds:"DS2",capacity:"$100K",capMin:100000,qs:"20",rating:100000,ask:100000,solicitor:"Unassigned"});
const rows=[row(4,"ZZTEST MergeSource",10),row(3,"ZZTEST Target",20),row(2,"ZZTEST Ordinary",5),row(8,"ZZTEST MissingTargetSource",99)];
const data={client:"Synthetic Loading QA",asOf:"Fixture",builtAt:"Fixture",source:"Synthetic",kpi:{total:0,gifts:0,donors:0,avg:0},health:{dsScreened:4},pool:[rows[0]],portfolio:[rows[0]],board:[],fys:[],retention:[],stages:[],dsRating:[],capacity:[],pyramid:[],highWealth:rows,highWealthCount:4,midLevel:[],midLevelCount:0,legacy:[],legacyCount:0,lapsed:[],lapsedCount:0,top:[],committed:[],givebutter:{transactions:[],pledges:[]},batches:[],feasibility:{people:[]}};
export default function Page(){const [client,setClient]=useState("");useEffect(()=>setClient(new URLSearchParams(location.search).get("client")||"pvas"),[]);return client==="jag"?<JagDataDashboard data={data as never}/>:client==="pvas"?<PvasDataDashboard data={data as never}/>:null;}
`);
const server=spawn(process.execPath,[require.resolve("next/dist/bin/next"),"dev","-p",String(port)],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:"1"},detached:true,stdio:["ignore","pipe","pipe"]});
const log=fs.createWriteStream(path.join(out,"server.log"));server.stdout.pipe(log);server.stderr.pipe(log);
const ready=new Promise((resolve,reject)=>{server.stdout.on("data",b=>{if(b.toString().includes("Ready"))resolve()});server.on("exit",code=>reject(new Error("Server exited "+code)));server.on("error",reject)});
let browser;
(async()=>{await ready;browser=await chromium.launch({headless:true});
for(const client of ["jag","pvas"])for(const order of ["state-first","index-first"]){
 const page=await browser.newPage({viewport:{width:1440,height:1000},extraHTTPHeaders:{"x-forwarded-proto":"https"}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 let releaseIndex,releaseState,indexRequested,stateRequested;
 const indexGate=new Promise(r=>releaseIndex=r),stateGate=new Promise(r=>releaseState=r);
 const indexSeen=new Promise(r=>indexRequested=r),stateSeen=new Promise(r=>stateRequested=r);
 const index=[{cptid:3,name:"ZZTEST Target",lifetime:30,gifts:2,largest:20,last:"2026-01-01",years:2,band:"",capMin:100000,ds:"DS2",capacity:"$100K",solicitor:"Lead",solicitor2:"Second"},{cptid:2,name:"ZZTEST Ordinary",lifetime:5,gifts:1,largest:5,last:"2026-01-01",years:1,band:"",capMin:100000}];
 await page.route("**/api/**",async route=>{
  const url=route.request().url();let data={};
  if(url.includes("-data-records")){indexRequested();await indexGate;data={index};}
  else if(url.includes("-data-v2")){stateRequested();await stateGate;data={gifts:[],prospects:[],batches:[],updates:[{id:1,cptid:4,field:"merged_into",new_value:"3"},{id:2,cptid:8,field:"merged_into",new_value:"999"}]};}
  else if(url.includes("-data-tracking"))data={prospects:{},activity:[],pirs:{},removed:[]};
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)});
 });
 await page.goto(`http://localhost:${port}/dev/assignment-loading-qa?client=${client}&tab=Prospects`,{waitUntil:"domcontentloaded"});
 await Promise.all([indexSeen,stateSeen]);await page.getByText("Loading donor records and effective assignments...",{exact:true}).waitFor();
 const first=order==="state-first"?"-data-v2":"-data-records";
 const response=page.waitForResponse(r=>r.url().includes(first));(order==="state-first"?releaseState:releaseIndex)();await response;
 assert.equal(await page.getByRole("heading",{name:"High Wealth prospects",exact:true}).count(),0,"hold display while either authoritative source is pending");
 (order==="state-first"?releaseIndex:releaseState)();
 await page.getByRole("heading",{name:"High Wealth prospects",exact:true}).waitFor();
 await page.getByRole("cell",{name:"ZZTEST Target",exact:true}).waitFor();
 assert.equal(await page.getByRole("cell",{name:"ZZTEST MergeSource",exact:true}).count(),0);
 assert.equal(await page.getByRole("cell",{name:"ZZTEST MissingTargetSource",exact:true}).count(),0,"missing survivor remains excluded");
 const target=page.getByRole("row").filter({has:page.getByRole("cell",{name:"ZZTEST Target",exact:true})});
 assert.ok((await target.innerText()).includes("$30"),"merged row uses folded giving, never partial source total");
 assert.ok(!(await page.locator("body").innerText()).includes("Something went wrong"));
 assert.ok(!(await page.locator("body").innerText()).includes("Cannot read properties of null"));
 assert.deepEqual(errors,[]);
 const necessary=page.getByRole("button",{name:"Necessary Only",exact:true});if(await necessary.isVisible())await necessary.click();
 await page.screenshot({path:path.join(out,`${client}-${order}.png`),fullPage:true});
 console.log(`PASS actual ${client} rendering ${order}: loading gate, folded giving, missing target excluded, no render error`);await page.close();
}
fs.writeFileSync(path.join(out,"result.json"),JSON.stringify({passed:true,clients:["jag","pvas"],orders:["state-first","index-first"],externalApiRequests:0},null,2));console.log("ARTIFACTS "+out);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();try{process.kill(-server.pid,"SIGTERM")}catch{}fs.unlinkSync(fixture);fs.rmdirSync(dir);log.end()});
