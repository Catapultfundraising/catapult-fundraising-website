// Deterministic controller races: no network, real timers, SDK, data or credentials.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,f);
const {ProspectAutosave}=require('../lib/sa-sponsorship/autosave.ts');
let timerId=0;const timers=new Map(),originalSet=global.setTimeout,originalClear=global.clearTimeout;
global.setTimeout=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;};global.clearTimeout=id=>timers.delete(id);
const tick=()=>Promise.resolve().then(()=>Promise.resolve());
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const ack=op=>({...op,memberId:'member',savedAt:'2026-11-24T12:00:00.000Z'});
(async()=>{
 let sent=[],receipts=[],hold=deferred();
 const save=new ProspectAutosave('member','sample-1','version',undefined,op=>{sent.push({...op});return sent.length===1?hold.promise:Promise.resolve(ack(op));},r=>receipts.push(r));
 await save.flush();assert.equal(sent.length,0,'untouched companies never create answers');
 save.edit({choice:'A'},true);assert.equal(sent.length,1);assert.equal(save.saving,true);
 save.edit({comment:'one'});save.edit({comment:'two'});save.edit({choice:'C'},true);
 assert.equal(sent.length,1,'one serialized pending operation');assert.equal(save.draft.comment,'two','typing remains editable during saves');assert.equal(sent[0].comment,'');assert.equal(sent[0].choice,'A');
 const wait=save.flush();hold.resolve(ack(sent[0]));await wait;
 assert.equal(sent.length,2);assert.equal(sent[1].revision,2);assert.equal(sent[1].comment,'two');assert.equal(sent[1].choice,'C');assert.equal(save.dirty,false);assert.equal(save.phase,'saved');
 assert.notEqual(sent[0].operationId,sent[1].operationId);assert.equal(receipts.length,2);
 // Debounce resets to 600ms and notes can save with no selected role.
 sent=[];const notes=new ProspectAutosave('member','sample-2','version',undefined,async op=>{sent.push({...op});return ack(op);},()=>{});
 notes.edit({comment:'draft'});notes.edit({comment:'latest note'});assert.equal(sent.length,0);assert.equal(timers.size,1);const timer=Array.from(timers.values())[0];assert.equal(timer.ms,600);timers.clear();timer.fn();await notes.flush();
 assert.equal(sent.length,1);assert.equal(sent[0].choice,'');assert.equal(sent[0].comment,'latest note');
 notes.edit({comment:''});await notes.flush();assert.equal(sent[1].choice,'');assert.equal(sent[1].comment,'');assert.equal(sent[1].revision,2,'explicit note clearing persisted');
 // Failure keeps immutable first operation; edited latest text waits behind exact replay.
 sent=[];let fail=true;const failed=new ProspectAutosave('member','sample-3','version',undefined,async op=>{sent.push({...op});if(fail)throw Error('Save unavailable');return ack(op);},()=>{});
 failed.edit({comment:'original pending'});await assert.rejects(failed.flush());const pending={...failed.pending};assert.equal(failed.phase,'error');
 failed.edit({comment:'new text kept while retry pending'});failed.edit({choice:'B'},true);assert.equal(sent.length,1,'no infinite automatic error retries');assert.deepEqual(failed.pending,pending);
 fail=false;await failed.flush();assert.deepEqual(sent[1],pending,'same operation ID/revision/body for ambiguous retry');assert.equal(sent[2].comment,'new text kept while retry pending');assert.equal(sent[2].choice,'B');assert.equal(sent[2].revision,2);assert.equal(failed.error,'');
 // A mismatched acknowledgement is ambiguous, not permission to move on.
 let corrupt=true;const mismatch=new ProspectAutosave('member','sample-4','version',undefined,async op=>({...ack(op),memberId:corrupt?'someone-else':'member'}),()=>{});
 mismatch.edit({choice:'D'});await assert.rejects(mismatch.flush());assert.equal(mismatch.dirty,true);const exactId=mismatch.pending.operationId;corrupt=false;await mismatch.flush();assert.equal(mismatch.receipt.operationId,exactId);
 // While a navigation flush awaits, a later edit is drained before its promise resolves.
 sent=[];hold=deferred();const navigation=new ProspectAutosave('member','sample-5','version',undefined,op=>{sent.push({...op});return sent.length===1?hold.promise:Promise.resolve(ack(op));},()=>{});
 navigation.edit({comment:'before navigation'});const navigationWait=navigation.flush();navigation.edit({comment:'last edit before leaving'});hold.resolve(ack(sent[0]));await navigationWait;assert.equal(navigation.receipt.comment,'last edit before leaving');assert.equal(navigation.dirty,false);
 for(const c of [save,notes,failed,mismatch,navigation])c.dispose();assert.equal(timers.size,0);
 console.log('PASS: serialized autosave, 600ms debounce, coalesced editable drafts, note-only/clearing, immutable retries, ack validation and navigation drain races.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{global.setTimeout=originalSet;global.clearTimeout=originalClear;});
