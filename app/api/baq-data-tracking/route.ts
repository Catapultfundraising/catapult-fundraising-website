import { NextRequest, NextResponse } from "next/server";
import { isBaqDataAuthed } from "@/lib/baq-data-auth";
import { getBaqTracking, saveBaqTracking } from "@/lib/baq-tracking";
import { PROSPECT_STATUSES, type ProspectStatus } from "@/lib/baq-tracking-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isBaqDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getBaqTracking(), { headers: { "Cache-Control": "no-store" } });
}

const clean = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);

// POST { type: "status", cptid, status, level?, solicitor?, reason?, by }
//      { type: "activity", cptid, date, kind, note, by }
// Every status change is also written to the activity history, never overwritten.
export async function POST(req: NextRequest) {
  if (!(await isBaqDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const cptid = Number(b?.cptid);
  const by = clean(b?.by, 80);
  if (!b || !Number.isInteger(cptid) || cptid <= 0) return NextResponse.json({ error: "bad cptid" }, { status: 400 });
  if (!by) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  const t = await getBaqTracking();
  const now = new Date().toISOString();
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  if (b.type === "status") {
    const status = clean(b.status, 40) as ProspectStatus;
    if (!PROSPECT_STATUSES.includes(status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
    const level = Number(b.level) > 0 ? Math.round(Number(b.level)) : undefined;
    const prev = t.prospects[cptid];
    const st = { status, level, solicitor: clean(b.solicitor, 120) || undefined, reason: clean(b.reason, 500) || undefined, updatedAt: now, by };
    t.prospects[cptid] = st;
    const parts = [`Status: ${prev?.status ?? "none"} → ${status}`];
    if (level !== prev?.level) parts.push(`Gift level: ${level ? `$${level.toLocaleString("en-US")}` : "auto"}`);
    if (st.solicitor !== prev?.solicitor) parts.push(`Solicitor: ${st.solicitor ?? "none"}`);
    if (st.reason) parts.push(`Reason: ${st.reason}`);
    t.activity.push({ id, cptid, date: now.slice(0, 10), kind: "Committee update", note: parts.join(" · "), by, at: now });
  } else if (b.type === "activity") {
    const note = clean(b.note);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : now.slice(0, 10);
    if (!note) return NextResponse.json({ error: "Please enter a note" }, { status: 400 });
    t.activity.push({ id, cptid, date, kind: clean(b.kind, 40) || "Note", note, by, at: now });
  } else {
    return NextResponse.json({ error: "bad type" }, { status: 400 });
  }
  await saveBaqTracking(t);
  return NextResponse.json(t);
}
