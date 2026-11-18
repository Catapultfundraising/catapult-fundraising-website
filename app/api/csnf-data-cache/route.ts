import { NextRequest, NextResponse } from "next/server";
import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { invalidateLive } from "@/lib/client-live-data.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The dashboard's "Reload current SQL view" link calls this first, so Reload always reads SQL fresh.
export async function POST(req: NextRequest) {
  if (!(await isCsnfDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await invalidateLive("csnf");
  return NextResponse.json({ ok: true });
}
