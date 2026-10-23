import { NextRequest, NextResponse } from "next/server";
import { portalStateSafe } from "@/lib/portal-v2/server";
import { buildOverlay, finalId, mergedSources, screeningPending, type Overlay, type UpdateRow } from "@/lib/portal-v2/record-overlay";
import type { PortalClient } from "@/lib/portal-v2/clients";

type Idx = { cptid: number; name: string; kind?: string; city?: string; lifetime: number; gifts: number; largest: number; last: string; years: number; band: string; capMin: number };
type Data = { asOf?: string; index: Idx[]; records: Record<string, unknown> } | null;

type Rec = { cptid: number; kind?: string; flags?: string[]; contact?: Record<string, string>; gifts?: { date?: string; amount: number; stage?: string; campaign?: string; type?: string }[];
  calling?: { batch?: string; tier?: string }[]; summary?: { first?: string } };
// JAG + CSNF chart giving by fiscal year (July start); the others by calendar year.
const FISCAL: Partial<Record<PortalClient, boolean>> = { jag: true, csnf: true };
const yearOf = (client: PortalClient, d?: string) => {
  if (!d) return null; const y = Number(d.slice(0, 4)); if (!y) return null;
  return FISCAL[client] && Number(d.slice(5, 7)) >= 7 ? y + 1 : y;
};
/** CPTIDs behind an aggregate (chart bar, table row, count) so every number on a dashboard can list its people. */
function drillIds(client: PortalClient, records: Record<string, Rec>, kind: string, v: string): number[] {
  const out: number[] = [];
  const vy = Number(v), vl = v.toLowerCase();
  for (const r of Object.values(records)) {
    const years = new Set((r.gifts ?? []).filter((g) => g.amount > 0).map((g) => yearOf(client, g.date)).filter((y): y is number => y !== null));
    const c = r.contact ?? {};
    let hit = false;
    if (kind === "year") hit = years.has(vy);
    else if (kind === "retained") hit = years.has(vy) && years.has(vy - 1);
    else if (kind === "new") hit = years.has(vy) && Math.min(...years) === vy;
    else if (kind === "stage") hit = (r.gifts ?? []).some((g) => [g.stage, g.type, g.campaign].some((x) => (x ?? "").toLowerCase() === vl)) || (r.kind ?? "").toLowerCase() === vl;
    else if (kind === "attr") hit = (r.kind ?? "").toLowerCase() === vl || (r.flags ?? []).some((f) => f.toLowerCase() === vl) || Object.values(c).some((x) => String(x ?? "").toLowerCase() === vl)
      || (r.calling ?? []).some((x) => (x.batch ?? "").toLowerCase() === vl || (x.tier ?? "").toLowerCase() === vl);
    else if (kind === "has") hit = v === "address" ? !!(c.street || c.address) : v === "phone" ? !!(c.phone || c.mobile || c.phone2) : v === "email" ? !!(c.email || c.workEmail || c.email2) : false;
    if (hit) out.push(r.cptid);
  }
  return out;
}

type Full = Rec & { name?: string; summary?: Record<string, unknown>; notes?: string[]; calls?: unknown[]; board?: unknown[]; committees?: string[]; ds?: Record<string, string>;
  givebutter?: unknown[]; portfolio?: unknown; [k: string]: unknown };
type Prospect = { cptid: number; full_name: string; org_name?: string | null; address1?: string | null; city?: string | null; state?: string | null; zip?: string | null; phone?: string | null; email?: string | null; note?: string | null; created_at?: string | null; created_by?: string | null };

function prospectRecord(p: Prospect): Full {
  return {
    cptid: p.cptid, name: p.full_name, kind: p.org_name ? "Organization" : "Individual",
    contact: { street: p.address1 ?? "", city: p.city ?? "", state: p.state ?? "", zip: p.zip ?? "", phone: p.phone ?? "", email: p.email ?? "" },
    flags: ["Added on the dashboard"], gifts: [], summary: { lifetime: 0, gifts: 0, largest: 0, years: 0, first: "", last: "", band: "" },
    notes: [p.note ?? "", `Added ${p.created_at ? new Date(p.created_at).toLocaleDateString("en-US") : ""} by ${p.created_by ?? "dashboard"}`].filter(Boolean),
  };
}
const num = (v: unknown) => Number(v) || 0;
const minDate = (a: string, b: string) => (!a ? b : !b ? a : a < b ? a : b);
const maxDate = (a: string, b: string) => (!a ? b : !b ? a : a > b ? a : b);

/** Fold merged duplicates into the surviving record and apply dashboard edits (contact, wealth). Client data itself is untouched. */
function overlayRecord(base: Full, o: Overlay, lookup: (c: number) => Full | null): Full {
  const r: Full = JSON.parse(JSON.stringify(base));
  const sources = mergedSources(o, r.cptid);
  if (sources.length) {
    const merged: { cptid: number; name: string; contact: Record<string, string>; lifetime: number }[] = [];
    const sm = { ...(r.summary ?? {}) } as Record<string, unknown>;
    for (const c of sources) {
      const s = lookup(c); if (!s) continue;
      const ssum = (s.summary ?? {}) as Record<string, unknown>;
      merged.push({ cptid: c, name: s.name ?? `CPTID ${c}`, contact: { ...(s.contact ?? {}), ...(o.contact.get(c) ?? {}) } as Record<string, string>, lifetime: num(ssum.lifetime) });
      r.gifts = [...(r.gifts ?? []), ...(s.gifts ?? []).map((g) => ({ ...g, fromCptid: c }))];
      r.notes = [...(r.notes ?? []), ...(s.notes ?? []).map((n) => `[from CPTID ${c}] ${n}`)];
      r.calls = [...(r.calls ?? []), ...(s.calls ?? [])];
      r.board = [...(r.board ?? []), ...(s.board ?? [])];
      r.committees = [...new Set([...(r.committees ?? []), ...(s.committees ?? [])])];
      r.flags = [...new Set([...(r.flags ?? []), ...(s.flags ?? []).filter((f) => f !== "Added on the dashboard")])];
      if (s.givebutter) r.givebutter = [...(r.givebutter ?? []), ...s.givebutter];
      if (!r.portfolio && s.portfolio) r.portfolio = s.portfolio;
      if ((!r.ds || !Object.keys(r.ds).length) && s.ds && Object.keys(s.ds).length) { r.ds = s.ds; r.dsFromCptid = c; }
      sm.lifetime = Math.round((num(sm.lifetime) + num(ssum.lifetime)) * 100) / 100;
      sm.gifts = num(sm.gifts) + num(ssum.gifts);
      sm.largest = Math.max(num(sm.largest), num(ssum.largest));
      sm.first = minDate(String(sm.first ?? ""), String(ssum.first ?? ""));
      sm.last = maxDate(String(sm.last ?? ""), String(ssum.last ?? ""));
    }
    const years = new Set((r.gifts ?? []).filter((g) => g.amount > 0).map((g) => (g.date ?? "").slice(0, 4)).filter(Boolean));
    if (years.size) sm.years = years.size;
    r.summary = sm;
    r.mergedFrom = merged;
  }
  const ce = o.contact.get(r.cptid);
  if (ce) r.contact = { ...(r.contact ?? {}), ...ce };
  r.contactHistory = [...(o.contactHistory.get(r.cptid) ?? [])].reverse();
  const w = o.wealth.get(r.cptid), ds = o.ds.get(r.cptid);
  r.wealth = {
    edits: w ?? {}, screening: ds ?? null, pending: screeningPending(o, r.cptid), requested: o.request.get(r.cptid) ?? null,
    original: r.ds && Object.keys(r.ds).length ? r.ds : null,
  };
  // A screening result fills the DonorSearch section when the client file had none.
  if ((!r.ds || !Object.keys(r.ds).length) && ds?.status === "matched" && ds.fields) { r.ds = ds.fields; r.dsFromScreening = true; }
  const del = o.deleted.get(r.cptid);
  if (del) r.deleted = del;
  return r;
}

// GET ?id=<CPTID> -> one full donor record; no id -> the lookup index. Prospects added on the dashboard (Engage SQL)
// are included so every name on every screen opens a record, even before the next refresh picks them up.
// Dashboard edits (contact, wealth, merges, deletes) are applied on read; merged/deleted records leave the index.
export function recordsRoute(client: PortalClient, auth: (r: NextRequest) => Promise<boolean>, load: () => Promise<Data>) {
  async function GET(req: NextRequest) {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const data = await load();
    if (!data) return NextResponse.json({ error: "records not loaded" }, { status: 503 });
    const drill = req.nextUrl.searchParams.get("drill");
    if (drill) return NextResponse.json({ cptids: drillIds(client, data.records as Record<string, Rec>, drill, req.nextUrl.searchParams.get("v") ?? "") });
    const state = await portalStateSafe(client);
    const prospects = (state?.prospects ?? []) as Prospect[];
    const o = buildOverlay((state?.updates ?? []) as unknown as UpdateRow[]);
    const lookup = (c: number): Full | null => {
      const rec = data.records[String(c)] as Full | undefined;
      if (rec) return rec;
      const p = prospects.find((x) => x.cptid === c);
      return p ? prospectRecord(p) : null;
    };
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const asked = Number(id);
      const target = finalId(o, asked);
      const base = lookup(target);
      if (!base) return NextResponse.json({ error: "not found" }, { status: 404 });
      const out = overlayRecord(base, o, lookup);
      if (target !== asked) out.redirectedFrom = { cptid: asked, name: lookup(asked)?.name ?? `CPTID ${asked}` };
      return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
    }
    const have = new Set(data.index.map((r) => r.cptid));
    const extra: Idx[] = prospects.filter((p) => !have.has(p.cptid)).map((p) => ({ cptid: p.cptid, name: p.full_name, kind: p.org_name ? "Organization" : "Individual", city: p.city ?? "", lifetime: 0, gifts: 0, largest: 0, last: "", years: 0, band: "", capMin: 0 }));
    const all = [...data.index, ...extra];
    const byId = new Map(all.map((r) => [r.cptid, r]));
    const gone = (c: number) => o.mergedInto.has(c) || o.deleted.has(c);
    const index = all.filter((r) => !gone(r.cptid)).map((r) => {
      const srcs = mergedSources(o, r.cptid);
      const city = o.contact.get(r.cptid)?.city;
      if (!srcs.length && !city) return r;
      const x = { ...r, city: city || r.city };
      for (const c of srcs) { const s = byId.get(c); if (!s) continue; x.lifetime = Math.round((x.lifetime + (s.lifetime || 0)) * 100) / 100; x.gifts += s.gifts || 0; x.largest = Math.max(x.largest, s.largest || 0); x.last = maxDate(x.last, s.last); }
      return x;
    });
    return NextResponse.json({ asOf: data.asOf, index }, { headers: { "Cache-Control": "private, max-age=20" } });
  }
  return { GET };
}
