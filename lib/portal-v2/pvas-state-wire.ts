import { campaignPresentationV3, type MixedGiftRecord } from "./pvas-native-v3";
import {pvasContactProfile}from"./pvas-contact-wire";
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
/** Historical SQL edit/audit rows can never mask current canonical owners. */
export function canonicalPvasState(raw: Record<string, unknown>,records?:Record<string,unknown>, nativeCampaign?: MixedGiftRecord[]): Record<string, unknown> {
  if (raw.v !== 3 || raw.stateVersion !== 3 || raw.giftWireVersion !== 3 || !nativeCampaign || ["gifts","giftOverrides","voidedGifts"].some(k=>Object.hasOwn(raw,k)) ||
      !Array.isArray(raw.updates) || !Array.isArray(raw.prospects) || !Array.isArray(raw.batches)) throw new Error("Incomplete current gift state");
  const updates = raw.updates.filter(row => {
    if (!object(row) || typeof row.field !== "string") throw new Error("Invalid canonical state update");
    return !["ask","solicitor","solicitor2","dashboard:outcome",...(records?["merged_into","deleted"]:[])].includes(row.field) && !/^(contact|wealth|ds):/.test(row.field);
  });
  if(records)for(const[key,record]of Object.entries(records)){
    if(!object(record))throw new Error("Invalid canonical record");
    const p=pvasContactProfile(record._canonicalContact,Number(key)),i=p.identity;
    // Compatibility projection of CURRENT contact state, never historical edits.
    if(i.mergedInto!==null)updates.push({id:-2*p.cptid,cptid:p.cptid,field:"merged_into",old_value:null,new_value:String(i.mergedInto)});
    if(i.deleted)updates.push({id:-2*p.cptid-1,cptid:p.cptid,field:"deleted",old_value:null,new_value:i.deleteReason??"Deleted"});
  }
  const campaign = campaignPresentationV3(nativeCampaign);
  // Compatibility presentation is produced only AFTER the complete typed
  // stream is validated. No fabricated backend gifts:[] or mixed amountExact.
  const gifts = campaign.rows.map(({ row, metadata }) => ({ ...row, _nativeGift: metadata }));
  return { ...raw, updates, gifts, nativeCampaignInventory: campaign.inventory };
}
