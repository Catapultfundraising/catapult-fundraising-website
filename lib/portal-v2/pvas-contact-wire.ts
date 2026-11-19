export type CanonicalScalar = string | number | boolean | null;
export type PvasContactProfile = {
  cptid: number; clientId: string | null; presence: Record<string, unknown>;
  fields: Record<string, CanonicalScalar>; extras: Record<string, unknown>;
  identity: { isProspect: boolean; deleted: boolean; deleteReason: string | null; mergedInto: number | null; version: number; createdBy: string | null; createdAt: string | null };
};
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
export function pvasContactProfile(raw: unknown, cptid: number): PvasContactProfile {
  if (!object(raw) || raw.cptid !== cptid || !object(raw.fields) || !object(raw.extras) || !object(raw.identity) || !object(raw.presence)) throw new Error("Canonical raw contact profile unavailable");
  for (const value of Object.values(raw.fields)) if (value !== null && !["string","number","boolean"].includes(typeof value) || typeof value === "number" && !Number.isFinite(value)) throw new Error("Invalid canonical contact scalar");
  for(const field of typed)if(!Object.hasOwn(raw.fields,field))throw new Error("Incomplete canonical contact field projection");
  const i=raw.identity;
  if(typeof i.deleted!=="boolean"||typeof i.isProspect!=="boolean"||typeof i.version!=="number"||!Number.isInteger(i.version)||i.version<0||
    !(i.mergedInto===null||typeof i.mergedInto==="number"&&Number.isInteger(i.mergedInto)&&i.mergedInto>0&&i.mergedInto<=2147483647)||i.mergedInto===cptid)
    throw new Error("Invalid canonical contact identity metadata");
  return raw as unknown as PvasContactProfile;
}
const typed = new Set("fullName firstName middleName lastName street street2 city state zip phone phone2 email email2 spouseFirstName spouseMiddleName spouseLastName ask primarySolicitor secondarySolicitor phone3 phone4 dsRating wealthCapacity majorGiftScore realEstate stock status outcome".split(" "));
/** From the exact profile shown when editor opened, NOT a newly fetched current
 * row at save time. Preserve expected NULL vs empty vs absent extension. */
export function pvasContactChanges(profile: PvasContactProfile, values: Record<string, unknown>) {
  return Object.entries(values).map(([field,value]) => {
    const owner = typed.has(field) ? profile.fields : profile.extras;
    const present = Object.hasOwn(owner, field);
    if (typed.has(field) && !present) throw new Error("Canonical expected field missing; reload");
    return { field, expected: present ? owner[field] : null, value, ...(!typed.has(field) ? { expectedPresent: present } : {}) };
  }).filter(change => change.expectedPresent === false || !Object.is(change.expected, change.value));
}
export function pvasIdentityCommand(profile:PvasContactProfile, action:"deleteRecord"|"restoreRecord"|"unmerge", reason?:unknown) {
  const {deleted,deleteReason,mergedInto,version}=profile.identity;
  const expected={deleted,deleteReason,mergedInto,version};
  const value={deleted,deleteReason,mergedInto};
  if(action==="deleteRecord"){
    if(typeof reason!=="string"||!reason.trim()||reason.length>500)throw new Error("Enter a deletion reason (at most500 characters)");
    value.deleted=true;value.deleteReason=reason;
  }else if(action==="restoreRecord"){value.deleted=false;value.deleteReason=null;}
  else value.mergedInto=null;
  return {operation:"contact-state",cptid:profile.cptid,expected,value};
}
export function pvasProspectChanges(profile:PvasContactProfile, input:Record<string,unknown>){
  if(!profile.identity.isProspect)throw new Error("Canonical record is not a manually created prospect");
  const values:Record<string,unknown>={};
  const aliases:Record<string,string>={address1:"street",name:"fullName",first:"firstName",last:"lastName"};
  for(const[key,value]of Object.entries(input))if(key!=="clientId"){
    const field=aliases[key]??key;
    if(Object.hasOwn(values,field)&&!Object.is(values[field],value))throw new Error("Conflicting contact aliases");
    values[field]=value;
  }
  return {operation:"contact-prospect-edit",cptid:profile.cptid,changes:pvasContactChanges(profile,values),
    ...(Object.hasOwn(input,"clientId")?{clientId:{expected:profile.clientId,value:input.clientId}}:{})};
}
export function pvasMergeStates(profiles:Record<string,unknown>,keep:number,merge:number[]){
  if(!Number.isInteger(keep)||keep<1||keep>2147483647||!Array.isArray(merge)||!merge.length||merge.length>=500||
    new Set([keep,...merge]).size!==merge.length+1)throw new Error("Choose distinct canonical identities (at most499 duplicates)");
  return [keep,...merge].map(id=>{
    const p=pvasContactProfile(profiles[String(id)],id),{deleted,deleteReason,mergedInto,version}=p.identity;
    if(deleted||mergedInto!==null)throw new Error("Reload unmerged, undeleted identities before merging");
    return {cptid:id,expected:{deleted,deleteReason,mergedInto,version},value:{deleted,deleteReason,mergedInto:id===keep?null:keep}};
  });
}

/** Minimal read-only dashboard ask owner. Never an editor/expected-state profile. */
export type PvasCanonicalAsk = { cptid: number; ask: number | null };
export function pvasCanonicalAsk(raw: unknown, cptid: number): PvasCanonicalAsk {
  const profile = pvasContactProfile(raw, cptid), ask = profile.fields.ask;
  if (!Object.hasOwn(profile.fields, "ask") || ask !== null && (typeof ask !== "number" || !Number.isFinite(ask)))
    throw new Error("Invalid raw canonical ask");
  return { cptid, ask };
}
/** Rich internal indexes retain full profiles; HTTP indexes carry only the
 * validated raw ask. A present malformed compact owner never falls back. */
export function pvasIndexAsk(row: unknown, cptid: number): PvasCanonicalAsk {
  if (!object(row) || !Object.hasOwn(row, "_canonicalAsk"))
    return pvasCanonicalAsk(object(row) ? row._canonicalContact : undefined, cptid);
  const raw = row._canonicalAsk;
  if (!object(raw) || raw.cptid !== cptid || Object.keys(raw).length !== 2 || !Object.hasOwn(raw, "ask") ||
    raw.ask !== null && (typeof raw.ask !== "number" || !Number.isFinite(raw.ask)))
    throw new Error("Invalid raw canonical ask projection");
  return { cptid, ask: raw.ask };
}
