import { NextRequest } from 'next/server';
import { body, COOKIE, origin } from '@/lib/sa-sponsorship/security.server';
import { getRoster, getPresentation, memberFor, responses, saveAnswer } from '@/lib/sa-sponsorship/store.server';
import { memberPresentation } from '@/lib/sa-sponsorship/presentation.server';
import { failure, json } from '@/lib/sa-sponsorship/http.server';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{const member=await memberFor(req.cookies.get(COOKIE)?.value),roster=await getRoster();const visible=memberPresentation(roster,await getPresentation(roster));const allowed=new Set(visible.prospects.map(p=>p.id));return json({roster:visible,member:{id:member.id,name:member.name,email:member.email},responses:(await responses(member.id,roster)).filter(r=>allowed.has(r.prospectId)||r.prospectId==='other-companies')});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{origin(req);const member=await memberFor(req.cookies.get(COOKIE)?.value);return json({receipt:await saveAnswer(member,await body(req))});}catch(e){return failure(e);}}
