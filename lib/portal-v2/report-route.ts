import { NextRequest, NextResponse } from "next/server";
import { portalCampaignStateSafe } from "@/lib/portal-v2/server";
import { buildOverlay, finalId, mergedSources, type UpdateRow } from "@/lib/portal-v2/record-overlay";
import { campaignRecords } from "@/lib/portal-v2/campaign-records";
import { overlaidIndex, type Data, type Prospect } from "@/lib/portal-v2/records-route";
import { FIELD_BY_ID, XLSX_MAX_ROWS, queryErrors, reportNotes, runReport, sanitizeQuery, usesCampaign, type ReportRow } from "@/lib/portal-v2/report-fields";
import type { PortalClient, PortalGift, PortalState } from "@/lib/portal-v2/clients";

type Tracking = { prospects: Record<string, { status?: string; solicitor?: string; solicitor2?: string }> };
type Rec = { contact?: Record<string, string>; flags?: string[]; ds?: Record<string, string>; summary?: { first?: string; last?: string } };
type XlsxBuilder = (o: { title: string; subtitle: string; client: string; cols: { label: string; kind?: "text" | "usd" | "num" | "pct" }[]; sections: { heading?: string; rows: (string | number | null)[][] }[]; notes?: string[] }) => Promise<Buffer | ArrayBuffer | Uint8Array>;
const CONTACT = ["street", "city", "state", "zip", "phone", "mobile", "phone2", "phone3", "email", "email2", "email3", "workEmail"] as const;
// Same keys and order the record modal (components/record-tools.tsx WealthSection) reads from DonorSearch fields.
const CAP_KEYS = ["Wealth-Based Capacity", "Capacity", "Estimated Capacity", "Wealth Capacity"];
const RATING_KEYS = ["DS Rating", "DS_Rating", "Rating"];
const pick = (o: Record<string, string> | null | undefined, keys: string[]) => { for (const k of keys) if (o?.[k]) return String(o[k]); return ""; };
const minDate = (a: string, b: string) => (!a ? b : !b ? a : a < b ? a : b);
export const PREVIEW_MAX_ROWS = 500;

/** One flat row per live record (merged/deleted removed), with staff contact/wealth edits applied.
 * state === null means the campaign SQL source is unavailable: campaign fields are null (unknown), never 0. */
export function buildReportRows(data: NonNullable<Data>, state: PortalState | null, tracking: Tracking | null): ReportRow[] {
  const prospects = (state?.prospects ?? []) as unknown as Prospect[];
  const o = buildOverlay((state?.updates ?? []) as unknown as UpdateRow[]);
  const gifts = (state?.gifts ?? []) as PortalGift[];
  const index = overlaidIndex(data.index, prospects, campaignRecords(gifts), o);
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
  const recOf = (c: number) => (data.records[String(c)] ?? null) as Rec | null;
  return index.map((r) => {
    const rec = recOf(r.cptid);
    const p = pById.get(r.cptid);
    const base: Record<string, string> = rec?.contact ?? (p ? { street: p.address1 ?? "", city: p.city ?? "", state: p.state ?? "", zip: p.zip ?? "", phone: p.phone ?? "", email: p.email ?? "" } : {});
    const edits = o.contact.get(r.cptid) ?? {};
    const c = { ...base, ...edits } as Record<string, string>;
    const w = o.wealth.get(r.cptid), scr = o.ds.get(r.cptid);
    const x = r as typeof r & { ds?: string; capacity?: string };
    // Like the record modal: a matched dashboard screening fills in only when the client file had no DonorSearch data.
    const original = rec?.ds && Object.keys(rec.ds).length ? rec.ds : null;
    const screened = !original && !x.ds && !x.capacity && scr?.status === "matched" ? scr.fields ?? null : null;
    // First gift: earliest across the survivor and records merged into it (index "last" is already folded).
    let first = rec?.summary?.first ?? "";
    for (const s of mergedSources(o, r.cptid)) first = minDate(first, recOf(s)?.summary?.first ?? "");
    const t = tracking?.prospects[String(r.cptid)];
    const cm = camp.get(r.cptid);
    const row: ReportRow = {
      cptid: r.cptid, name: r.name, kind: r.kind ?? "", flags: (rec?.flags ?? (p ? ["Added on the dashboard"] : [])).join("; "),
      lifetime: r.lifetime || 0, gifts: r.gifts || 0, largest: r.largest || 0, first, last: r.last || "", years: r.years || 0, band: r.band || "",
      ds: w?.rating?.value || x.ds || pick(screened, RATING_KEYS), capacity: w?.capacity?.value || x.capacity || pick(screened, CAP_KEYS),
      campaignPledged: state ? Math.round((cm?.pledged ?? 0) * 100) / 100 : null, campaignReceived: state ? Math.round((cm?.received ?? 0) * 100) / 100 : null,
      status: t?.status ?? "", solicitor: t?.solicitor ?? "", solicitor2: sec.get(r.cptid) ?? t?.solicitor2 ?? "",
    };
    for (const k of CONTACT) row[k] = c[k] ?? (k === "street" ? c.address ?? "" : "");
    // Index city is only a fallback when nobody (client file or staff) has set a city; a staff-cleared city stays blank.
    if (!("city" in c)) row.city = r.city || "";
    return row;
  });
}

// POST { query, limit? }               -> { asOf, total, fields, rows, campaignAvailable } (selected fields only)
// POST { query, format: "xlsx", title } -> branded Excel of every matching row (built here so no partial file is sent)
// Each client route passes its own auth, so one dashboard's login can never read another client's records.
export function reportRoute(client: PortalClient, auth: (r: NextRequest) => Promise<boolean>, load: () => Promise<Data>, getTracking: () => Promise<Tracking>,
  xlsx?: { clientName: string; filePrefix: string; build: XlsxBuilder },
  /** Test seam only (synthetic QA harness/unit tests); production routes always read live campaign state. */
  getState: (c: PortalClient) => Promise<PortalState | null> = portalCampaignStateSafe) {
  async function POST(req: NextRequest) {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = (await req.json().catch(() => null)) as { query?: unknown; limit?: unknown; format?: unknown; title?: unknown } | null;
    const query = sanitizeQuery(body?.query);
    const errs = queryErrors(query);
    if (errs.length) return NextResponse.json({ error: errs.join("; ") }, { status: 400 });
    const data = await load();
    if (!data) return NextResponse.json({ error: "records not loaded" }, { status: 503 });
    const [state, tracking] = await Promise.all([getState(client), getTracking().catch(() => null)]);
    if (!state && usesCampaign(query)) return NextResponse.json({ error: "Campaign figures are unavailable right now, so campaign filters and sorting cannot run. Remove them or try again shortly." }, { status: 503 });
    const rows = runReport(buildReportRows(data, state, tracking), query);
    const keep = ["cptid", ...query.fields.filter((f) => f !== "cptid")];
    if (body?.format === "xlsx") {
      // Without SQL state, merges/deletes/staff edits cannot be applied either: never ship a file that may resurrect them.
      if (!state) return NextResponse.json({ error: "Dashboard edits and campaign figures are unavailable right now, so downloads are paused. Please try again shortly." }, { status: 503 });
      if (!xlsx) return NextResponse.json({ error: "Excel export not configured" }, { status: 400 });
      if (rows.length > XLSX_MAX_ROWS) return NextResponse.json({ error: `This list has ${rows.length.toLocaleString()} records; Excel downloads are limited to ${XLSX_MAX_ROWS.toLocaleString()}. Add a filter.` }, { status: 413 });
      const cols = query.fields.map((f) => FIELD_BY_ID.get(f)!);
      const title = String(body.title ?? "").replace(/[^\w .,+&'()-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "Custom Report";
      const buf = await xlsx.build({
        title, client: xlsx.clientName, subtitle: `${rows.length.toLocaleString()} records${data.asOf ? ` · Data as of ${data.asOf}` : ""} · ${xlsx.clientName}`,
        cols: cols.map((c) => ({ label: c.label, kind: c.kind === "usd" ? "usd" : c.kind === "num" && c.id !== "cptid" ? "num" : "text" })),
        sections: [{ rows: rows.map((r) => cols.map((c) => (c.id === "cptid" ? String(r.cptid ?? "") : r[c.id] ?? null))) }],
        notes: reportNotes(query, !!state),
      });
      return new NextResponse(new Uint8Array(buf as ArrayBuffer), { headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${xlsx.filePrefix} ${title}.xlsx"`, "Cache-Control": "no-store", "X-Report-Rows": String(rows.length),
      } });
    }
    const limit = Math.min(PREVIEW_MAX_ROWS * 10, Math.max(1, Number(body?.limit) || PREVIEW_MAX_ROWS));
    const out = rows.slice(0, limit).map((r) => Object.fromEntries(keep.map((k) => [k, r[k] ?? null])));
    return NextResponse.json({ asOf: data.asOf, total: rows.length, fields: query.fields, rows: out, campaignAvailable: !!state },
      { headers: { "Cache-Control": "no-store" } });
  }
  return { POST };
}
