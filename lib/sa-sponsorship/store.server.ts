import 'server-only';
import { get, put, list, BlobNotFoundError } from '@vercel/blob';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { equal, hash, previewOnly, verifyToken } from './security.server';
import { ReviewError, validateOperation, validateRoster, type Member, type Operation, type Receipt, type Roster } from './schema';
// Namespace is chosen by deployment, never by caller input. Production requires explicit launch enablement.
export const prefix=()=>`sa-sponsorship/v1/${process.env.VERCEL_ENV==='production'?'production':process.env.VERCEL_ENV==='preview'?'preview':'local'}/`;
function localDir() { const dir=process.env.SA_SPONSORSHIP_LOCAL_DIR; return !process.env.VERCEL && process.env.NODE_ENV!=='production' && dir && path.isAbsolute(dir) ? dir : null; }
function ready() { previewOnly(); if (!localDir() && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) throw new ReviewError('Private storage is not configured.',503); }
async function read<T>(key:string):Promise<T|null> { ready(); const dir=localDir(); if(dir){try{return JSON.parse(await fs.readFile(path.join(dir,key),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
 try { const r=await get(key,{access:'private',useCache:false}); if(!r)return null; if(r.statusCode!==200||!r.stream)throw new Error('Storage unavailable');return JSON.parse(await new Response(r.stream).text()); }catch(e){if(e instanceof BlobNotFoundError)return null;throw e;}
}
async function create<T>(key:string,value:T,verify:(saved:T)=>void) { const old=await read<T>(key); if(old){verify(old);return old;} try { const dir=localDir(); if(dir){await fs.mkdir(path.dirname(path.join(dir,key)),{recursive:true});await fs.writeFile(path.join(dir,key),JSON.stringify(value),{flag:'wx',mode:0o600});}else{await put(key,JSON.stringify(value),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:false});}return value;}catch(e){const saved=await read<T>(key);if(!saved)throw e;verify(saved);return saved;} }
async function paths(base:string):Promise<string[]> { ready();const dir=localDir(); if(dir){async function walk(key:string):Promise<string[]> {try{const entries=await fs.readdir(path.join(dir!,key),{withFileTypes:true});const all=await Promise.all(entries.map(e=>e.isDirectory()?walk(`${key}${e.name}/`):Promise.resolve([`${key}${e.name}`])));return all.flat();}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}}return walk(base);}
 const out:string[]=[];let cursor:string|undefined; do{const page=await list({prefix:base,cursor,limit:1000});out.push(...page.blobs.map(b=>b.pathname));cursor=page.hasMore?page.cursor:undefined;if(out.length>100000)throw new ReviewError('Export too large.',503);}while(cursor);return out;
}
function same(a:unknown,b:unknown){if(!equal(JSON.stringify(a),JSON.stringify(b)))throw new ReviewError('Conflicting replay. Reload your saved answers before editing.',409);}
export async function importRoster(input:unknown) { const roster=validateRoster(input);
 await create(`${prefix()}rosters/${roster.version}.json`,roster,saved=>same(validateRoster(saved),roster));
 // One immutable active-version pointer for this preview; updates require a new isolated namespace/release.
 await create(`${prefix()}active.json`,{version:roster.version},saved=>same(saved,{version:roster.version})); return {rosterVersion:roster.version};
}
export async function getRoster() { const active=await read<{version:string}>(`${prefix()}active.json`);if(!active||!/^[a-zA-Z0-9_-]{1,80}$/.test(active.version))throw new ReviewError('The review roster is not available yet.',503);const roster=validateRoster(await read(`${prefix()}rosters/${active.version}.json`));if(roster.version!==active.version)throw new Error('Roster mismatch');return roster; }
export async function saveMember(member:Member){await create(`${prefix()}members/${member.id}.json`,member,saved=>same(saved,member));return member;}
export async function memberFor(value:string|undefined){const session=verifyToken(value);if(!session)throw new ReviewError('Please enter the board access code to continue.',401);const member=await read<Member>(`${prefix()}members/${session.id}.json`);if(!member||member.id!==session.id||!equal(member.identityHash,session.identityHash)||!equal(member.identityHash,hash(JSON.stringify([member.name,member.email.toLowerCase()]))))throw new ReviewError('Session unavailable. Sign in again.',401);return member;}
const receiptPath=(m:string,p:string,r:number)=>`${prefix()}answers/${m}/${p}/revision-${String(r).padStart(7,'0')}.json`;
function operation(r:Receipt):Operation{return {operationId:r.operationId,rosterVersion:r.rosterVersion,prospectId:r.prospectId,revision:r.revision,choice:r.choice,comment:r.comment};}
export async function responses(memberId:string,roster:Roster,prospectId?:string) {
 if(prospectId!==undefined&&!roster.prospects.some(p=>p.id===prospectId))throw new ReviewError('Unknown prospect.');
 const base=`${prefix()}answers/${memberId}/${prospectId?`${prospectId}/`:''}`;
 const keys=await paths(base),result:Receipt[]=[];
 for(let i=0;i<keys.length;i+=10){
  const batch=await Promise.all(keys.slice(i,i+10).map(async key=>{
   const r=await read<Receipt>(key);
   if(!r||r.memberId!==memberId||key!==receiptPath(memberId,r.prospectId,r.revision)||(prospectId!==undefined&&r.prospectId!==prospectId)||!Number.isFinite(Date.parse(r.savedAt))||new Date(r.savedAt).toISOString()!==r.savedAt)throw new Error('Receipt invalid');
   validateOperation(operation(r),roster);return r;
  }));result.push(...batch);
 }
 return result.sort((a,b)=>a.revision-b.revision);
}
export async function saveAnswer(member:Member,input:unknown){const roster=await getRoster(),op=validateOperation(input,roster);const base=`${prefix()}operations/${member.id}/${op.operationId}.json`;
 // Claim operation ID immutably before the revision. Hash the actual canonical payload, not caller metadata.
 await create(base,op,saved=>same(saved,op));
 const key=receiptPath(member.id,op.prospectId,op.revision),old=await read<Receipt>(key);
 if(old){same(operation(old),op);return old;}
 const history=await responses(member.id,roster,op.prospectId),latest=history.filter(r=>r.prospectId===op.prospectId).pop();if(op.revision!==(latest?.revision||0)+1)throw new ReviewError('Your saved answer changed. Reload before editing.',409);
 return create<Receipt>(key,{...op,memberId:member.id,savedAt:new Date().toISOString()},saved=>{same(operation(saved),op);if(saved.memberId!==member.id)throw new Error('Receipt owner mismatch');});
}
export async function exportReview(){const roster=await getRoster(),members:Member[]=[],answers:Receipt[]=[];for(const key of await paths(`${prefix()}members/`)){const member=await read<Member>(key);if(!member||key!==`${prefix()}members/${member.id}.json`)throw new Error('Invalid member');members.push(member);answers.push(...await responses(member.id,roster));}return {schemaVersion:1,rosterVersion:roster.version,prospects:roster.prospects,members:members.map(({identityHash:_hash,...m})=>m),responses:answers};}
// Durable, create-only 15-minute buckets: bounded attempts across serverless instances.
// No raw IP is persisted. Failed races fail closed, rather than exceeding the limit.
export async function throttleLogin(clientKey:string) { const bucket=Math.floor(Date.now()/900000); const base=`${prefix()}login-limits/${clientKey}/${bucket}/`; const count=(await paths(base)).length; if(count>=8)throw new ReviewError('Too many access attempts. Please try again in 15 minutes.',429);const nonce=hash(`${Math.random()}-${Date.now()}`);await create(`${base}${count}.json`,{nonce},()=>{throw new ReviewError('Too many access attempts. Please try again in 15 minutes.',429);}); }
