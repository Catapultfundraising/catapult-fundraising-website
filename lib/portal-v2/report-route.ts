import { NextRequest, NextResponse } from "next/server";
import { portalCampaignStateSafe } from "@/lib/portal-v2/server";
import { buildOverlay, finalId, type UpdateRow } from "@/lib/portal-v2/record-overlay";
import { campaignRecords } from "@/lib/portal-v2/campaign-records";
import { overlaidIndex, type Data, type Prospect } from "@/lib/portal-v2/records-route";
import { runReport, sanitizeQuery, type ReportRow } from "@/lib/portal-v2/report-fields";
import type { PortalClient, PortalGift, PortalState } from "@/lib/portal-v2/clients";

type Tracking = { prospects: Record<string, { status?: string; solicitor?: string; solicitor2?: string }> };
type Rec = { contact?: Record<string, string>; flags?: string[]; summary?: { first?: string; last?: string } };
const CONTACT = ["street", "city", "state", "zip", "phone", "mobile", "phone2", "phone3", "email", "email2", "email3", "workEmail"] as const;
export const REPORT_MAX_ROWS = 25_000;

/** One flat row per live record (merged/deleted removed), with staff contact/wealth edits applied. */
export function buildReportRows(data: NonNullable<Data>, state: PortalState | null, tracking: Tracking | null): ReportRow[] {
  const prospects = (state?.prospects ?? []) as unknown as Prospect[];
  const o = buildOverlay((state?.updates ?? []) as unknown as UpdateRow[]);
  const gifts = (state?.gifts ?? []) as PortalGift[];
  const campaign = campaignRecords(gifts);
  const index = overlaidIndex(data.index, prospects, campaign, o);
  // Campaign activity follows merges onto the surviving CPTID. Pledges and gifts stay in separate columns.
  const camp = new Map<number, { pledged: number; received: number }>();
  for (const g of gifts) {
    const id = Number(g.cptid); if (!(id > 0)) continue;
    const t = finalId(o, id), cur = camp.get(t) ?? { pledged: 0, received: 0 };
    if (g.kind === "pledge") cur.pledged += Number(g.amount) || 0; else cur.received += Number(g.amount) || 0;
    camp.set(t, cur);
  }
  // Secondary solicitor is saved in Engage SQL (latest row per CPTID wins), same as the tracking API.
  const sec = new Map<number, string>();
  for (const u of [...(state?.updates ?? [])].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))) if (u.field === "solicitor2") sec.set(Number(u.cptid), u.new_value ?? "");
  const pById = new Map(prospects.map((p) => [p.cptid, p]));
  return index.map((r) => {
    const rec = (data.records[String(r.cptid)] ?? null) as Rec | null;
    const p = pById.get(r.cptid);
    const base: Record<string, string> = rec?.contact ?? (p ? { street: p.address1 ?? "", city: p.city ?? "", state: p.state ?? "", zip: p.zip ?? "", phone: p.phone ?? "", email: p.email ?? "" } : {});
    const c = { ...base, ...(o.contact.get(r.cptid) ?? {}) } as Record<string, string>;
    const w = o.wealth.get(r.cptid);
    const x = r as typeof r & { ds?: string; capacity?: string; first?: string };
    const t = tracking?.prospects[String(r.cptid)];
    const cm = camp.get(r.cptid);
    const row: ReportRow = {
      cptid: r.cptid, name: r.name, kind: r.kind ?? "", flags: (rec?.flags ?? (p ? ["Added on the dashboard"] : [])).join("; "),
      lifetime: r.lifetime || 0, gifts: r.gifts || 0, largest: r.largest || 0, first: x.first || rec?.summary?.first || "", last: r.last || "", years: r.years || 0, band: r.band || "",
      ds: w?.rating?.value || x.ds || "", capacity: w?.capacity?.value || x.capacity || "",
      campaignPledged: cm ? Math.round(cm.pledged * 100) / 100 : 0, campaignReceived: cm ? Math.round(cm.received * 100) / 100 : 0,
      status: t?.status ?? "", solicitor: t?.solicitor ?? "", solicitor2: sec.get(r.cptid) ?? t?.solicitor2 ?? "",
    };
    for (const k of CONTACT) row[k] = c[k] || (k === "street" ? c.address || "" : "") || "";
    if (!row.city) row.city = r.city || "";
    return row;
  });
}

// POST { query: ReportQuery, limit? } -> { asOf, total, fields, rows } (only the selected fields).
// Each client route passes its own auth, so one dashboard's login can never read another client's records.
export function reportRoute(client: PortalClient, auth: (r: NextRequest) => Promise<boolean>, load: () => Promise<Data>, getTracking: () => Promise<Tracking>) {
  async function POST(req: NextRequest) {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = (await req.json().catch(() => null)) as { query?: unknown; limit?: unknown } | null;
    const query = sanitizeQuery(body?.query);
    const limit = Math.min(REPORT_MAX_ROWS, Math.max(1, Number(body?.limit) || 500));
    const data = await load();
    if (!data) return NextResponse.json({ error: "records not loaded" }, { status: 503 });
    const [state, tracking] = await Promise.all([portalCampaignStateSafe(client), getTracking().catch(() => null)]);
    const rows = runReport(buildReportRows(data, state, tracking), query);
    const keep = ["cptid", ...query.fields.filter((f) => f !== "cptid")];
    const out = rows.slice(0, limit).map((r) => Object.fromEntries(keep.map((k) => [k, r[k] ?? null])));
    return NextResponse.json({ asOf: data.asOf, total: rows.length, fields: query.fields, rows: out, campaignAvailable: !!state },
      { headers: { "Cache-Control": "no-store" } });
  }
  return { POST };
}
