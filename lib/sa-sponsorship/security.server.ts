import 'server-only';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { ReviewError, UUID, email, keys, object, text, type Member } from './schema';
export const COOKIE='sa_sponsorship_member';
export const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export function equal(a:string,b:string) { const x=Buffer.from(hash(a)), y=Buffer.from(hash(b)); return timingSafeEqual(x,y); }
export function previewOnly() {
 const production=process.env.VERCEL_ENV === 'production' || (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview');
 if(production && process.env.SA_SPONSORSHIP_ENABLED !== 'true') throw new ReviewError('This review is not open yet.',503);
 if(process.env.VERCEL_ENV === 'preview' && process.env.SA_SPONSORSHIP_PREVIEW_ENABLED !== 'true') throw new ReviewError('This private preview is not enabled.',503);
}
export function configured() { previewOnly(); const secret=process.env.BOARD_REVIEW_SECRET || process.env.RESEARCH_AUTH_SECRET; const code=process.env.SA_SPONSORSHIP_ACCESS_CODE; if (!secret || !code) throw new ReviewError('Review access is not configured.',503); return {secret,code}; }
function signature(body:string) { return createHmac('sha256',configured().secret).update(`sa-sponsorship-v1:${body}`).digest('hex'); }
export function token(member:Member) { const body=`${member.id}.${member.identityHash}.${Math.floor(Date.now()/1000)+30*86400}`; return `${body}.${signature(body)}`; }
export function verifyToken(value:string|undefined) { configured(); if (!value || value.length>300) return null; const p=value.split('.'); if(p.length!==4 || !UUID.test(p[0]) || !/^[a-f0-9]{64}$/.test(p[1]) || !/^\d{10}$/.test(p[2]) || Number(p[2])<=Date.now()/1000 || Number(p[2])>Date.now()/1000+31*86400 || !equal(p[3],signature(p.slice(0,3).join('.')))) return null; return {id:p[0],identityHash:p[1]}; }
export function identity(input:unknown):Member { const o=object(input); keys(o,['name','email','code']); const {code}=configured(); if (!equal(text(o.code,200,true),code)) throw new ReviewError('Access code not recognized.',401); const name=text(o.name,150,true).trim(), address=email(o.email,true).trim(); return {id:randomUUID(),name,email:address,identityHash:hash(JSON.stringify([name,address.toLowerCase()])),createdAt:new Date().toISOString()}; }
export function origin(req:NextRequest) { const supplied=req.headers.get('origin'); if (!supplied || supplied !== new URL(req.url).origin || req.headers.get('sec-fetch-site')==='cross-site') throw new ReviewError('Same-origin request required.',403); }
export function admin(req:NextRequest) { configured(); const secret=process.env.CRON_SECRET; if (!secret || !equal(req.headers.get('authorization')||'',`Bearer ${secret}`)) throw new ReviewError('Unauthorized.',401); }
export const PRIVATE_HEADERS={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export async function body(req:NextRequest,max=16000) {
 if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new ReviewError('JSON content type required.',415);
 const reader=req.body?.getReader(); if(!reader)throw new ReviewError('Invalid JSON.'); const chunks:Uint8Array[]=[]; let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>max){await reader.cancel();throw new ReviewError('Request too large.',413);}chunks.push(part.value);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{throw new ReviewError('Invalid JSON.');}
}
