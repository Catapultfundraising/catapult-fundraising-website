import * as XLSX from "xlsx";
import { get as blobGet } from "@vercel/blob";
import { getJagRecords } from "@/lib/jag-data-store";
import { getCsnfRecords } from "@/lib/csnf-data-store";
import { getPvasRecords } from "@/lib/pvas-data-store";
import { getWcbhcRecords } from "@/lib/wcbhc-data-store";
import { getBaqRecords } from "@/lib/baq-data-store";
import { getJagTracking } from "@/lib/jag-tracking";
import { getCsnfTracking } from "@/lib/csnf-tracking";
import { getPvasTracking } from "@/lib/pvas-tracking";
import { getWcbhcTracking } from "@/lib/wcbhc-tracking";
import { getBaqTracking } from "@/lib/baq-tracking";
import { idsPath } from "@/lib/portal-v2/clients";
import { lastNameKey, type BrClient, type BrEntry, type BrFilters, type BrPoolRow } from "@/lib/board-review/config";

// Prospect pool for the Catapult setup screen: the dashboard's records blob
// (index + per-record contact for state) joined with committee tracking (status, solicitor).
type Rec = { index: { cptid: number; name: string; kind?: string; city?: string; lifetime: number; gifts: number; largest: number; last: string; ds?: string; capacity?: string; capMin: number }[];
  records: Record<string, { contact?: Record<string, string>; gifts?: { date?: string; amount: number }[] }> };
type Trk = { prospects: Record<string, { status?: string; solicitor?: string }> };
const RECORDS: Record<BrClient, () => Promise<unknown>> = { jag: getJagRecords, csnf: getCsnfRecords, pvas: getPvasRecords, wcbhc: getWcbhcRecords, baq: getBaqRecords };
const TRACKING: Record<BrClient, () => Promise<unknown>> = { jag: getJagTracking, csnf: getCsnfTracking, pvas: getPvasTracking, wcbhc: getWcbhcTracking, baq: getBaqTracking };

export async function getPool(c: BrClient): Promise<BrPoolRow[]> {
  const [rec, trk] = (await Promise.all([RECORDS[c](), TRACKING[c]().catch(() => null)])) as [Rec | null, Trk | null];
  if (!rec) return [];
  return rec.index.map((r) => {
    const full = rec.records?.[String(r.cptid)];
    let lastAmt = 0, lastDate = "";
    for (const g of full?.gifts ?? []) if (g.amount > 0 && (g.date ?? "") >= lastDate) { lastDate = g.date ?? ""; lastAmt = g.amount; }
    const t = trk?.prospects?.[String(r.cptid)];
    return {
      cptid: r.cptid, name: r.name || `CPTID ${r.cptid}`, kind: r.kind ?? "", city: r.city || full?.contact?.city || "", state: (full?.contact?.state ?? "").toUpperCase(),
      lifetime: r.lifetime || 0, gifts: r.gifts || 0, largest: r.largest || 0, lastDate: lastDate || r.last || "", lastAmt,
      ds: r.ds ?? "", capacity: r.capacity ?? "", capMin: r.capMin || 0, status: t?.status ?? "", solicitor: t?.solicitor ?? "",
    };
  });
}

export const isAssigned = (p: BrPoolRow) => Boolean(p.solicitor.trim()) || p.status === "Assigned";
const isOrg = (p: BrPoolRow) => /org|business|corp|foundation/i.test(p.kind);

export function applyFilters(pool: BrPoolRow[], f: BrFilters): BrPoolRow[] {
  const states = (f.states ?? "").split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
  const q = (f.q ?? "").trim().toLowerCase();
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  let out = pool.filter((p) => {
    if (n(f.capMin) !== undefined && p.capMin < f.capMin!) return false;
    if (n(f.capMax) !== undefined && p.capMin > f.capMax!) return false;
    if (f.ds && !p.ds.toLowerCase().startsWith(f.ds.toLowerCase())) return false;
    if (f.assigned === "yes" && !isAssigned(p)) return false;
    if (f.assigned === "no" && isAssigned(p)) return false;
    if (f.donor === "donor" && !(p.lifetime > 0)) return false;
    if (f.donor === "nondonor" && p.lifetime > 0) return false;
    if (n(f.lifeMin) !== undefined && p.lifetime < f.lifeMin!) return false;
    if (n(f.lifeMax) !== undefined && p.lifetime > f.lifeMax!) return false;
    if (n(f.lastMin) !== undefined && p.lastAmt < f.lastMin!) return false;
    if (n(f.lastMax) !== undefined && p.lastAmt > f.lastMax!) return false;
    if (f.lastAfter && !(p.lastDate && p.lastDate >= f.lastAfter)) return false;
    if (f.lastBefore && !(p.lastDate && p.lastDate <= f.lastBefore)) return false;
    if (states.length && !states.includes(p.state)) return false;
    if (f.kind === "individual" && isOrg(p)) return false;
    if (f.kind === "organization" && !isOrg(p)) return false;
    if (f.status && p.status !== f.status) return false;
    if (q && !p.name.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q)) return false;
    return true;
  });
  if (f.sort === "lifetime") out.sort((a, b) => b.lifetime - a.lifetime);
  else if (f.sort === "name") out.sort((a, b) => lastNameKey(a.name, a.kind).localeCompare(lastNameKey(b.name, b.kind)));
  else out.sort((a, b) => b.capMin - a.capMin || b.lifetime - a.lifetime);
  if (n(f.limit) && f.limit! > 0) out = out.slice(0, f.limit);
  return out;
}

export const toEntry = (p: BrPoolRow): BrEntry => ({ cptid: p.cptid, name: p.name, sortKey: lastNameKey(p.name, p.kind), city: p.city, state: p.state });

// ---- Upload matching: CPTID first, then the client's own ID (ids.json), then name ----
const key = (n: string) => n.toLowerCase().replace(/\b(mr|mrs|ms|dr|jr|sr|ii|iii|the)\b/g, "").replace(/[^a-z0-9]/g, "");
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

async function readIds(c: BrClient): Promise<{ cptid: number; clientId: string }[]> {
  try {
    const r = await blobGet(idsPath(c), { access: "private", useCache: false });
    if (!r?.stream) return [];
    return JSON.parse(await new Response(r.stream).text());
  } catch { return []; }
}

export interface UploadResult { matched: BrEntry[]; unmatched: { line: number; text: string }[]; total: number }
export async function matchUpload(c: BrClient, buf: Buffer, pool: BrPoolRow[]): Promise<UploadResult> {
  const wb = XLSX.read(buf, { type: "buffer" });
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
  const headers = raw.length ? Object.keys(raw[0]) : [];
  const h = (re: RegExp) => headers.find((x) => re.test(x.trim()));
  const cCpt = h(/cpt\s*id|catapult\s*id/i), cId = h(/^(client\s*id|id|account\s*id|constituent\s*id|donor\s*id|record\s*id)$/i);
  const cFirst = h(/^first(\s*name)?$/i), cLast = h(/^last(\s*name)?$/i);
  const cName = h(/^(full\s*name|name|prospect(\s*name)?|donor(\s*name)?|account\s*name|organization|constituent)$/i) ?? (cFirst || cLast || cCpt || cId ? undefined : headers[0]);
  const byCpt = new Map(pool.map((p) => [p.cptid, p]));
  const byName = new Map<string, BrPoolRow>();
  for (const p of pool) {
    byName.set(key(p.name), p);
    if (p.name.includes(",")) { const [l, f] = p.name.split(","); byName.set(key(`${f} ${l}`), p); }
  }
  const ids = cId ? await readIds(c) : [];
  const byClientId = new Map(ids.filter((x) => x.clientId).map((x) => [x.clientId.toLowerCase(), x.cptid]));
  const seen = new Set<number>();
  const matched: BrEntry[] = [], unmatched: UploadResult["unmatched"] = [];
  raw.forEach((r, i) => {
    const cpt = cCpt ? Number(str(r[cCpt]).replace(/[^0-9]/g, "")) : 0;
    const cid = cId ? str(r[cId]).toLowerCase() : "";
    const name = cName ? str(r[cName]) : `${cFirst ? str(r[cFirst]) : ""} ${cLast ? str(r[cLast]) : ""}`.trim();
    if (!cpt && !cid && !name) return;
    let p = cpt ? byCpt.get(cpt) : undefined;
    if (!p && cid) { const m = byClientId.get(cid) ?? (/^\d+$/.test(cid) && !cCpt ? Number(cid) : undefined); if (m) p = byCpt.get(m); }
    if (!p && name) {
      p = byName.get(key(name));
      if (!p && name.includes(",")) { const [l, f] = name.split(","); p = byName.get(key(`${f} ${l}`)); }
    }
    if (!p) { unmatched.push({ line: i + 2, text: [name, cpt ? `CPTID ${cpt}` : "", cid ? `ID ${cid}` : ""].filter(Boolean).join(" · ") }); return; }
    if (seen.has(p.cptid)) return;
    seen.add(p.cptid); matched.push(toEntry(p));
  });
  return { matched, unmatched, total: raw.length };
}
