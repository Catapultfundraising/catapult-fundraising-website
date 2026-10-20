import { NextRequest, NextResponse } from "next/server";
import { portalProspects } from "@/lib/portal-v2/server";
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

// GET ?id=<CPTID> -> one full donor record; no id -> the lookup index. Prospects added on the dashboard (Engage SQL)
// are included so every name on every screen opens a record, even before the next refresh picks them up.
export function recordsRoute(client: PortalClient, auth: (r: NextRequest) => Promise<boolean>, load: () => Promise<Data>) {
  async function GET(req: NextRequest) {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const data = await load();
    if (!data) return NextResponse.json({ error: "records not loaded" }, { status: 503 });
    const drill = req.nextUrl.searchParams.get("drill");
    if (drill) return NextResponse.json({ cptids: drillIds(client, data.records as Record<string, Rec>, drill, req.nextUrl.searchParams.get("v") ?? "") });
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const rec = data.records[id];
      if (rec) return NextResponse.json(rec);
      const p = (await portalProspects(client)).find((x) => String(x.cptid) === id);
      if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({
        cptid: p.cptid, name: p.full_name, kind: p.org_name ? "Organization" : "Individual",
        contact: { street: p.address1 ?? "", city: p.city ?? "", state: p.state ?? "", zip: p.zip ?? "", phone: p.phone ?? "", email: p.email ?? "" },
        flags: ["Added on the dashboard"], gifts: [], summary: { lifetime: 0, gifts: 0, largest: 0, years: 0, first: "", last: "", band: "" },
        notes: [p.note, `Added ${p.created_at ? new Date(p.created_at).toLocaleDateString("en-US") : ""} by ${p.created_by ?? "dashboard"}`].filter(Boolean),
      });
    }
    const have = new Set(data.index.map((r) => r.cptid));
    const extra: Idx[] = (await portalProspects(client)).filter((p) => !have.has(p.cptid)).map((p) => ({ cptid: p.cptid, name: p.full_name, kind: p.org_name ? "Organization" : "Individual", city: p.city ?? "", lifetime: 0, gifts: 0, largest: 0, last: "", years: 0, band: "", capMin: 0 }));
    return NextResponse.json({ asOf: data.asOf, index: [...data.index, ...extra] }, { headers: { "Cache-Control": "private, max-age=60" } });
  }
  return { GET };
}
