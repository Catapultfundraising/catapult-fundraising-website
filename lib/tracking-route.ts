import { dashboardRefreshUnconfirmed, withDashboardMutationRefresh } from "./dashboard-ready-invalidation.server";
import { NextRequest, NextResponse } from "next/server";
import { pvasCanonicalEnabled } from "@/lib/portal-v2/pvas-canonical";
import { PvasTrackingSaveError } from "@/lib/pvas-tracking";
import { PROSPECT_STATUSES, ACTIVITY_KINDS, type ProspectStatus, type PvasTracking as Tracking } from "@/lib/pvas-tracking-types";
import { logHistoryAudit, parseUsDate, secondarySolicitors, saveSecondarySolicitor } from "@/lib/portal-v2/server";
import type { PortalClient } from "@/lib/portal-v2/clients";
import { currentTracking, directTrackingView } from "@/lib/portal-v2/direct-source-state.server";
import { canonicalTrackingStatusIntent, validCanonicalTrackingProspect } from "@/lib/portal-v2/pvas-tracking-presence";

// Shared committee-tracking API for all five data dashboards (tracking shapes are identical per client).
// POST { type: "status", cptid, status, level?, solicitor?, reason?, by }
//      { type: "activity", cptid, date (MM/DD/YYYY or YYYY-MM-DD), kind, note, by }
//      { type: "editActivity", cptid, id, date?, kind?, note?, by }
//      { type: "deleteActivity", cptid, id, by }   -> moved to `removed` (kept with who/when), never dropped
// Every status change is also written to the activity history. Every history add/edit/delete is mirrored to the Engage SQL audit log.
export function trackingRoute<T extends Tracking>(client: PortalClient, auth: (r: NextRequest) => Promise<boolean>, get: () => Promise<T>, save: (t: T, action?: { requestId: string; by: string }) => Promise<void>) {
  const clean = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);
  // SQL is the source of truth for the secondary solicitor; merge it into the tracking view.
  async function withSecondary(t: T): Promise<T> {
    if (pvasCanonicalEnabled(client)) return t;
    const sec = await secondarySolicitors(client);
    for (const [id, v] of Object.entries(sec)) {
      if (t.prospects[id]) t.prospects[id] = { ...t.prospects[id], solicitor2: v };
      else t.prospects[id] = { status: "Active", solicitor2: v, updatedAt: "", by: "" };
    }
    return t;
  }
  // PIR links live in <client>.pir_links and arrive with the live SQL build. The direct-source
  // tracking document has no pirs, so re-attach them to every response (View PIR + PIR wealth).
  async function withPirs<V>(view: V): Promise<V> {
    if (client !== "csnf" && client !== "jag" && client !== "wcbhc" && client !== "baq" && client !== "imas") return view;
    const { liveBuild } = await import("@/lib/client-live-data.server");
    const pirs = (await liveBuild(client)).pirs ?? {};
    return { ...(view as object), pirs } as V;
  }
  async function GET(req: NextRequest) {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json(await withPirs(await directTrackingView(client, await withSecondary(await currentTracking(client, get)))), { headers: { "Cache-Control": "no-store" } });
  }
  async function POST(req: NextRequest) {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const b = await req.json().catch(() => null);
    const canonical = pvasCanonicalEnabled(client);
    if (canonical && (!b || !/^[a-f0-9]{32}$/.test(b.requestId) || !/^[a-f0-9]{64}$/.test(b.revision) || typeof b.actionAt!=="string" || !Number.isFinite(Date.parse(b.actionAt)) || new Date(b.actionAt).toISOString()!==b.actionAt)) return NextResponse.json({ error: "Canonical action requires requestId, stable action time and current revision" }, { status: 400 });
    if (canonical && b.type === "purgeTest") return NextResponse.json({ error: "Physical cleanup is disabled for canonical history" }, { status: 403 });
    // QA cleanup: removes only entries written by a "ZZTEST" author (test data), never real staff entries.
    if (b?.type === "purgeTest") {
      const t = await currentTracking(client, get);
      const isTest = (x?: string) => /^ZZTEST/i.test(x ?? "");
      t.activity = t.activity.filter((a) => !isTest(a.by));
      t.removed = (t.removed ?? []).filter((a) => !isTest(a.by) && !isTest(a.removedBy));
      for (const [k, v] of Object.entries(t.prospects)) if (isTest(v.by)) delete t.prospects[k];
      await save(t);
      return NextResponse.json({ ok: true });
    }
    const cptid = Number(b?.cptid);
    const by = clean(b?.by, 80);
    if (!b || !Number.isInteger(cptid) || cptid <= 0) return NextResponse.json({ error: "bad cptid" }, { status: 400 });
    if (!by) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    const t = await currentTracking(client, get);
    if (canonical && t.revision !== b.revision) return NextResponse.json({ error: "Tracking changed; reload before saving" }, { status: 409 });
    const now = canonical ? b.actionAt as string : new Date().toISOString();
    const id = canonical ? b.requestId as string : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const dateOf = (v: unknown): string | null | "bad" => { const s = clean(v, 20); if (!s) return null; return parseUsDate(s) ?? "bad"; };
    let audit: { action: string; oldValue?: string | null; newValue?: string | null } | null = null;
    if (b.type === "status") {
      const prev = t.prospects[cptid];
      let intent: ReturnType<typeof canonicalTrackingStatusIntent>;
      if (canonical) {
        if (!validCanonicalTrackingProspect(prev)) return NextResponse.json({error:"Canonical tracking presence unavailable"},{status:503});
        try { intent = canonicalTrackingStatusIntent(prev,b); }
        catch { return NextResponse.json({error:"Invalid tracking status intent; presence metadata is read-only"},{status:400}); }
      } else {
        const status = clean(b.status, 40) as ProspectStatus;
        if (!PROSPECT_STATUSES.includes(status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
        intent = {changed:true,patch:{status}};
      }
      const level = canonical && !Object.hasOwn(b,"level") ? prev?.level : Number(b.level) > 0 ? Math.round(Number(b.level)) : undefined;
      const solicitor2 = clean(b.solicitor2, 120);
      const prev2 = (canonical ? undefined : (await secondarySolicitors(client))[String(cptid)]) ?? prev?.solicitor2 ?? "";
      const primarySpecified = b.solicitor !== undefined;
      const primary = primarySpecified ? clean(b.solicitor, 120) : prev?.solicitor;
      const secondary = b.solicitor2 !== undefined ? solicitor2 : prev?.solicitor2;
      const st = { ...(canonical?prev:{}), ...intent.patch, level,
        ...(primary !== undefined ? { solicitor: primary } : {}),
        ...(!canonical ? {solicitorEdited: primarySpecified ? true : prev?.solicitorEdited ?? (prev?.updatedAt ? undefined : false)} : {}),
        ...(secondary !== undefined ? { solicitor2: secondary } : {}), reason: canonical && !Object.hasOwn(b,"reason") ? prev?.reason : clean(b.reason, 500) || undefined, updatedAt: now, by };
      if (!canonical && b.solicitor2 !== undefined && solicitor2 !== prev2) {
        try { await saveSecondarySolicitor(client, cptid, prev2, solicitor2, by); }
        catch (e) { return NextResponse.json({ error: `Could not save the secondary solicitor: ${(e as Error).message}` }, { status: 500 }); }
      }
      t.prospects[cptid] = st;
      const parts = !canonical || intent.changed ? [`Status: ${prev?.status ?? "none"} → ${st.status}`] : [];
      if (level !== prev?.level) parts.push(`Gift level: ${level ? `$${level.toLocaleString("en-US")}` : "auto"}`);
      if (primarySpecified && st.solicitor !== prev?.solicitor) parts.push(`Solicitor: ${st.solicitor ?? "none"}`);
      if (b.solicitor2 !== undefined && (st.solicitor2 ?? "") !== prev2) parts.push(`Secondary solicitor: ${st.solicitor2 ?? "none"}`);
      if (st.reason) parts.push(`Reason: ${st.reason}`);
      if (!parts.length) parts.push("Committee update (status unchanged)");
      t.activity.push({ id, cptid, date: now.slice(0, 10), kind: "Committee update", note: parts.join(" · "), by, at: now });
      audit = { action: "status", newValue: parts.join(" · ") };
    } else if (b.type === "activity") {
      const note = clean(b.note);
      const d = dateOf(b.date);
      if (d === "bad") return NextResponse.json({ error: "Use MM/DD/YYYY for the date", field: "date" }, { status: 400 });
      if (!note) return NextResponse.json({ error: "Please enter a note" }, { status: 400 });
      const kind = clean(b.kind, 40) || "Note";
      t.activity.push({ id, cptid, date: d ?? (canonical ? "" : now.slice(0, 10)), kind, note, by, at: now });
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
        const d = b.date === undefined ? cur.date : canonical && cur.date === "" && b.date === "" ? "" : dateOf(b.date);
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
    await save(t, canonical ? { requestId: b.requestId, by } : undefined);
    if (dashboardRefreshUnconfirmed()) return NextResponse.json({ ok: true, ...(canonical ? { requestId: b.requestId } : {}) });
    if (audit && !canonical) await logHistoryAudit(client, { cptid, by, ...audit });
    const view=await withPirs(await directTrackingView(client, await withSecondary(canonical ? await get() : t)));
    return NextResponse.json(canonical?{...view,ok:true,requestId:b.requestId}:view);
  }
  const guarded = (run: (req: NextRequest) => Promise<NextResponse>) => async (req: NextRequest) => { try { return await run(req); } catch (e) { return NextResponse.json({ error: "Current tracking/source view unavailable; no success asserted" }, { status: e instanceof PvasTrackingSaveError && e.status === 409 ? 409 : 503 }); } };
  return { GET: guarded(GET), POST: withDashboardMutationRefresh(guarded(POST)) };
}
