import 'server-only';
import { NextResponse } from 'next/server';
import { ReviewError } from './schema';
import { PRIVATE_HEADERS } from './security.server';
export const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:PRIVATE_HEADERS});
export function failure(e:unknown) { return json({error:e instanceof ReviewError?e.message:'The private review is temporarily unavailable. Your unsaved edits have not been cleared.'},e instanceof ReviewError?e.status:503); }
