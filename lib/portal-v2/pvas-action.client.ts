import { pvasCanonicalEnabled } from "./pvas-canonical";

const inFlight = new Map<string, Promise<{id:string;at:string;existing:boolean}>>();
/** Identity is generated once per exact logical payload and retained after
 * uncertain responses, including browser reload. Storage contains only a
 * digest and random ID, never donor fields, actor, file contents or raw notes. */
async function identity(scope: string, body: string): Promise<{ key: string; id: string; at:string; existing:boolean }> {
  const bytes = new TextEncoder().encode(`${scope}\0${body}`);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
  const key = `pvas-action-v2:${digest}`;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = Promise.resolve().then(() => {
      // Storage failure HOLDS rather than losing replay identity after reload.
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        const value=JSON.parse(saved);
        if(!value||typeof value.id!=="string"||!/^[a-f0-9]{32}$/.test(value.id)||typeof value.at!=="string"||!Number.isFinite(Date.parse(value.at))||new Date(value.at).toISOString()!==value.at)throw new Error("Invalid saved action identity");
        return {id:value.id,at:value.at,existing:true};
      }
      const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
      const at=new Date().toISOString();
      sessionStorage.setItem(key, JSON.stringify({id,at})); return {id,at,existing:false};
    });
    inFlight.set(key, pending);
  }
  return { key, ...await pending };
}
/** No automatic retry. Reconcile uncertain outcomes with the same requestId.
 * Existing monthly/direct uploads already own their own durable identities. */
export async function pvasActionFetch(client: string, url: string, init: RequestInit): Promise<Response> {
  if (!pvasCanonicalEnabled(client)) return fetch(url, init);
  if (typeof init.body !== "string") throw new Error("Canonical action requires an exact JSON payload");
  const raw: unknown = JSON.parse(init.body);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid canonical action");
  const data = raw as Record<string, unknown>;
  if(["getAsk","matchDonor","duplicates","pirWealth","pvasRequestStatus","nativeGiftPageV2","nativeGiftPageV3","nativeCampaignStatusV3","pvasHistoricalUploads"].includes(String(data.op)))return fetch(url,init);
  if(data.op==="nativeCampaignMutationV3")throw new Error("Use the saved original gift-change request.");
  const action = await identity(url, init.body);
  if (data.requestId !== undefined && data.requestId !== action.id) throw new Error("Conflicting canonical action identity");
  try{
    // A newly entered manual gift's occurrence identity is its durable random
    // action ID, NEVER an amount/date/name tuple. Existing source aliases are
    // left byte-for-byte unchanged for edit/void commands.
    if(data.op==="pvasGift"&&data.command&&typeof data.command==="object"){
      const command=data.command as Record<string,any>;
      if(command.action==="create"&&command.source?.system==="manual"&&command.source.key==="@new-manual-action")
        data.command={...command,source:{system:"manual",key:action.id}};
    }
    if(action.existing){
      const status=await fetch("/api/pvas-data-v2",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({op:"pvasRequestStatus",requestId:action.id})});
      const receipt=await status.json().catch(()=>null);
      if(!status.ok||!receipt||receipt.requestId!==action.id||typeof receipt.found!=="boolean")
        return Response.json({error:"Original action status unavailable. Do not resend; retain this requestId.",requestId:action.id,unconfirmed:true},{status:503});
      if(receipt.pending===true||receipt.legacy===true||receipt.found&&(!receipt.receipt||typeof receipt.receipt!=="object"))
        return Response.json({error:"Original action pending or archived. Retain its requestId and reconcile; do not resend.",requestId:action.id,unconfirmed:true},{status:503});
      if(receipt.found)return Response.json({error:"Original action already committed. Reload the current view before another save.",requestId:action.id,receipt:receipt.receipt},{status:409});
    }
    const response = await fetch(url, { ...init, body: JSON.stringify({ ...data, requestId: action.id,actionAt:action.at }) });
    const result = await response.clone().json().catch(() => null);
    if(response.ok){
      if(!result||result.ok!==true||result.requestId!==action.id||result.error||result.unconfirmed===true)
        return Response.json({error:"Save is unconfirmed. Check the original requestId before retrying.",requestId:action.id,unconfirmed:true},{status:503});
      sessionStorage.removeItem(action.key);
    }
    return response;
  }finally{inFlight.delete(action.key);}
}
