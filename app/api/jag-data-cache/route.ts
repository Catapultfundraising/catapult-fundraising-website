import { NextRequest, NextResponse } from "next/server";
import { isJagDataAuthed } from "@/lib/jag-data-auth";
import { invalidateLive } from "@/lib/client-live-data.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The dashboard's "Reload current SQL view" link calls this first, so Reload always reads SQL fresh.
export async function POST(req: NextRequest) {
  if (!(await isJagDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await invalidateLive("jag");
  return NextResponse.json({ ok: true });
}
