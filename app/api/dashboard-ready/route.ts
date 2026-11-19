import { cacheTtlMs } from "@/lib/pvas-shared-cache.server";
import { NextRequest, NextResponse } from "next/server";
import { readyClient, readyPayload } from "@/lib/dashboard-ready.server";
import { isPvasDataAuthed } from "@/lib/pvas-data-auth";
import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { isJagDataAuthed } from "@/lib/jag-data-auth";
import { isWcbhcDataAuthed } from "@/lib/wcbhc-data-auth";
import { isBaqDataAuthed } from "@/lib/baq-data-auth";
export const runtime = "nodejs", dynamic = "force-dynamic", maxDuration = 300;
const AUTH = { pvas: isPvasDataAuthed, csnf: isCsnfDataAuthed, jag: isJagDataAuthed, wcbhc: isWcbhcDataAuthed, baq: isBaqDataAuthed };
export async function GET(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client");
  if (!readyClient(client)) return NextResponse.json({ error: "Unknown dashboard" }, { status: 400 });
  if (!await AUTH[client](req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (cacheTtlMs() === 0 || !(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID))
    return NextResponse.json({ mode: "uncached" }, { headers: { "Cache-Control": "no-store" } });
  try { return NextResponse.json(await readyPayload(client, req.nextUrl.searchParams.get("known")), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Complete ready view unavailable; reload to retry" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
