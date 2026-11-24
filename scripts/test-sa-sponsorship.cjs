// Bounded, hermetic route/security tests: no real Blob, network, SQL or contacts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript'),{randomBytes,randomUUID,createHash}=require('node:crypto');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const ledger=new Map(),original=Module._load,listCalls=[];let lost=false,unavailable=false;
const digest=value=>createHash('sha256').update(value).digest('hex');
let raceConditional=false,conditionalWrites=0,unstableHead=false,headReads=0;
class BlobNotFoundError extends Error{}
class BlobPreconditionFailedError extends Error{}
Module._load=function(name,parent,main){if(name==='server-only')return {};if(name==='@vercel/blob')return {BlobNotFoundError,BlobPreconditionFailedError,head:async key=>{headReads++;return {pathname:key,size:Buffer.byteLength(ledger.get(key)),etag:unstableHead&&headReads%2===0?'changed-canonical-etag':digest(ledger.get(key))};},get:async key=>{if(unavailable)throw Error('private provider failure');return ledger.has(key)?{statusCode:200,stream:new Response(ledger.get(key)).body,blob:{etag:'W/"'+digest(ledger.get(key))+'"',pathname:key}}:null;},put:async(key,value,opts)=>{assert.equal(opts.access,'private');assert.equal(opts.addRandomSuffix,false);if(opts.ifMatch){conditionalWrites++;if(raceConditional){raceConditional=false;ledger.set(key,ledger.get(key)+' ');}if(!ledger.has(key)||opts.ifMatch!==digest(ledger.get(key)))throw Object.assign(new BlobPreconditionFailedError('fixture secret should never be returned'),{status:412});}else{assert.equal(opts.allowOverwrite,false);if(ledger.has(key))throw Error('create conflict');}ledger.set(key,typeof value==='string'?value:Buffer.from(value).toString('utf8'));if(lost)throw Error('lost acknowledgment');},list:async({prefix,cursor})=>{listCalls.push(prefix);const all=[...ledger.keys()].filter(k=>k.startsWith(prefix)).sort(),n=Number(cursor||0);return {blobs:all.slice(n,n+2).map(pathname=>({pathname})),hasMore:n+2<all.length,cursor:String(n+2)};}};if(name.startsWith('@/'))name=path.join(process.cwd(),name.slice(2));return original.call(this,name,parent,main);};
global.fetch=async()=>{throw Error('network forbidden');};
const {NextRequest}=require('next/server'),schema=require('../lib/sa-sponsorship/schema.ts'),security=require('../lib/sa-sponsorship/security.server.ts'),store=require('../lib/sa-sponsorship/store.server.ts'),session=require('../app/api/sa-sponsorship/session/route.ts'),review=require('../app/api/sa-sponsorship/review/route.ts'),admin=require('../app/api/sa-sponsorship/admin/route.ts'),fixture=require('./sa-sponsorship-fixture.cjs');
const request=(route,body,headers={},method=body===undefined?'GET':'POST')=>new NextRequest(`https://review.example/api/sa-sponsorship/${route}`,{method,headers:{origin:'https://review.example','content-type':'application/json',...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
const body=async r=>{assert.equal(r.headers.get('cache-control'),'private, no-store, max-age=0');assert.equal(r.headers.get('referrer-policy'),'no-referrer');return r.json();};
(async()=>{
 process.env.VERCEL_ENV='preview';process.env.SA_SPONSORSHIP_PREVIEW_ENABLED='true';process.env.BLOB_STORE_ID='fixture';delete process.env.SA_SPONSORSHIP_ACCESS_CODE;delete process.env.BOARD_REVIEW_SECRET;delete process.env.RESEARCH_AUTH_SECRET;
 assert.equal((await review.GET(request('review'))).status,503);assert.equal(ledger.size,0);
 process.env.SA_SPONSORSHIP_ACCESS_CODE=randomBytes(24).toString('hex');process.env.BOARD_REVIEW_SECRET=randomBytes(32).toString('hex');process.env.CRON_SECRET=randomBytes(32).toString('hex');
 delete process.env.SA_SPONSORSHIP_PREVIEW_ENABLED;assert.equal((await review.GET(request('review'))).status,503);process.env.SA_SPONSORSHIP_PREVIEW_ENABLED='true';assert.equal((await review.GET(request('review'))).status,401);assert.equal((await admin.GET(request('admin'))).status,401);
 const authorization=`Bearer ${process.env.CRON_SECRET}`;
 assert.equal((await admin.POST(request('admin',fixture,{authorization,origin:'https://evil.example'}))).status,403);
 for(const bad of [{...fixture,prospects:[{...fixture.prospects[0],id:'../bad'}]},{...fixture,checkedAt:'2026-02-30'},{...fixture,prospects:[{...fixture.prospects[0],website:'javascript:alert(1)'}]}])assert.equal((await admin.POST(request('admin',bad,{authorization}))).status,400);
 fixture.prospects[0].emailStatus='Completed: Apollo verified work email';
 assert.equal((await admin.POST(request('admin',fixture,{authorization}))).status,200);
 assert.ok(!ledger.get(store.prefix()+'rosters/'+fixture.version+'.json').includes('Apollo'),'imports redact provider source labels before persistence');
 assert.equal((await admin.POST(request('admin',fixture,{authorization}))).status,200,'same import idempotent');
 assert.equal((await admin.POST(request('admin',{...fixture,checkedAt:'2026-11-22'},{authorization}))).status,409);
 const login={name:'Sample Member',email:'member@example.com',code:process.env.SA_SPONSORSHIP_ACCESS_CODE};
 assert.equal((await session.POST(request('session',login,{origin:'https://evil.example'}))).status,403);
 assert.equal((await session.POST(request('session',{...login,code:'wrong'}))).status,401);
 assert.equal((await session.POST(request('session',{...login,name:''}))).status,400);
 const first=await session.POST(request('session',login));assert.equal(first.status,200);const cookie=first.headers.get('set-cookie');for(const flag of ['HttpOnly','Secure','SameSite=strict'])assert.ok(cookie.includes(flag));const c1=cookie.split(';')[0],id1=(await body(first)).member.id;
 const second=await session.POST(request('session',login));const c2=second.headers.get('set-cookie').split(';')[0],id2=(await body(second)).member.id;assert.notEqual(id1,id2,'same email never recovers another identity');
 const r1=await body(await review.GET(request('review',undefined,{cookie:c1})));assert.equal(r1.roster.prospects.length,12);assert.equal(r1.responses.length,0);assert.equal(r1.member.id,id1);
 assert.equal((await review.GET(request('review',undefined,{cookie:c1+'tampered'}))).status,401);
 const rawToken=c1.split('=')[1];assert.equal(security.verifyToken(decodeURIComponent(rawToken)).id,id1);
 const op={operationId:randomUUID(),rosterVersion:fixture.version,prospectId:'sample-1',revision:1,choice:'A',comment:'Sample introduction'};
 const snapshot=[...ledger.entries()];
 for(const bad of [{...op,prospectId:'unlisted'},{...op,memberId:id2},{...op,choice:'X'},{...op,comment:'x'.repeat(2001)},{...op,revision:1.2},{...op,revision:3},{...op,rosterVersion:'wrong'}])assert.ok((await review.POST(request('review',{...bad,operationId:randomUUID()},{cookie:c1}))).status>=400);
 for(const [k,v]of snapshot)assert.equal(ledger.get(k),v,'old objects unchanged');
 assert.equal((await review.POST(request('review',op,{cookie:c1,origin:'https://evil.example'}))).status,403);
 assert.equal((await review.POST(request('review',JSON.stringify(op),{cookie:c1,'content-type':'text/plain'}))).status,415);
 assert.equal((await review.POST(request('review','x'.repeat(17000),{cookie:c1}))).status,413);
 assert.equal((await review.POST(request('review','{',{cookie:c1}))).status,400);
 listCalls.length=0;lost=true;const ack=await body(await review.POST(request('review',op,{cookie:c1})));lost=false;assert.ok(listCalls.every(p=>p.endsWith('/answers/'+id1+'/sample-1/')),'save history is scoped to one member and prospect');assert.equal(ack.receipt.choice,'A');assert.equal(ack.receipt.memberId,id1);assert.ok(Date.parse(ack.receipt.savedAt));
 assert.deepEqual((await body(await review.POST(request('review',op,{cookie:c1})))).receipt,ack.receipt,'exact replay stable');
 assert.equal((await review.POST(request('review',{...op,comment:'changed actual body'},{cookie:c1}))).status,409);
 assert.equal((await review.POST(request('review',{...op,operationId:randomUUID(),choice:'B'},{cookie:c1}))).status,409,'revision cannot overwrite');
 const copyBefore=[...ledger.entries()];
 const op2={...op,operationId:randomUUID(),revision:2,choice:'C'},op2b={...op,operationId:randomUUID(),revision:2,choice:'D'};
 const concurrent=await Promise.all([review.POST(request('review',op2,{cookie:c1})),review.POST(request('review',op2b,{cookie:c1}))]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 for(const [k,v]of copyBefore)assert.equal(ledger.get(k),v,'all prior receipts/identity rows unchanged');
 const mine=await body(await review.GET(request('review',undefined,{cookie:c1})));assert.equal(mine.responses.length,2);assert.equal((await body(await review.GET(request('review',undefined,{cookie:c2})))).responses.length,0,'own answers only');
 const exported=await body(await admin.GET(request('admin',undefined,{authorization})));assert.equal(exported.schemaVersion,1);assert.equal(exported.members.length,2);assert.equal(exported.responses.length,2);assert.ok(!JSON.stringify(exported).includes('identityHash'));
 unavailable=true;const fail=await review.GET(request('review',undefined,{cookie:c1}));assert.equal(fail.status,503);assert.ok(!(await fail.text()).includes('private provider'));unavailable=false;
 for(let i=0;i<60;i++)assert.equal((await session.POST(request('session',{...login,code:'bad'}))).status,401,'full 64-attempt board-size allowance');assert.equal((await session.POST(request('session',login))).status,429,'persistent rate limit');

 const labels=require('../lib/sa-sponsorship/source-labels.server.ts');
 for(const [input,expected]of [['Completed: Apollo verified work email','Completed: verified work email'],['(Apollo)',''],['Apollo organization record','company record'],['Apollo enrichment not run: no approved suitable candidate selected','no suitable named contact verified'],['no Apollo person match','no matching contact found'],['Apollo-reported','research-reported'],['Apollo/provider-reported','research-provider-reported'],['aPoLlO supplemental source','research provider supplemental source'],['https://app.apollo.io/contact/123',''],['https://www.apollo.io/',''],['https://example.com/Apollo','https://example.com/Apollo']])assert.equal(labels.sourceLabel(input),expected);
 const rosterKey=store.prefix()+'rosters/'+fixture.version+'.json',legacy=JSON.parse(JSON.stringify(fixture));
 legacy.prospects[0].emailStatus='Completed: Apollo verified work email';legacy.prospects[0].phoneStatus='Apollo-reported direct line';legacy.prospects[0].officePhone='+1 (202) 555-0100 (Apollo organization record)';legacy.prospects[0].contactFit='Apollo enrichment not run: no approved suitable candidate selected';legacy.prospects[0].contactSource='https://app.apollo.io/contact/123';legacy.prospects[0].portals[0].source='Apollo/provider-reported';
 const originalRaw=JSON.stringify(legacy,null,2)+'\n';ledger.set(rosterKey,originalRaw);
 const unchanged=new Map([...ledger.entries()].filter(([k])=>k!==rosterKey));
 const migratedRequest={action:'redact-source-labels',operationId:randomUUID(),expectedRawDigest:digest(originalRaw)};
 const cleanExport=await admin.GET(request('admin',undefined,{authorization}));assert.equal(cleanExport.headers.get('x-sa-roster-raw-sha256'),digest(originalRaw));const cleaned=await body(cleanExport);assert.deepEqual(Object.keys(cleaned).sort(),['members','prospects','responses','rosterVersion','schemaVersion']);assert.ok(!JSON.stringify(cleaned.prospects).toLowerCase().includes('apollo'));
 const memberExport=await body(await review.GET(request('review',undefined,{cookie:c1})));assert.ok(!JSON.stringify(memberExport.roster).toLowerCase().includes('apollo'));
 for(const field of ['id','organization','contactName','title','email','directPhone','website'])assert.equal(memberExport.roster.prospects[0][field],legacy.prospects[0][field]);
 assert.equal((await admin.PATCH(request('admin',migratedRequest,{},'PATCH'))).status,401);
 assert.equal((await admin.PATCH(request('admin',migratedRequest,{authorization,origin:'https://evil.example'},'PATCH'))).status,403);
 assert.equal((await admin.PATCH(request('admin',{...migratedRequest,arbitraryRoster:legacy},{authorization},'PATCH'))).status,400);
 assert.equal((await admin.PATCH(request('admin',{...migratedRequest,expectedRawDigest:'0'.repeat(64)},{authorization},'PATCH'))).status,409);assert.equal(conditionalWrites,0);
 // Stable canonical HEAD proof rejects metadata races before creating any audit/write.
 const beforeUnstable=[...ledger.entries()];headReads=0;unstableHead=true;
 assert.equal((await admin.PATCH(request('admin',migratedRequest,{authorization},'PATCH'))).status,409);
 unstableHead=false;assert.deepEqual([...ledger.entries()],beforeUnstable);assert.equal(conditionalWrites,0);
 // A changed ETag fails closed, retains concurrent bytes and writes no completion receipt.
 raceConditional=true;const failedPatch=await admin.PATCH(request('admin',migratedRequest,{authorization},'PATCH'));assert.equal(failedPatch.status,409);const safeFailure=await body(failedPatch);assert.deepEqual(safeFailure.diagnostic,{stage:'conditional-put',code:'BlobPreconditionFailedError',httpStatus:412,etagFormat:'bare'});assert.ok(!JSON.stringify(safeFailure).includes('fixture secret'));assert.equal(ledger.get(rosterKey),originalRaw+' ');
 assert.ok(!ledger.has(store.prefix()+'source-redactions/'+migratedRequest.operationId+'/receipt.json'));
 // Fresh digest/operation after operator rereads the conflict; lost acknowledgement resolved by exact bytes.
 const accepted={...migratedRequest,operationId:randomUUID(),expectedRawDigest:digest(ledger.get(rosterKey))};
 lost=true;const migrationResult=await admin.PATCH(request('admin',accepted,{authorization},'PATCH'));lost=false;assert.equal(migrationResult.status,200);const receipt=await body(migrationResult);assert.equal(receipt.originalRawDigest,accepted.expectedRawDigest);assert.equal(receipt.redactedRawDigest,digest(ledger.get(rosterKey)));assert.ok(!ledger.get(rosterKey).toLowerCase().includes('apollo'));
 const backup=JSON.parse(ledger.get(store.prefix()+'source-redactions/'+accepted.operationId+'/original.json'));assert.equal(digest(Buffer.from(backup.rawBytes,'base64')),accepted.expectedRawDigest);assert.equal(Buffer.from(backup.rawBytes,'base64').toString(),originalRaw+' ');
 const afterMigration=[...ledger.entries()];assert.deepEqual(await body(await admin.PATCH(request('admin',accepted,{authorization},'PATCH'))),receipt);assert.deepEqual([...ledger.entries()],afterMigration,'exact migration replay creates no writes');
 assert.equal((await admin.PATCH(request('admin',{...accepted,expectedRawDigest:'f'.repeat(64)},{authorization},'PATCH'))).status,409);
 for(const [k,v]of unchanged)assert.equal(ledger.get(k),v,'all members, answers, operations and pre-existing non-roster objects unchanged');
 assert.equal((await admin.POST(request('admin',{...fixture,checkedAt:'2026-11-21'},{authorization}))).status,409,'arbitrary import remains immutable');
 process.env.VERCEL_ENV='production';process.env.SA_SPONSORSHIP_ENABLED='true';assert.equal((await admin.PATCH(request('admin',accepted,{authorization},'PATCH'))).status,403);delete process.env.SA_SPONSORSHIP_ENABLED;process.env.VERCEL_ENV='preview';

 // Additive blank choice means notes only, never an inferred Other; historical keys stay exact.
 const notes={operationId:randomUUID(),rosterVersion:fixture.version,prospectId:'sample-2',revision:1,choice:'',comment:'Sample notes without a selected role'};
 const initialBlank={...notes,operationId:randomUUID(),prospectId:'sample-3',comment:''};
 assert.equal((await review.POST(request('review',initialBlank,{cookie:c1}))).status,400,'initial blank no-op rejected');
 const noteReceipt=await body(await review.POST(request('review',notes,{cookie:c1})));assert.equal(noteReceipt.receipt.choice,'');
 assert.deepEqual(await body(await review.POST(request('review',notes,{cookie:c1}))),noteReceipt,'note-only exact replay');
 const clearNotes={...notes,operationId:randomUUID(),revision:2,comment:''};assert.equal((await review.POST(request('review',clearNotes,{cookie:c1}))).status,200,'explicit clearing of existing note-only draft');
 const chooseRole={...notes,operationId:randomUUID(),revision:3,choice:'B'};assert.equal((await review.POST(request('review',chooseRole,{cookie:c1}))).status,200,'notes to actual role uses next revision');
 assert.equal((await review.POST(request('review',{...notes,operationId:randomUUID(),revision:4,choice:'unknown'},{cookie:c1}))).status,400);
 const noteHistory=(await body(await review.GET(request('review',undefined,{cookie:c1})))).responses.filter(r=>r.prospectId==='sample-2');assert.deepEqual(noteHistory.map(r=>[r.revision,r.choice,r.comment]),[[1,'',notes.comment],[2,'',''],[3,'B',notes.comment]]);

 const presentation=require('../lib/sa-sponsorship/presentation.server.ts');
 for(const phone of ['+1 202-555-0100','+1 202-555-0100; +1 202-555-0101','+44 123 456 789','+44 123 456 7890','+1 202-555-0100 (company record)','(202) 555-0100 (original file; not reverified)','202-555-0100 (published office line)','+1-202-555-0100 (published office line)','+44 1 2345 6789 (company record)'])assert.equal(presentation.usablePhone(phone),true,phone);
 for(const phone of ['', '2026','2026-11-24','Checked 2026-11-24','Not verified: 2025550100','https://example.com/2025550100','(company record 2026)','+1234567890123456','202 555 (not verified)'])assert.equal(presentation.usablePhone(phone),false,phone);
 // Twenty contact-less Top20 exceptions plus complete and incomplete profiles.
 const displayRoster={...fixture,version:'synthetic-presentation-v1',prospects:Array.from({length:27},(_,i)=>({...fixture.prospects[0],id:'display-'+(i+1),organization:'Sample Display '+(i+1),contactName:i===21?'':i<20?'':'Sample Contact',email:[20,21,23,26].includes(i)?'work@example.com':'',directPhone:[20,21,22,26].includes(i)?'+1 202-555-0100':'',officePhone:[23,24].includes(i)?'(202) 555-0100 (original file; not reverified)':'',portals:[{...fixture.prospects[0].portals[0],email:i===25?'shared@example.com':''}]}))};
 const originalLedger=new Map(ledger);ledger.clear();
 const displayKey=store.prefix()+'rosters/'+displayRoster.version+'.json';ledger.set(displayKey,JSON.stringify(displayRoster));ledger.set(store.prefix()+'active.json',JSON.stringify({version:displayRoster.version}));
 const config={rosterVersion:displayRoster.version,topProspectIds:displayRoster.prospects.slice(0,20).map(p=>p.id)};
 // Existing member has no historical rows tied to this separate synthetic fixture.
 // Previous throttle boundary is full: create a separate private member through
 // the existing store helper, then use its own signed cookie (not staff auth).
 const displayMember=security.identity({...login,email:'display@example.com'});await store.saveMember(displayMember);const displayCookie=security.COOKIE+'='+security.token(displayMember);
 assert.equal((await body(await review.GET(request('review',undefined,{cookie:displayCookie})))).roster.prospects.length,27,'missing config preserves old full view');
 assert.equal((await admin.PUT(request('admin',config,{},'PUT'))).status,401);
 assert.equal((await admin.PUT(request('admin',config,{authorization,origin:'https://evil.example'},'PUT'))).status,403);
 for(const bad of [{...config,rosterVersion:'wrong'},{...config,topProspectIds:config.topProspectIds.slice(1)},{...config,topProspectIds:[...config.topProspectIds.slice(1),'unlisted']},{...config,topProspectIds:[...config.topProspectIds.slice(1),config.topProspectIds[1]]},{...config,extra:true}])assert.equal((await admin.PUT(request('admin',bad,{authorization},'PUT'))).status,400);
 const untouched=new Map([...ledger.entries()]);
 const configured=await admin.PUT(request('admin',config,{authorization},'PUT'));assert.equal(configured.status,200);assert.deepEqual(await body(configured),{rosterVersion:displayRoster.version,topProspectCount:20,visibleProspectCount:22,canonicalProspectCount:27});assert.equal((await admin.PUT(request('admin',config,{authorization},'PUT'))).status,200);
 const alternate={...config,topProspectIds:[...config.topProspectIds.slice(1),'display-21']};assert.equal((await admin.PUT(request('admin',alternate,{authorization},'PUT'))).status,409,'presentation cannot be destructively replaced');
 const beforeExcluded={operationId:randomUUID(),rosterVersion:displayRoster.version,prospectId:'display-24',revision:1,choice:'',comment:'Sample old open page note remains saveable'};
 assert.equal((await review.POST(request('review',beforeExcluded,{cookie:displayCookie}))).status,200,'old open pages can save canonical excluded IDs');
 const view=await body(await review.GET(request('review',undefined,{cookie:displayCookie})));assert.equal(view.roster.prospects.length,22);assert.deepEqual(view.roster.prospects.slice(20).map(p=>p.id),['display-21','display-27'],'only complete named/email/direct profiles qualify beyond Top20');assert.ok(view.roster.prospects.some(p=>p.id==='display-1'),'priority included without contacts');assert.ok(!view.roster.prospects.some(p=>p.id==='display-24'),'missing direct phone excluded despite named work email and office phone');assert.equal(view.responses.length,0,'excluded histories not returned to member');
 for(const id of ['display-22','display-23','display-24','display-25','display-26'])assert.ok(!view.roster.prospects.some(p=>p.id===id),'incomplete or office/shared-only profile excluded: '+id);
 const placeholder={...displayRoster,prospects:displayRoster.prospects.map(p=>p.id==='display-21'?{...p,contactName:'Not verified'}:p)};assert.ok(!presentation.memberPresentation(placeholder,config).prospects.some(p=>p.id==='display-21'),'placeholder is not a named contact');
 // No canonical roster/member/history mutation from configuration installation.
 for(const [k,v]of untouched)assert.equal(ledger.get(k),v);
 // Export with this roster only references this isolated synthetic member.
 const fullDisplayExport=await body(await admin.GET(request('admin',undefined,{authorization})));assert.deepEqual(Object.keys(fullDisplayExport).sort(),['members','prospects','responses','rosterVersion','schemaVersion']);assert.equal(fullDisplayExport.prospects.length,27);assert.equal(fullDisplayExport.responses.length,1,'admin preserves excluded histories');
 const allHistory=await store.responses(displayMember.id,displayRoster);assert.equal(allHistory.length,1);assert.equal(allHistory[0].prospectId,'display-24');
 ledger.clear();for(const [k,v]of originalLedger)ledger.set(k,v);
 const beforeProduction=[...ledger.entries()];process.env.VERCEL_ENV='production';assert.equal((await admin.POST(request('admin',fixture,{authorization}))).status,503);assert.equal((await review.GET(request('review',undefined,{cookie:c1}))).status,503);assert.deepEqual([...ledger.entries()],beforeProduction,'production gate never reads or writes collection');
 assert.ok([...ledger.keys()].every(k=>k.startsWith('sa-sponsorship/v1/preview/')));
 console.log('PASS: access fail-closed, strict import, immutable version, signed/isolated sessions, origin/content/body limits, allowlist, replay/concurrency, lost acknowledgement, append-only history, safe errors, rate limit, private export, source-label sanitization, conditional preview migration/audit/replay and zero production collection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
