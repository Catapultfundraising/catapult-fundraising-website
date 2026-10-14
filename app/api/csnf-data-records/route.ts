import { NextRequest, NextResponse } from "next/server";
import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { getCsnfRecords } from "@/lib/csnf-data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?id=<CPTID> -> one full donor record; no id -> the lookup index.
export async function GET(req: NextRequest) {
  if (!(await isCsnfDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await getCsnfRecords();
  if (!data) return NextResponse.json({ error: "records not loaded" }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const rec = data.records[id];
    return rec ? NextResponse.json(rec) : NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ asOf: data.asOf, index: data.index }, { headers: { "Cache-Control": "private, max-age=300" } });
}
