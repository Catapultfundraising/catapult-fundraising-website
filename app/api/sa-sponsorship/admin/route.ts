import { NextRequest } from 'next/server';
import { admin, body, origin } from '@/lib/sa-sponsorship/security.server';
import { exportReview, importRoster } from '@/lib/sa-sponsorship/store.server';
import { failure, json } from '@/lib/sa-sponsorship/http.server';
export const runtime='nodejs'; export const dynamic='force-dynamic';export const maxDuration=300;
export async function GET(req:NextRequest){try{admin(req);return json(await exportReview());}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{origin(req);admin(req);return json(await importRoster(await body(req,4000000)));}catch(e){return failure(e);}}
