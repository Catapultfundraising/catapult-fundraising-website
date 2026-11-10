// Local synthetic shared-component QA. Install playwright + esbuild outside the repo,
// then set OUTCOME_QA_MODULES=/tmp/outcome-qa/node_modules. No deployed APIs or donor data.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const qa=createRequire(path.join(process.env.OUTCOME_QA_MODULES||'/tmp/outcome-qa/node_modules','fixture.js'));
const {chromium}=qa('playwright'),esbuild=qa('esbuild');
const root=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-outcomes-')),out=process.env.OUTCOME_CAPTURE_DIR||path.join(dir,'captures');
fs.mkdirSync(out,{recursive:true});
const base=process.env.OUTCOME_BASE_COMPONENT;
(async()=>{
 const entry=`import React from 'react'; import {createRoot} from 'react-dom/client';
 import {OutcomeSection,ContactSection} from '${root}/components/record-tools';
 ${base?`import {ContactSection as BeforeContact} from '${base}';`:'const BeforeContact=ContactSection;'}
 const root=createRoot(document.getElementById('root')); window.saved=0; window.requests=[];
 window.fetch=async(url,options)=>{window.requests.push({url,body:JSON.parse(options.body)}); if(window.delaySave) await new Promise(r=>window.finishSave=r); if(window.failSave) return new Response('{}',{status:500}); return new Response('{}',{status:200});};
 window.renderFixture=(client='jag',id=123,outcome={value:'',note:''},before=false)=>{
  const r={cptid:id,name:'Fixture donor',contact:{street:'123 Example Street',city:'Fixture City',state:'NV',zip:'00000',phone:'555-0100',email:'fixture@example.test'},outcome};
  root.render(<main className="mx-auto max-w-3xl p-8"><p className="mb-2 text-xs uppercase tracking-wider">Synthetic QA fixture · {client.toUpperCase()}</p><h1 className="mb-5 font-display text-2xl">Fixture donor · CPTID {id}</h1><div className="space-y-4">{!before&&<OutcomeSection client={client} r={r} onSaved={()=>window.saved++}/>}{before?<BeforeContact client={client} r={r} onSaved={()=>{}}/>:<ContactSection client={client} r={r} onSaved={()=>{}}/>}</div></main>);
 }; window.renderFixture();`;
 fs.writeFileSync(path.join(dir,'fixture.tsx'),entry);
 await esbuild.build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:true,outfile:path.join(dir,'bundle.js'),jsx:'automatic',nodePaths:[path.join(root,'node_modules')],plugins:[{name:'fixture-nav',setup(build){build.onResolve({filter:/^@\/components\/dashboard-shared$/},()=>({path:'nav',namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const useRecordNav=()=>null',loader:'js'}));}}]});
 execFileSync(path.join(root,'node_modules/.bin/tailwindcss'),['-i',path.join(root,'app/globals.css'),'-o',path.join(dir,'style.css'),'--content',`${root}/components/record-tools.tsx,${root}/components/dashboard-shared.tsx,${dir}/fixture.tsx`],{stdio:'pipe'});
 fs.writeFileSync(path.join(dir,'index.html'),'<html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 const server=http.createServer((req,res)=>{const p=path.join(dir,req.url==='/'?'index.html':req.url.slice(1));if(!fs.existsSync(p)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1000,height:1000},deviceScaleFactor:1});let errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByLabel('Outcome',{exact:true}).waitFor().catch(async e=>{console.error(errors,await page.content());throw e});
  await page.evaluate(()=>window.renderFixture('jag',123,{value:'',note:''},true));await page.getByRole('heading',{name:'Contact',exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'before.png'),fullPage:true});
  for(const client of ['jag','csnf','pvas','wcbhc','baq']) {
   await page.evaluate(c=>window.renderFixture(c,123),client);await page.getByText(`Synthetic QA fixture · ${client.toUpperCase()}`,{exact:true}).waitFor();
   const select=page.getByLabel('Outcome',{exact:true});await select.waitFor();assert.equal(await select.inputValue(),'');assert.equal(await select.count(),1);
   assert.equal(await page.getByRole('button',{name:'Save outcome',exact:true}).isDisabled(),true);
   await select.selectOption('Other');await page.getByRole('button',{name:'Save outcome',exact:true}).click();await page.getByRole('status').filter({hasText:'Enter your name'}).waitFor();
   await page.getByLabel('Your name').fill('Fixture Staff');await page.getByRole('button',{name:'Save outcome',exact:true}).click();await page.getByRole('status').filter({hasText:'short explanation'}).waitFor();
   const note=page.getByLabel('Explanation for Other (required)');assert.equal(await note.getAttribute('maxlength'),'300');await note.fill('Fixture explanation');
   await page.getByRole('button',{name:'Save outcome',exact:true}).click();await page.getByRole('status').filter({hasText:'Outcome saved.'}).waitFor();
   const request=await page.evaluate(()=>window.requests.at(-1));assert.equal(request.url,`/api/${client}-data-v2`);assert.equal(request.body.cptid,123);assert.equal(request.body.note,'Fixture explanation');
   await page.getByRole('button',{name:'Clear outcome',exact:true}).click();assert.equal(await select.inputValue(),'');assert.equal(await note.count(),0);await page.getByRole('button',{name:'Save outcome',exact:true}).click();await page.getByRole('status').filter({hasText:'Outcome saved.'}).waitFor();
   assert.equal((await page.evaluate(()=>window.requests.at(-1))).body.value,'');assert.equal((await page.evaluate(()=>window.requests.at(-1))).body.note,'');
   console.log(`PASS rendered ${client}: exactly one shared dropdown, initially blank, required attribution/Other, note limit, save and clear payload`);
  }
  await page.evaluate(()=>window.renderFixture('jag',123,{value:'Other',note:'Fixture explanation'}));await page.getByLabel('Explanation for Other (required)').waitFor();
  await page.screenshot({path:path.join(out,'after-other.png'),fullPage:true});
  await page.evaluate(()=>window.renderFixture('jag',123));await page.getByLabel('Outcome',{exact:true}).selectOption('Moved');
  await page.evaluate(()=>{window.delaySave=true;window.saved=0});await page.getByRole('button',{name:'Save outcome',exact:true}).click();await page.getByRole('button',{name:'Saving...'}).waitFor();
  await page.evaluate(()=>window.renderFixture('jag',456));await page.getByRole('heading',{name:'Fixture donor · CPTID 456'}).waitFor();
  assert.equal(await page.getByLabel('Outcome',{exact:true}).inputValue(),'');
  await page.evaluate(()=>window.finishSave());await page.evaluate(()=>new Promise(requestAnimationFrame));assert.equal(await page.evaluate(()=>window.saved),0,'late save cannot reload a different record');assert.equal(await page.getByLabel('Outcome',{exact:true}).count(),1);
  await page.evaluate(()=>window.renderFixture('csnf',456));await page.getByLabel('Your name').fill('Fixture Other Staff');assert.equal(await page.getByLabel('Outcome',{exact:true}).inputValue(),'');
  assert.equal(await page.getByLabel('Outcome',{exact:true}).count(),1);assert.equal(await page.getByRole('heading',{name:'Contact',exact:true}).count(),1);
  await page.evaluate(()=>{window.delaySave=false;window.failSave=true});await page.getByLabel('Outcome',{exact:true}).selectOption('Deceased');await page.getByRole('button',{name:'Save outcome',exact:true}).click();await page.getByRole('status').filter({hasText:'Save not confirmed'}).waitFor();
  await page.evaluate(()=>{window.failSave=false;window.delaySave=true;window.saved=0});
  await page.getByRole('button',{name:'Save outcome',exact:true}).click();await page.getByRole('button',{name:'Saving...'}).waitFor();
  await page.evaluate(()=>window.renderFixture('pvas',456));await page.getByText('Synthetic QA fixture · PVAS',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Outcome',{exact:true}).inputValue(),'');
  await page.evaluate(()=>window.finishSave());await page.evaluate(()=>new Promise(requestAnimationFrame));
  assert.equal(await page.evaluate(()=>window.saved),0,'late save cannot reload a different client with the same CPTID');
  assert.equal(await page.getByLabel('Outcome',{exact:true}).count(),1);
  assert.equal(await page.getByRole('heading',{name:'Contact',exact:true}).count(),1);
  await page.evaluate(()=>window.renderFixture('pvas',456,{value:'Other',note:'Reloaded fixture explanation'}));
  await page.getByLabel('Explanation for Other (required)').waitFor();assert.equal(await page.getByLabel('Outcome',{exact:true}).inputValue(),'Other');
  assert.equal(await page.getByLabel('Explanation for Other (required)').inputValue(),'Reloaded fixture explanation');
  console.log('PASS delayed-save record/client isolation, same-CPTID client switch, reloaded props, no duplicate siblings, failed-save uncertainty');
  await page.evaluate(()=>{window.failSave=false;window.renderFixture('jag',123)});await page.getByRole('heading',{name:'Fixture donor · CPTID 123'}).waitFor();
  await page.screenshot({path:path.join(out,'after-blank.png'),fullPage:true});
  await page.setViewportSize({width:390,height:1000});await page.screenshot({path:path.join(out,'after-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log(`PASS browser console clean; captures ${out}`);
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
