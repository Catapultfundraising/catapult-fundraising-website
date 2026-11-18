"use client";
import {useEffect,useState}from"react";
import {pvasCanonicalEnabled}from"@/lib/portal-v2/pvas-canonical";
import {pvasImportPlan,pvasImportReceipt,type PvasImportPlan,type PvasImportReceipt}from"@/lib/portal-v2/pvas-import-wire";
type Pending={requestId:string;payloadHash:string;operation:"import-direct"|"import-monthly"};
/** Separate canonical review/recovery owner. Original bytes stay memory-only;
 * durable storage contains request/hash only. An uncertain action is never
 * cleared or automatically retried, including after browser reload. */
export function usePvasImportReview(client:string,kind:"direct"|"monthly",call:(body:unknown)=>Promise<unknown>,refresh:()=>Promise<void>,reset:()=>void){
  const enabled=pvasCanonicalEnabled(client),key=`pvas-canonical-${kind}-pending`;
  const [plan,setPlan]=useState<PvasImportPlan|null>(null),[file,setFile]=useState<unknown>(null),[pending,setPending]=useState<Pending|null>(null);
  const [receipt,setReceipt]=useState<PvasImportReceipt|null>(null),[busy,setBusy]=useState(false),[approved,setApproved]=useState(false),[message,setMessage]=useState("");
  useEffect(()=>{
    setPending(null);setReceipt(null);setPlan(null);setFile(null);
    if(!enabled)return;
    try{const raw=localStorage.getItem(key);if(raw){const p=JSON.parse(raw);if(!/^[a-f0-9]{32}$/.test(p.requestId)||!/^[a-f0-9]{64}$/.test(p.payloadHash)||p.operation!==`import-${kind}`)throw Error();setPending(p);}}
    catch{setMessage("Saved import identity unavailable. Do not submit another file; reconcile original request.");setBusy(true);}
  },[enabled,key,kind]);
  const invalidate=()=>{setPlan(null);setFile(null);setApproved(false);};
  const preview=(raw:unknown,file:unknown)=>{
    if(pending)throw new Error("Reconcile the original import first");
    const id=(file as {requestId:string}).requestId,p=pvasImportPlan(raw,id);
    setPlan(p);setFile(structuredClone(file));setApproved(false);setMessage("Review all canonical changes and held rows. Preview has not saved data.");
  };
  const accept=async(raw:unknown,p:Pending)=>{
    const r=pvasImportReceipt(raw,p);setReceipt(r);setMessage("Canonical SQL receipt confirmed. Dashboard refresh is separate.");
    try{await refresh();}catch{setMessage("SQL receipt confirmed; dashboard refresh unavailable. Keep receipt and refresh the dashboard, not the import.");}
  };
  async function commit(){
    if(!plan||!approved||!file||pending||plan.held.length)return;
    const p:Pending={requestId:plan.requestId,payloadHash:plan.payloadHash,operation:`import-${kind}`};
    try{localStorage.setItem(key,JSON.stringify(p));}catch{setMessage("Cannot retain original request identity. Nothing submitted.");return;}
    setPending(p);setBusy(true);setMessage("Submitting ONCE. If uncertain, check original status; never resend.");
    try{await accept(await call({op:"commit",file,approval:{confirm:true,payloadHash:plan.payloadHash,planHash:plan.planHash}}),p);}
    catch{setMessage("UNCONFIRMED. Keep original requestId and check status. Do not resend or create another request.");}
    finally{setBusy(false);}
  }
  async function status(){
    if(!pending)return;setBusy(true);
    try{
      const raw=await call({op:"status",requestId:pending.requestId}) as Record<string,unknown>;
      if(raw?.v!==1||raw.requestId!==pending.requestId)throw Error();
      if(raw.status==="committed")await accept(raw.receipt,pending);
      else if(["pending","not-found","legacy"].includes(String(raw.status)))setMessage(raw.status==="legacy"?"Archived original import found. Reconcile its original receipt; it will not be submitted as a new canonical import.":"Not committed yet is NOT rollback proof. Retain original ID; do not resend.");
      else throw Error();
    }catch{setMessage("Status unavailable/unconfirmed. Keep original ID; no automatic retry.");}finally{setBusy(false);}
  }
  const panel=enabled?<div className="mt-4 space-y-3 border-t pt-3">
    {plan&&!pending&&<><h4 className="font-semibold">Canonical change review</h4><p className="text-sm">New contacts {plan.batch.newRows.length} · Field groups {plan.batch.updates.length} · Notes {plan.batch.notes.length} · Gifts {plan.batch.gifts.length} · Held {plan.held.length}. Any held row prevents the entire commit.</p>
      <details open><summary>Exact expected/current values and proposed changes</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({batch:plan.batch,held:plan.held,metadata:plan.metadata,links:plan.links},null,2)}</pre></details>
      <label className="block text-sm"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)} disabled={busy||!!plan.held.length}/> I reviewed these exact changes and approve this whole transaction.</label>
      <button type="button" disabled={busy||!approved||!!plan.held.length} onClick={()=>void commit()} className="rounded bg-[rgb(var(--navy))] px-4 py-2 text-sm text-white disabled:opacity-50">Commit reviewed canonical transaction once</button></>}
    {pending&&<><p className="break-all text-xs">Original request: {pending.requestId}</p><button type="button" disabled={busy} onClick={()=>void status()} className="rounded border px-3 py-2 text-sm">Check original canonical request status</button></>}
    {receipt&&<><details><summary>Confirmed canonical receipt</summary><pre className="max-h-60 overflow-auto text-xs">{JSON.stringify(receipt,null,2)}</pre></details><button type="button" onClick={()=>{localStorage.removeItem(key);setPending(null);setReceipt(null);invalidate();reset();setMessage("Previous receipt confirmed. Ready for a distinct next import.");}} className="rounded border px-3 py-2 text-sm">Finish confirmed import</button></>}
    {message&&<p role="status" className="text-sm">{message}</p>}
  </div>:null;
  return {enabled,locked:busy||!!pending,preview,invalidate,panel,plan};
}
