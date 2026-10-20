import { get as blobGet } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { isPvasDataAuthed } from "@/lib/pvas-data-auth";
import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { isJagDataAuthed } from "@/lib/jag-data-auth";
import { isWcbhcDataAuthed } from "@/lib/wcbhc-data-auth";
import { isBaqDataAuthed } from "@/lib/baq-data-auth";
import { getPvasRecords } from "@/lib/pvas-data-store";
import { getCsnfRecords } from "@/lib/csnf-data-store";
import { getJagRecords } from "@/lib/jag-data-store";
import { getWcbhcRecords } from "@/lib/wcbhc-data-store";
import { getBaqRecords, getBaqSnapshot } from "@/lib/baq-data-store";
import { getPvasSnapshot } from "@/lib/pvas-data-store";
import { getWcbhcSnapshot } from "@/lib/wcbhc-data-store";
import { PORTAL_V2, idsPath, type PortalClient, type PortalGift, type PortalState } from "@/lib/portal-v2/clients";
import { buildMatcher, diffRow, nameKey, parseClientFile, type Known } from "@/lib/portal-v2/match";

// Portal v2 server side. Reads (match index) happen here; every Azure SQL write is
// forwarded to the Catapult Engage project (static IPs) at ENGAGE_PORTAL_URL with
// Authorization: Bearer PORTAL_WRITE_SECRET.

const AUTH: Record<PortalClient, (r: NextRequest) => Promise<boolean>> = {
  pvas: isPvasDataAuthed, csnf: isCsnfDataAuthed, jag: isJagDataAuthed, wcbhc: isWcbhcDataAuthed, baq: isBaqDataAuthed,
};
const RECORDS: Record<PortalClient, () => Promise<{ index: { cptid: number; name: string; city?: string }[] } | null>> = {
  pvas: getPvasRecords, csnf: getCsnfRecords, jag: getJagRecords, wcbhc: getWcbhcRecords, baq: getBaqRecords,
};
// CPTIDs at or above this are placeholders in client data (PVAS has a 999999); they never set the next id.
const PLACEHOLDER_CPTID = 900_000;

async function engage<T>(client: PortalClient, op: string, body: Record<string, unknown> = {}): Promise<T> {
  const url = process.env.ENGAGE_PORTAL_URL, secret = process.env.PORTAL_WRITE_SECRET;
  if (!url || !secret) throw new Error("Portal writes are not configured (ENGAGE_PORTAL_URL / PORTAL_WRITE_SECRET)");
  const r = await fetch(url, { method: "POST", cache: "no-store", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify({ ...body, op, client }) });
  const j = await r.json().catch(() => ({ error: `engage ${r.status}` }));
  if (!r.ok) throw new Error(j.error || `engage ${r.status}`);
  return j as T;
}

async function readIds(client: PortalClient): Promise<Known[] | null> {
  try {
    const dir = process.env[`${client.toUpperCase()}_LOCAL_DIR`];
    let text: string;
    if (dir) { const { readFile } = await import("node:fs/promises"); text = await readFile(`${dir}/ids.json`, "utf8"); }
    else { const r = await blobGet(idsPath(client), { access: "private", useCache: false }); if (!r?.stream) return null; text = await new Response(r.stream).text(); }
    return JSON.parse(text) as Known[];
  } catch { return null; }
}

/** Everything we know about the client's constituents: ids.json (client id + address), records index, portal-added prospects, latest portal edits. */
async function knownRecords(client: PortalClient, state: PortalState) {
  const [ids, rec] = await Promise.all([readIds(client), RECORDS[client]()]);
  const byCpt = new Map<number, Known>();
  for (const k of ids ?? []) if (!byCpt.has(k.cptid) || (k.clientId && !byCpt.get(k.cptid)!.clientId)) byCpt.set(k.cptid, { ...k });
  const extra: Known[] = [];
  for (const r of rec?.index ?? []) if (!byCpt.has(r.cptid)) byCpt.set(r.cptid, { cptid: r.cptid, clientId: "", name: r.name, address: "", city: r.city ?? "", zip: "" });
  for (const p of state.prospects) byCpt.set(p.cptid, { cptid: p.cptid, clientId: p.client_id ?? "", name: p.full_name, address: p.address1 ?? "", city: p.city ?? "", zip: p.zip ?? "", email: p.email ?? "", phone: p.phone ?? "" });
  for (const u of state.updates) { const k = byCpt.get(u.cptid); if (k) (k as unknown as Record<string, string>)[u.field === "client_id" ? "clientId" : u.field] = u.new_value ?? ""; }
  // Extra client-id rows (one CPTID with several client ids) still match on id.
  for (const k of ids ?? []) if (k.clientId && byCpt.get(k.cptid)?.clientId !== k.clientId) extra.push(k);
  const known = [...byCpt.values()];
  const all = [...known.map((k) => k.cptid), ...extra.map((k) => k.cptid)];
  const floor = Math.max(0, ...all.filter((c) => c < PLACEHOLDER_CPTID));
  const skip = [...new Set(all.filter((c) => c > floor))];
  return { known: [...known, ...extra], floor, skip, idsLoaded: !!ids };
}

/** Prospects added through the portal (Engage SQL), for screens built on the records index. */
export async function portalProspects(client: PortalClient): Promise<PortalState["prospects"]> {
  try { return (await engage<PortalState>(client, "state")).prospects ?? []; } catch { return []; }
}

/** Board/committee member suggestion from the Prospect Ratings page. Saved as a portal-added prospect (Engage SQL,
 *  next CPTID) so it joins the client data and the Monday refresh never overwrites it. Possible duplicates are
 *  still saved (members cannot resolve them) and flagged in the note for Catapult staff. */
export const BOARD_SUGGEST_PREFIX = "Board member: ";
export async function addBoardSuggestion(client: PortalClient, memberName: string, s: { name: string; city: string; state: string; phone: string; how: string }) {
  const state = await engage<PortalState>(client, "state");
  const { known, floor, skip } = await knownRecords(client, state);
  const parts = s.name.trim().split(/\s+/);
  const prospect = { clientId: "", firstName: parts.length > 1 ? parts.slice(0, -1).join(" ") : "", lastName: parts.length > 1 ? parts[parts.length - 1] : "", fullName: s.name.trim(), orgName: "", address1: "",
    city: s.city, state: s.state, zip: "", email: "", phone: s.phone, note: "" };
  const dups = buildMatcher(known).similar(prospect).slice(0, 3);
  const dupNote = dups.length ? ` | Possible duplicate of ${dups.map((k) => `CPTID ${k.cptid} ${k.name}`).join("; ")}` : "";
  prospect.note = `Suggested by ${memberName} (Prospect Ratings).${s.how ? ` How they know them: ${s.how}` : ""}${dupNote}`.slice(0, 1000);
  return engage<{ cptid: number }>(client, "addProspect", { floor, skip, prospect, by: `${BOARD_SUGGEST_PREFIX}${memberName}`.slice(0, 200) });
}

// ---- Campaign gifts already in the client database (weekly snapshot) ----
// Only gifts/pledges coded to the CURRENT capital campaign count. CSNF (only the older
// Henderson Health Sciences campaign is coded) and JAG (no campaign coding yet) have none.
type SnapGiving = {
  transactions: { cptid: number | null; name: string; date: string; amount: number; campaign: string; fund: string; status: string; dedication: string }[];
  pledges: { cptid: number | null; name: string; pledged: string; amount: number; campaign: string; status: string; frequency: string; expected: string }[];
};
type SnapLike = { givebutter?: SnapGiving; committed?: { cptid: number; name: string }[]; portfolio?: { cptid: number; name: string }[] } | null;
const DB_CAMPAIGN: Partial<Record<PortalClient, { load: () => Promise<SnapLike>; campaign: (c: string) => boolean; label: string }>> = {
  // PVAS: One Shelter. One Future. pledges/gifts recorded in Givebutter (other Givebutter activity is separate and excluded).
  pvas: { load: getPvasSnapshot as () => Promise<SnapLike>, campaign: (c) => c.trim() === "One Shelter. One Future.", label: "Givebutter" },
  // WCBHC: $12M Capital Campaign giving history + committee pledges.
  wcbhc: { load: getWcbhcSnapshot as () => Promise<SnapLike>, campaign: () => true, label: "Client database" },
  // BAQ: community campaign, nothing on file yet; picks up automatically once the database has campaign gifts.
  baq: { load: getBaqSnapshot as () => Promise<SnapLike>, campaign: () => true, label: "Client database" },
};
const BAD_STATUS = /refund|disput|fail|cancel|void|declin/i;

export async function dbCampaignGifts(client: PortalClient): Promise<PortalGift[]> {
  const cfg = DB_CAMPAIGN[client];
  if (!cfg) return [];
  const snap = await cfg.load().catch(() => null);
  const gb = snap?.givebutter ?? { transactions: [], pledges: [] };
  // Proxy contacts ("City of McAllen Proxy") resolve to the org's own record when the name matches exactly.
  const byName = new Map<string, number>();
  for (const p of [...(snap?.committed ?? []), ...(snap?.portfolio ?? [])]) if (p.cptid && p.cptid < PLACEHOLDER_CPTID && !byName.has(nameKey(p.name))) byName.set(nameKey(p.name), p.cptid);
  const resolve = (cptid: number | null, name: string) => {
    if (cptid && cptid < PLACEHOLDER_CPTID) return { cptid, name };
    const clean = name.replace(/\s+proxy$/i, "").trim();
    return { cptid: byName.get(nameKey(clean)) ?? null, name: clean || name };
  };
  const out: PortalGift[] = [];
  let id = -1;
  for (const t of gb.transactions ?? []) {
    if (!cfg.campaign(t.campaign || "") || BAD_STATUS.test(t.status || "") || !(Number(t.amount) > 0)) continue;
    const r = resolve(t.cptid, t.name);
    out.push({ id: id--, cptid: r.cptid, client_id: null, donor_name: r.name, kind: "gift", amount: Number(t.amount), gift_date: t.date || null,
      note: [t.fund, t.dedication].filter(Boolean).join(" · ") || null, source: "database", batch_id: null, created_by: cfg.label, created_at: "" });
  }
  for (const p of gb.pledges ?? []) {
    if (!cfg.campaign(p.campaign || "") || BAD_STATUS.test(p.status || "") || !(Number(p.amount) > 0)) continue;
    const r = resolve(p.cptid, p.name);
    out.push({ id: id--, cptid: r.cptid, client_id: null, donor_name: r.name, kind: "pledge", amount: Number(p.amount), gift_date: p.pledged || null,
      note: [p.status && p.status[0].toUpperCase() + p.status.slice(1), p.frequency].filter(Boolean).join(" · ") || null, source: "database", batch_id: null, created_by: cfg.label, created_at: "" });
  }
  return stewardshipWins(client, snap, out);
}

// Same donor recorded under another name in Givebutter / the gift file than on the Stewardship list (confirmed by Anthony).
const STEWARD_ALIASES: Partial<Record<PortalClient, Record<string, string>>> = {
  pvas: { "Maria Cuellar-Munoz": "LFD Furniture", "Klaire Duff": "Klaire & Nick Rhodes" },
};
/** The Committed (Stewardship) list is the source of truth for campaign dollars (Anthony, 2026-10-19). Each Stewardship donor
 *  counts once at their Stewardship amount: their database gifts/pledges are kept as-is when they add up to that amount,
 *  otherwise replaced by one pledge for the Stewardship amount. Database items for donors not on the list are added on top. */
function stewardshipWins(client: PortalClient, snap: SnapLike, items: PortalGift[]): PortalGift[] {
  const stew = (snap?.committed ?? []).filter((p) => Number((p as { ask?: number }).ask) > 0) as { cptid: number; name: string; ask: number }[];
  if (!stew.length) return items;
  const alias = new Map(Object.entries(STEWARD_ALIASES[client] ?? {}).map(([a, b]) => [nameKey(a), nameKey(b)]));
  const byCpt = new Map<number, number>(), byKey = new Map<string, number>();
  stew.forEach((p, i) => { if (p.cptid && p.cptid < PLACEHOLDER_CPTID) byCpt.set(p.cptid, i); byKey.set(nameKey(p.name), i); });
  const owner = (g: PortalGift) => {
    if (g.cptid != null && byCpt.has(g.cptid)) return byCpt.get(g.cptid)!;
    const k = nameKey(g.donor_name);
    return byKey.get(alias.get(k) ?? k);
  };
  const mine = new Map<number, PortalGift[]>(), rest: PortalGift[] = [];
  for (const g of items) { const o = owner(g); if (o === undefined) rest.push(g); else mine.set(o, [...(mine.get(o) ?? []), g]); }
  let id = Math.min(0, ...items.map((g) => g.id)) - 1;
  const out: PortalGift[] = [];
  stew.forEach((p, i) => {
    const gs = mine.get(i) ?? [];
    if (gs.length && Math.abs(gs.reduce((a, g) => a + g.amount, 0) - p.ask) < 1) { out.push(...gs.map((g) => ({ ...g, cptid: p.cptid, donor_name: p.name }))); return; }
    const was = gs.length ? ` (database shows ${gs.reduce((a, g) => a + g.amount, 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })})` : "";
    out.push({ id: id--, cptid: p.cptid, client_id: null, donor_name: p.name, kind: "pledge", amount: p.ask, gift_date: gs[0]?.gift_date ?? null,
      note: `Stewardship commitment${was}`, source: "database", batch_id: null, created_by: "Stewardship", created_at: "" });
  });
  return [...out, ...rest];
}

async function withDbGifts(client: PortalClient, state: PortalState): Promise<PortalState> {
  const db = await dbCampaignGifts(client);
  return { ...state, gifts: [...db, ...state.gifts] };
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const txt = (v: unknown, n = 300) => (v === null || v === undefined ? "" : String(v).trim().slice(0, n));

async function preview(client: PortalClient, buf: Buffer, state: PortalState) {
  const { rows, headers, mapped } = parseClientFile(buf);
  const { known, floor, skip, idsLoaded } = await knownRecords(client, state);
  const m = buildMatcher(known);
  const existingGift = new Set(state.gifts.map((g) => `${g.cptid ?? g.client_id ?? nameKey(g.donor_name)}|${g.kind}|${Number(g.amount).toFixed(2)}|${g.gift_date ?? ""}`));
  const newRows: { line: number; prospect: Record<string, string>; possibleDuplicates: { cptid: number; name: string }[] }[] = [];
  const changed: { line: number; cptid: number; name: string; how: string; changes: ReturnType<typeof diffRow> }[] = [];
  const gifts: { line: number; cptid: number | null; newRowIndex?: number; clientId: string; donorName: string; kind: "gift" | "pledge"; amount: number; date: string | null }[] = [];
  let unchanged = 0, duplicateGifts = 0;
  const seenNew = new Map<string, number>();
  for (const r of rows) {
    const hit = m.match(r);
    let cptid: number | null = null, newIdx: number | undefined;
    if (hit) {
      cptid = hit.k.cptid;
      const ch = diffRow(r, hit.k);
      if (ch.length) changed.push({ line: r.line, cptid, name: hit.k.name || r.fullName, how: hit.how, changes: ch }); else unchanged++;
    } else {
      const key = r.clientId ? `id:${r.clientId.toLowerCase()}` : `n:${nameKey(r.fullName)}|${r.address1.toLowerCase()}`;
      if (seenNew.has(key)) newIdx = seenNew.get(key);
      else {
        newIdx = newRows.length; seenNew.set(key, newIdx);
        newRows.push({ line: r.line, prospect: { clientId: r.clientId, firstName: r.firstName, lastName: r.lastName, fullName: r.fullName, orgName: r.orgName, address1: r.address1, city: r.city, state: r.state, zip: r.zip, email: r.email, phone: r.phone },
          possibleDuplicates: m.similar(r).map((k) => ({ cptid: k.cptid, name: k.name })) });
      }
    }
    for (const g of r.gifts) {
      const key = `${cptid ?? (r.clientId || nameKey(r.fullName))}|${g.kind}|${g.amount.toFixed(2)}|${g.date ?? ""}`;
      if (existingGift.has(key)) { duplicateGifts++; continue; }
      existingGift.add(key);
      gifts.push({ line: r.line, cptid, newRowIndex: newIdx, clientId: r.clientId, donorName: r.fullName, kind: g.kind, amount: g.amount, date: g.date });
    }
  }
  return { headers, mapped, rows: rows.length, newRows, changed, unchanged, gifts, duplicateGifts, floor, skip, idsLoaded };
}

export function portalV2Route(client: PortalClient) {
  const cfg = PORTAL_V2[client];
  async function GET(req: NextRequest) {
    if (!(await AUTH[client](req))) return bad("unauthorized", 401);
    try {
      const state = await engage<PortalState>(client, "state");
      return NextResponse.json({ ...(await withDbGifts(client, state)), goal: cfg.goal, configured: true });
    } catch (e) {
      const gifts = await dbCampaignGifts(client).catch(() => []);
      return NextResponse.json({ prospects: [], gifts, updates: [], batches: [], goal: cfg.goal, configured: false, error: (e as Error).message });
    }
  }
  async function POST(req: NextRequest) {
    if (!(await AUTH[client](req))) return bad("unauthorized", 401);
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("multipart/form-data")) {
        const fd = await req.formData();
        const file = fd.get("file");
        if (!(file instanceof File)) return bad("file required");
        if (file.size > 15_000_000) return bad("file too large (15MB max)", 413);
        if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return bad("upload an .xlsx, .xls or .csv file");
        // Database campaign gifts join the duplicate check so a client file can't count them twice.
        const state = await withDbGifts(client, await engage<PortalState>(client, "state"));
        const p = await preview(client, Buffer.from(await file.arrayBuffer()), state);
        if (fd.get("confirm") !== "1") return NextResponse.json({ preview: true, fileName: file.name, ...p });
        if (!p.newRows.length && !p.changed.length && !p.gifts.length) return NextResponse.json({ applied: false, message: "Nothing to apply" });
        const updates = p.changed.flatMap((c) => c.changes.map((x) => ({ cptid: c.cptid, field: x.field, oldValue: x.oldValue, newValue: x.newValue })));
        const res = await engage<{ batchId: number; assigned: number[] }>(client, "applyBatch", {
          floor: p.floor, skip: p.skip, fileName: file.name, by: txt(fd.get("by"), 200) || "Catapult portal",
          newRows: p.newRows.map((n) => n.prospect), updates,
          gifts: p.gifts.map((g) => ({ cptid: g.cptid, newRowIndex: g.newRowIndex, clientId: g.clientId, donorName: g.donorName, kind: g.kind, amount: g.amount, date: g.date })),
          summary: { rows: p.rows, newRows: p.newRows.length, changed: p.changed.length, unchanged: p.unchanged, gifts: p.gifts.length, duplicateGifts: p.duplicateGifts, mapped: p.mapped },
        });
        return NextResponse.json({ applied: true, ...res, newRows: p.newRows.length, changed: p.changed.length, gifts: p.gifts.length });
      }
      const b = (await req.json().catch(() => null)) as Record<string, any> | null;
      if (!b) return bad("bad body");
      const by = txt(b.by, 200) || "Catapult portal";
      if (b.op === "addProspect") {
        const pr = b.prospect ?? {};
        const fullName = txt(pr.fullName) || `${txt(pr.firstName)} ${txt(pr.lastName)}`.trim() || txt(pr.orgName);
        if (!fullName) return bad("Name is required");
        const prospect = { clientId: txt(pr.clientId, 100), firstName: txt(pr.firstName, 100), lastName: txt(pr.lastName, 100), fullName, orgName: txt(pr.orgName), address1: txt(pr.address1),
          city: txt(pr.city, 100), state: txt(pr.state, 50), zip: txt(pr.zip, 20), email: txt(pr.email, 200), phone: txt(pr.phone, 50), note: txt(pr.note, 1000) };
        const state = await engage<PortalState>(client, "state");
        const { known, floor, skip } = await knownRecords(client, state);
        const m = buildMatcher(known);
        const idHit = prospect.clientId ? m.match({ clientId: prospect.clientId, fullName: "" }) : null;
        const dups = [...(idHit ? [idHit.k] : []), ...m.similar(prospect)].filter((k, i, a) => a.findIndex((x) => x.cptid === k.cptid) === i);
        if (dups.length && !b.force) return NextResponse.json({ duplicates: dups.map((k) => ({ cptid: k.cptid, name: k.name, address: [k.address, k.city, k.zip].filter(Boolean).join(", "), clientId: k.clientId })) });
        return NextResponse.json(await engage(client, "addProspect", { floor, skip, prospect, by }));
      }
      if (b.op === "addGift") {
        const g = b.gift ?? {};
        const amount = Number(String(g.amount ?? "").replace(/[$,\s]/g, ""));
        if (!txt(g.donorName) || !(amount > 0) || !["gift", "pledge"].includes(g.kind)) return bad("Donor, type and amount are required");
        const cptid = Number(g.cptid) || null;
        return NextResponse.json(await engage(client, "addGift", { by, gift: { cptid, clientId: txt(g.clientId, 100), donorName: txt(g.donorName), kind: g.kind, amount, date: txt(g.date, 10) || null, note: txt(g.note, 1000) } }));
      }
      if (b.op === "getAsk" || b.op === "setAsk") {
        const cptid = Number(b.cptid);
        if (!(cptid > 0)) return bad("cptid required");
        const state = await engage<PortalState>(client, "state");
        const edits = (state.updates as unknown as { cptid: number; field: string; old_value: string | null; new_value: string | null; created_by?: string; created_at?: string }[])
          .filter((u) => Number(u.cptid) === cptid && u.field === "ask");
        const last = edits[edits.length - 1];
        if (b.op === "getAsk") return NextResponse.json({ edited: !!last, ask: last ? Number(last.new_value) || 0 : null, oldAsk: last ? Number(last.old_value) || 0 : null, by: last?.created_by ?? "", at: last?.created_at ?? "" });
        const amount = Number(String(b.amount ?? "").replace(/[$,\s]/g, ""));
        if (!(amount >= 0) || !Number.isFinite(amount)) return bad("Enter a dollar amount");
        const current = last ? Number(last.new_value) || 0 : Number(b.current) || 0;
        if (amount === current) return NextResponse.json({ edited: !!last, ask: current, oldAsk: last ? Number(last.old_value) || 0 : null, unchanged: true });
        await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `Ask amount edit (CPTID ${cptid})`, by, newRows: [], gifts: [],
          updates: [{ cptid, field: "ask", oldValue: String(current), newValue: String(amount) }], summary: { askEdit: true, cptid, from: current, to: amount } });
        return NextResponse.json({ edited: true, ask: amount, oldAsk: current, by });
      }
      if (b.op === "editProspect") {
        const cptid = Number(b.cptid), pr = b.prospect ?? {};
        if (!(cptid > 0)) return bad("cptid required");
        const prospect: Record<string, string> = {};
        const lim: Record<string, number> = { clientId: 100, firstName: 100, lastName: 100, fullName: 300, orgName: 300, address1: 300, city: 100, state: 50, zip: 20, email: 200, phone: 50, note: 1000 };
        for (const k of Object.keys(lim)) if (pr[k] !== undefined) prospect[k] = txt(pr[k], lim[k]);
        if (prospect.fullName !== undefined && !prospect.fullName) return bad("Name is required");
        return NextResponse.json(await engage(client, "editProspect", { cptid, prospect, by }));
      }
      if (b.op === "undo") return NextResponse.json(await engage(client, "undoBatch", { batchId: Number(b.batchId), by }));
      return bad("unknown op");
    } catch (e) {
      return bad((e as Error).message || "error", 500);
    }
  }
  return { GET, POST };
}
