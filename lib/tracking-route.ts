import { NextRequest, NextResponse } from "next/server";
import { PROSPECT_STATUSES, ACTIVITY_KINDS, type ProspectStatus, type PvasTracking as Tracking } from "@/lib/pvas-tracking-types";
import { logHistoryAudit, parseUsDate } from "@/lib/portal-v2/server";
import type { PortalClient } from "@/lib/portal-v2/clients";

// Shared committee-tracking API for all five data dashboards (tracking shapes are identical per client).
// POST { type: "status", cptid, status, level?, solicitor?, reason?, by }
//      { type: "activity", cptid, date (MM/DD/YYYY or YYYY-MM-DD), kind, note, by }
//      { type: "editActivity", cptid, id, date?, kind?, note?, by }
//      { type: "deleteActivity", cptid, id, by }   -> moved to `removed` (kept with who/when), never dropped
// Every status change is also written to the activity history. Every history add/edit/delete is mirrored to the Engage SQL audit log.
export function trackingRoute(client: PortalClient, auth: (r: NextRequest) => Promise<boolean>, get: () => Promise<Tracking>, save: (t: Tracking) => Promise<void>) {
  const clean = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);
  async function GET(req: NextRequest) {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json(await get(), { headers: { "Cache-Control": "no-store" } });
  }
  async function POST(req: NextRequest) {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => null);
    const cptid = Number(b?.cptid);
    const by = clean(b?.by, 80);
    if (!b || !Number.isInteger(cptid) || cptid <= 0) return NextResponse.json({ error: "bad cptid" }, { status: 400 });
    if (!by) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    const t = await get();
    const now = new Date().toISOString();
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const dateOf = (v: unknown): string | null | "bad" => { const s = clean(v, 20); if (!s) return null; return parseUsDate(s) ?? "bad"; };
    let audit: { action: string; oldValue?: string | null; newValue?: string | null } | null = null;
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
      audit = { action: "status", newValue: parts.join(" · ") };
    } else if (b.type === "activity") {
      const note = clean(b.note);
      const d = dateOf(b.date);
      if (d === "bad") return NextResponse.json({ error: "Use MM/DD/YYYY for the date", field: "date" }, { status: 400 });
      if (!note) return NextResponse.json({ error: "Please enter a note" }, { status: 400 });
      const kind = clean(b.kind, 40) || "Note";
      t.activity.push({ id, cptid, date: d ?? now.slice(0, 10), kind, note, by, at: now });
      audit = { action: "add", newValue: `${d ?? now.slice(0, 10)} · ${kind} · ${note}` };
    } else if (b.type === "editActivity" || b.type === "deleteActivity") {
      const i = t.activity.findIndex((a) => a.id === clean(b.id, 40) && a.cptid === cptid);
      if (i < 0) return NextResponse.json({ error: "History entry not found (it may have been changed by someone else). Refresh and try again." }, { status: 404 });
      const cur = t.activity[i];
      const before = `${cur.date} · ${cur.kind} · ${cur.note}`;
      if (b.type === "deleteActivity") {
        t.activity.splice(i, 1);
        t.removed = [...(t.removed ?? []), { ...cur, removedBy: by, removedAt: now }];
        audit = { action: "delete", oldValue: before };
      } else {
        const d = b.date === undefined ? cur.date : dateOf(b.date);
        if (d === "bad" || d === null) return NextResponse.json({ error: "Use MM/DD/YYYY for the date", field: "date" }, { status: 400 });
        const kind = b.kind === undefined ? cur.kind : clean(b.kind, 40);
        if (!kind || (!(ACTIVITY_KINDS as readonly string[]).includes(kind) && kind !== cur.kind)) return NextResponse.json({ error: "Pick a type" }, { status: 400 });
        const note = b.note === undefined ? cur.note : clean(b.note);
        if (!note) return NextResponse.json({ error: "Please enter a note" }, { status: 400 });
        t.activity[i] = { ...cur, date: d, kind, note, editedBy: by, editedAt: now };
        audit = { action: "edit", oldValue: before, newValue: `${d} · ${kind} · ${note}` };
      }
    } else {
      return NextResponse.json({ error: "bad type" }, { status: 400 });
    }
    await save(t);
    if (audit) await logHistoryAudit(client, { cptid, by, ...audit });
    return NextResponse.json(t);
  }
  return { GET, POST };
}
