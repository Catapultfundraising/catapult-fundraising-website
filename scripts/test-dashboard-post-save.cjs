// Actual React DOM mounted provider/form and paired CRM hook. All transport is fictional.
// Install jsdom outside repo; QA_JSDOM_MODULE=/path/to/jsdom node scripts/test-dashboard-post-save.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {JSDOM}=require(process.env.QA_JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'https://fictional.invalid',pretendToBeVisual:true});
for(const k of ['window','document','localStorage','sessionStorage','Event','MouseEvent','HTMLElement','HTMLInputElement'])global[k]=dom.window[k];
for(const key of ['Node','NodeFilter','Element','CustomEvent','MutationObserver','HTMLButtonElement','HTMLFormElement','HTMLSelectElement','HTMLTextAreaElement','HTMLAnchorElement','HTMLFieldSetElement'])global[key]=dom.window[key];
global.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client');
const cache=new Map(),rootDir=process.cwd(); let canonical=false;
function load(file){
 if(cache.has(file))return cache.get(file).exports;
 const m={exports:{}};cache.set(file,m);
 const req=name=>{
  if(name==='react')return React;
  if(name==='lucide-react')return {X:()=>null};
  if(name.includes('pvas-canonical'))return {pvasCanonicalEnabled:c=>canonical&&c==='pvas'};
  if(name==='@/components/dashboard-shared')return {
   DateInput:p=>React.createElement('input',{'data-date':true,value:p.value,onChange:e=>p.onChange(e.target.value)}),
   NameLink:p=>p.name,isoToUs:s=>s?"11/25/2026":"",parseUsDateClient:s=>!s?'':/^\d\d\/\d\d\/\d{4}$/.test(s)?'2026-11-25':null,
   useSort:rows=>({sorted:rows}),SortTh:p=>React.createElement('th',{},p.label),
  };
  if(name==='@/components/ui/dialog')return load('components/ui/dialog.tsx');
  if(name.startsWith('@/components/'))return new Proxy({},{get:()=>()=>null});
  const candidate=name.startsWith('@/')?path.join(rootDir,name.slice(2)):name.startsWith('.')?path.resolve(path.dirname(path.join(rootDir,file)),name):null;
  if(candidate)for(const ext of ['.ts','.tsx'])if(fs.existsSync(candidate+ext))return load(path.relative(rootDir,candidate+ext));
  return require(name);
 };
 let source=fs.readFileSync(file,'utf8');
 if(file==='components/portal-v2.tsx')source+='\nexport {GiftForm,AllGifts,useV2};';
 const js=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('module','exports','require',js)(m,m.exports,req);return m.exports;
}
const {PortalV2Provider,GiftForm,AllGifts,useV2,useCampaignDataStatus}=load('components/portal-v2.tsx');
const {useCurrentCrmRead}=load('components/use-current-crm-read.ts');
const ready=load('lib/dashboard-ready.client.ts');
let observed,crm,mode='ok',generation=1,writes=0,reads=0,flagged=false,root,release;
function Observer(){observed=useV2();const status=useCampaignDataStatus();return React.createElement('output',{'data-status':true},status.available?'available':'unavailable');}
function Crm({client}){const [index,setIndex]=React.useState(null),[tracking,setTracking]=React.useState(null),[loading,setLoading]=React.useState(true);useCurrentCrmRead(client,setIndex,setTracking,setLoading);crm={index,tracking,loading};return null;}
function bundle(){return {generation:'fictional-'+generation,index:[{cptid:101,name:'Fictional donor'}],tracking:{prospects:{},revision:'strict-pair-'+generation},state:{configured:true,dashboardGeneration:'fictional-'+generation,dashboardFreshness:{verifiedAt:generation*10000,stale:false},goal:1000,prospects:[],updates:[],batches:[],gifts:[{id:1,cptid:101,donor_name:'Fictional donor',kind:'gift',amount:0.52,gift_date:'2026-11-25',source:'manual'}]}};}
global.fetch=async(url,init)=>{
 if(init?.method==='POST'){if(JSON.parse(init.body).op==='matchDonor')return Response.json({matches:[]});writes++;mode='failed';return Response.json({ok:true},{headers:flagged?{'X-Dashboard-Refresh':'unconfirmed','X-Dashboard-Refresh-After':'15000'}:{}});}
 reads++;const capturedMode=mode,capturedBundle=bundle();if(release===true)await new Promise(r=>release=r);
 if(capturedMode==='failed')return Response.json({error:'Fictional ready outage'},{status:503});
 if(capturedMode==='malformed')capturedBundle.state.dashboardGeneration='different';
 if(capturedMode==='configured-false')capturedBundle.state.configured=false;
 if(capturedMode==='state-error')capturedBundle.state.error='Fictional source failure';
 if(capturedMode==='stale')capturedBundle.state.dashboardFreshness.stale=true;
 return Response.json(capturedBundle);
};
const tick=()=>new Promise(r=>setImmediate(r));
async function flush(fn=()=>{}){await act(async()=>{await fn();await tick();});}
async function mount(client){root=createRoot(document.getElementById('root'));await flush(()=>root.render(React.createElement(PortalV2Provider,{client},React.createElement(Crm,{client}),React.createElement(Observer),React.createElement(GiftForm),React.createElement(AllGifts))));}
async function input(selector,value){await flush(()=>{const el=document.querySelector(selector);assert.ok(el,selector);Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
function button(text){return [...document.querySelectorAll('button')].find(b=>b.textContent===text);}
async function main(){
 for(const client of ['wcbhc','csnf','jag','baq','imas','pvas']){
  canonical=false;mode='ok';generation=1;writes=0;flagged=client==='imas';ready.invalidateDashboardReady(client);await mount(client);
  assert.equal(observed.state.configured,true);assert.equal(crm.index.length,1);
  // Deliberate base reproducer first: confirmed SQL receipt then unavailable paired ready.
  await input('[placeholder="Donor name *"]','Fictional donor');await input('[placeholder="CPTID (if known)"]','101');await input('[placeholder="Amount *"]','.52');await input('[data-date]','11/25/2026');
  await flush(()=>{button('Save').click();button('Save').click();});
  assert.equal(writes,1);assert.equal(observed.state.configured,true,'last-good body must survive successful save then failed ready');
  assert.equal(crm.index.length,1,'failed refresh retains the entire prior CRM pair');assert.equal(crm.tracking.revision,'strict-pair-1');assert.equal(crm.loading,false);
  assert.match(document.body.textContent,/Saved/);assert.match(document.body.textContent,/last (good|validated)|retained view/i);
  assert.match(document.body.textContent,/\$0\.52/,'exact gift history shows cents');
  assert.ok(button('Retry dashboard read'),'read-only recovery is explicit');assert.ok(button('Save').matches(':disabled'),'stale data cannot be used for another write');
  await flush(()=>button('Retry dashboard read').click());assert.equal(writes,1,'retry never replays mutation');assert.equal(observed.state.configured,true);
  if(flagged){mode='ok';generation=1;await flush(()=>button('Retry dashboard read').click());assert.ok(button('Save').matches(':disabled'),'old verifiedAt cannot clear unconfirmed receipt barrier');assert.match(document.body.textContent,/SQL save committed/);}
  mode='ok';generation=2;const before=reads;await flush(()=>button('Retry dashboard read').click());
  assert.equal(reads,before+1,'one coordinated whole-pair read');assert.equal(writes,1);assert.equal(observed.state.dashboardGeneration,'fictional-2');assert.equal(crm.index.dashboardGeneration,'fictional-2');assert.ok(!button('Save').matches(':disabled'));
  await flush(()=>root.unmount());console.log('PASS mounted',client,'save receipt / failed ready / retained pair / blocked repeat / GET-only recovery / cents');
 }
 // A real Radix edit dialog is open BEFORE the ready failure; its portal lives
 // under body, outside the disabled fieldset. The common write boundary must hold it.
 mode='ok';canonical=false;writes=0;localStorage.setItem('portal-v2-by','Fictional editor');ready.invalidateDashboardReady('wcbhc');await mount('wcbhc');
 await flush(()=>button('Edit').click());assert.ok(document.querySelector('[role=dialog]'));assert.equal(document.querySelector('[role=dialog]').closest('fieldset'),null,'real Radix portal escapes fieldset');
 mode='failed';await flush(()=>observed.reload());assert.ok(button('Save changes'));await flush(()=>button('Save changes').click());assert.equal(writes,0,'open portal cannot POST a mutation on retained state');assert.match(document.body.textContent,/Dashboard view is not current/);
 const action=load('lib/portal-v2/pvas-action.client.ts');
 assert.equal((await action.pvasActionFetch('wcbhc','/api/wcbhc-data-v2',{method:'POST',body:JSON.stringify({op:'matchDonor',name:'Fictional'})})).status,200,'read-only lookup remains allowed');
 for(const client of ['wcbhc','csnf','jag','baq','imas','pvas']){await flush(()=>ready.invalidateDashboardReady(client));const response=await action.pvasActionFetch(client,`/api/${client}-data-tracking`,{method:'POST',body:JSON.stringify({type:'activity',cptid:101})});assert.equal(response.status,409);}
 assert.equal(writes,0,'record-modal sibling tracking mutations held for all six clients');
 const native=load('lib/portal-v2/pvas-native-mutation.client.ts');
 await assert.rejects(native.submitCampaignChange('/api/pvas-data-v2',{}),/Dashboard view is not current/);
 assert.equal(sessionStorage.length,0,'blocked native submit creates no phantom pending intent');
 await flush(()=>root.unmount());console.log('PASS actual open Radix portal + all-six tracking boundary held; matchDonor still read-only');
 // Mounted late-pre-save read cannot overwrite a failed post-save boundary.
 mode='ok';generation=1;ready.invalidateDashboardReady('wcbhc');await mount('wcbhc');
 release=true;const old=ready.loadDashboardReady('wcbhc').catch(()=>{});await tick();const unblock=release;release=false;
 mode='failed';await flush(()=>observed.reload());unblock();await flush(()=>old);
 assert.equal(observed.state.dashboardGeneration,'fictional-1');assert.equal(ready.dashboardReadStatus('wcbhc'),'failed');assert.ok(button('Save').matches(':disabled'));
 await flush(()=>root.unmount());console.log('PASS mounted late pre-save success cannot clear failed post-save boundary');
 // Server may explicitly return a validated but stale last-good generation.
 mode='stale';ready.invalidateDashboardReady('wcbhc');await mount('wcbhc');assert.equal(observed.state.configured,true);assert.ok(button('Save').matches(':disabled'));await flush(()=>root.unmount());
 for(const failure of ['configured-false','state-error']){mode=failure;ready.invalidateDashboardReady('wcbhc');await mount('wcbhc');assert.equal(observed.state,null);assert.equal(crm.index,null);await flush(()=>root.unmount());}
 // No last-good data at initial failure. Recovery must still be accessible.
 mode='failed';ready.invalidateDashboardReady('wcbhc');await mount('wcbhc');assert.equal(observed.state,null);assert.equal(crm.index,null);assert.equal(document.querySelector('[data-status]').textContent,'unavailable');assert.ok(button('Retry dashboard read'));await flush(()=>root.unmount());
 // Canonical PVAS availability and malformed generation guards remain strict.
 canonical=true;mode='ok';ready.invalidateDashboardReady('pvas');await mount('pvas');assert.match(document.body.textContent,/New gift entry is unavailable/);assert.ok(!button('Save'));await flush(()=>root.unmount());
 mode='malformed';ready.invalidateDashboardReady('pvas');await assert.rejects(ready.loadDashboardReady('pvas'),/Incomplete ready/);
 console.log('PASS initial failure has no invented data; canonical PVAS create disabled; generation mismatch rejected');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>dom.window.close());
