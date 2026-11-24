import { NextRequest } from 'next/server';
import { body, COOKIE, origin } from '@/lib/sa-sponsorship/security.server';
import { getRoster, memberFor, responses, saveAnswer } from '@/lib/sa-sponsorship/store.server';
import { failure, json } from '@/lib/sa-sponsorship/http.server';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{const member=await memberFor(req.cookies.get(COOKIE)?.value),roster=await getRoster();return json({roster,member:{id:member.id,name:member.name,email:member.email},responses:await responses(member.id,roster)});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{origin(req);const member=await memberFor(req.cookies.get(COOKIE)?.value);return json({receipt:await saveAnswer(member,await body(req))});}catch(e){return failure(e);}}
