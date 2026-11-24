import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { body, configured, COOKIE, identity, origin, token } from '@/lib/sa-sponsorship/security.server';
import { memberFor, saveMember, throttleLogin } from '@/lib/sa-sponsorship/store.server';
import { failure, json } from '@/lib/sa-sponsorship/http.server';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{const m=await memberFor(req.cookies.get(COOKIE)?.value);return json({member:{id:m.id,name:m.name,email:m.email}});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{origin(req);const {secret}=configured();const ip=process.env.VERCEL ? (req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim() : 'local';await throttleLogin(createHmac('sha256',secret).update(`sa-login:${ip}`).digest('hex'));const member=await saveMember(identity(await body(req)));const res=json({member:{id:member.id,name:member.name,email:member.email}});res.cookies.set(COOKIE,token(member),{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:30*86400});return res;}catch(e){return failure(e);}}
export async function DELETE(req:NextRequest){try{origin(req);configured();const res=json({ok:true});res.cookies.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:0});return res;}catch(e){return failure(e);}}
