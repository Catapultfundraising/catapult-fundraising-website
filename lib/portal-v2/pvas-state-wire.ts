import { displayMoney } from "./pvas-financials";
import {pvasGiftMetadata,countedCampaign}from"./pvas-gift-wire";
import {pvasContactProfile}from"./pvas-contact-wire";
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
/** Historical SQL edit/audit rows can never mask current canonical owners. */
export function canonicalPvasState(raw: Record<string, unknown>,records?:Record<string,unknown>): Record<string, unknown> {
  if (!Array.isArray(raw.updates) || !Array.isArray(raw.gifts) || !Array.isArray(raw.prospects) || !Array.isArray(raw.batches)) throw new Error("Incomplete canonical state");
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
  const otherCanonicalGifts:unknown[]=[];
  const gifts = raw.gifts.flatMap(row => {
    if (!object(row) || !Number.isInteger(row.id) || Number(row.id) <= 0 || Number(row.id) > 2147483647 || typeof row.amount !== "string") throw new Error("Invalid canonical gift identity/amount");
    const meta=pvasGiftMetadata(row._canonicalGift);
    if(meta.gift.giftId!==row.id||meta.gift.cptid!==row.cptid||meta.gift.amount!==row.amount)throw new Error("Canonical gift wire/profile mismatch");
    if(!countedCampaign(meta.gift)){otherCanonicalGifts.push(row);return [];}
    return [{ ...row, amountExact: row.amount, amount: displayMoney(row.amount) }];
  });
  return { ...raw, updates, gifts,otherCanonicalGifts, giftOverrides: [], voidedGifts: raw.voidedGifts ?? [] };
}
