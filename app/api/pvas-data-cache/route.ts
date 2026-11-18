import { NextRequest, NextResponse } from "next/server";
import { isPvasDataAuthed } from "@/lib/pvas-data-auth";
import { invalidatePvasDataCache } from "@/lib/pvas-data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The dashboard's "Reload current SQL view" link calls this first, so Reload always reads SQL fresh.
export async function POST(req: NextRequest) {
  if (!(await isPvasDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await invalidatePvasDataCache();
  return NextResponse.json({ ok: true });
}
