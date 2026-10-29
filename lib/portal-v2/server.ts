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
import { CONTACT_KEYS, OVERLAY_FIELD, buildOverlay, finalId, findDuplicates, type DupCandidate, type UpdateRow } from "@/lib/portal-v2/record-overlay";
import { listProfiles, getProfile } from "@/lib/research-profiles-store";

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

const ENGAGE_V2_PREVIEW = "https://catapult-calling-git-portal-gift-edit-void-wwwcatapultfrcom.vercel.app/api/portal-v2";
export async function engage<T>(client: PortalClient, op: string, body: Record<string, unknown> = {}): Promise<T> {
  // Preview deploys of this branch talk to the Engage branch preview (same SQL database) until Engage PR #7 is merged.
  const url = process.env.ENGAGE_PORTAL_URL_OVERRIDE || (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "feat/delete-prospect-pdfs" ? "https://catapult-calling-git-feat-delete-prospect-pdfs-wwwcatapultfrcom.vercel.app/api/portal-v2" : undefined) || (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "feat/prospect-pdf-notes" ? "https://catapult-calling-git-feat-prospect-pdf-notes-wwwcatapultfrcom.vercel.app/api/portal-v2" : undefined) || (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "fix/dashboard-10-fixes" ? ENGAGE_V2_PREVIEW : process.env.ENGAGE_PORTAL_URL), secret = process.env.PORTAL_WRITE_SECRET;
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
  const [ids, rec, dbGifts] = await Promise.all([readIds(client), RECORDS[client](), dbCampaignGifts(client)]);
  const byCpt = new Map<number, Known>();
  for (const k of ids ?? []) if (!byCpt.has(k.cptid) || (k.clientId && !byCpt.get(k.cptid)!.clientId)) byCpt.set(k.cptid, { ...k });
  const extra: Known[] = [];
  for (const g of [...dbGifts, ...state.gifts]) if (g.cptid && !byCpt.has(g.cptid)) byCpt.set(g.cptid, { cptid: g.cptid, clientId: g.client_id ?? "", name: g.donor_name, address: "", city: "", zip: "" });
  for (const r of rec?.index ?? []) if (!byCpt.has(r.cptid)) byCpt.set(r.cptid, { cptid: r.cptid, clientId: "", name: r.name, address: "", city: r.city ?? "", zip: "" });
  for (const p of state.prospects) byCpt.set(p.cptid, { cptid: p.cptid, clientId: p.client_id ?? "", name: p.full_name, address: p.address1 ?? "", city: p.city ?? "", zip: p.zip ?? "", email: p.email ?? "", phone: p.phone ?? "" });
  // Dashboard contact edits feed matching (address/city/zip/email/phone); other dashboard-only fields never do.
  const CONTACT_TO_KNOWN: Record<string, string> = { "contact:street": "address", "contact:city": "city", "contact:zip": "zip", "contact:email": "email", "contact:phone": "phone" };
  for (const u of state.updates) {
    if (u.field === "solicitor2" || u.field === "ask") continue;
    if (OVERLAY_FIELD(u.field)) { const kf = CONTACT_TO_KNOWN[u.field]; const k = byCpt.get(u.cptid); if (kf && k) (k as unknown as Record<string, string>)[kf] = u.new_value ?? ""; continue; }
    const k = byCpt.get(u.cptid); if (k) (k as unknown as Record<string, string>)[u.field === "client_id" ? "clientId" : u.field] = u.new_value ?? "";
  }
  // Extra client-id rows (one CPTID with several client ids) still match on id.
  for (const k of ids ?? []) if (k.clientId && byCpt.get(k.cptid)?.clientId !== k.clientId) extra.push(k);
  const known = [...byCpt.values()];
  const all = [...known.map((k) => k.cptid), ...extra.map((k) => k.cptid)];
  const floor = Math.max(0, ...all.filter((c) => c < PLACEHOLDER_CPTID));
  const skip = [...new Set(all.filter((c) => c > floor))];
  return { known: [...known, ...extra], floor, skip, idsLoaded: !!ids };
}

/** Full Portal v2 state (Engage SQL), or null when Engage is unreachable. */
export async function portalStateSafe(client: PortalClient): Promise<PortalState | null> {
  try { return await engage<PortalState>(client, "state"); } catch { return null; }
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

export async function dbCampaignGifts(client: PortalClient, strict = false): Promise<PortalGift[]> {
  const cfg = DB_CAMPAIGN[client];
  if (!cfg) return [];
  const snap = await cfg.load().catch(() => null);
  if (strict && !snap) throw new Error("Campaign source unavailable");
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

/** Stable key per database gift so a dashboard correction/void (saved in Engage SQL) re-applies after every refresh. */
function keyDbGifts(items: PortalGift[]): PortalGift[] {
  const seen = new Map<string, number>();
  return items.map((g) => {
    const base = `db|${g.created_by ?? ""}|${g.cptid ?? nameKey(g.donor_name)}|${g.kind}|${g.gift_date ?? ""}`;
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    return { ...g, key: n > 1 ? `${base}#${n}` : base };
  });
}
/** Database gifts with the latest dashboard correction applied; voided ones dropped. The refreshed data itself is never changed. */
function applyOverrides(items: PortalGift[], overrides: PortalState["giftOverrides"]): PortalGift[] {
  const by = new Map((overrides ?? []).map((o) => [o.gift_key, o]));
  const out: PortalGift[] = [];
  for (const g of items) {
    const o = g.key ? by.get(g.key) : undefined;
    if (!o) { out.push(g); continue; }
    if (o.voided) continue;
    out.push({ ...g, cptid: o.cptid ?? g.cptid, donor_name: o.donor_name || g.donor_name, kind: o.kind || g.kind, amount: o.amount != null ? Number(o.amount) : g.amount,
      gift_date: o.gift_date ?? g.gift_date, note: o.note ?? g.note, corrected: { by: o.created_by, at: o.created_at, from: g.amount } });
  }
  return out;
}
async function withDbGifts(client: PortalClient, state: PortalState, strict = false): Promise<PortalState> {
  const db = applyOverrides(keyDbGifts(await dbCampaignGifts(client, strict)), state.giftOverrides);
  return { ...state, gifts: [...db, ...state.gifts] };
}

/** Current campaign rows plus refresh-safe overrides, for gift-only donor lookup records. */
export async function portalCampaignStateSafe(client: PortalClient): Promise<PortalState | null> {
  const state = await portalStateSafe(client);
  return state ? withDbGifts(client, state) : null;
}

/** Name match against everything on file (records index, ids.json, portal prospects): exact name key first, then
 *  every word of the typed name (2+ letters) present. Used before a gift is recorded without a CPTID. */
export async function matchDonorName(client: PortalClient, name: string, state?: PortalState) {
  const st = state ?? await engage<PortalState>(client, "state");
  const { known } = await knownRecords(client, st);
  const nk = nameKey(name);
  const words = name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 2 && !["mr", "mrs", "ms", "dr", "and", "the"].includes(w));
  if (!nk) return [];
  const seen = new Set<number>(); const exact: Known[] = [], partial: Known[] = [];
  for (const k of known) {
    if (seen.has(k.cptid) || !k.name) continue;
    const kk = nameKey(k.name), low = k.name.toLowerCase();
    if (kk === nk) { exact.push(k); seen.add(k.cptid); }
    else if (words.length && words.every((w) => low.includes(w))) { partial.push(k); seen.add(k.cptid); }
  }
  // Last name alone also catches "Nicholas & Mariana Arredondo" vs "Nick Arredondo".
  if (!exact.length && !partial.length && words.length) {
    const last = words[words.length - 1];
    for (const k of known) if (!seen.has(k.cptid) && k.name && new RegExp(`\\b${last}\\b`, "i").test(k.name)) { partial.push(k); seen.add(k.cptid); }
  }
  return [...exact, ...partial].slice(0, 15).map((k) => ({ cptid: k.cptid, name: k.name, city: k.city, address: [k.address, k.city, k.zip].filter(Boolean).join(", "), exact: nameKey(k.name) === nk }));
}

/** Audit trail in Engage SQL for dashboard history-note changes (best effort: never blocks the save). */
export async function logHistoryAudit(client: PortalClient, a: { cptid: number; action: string; oldValue?: string | null; newValue?: string | null; by: string }) {
  try { await engage(client, "logActivity", { cptid: a.cptid, action: a.action, oldValue: a.oldValue ?? null, newValue: a.newValue ?? null, by: a.by }); } catch { /* audit only */ }
}

/** Secondary solicitor: dashboard-origin data saved in Engage SQL (portal_updates field "solicitor2"); the refresh never writes it. */
export async function secondarySolicitors(client: PortalClient): Promise<Record<string, string>> {
  try {
    const st = await engage<PortalState>(client, "state");
    const out: Record<string, string> = {};
    for (const u of st.updates) if (u.field === "solicitor2") out[String(u.cptid)] = u.new_value ?? "";
    return out;
  } catch { return {}; }
}
export async function saveSecondarySolicitor(client: PortalClient, cptid: number, oldValue: string, newValue: string, by: string) {
  await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `Secondary solicitor (CPTID ${cptid})`, by, newRows: [], gifts: [],
    updates: [{ cptid, field: "solicitor2", oldValue: oldValue || null, newValue: newValue || "" }], summary: { solicitor2: true, cptid, from: oldValue, to: newValue } });
}

/** MM/DD/YYYY or YYYY-MM-DD -> YYYY-MM-DD, or null when it is not a real calendar date. */
export function parseUsDate(v: unknown): string | null {
  const t = String(v ?? "").trim();
  let y: number, m: number, d: number;
  let x = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (x) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else { x = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t); if (!x) return null; m = +x[1]; d = +x[2]; y = +x[3]; }
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Queue a DonorSearch wealth screening (portal_updates field wealth:request). Viktor's screening job picks it up within minutes. */
async function queueScreening(client: PortalClient, cptid: number, inputs: Record<string, string | undefined>, by: string) {
  const clean = Object.fromEntries(Object.entries(inputs).filter(([, v]) => v && String(v).trim()).map(([k, v]) => [k, String(v).trim().slice(0, 100)]));
  await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `Wealth screening request (CPTID ${cptid})`, by, newRows: [], gifts: [],
    updates: [{ cptid, field: "wealth:request", oldValue: null, newValue: JSON.stringify(clean).slice(0, 1000) }], summary: { screeningRequest: true, cptid } });
}

/** Wealth capacity + rating from a completed PIR in the /research portal, matched by the PIR file name or the record name. */
const pirKey = (s: string) => s.toLowerCase().replace(/\.(pdf|docx?)$/i, "").replace(/\b(pir|profile|prospect|research|individual|final|draft|v\d+)\b/g, " ")
  .replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, " ").replace(/[^a-z ]/g, " ").replace(/\b(and|the|mr|mrs|ms|dr|jr|sr)\b/g, " ").replace(/\s+/g, " ").trim();
async function pirWealth(pirName: string, name: string) {
  const keys = [pirKey(pirName), pirKey(name)].filter((k) => k.length > 3);
  if (!keys.length) return { found: false };
  const list = await listProfiles().catch(() => []);
  const hit = list.find((p) => keys.includes(pirKey(p.name))) ?? list.find((p) => keys.some((k) => { const a = pirKey(p.name).split(" "), b = k.split(" "); return a.length > 1 && b.length > 1 && a[0] === b[0] && a[a.length - 1] === b[b.length - 1]; }));
  if (!hit) return { found: false };
  const env = await getProfile(hit.id).catch(() => null);
  const d = (env?.data ?? {}) as { givingCapacity?: string; wealthRating?: string; netWorth?: string };
  if (!d.givingCapacity && !d.wealthRating) return { found: false };
  return { found: true, profile: hit.name, status: hit.status, updatedAt: hit.updatedAt, capacity: d.givingCapacity ?? "", rating: d.wealthRating ?? "", netWorth: d.netWorth ?? "" };
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
      const download = req.nextUrl.searchParams.get("report") === "campaign";
      const format = req.nextUrl.searchParams.get("format") ?? "pdf";
      const goal = Number(req.nextUrl.searchParams.get("goal") ?? cfg.goal);
      if (download && (!Number.isFinite(goal) || goal < 100_000 || goal > 500_000_000)) return bad("Invalid campaign goal", 400);
      if (download && format !== "pdf" && format !== "xlsx") return bad("Use PDF or Excel", 400);
      const state = await withDbGifts(client, await engage<PortalState>(client, "state"), download);
      if (download) {
        const { campaignDownload } = await import("@/lib/portal-v2/campaign-export");
        return await campaignDownload(client, goal, state.gifts, format as "pdf" | "xlsx");
      }
      return NextResponse.json({ ...state, goal: cfg.goal, configured: true });
    } catch (e) {
      // Never export an incomplete campaign total when SQL or rendering is unavailable.
      if (req.nextUrl.searchParams.get("report") === "campaign") {
        console.error("Campaign export failed", client, e);
        return bad(process.env.VERCEL_ENV === "preview" ? `Campaign download unavailable: ${(e as Error).message}` : "Campaign download unavailable. Please try again.", 503);
      }
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
        const added = await engage<{ cptid: number }>(client, "addProspect", { floor, skip, prospect, by });
        // New prospect with a name + state: queue a DonorSearch screening automatically (Viktor's screening job runs it).
        if (added?.cptid && prospect.state && (prospect.firstName || prospect.fullName) && !prospect.orgName) {
          const parts = prospect.fullName.split(/\s+/);
          const first = prospect.firstName || (parts.length > 1 ? parts.slice(0, -1).join(" ") : ""), last = prospect.lastName || (parts.length > 1 ? parts[parts.length - 1] : "");
          if (first && last) await queueScreening(client, added.cptid, { first, last, street: prospect.address1, city: prospect.city, state: prospect.state, zip: prospect.zip }, by).catch(() => {});
        }
        return NextResponse.json(added);
      }
      if (b.op === "addGift") {
        const g = b.gift ?? {};
        const amount = Number(String(g.amount ?? "").replace(/[$,\s]/g, ""));
        if (!txt(g.donorName) || !(amount > 0) || !["gift", "pledge"].includes(g.kind)) return bad("Donor, type and amount are required");
        const cptid = Number(g.cptid) || null;
        const date = txt(g.date, 10) ? parseUsDate(g.date) : null;
        if (txt(g.date, 20) && !date) return bad("Use MM/DD/YYYY for the date");
        // No CPTID: show name matches first so the gift attaches to the existing donor instead of creating a second one.
        if (!cptid && !b.confirmNew) {
          const matches = await matchDonorName(client, txt(g.donorName));
          if (matches.length) return NextResponse.json({ matches });
        }
        return NextResponse.json(await engage(client, "addGift", { by, gift: { cptid, clientId: txt(g.clientId, 100), donorName: txt(g.donorName), kind: g.kind, amount, date, note: txt(g.note, 1000) } }));
      }
      if (b.op === "matchDonor") return NextResponse.json({ matches: await matchDonorName(client, txt(b.name)) });
      if (b.op === "editGift" || b.op === "voidGift") {
        const g = b.gift ?? {};
        const id = Number(g.id);
        // Database rows carry a key; anything else must be a positive SQL id.
        const key = id > 0 ? undefined : txt(g.key, 400);
        if (!(id > 0) && !key) return bad("gift id required");
        const cptid = g.cptid === undefined || g.cptid === "" ? undefined : (Number(g.cptid) || null);
        const original = g.original && typeof g.original === "object" ? { amount: Number(g.original.amount) || 0, kind: txt(g.original.kind, 10), date: txt(g.original.date, 10), name: txt(g.original.name), cptid: Number(g.original.cptid) || null } : null;
        if (b.op === "voidGift") {
          const reason = txt(b.reason, 500);
          if (!reason) return bad("Please enter a reason for voiding");
          return NextResponse.json(await engage(client, "voidGift", { by, reason, gift: { id: id > 0 ? id : undefined, key, cptid: cptid ?? original?.cptid ?? null, donorName: txt(g.donorName) || original?.name, original } }));
        }
        const amount = g.amount === undefined ? undefined : Number(String(g.amount).replace(/[$,\s]/g, ""));
        if (amount !== undefined && !(amount > 0)) return bad("Enter an amount greater than $0");
        if (g.kind !== undefined && !["gift", "pledge"].includes(g.kind)) return bad("Type must be gift or pledge");
        let date: string | null | undefined = undefined;
        if (g.date !== undefined) { date = txt(g.date, 20) ? parseUsDate(g.date) : null; if (txt(g.date, 20) && !date) return bad("Use MM/DD/YYYY for the date"); }
        return NextResponse.json(await engage(client, "editGift", { by, gift: { id: id > 0 ? id : undefined, key, cptid, donorName: g.donorName === undefined ? undefined : txt(g.donorName), kind: g.kind, amount, date, note: g.note === undefined ? undefined : txt(g.note, 1000), original } }));
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
      // ---- record tools: contact edits, wealth screening, duplicates (all saved in Engage SQL portal_updates) ----
      if (b.op === "setContact") {
        const cptid = Number(b.cptid);
        if (!(cptid > 0)) return bad("cptid required");
        const changes = (b.changes ?? {}) as Record<string, unknown>, current = (b.current ?? {}) as Record<string, unknown>;
        const updates = (CONTACT_KEYS as readonly string[]).filter((k) => changes[k] !== undefined && txt(changes[k], 300) !== txt(current[k], 300))
          .map((k) => ({ cptid, field: `contact:${k}`, oldValue: txt(current[k], 300) || null, newValue: txt(changes[k], 300) }));
        if (!updates.length) return NextResponse.json({ ok: true, unchanged: true });
        await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `Contact edit (CPTID ${cptid})`, by, newRows: [], gifts: [], updates, summary: { contactEdit: true, cptid, fields: updates.map((u) => u.field) } });
        return NextResponse.json({ ok: true, changed: updates.length });
      }
      if (b.op === "setWealth") {
        const cptid = Number(b.cptid), field = String(b.field || "");
        if (!(cptid > 0) || !["capacity", "rating"].includes(field)) return bad("cptid and field (capacity or rating) required");
        const value = txt(b.value, 200), current = txt(b.current, 200);
        if (value === current) return NextResponse.json({ ok: true, unchanged: true });
        await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `Wealth ${field} edit (CPTID ${cptid})`, by, newRows: [], gifts: [],
          updates: [{ cptid, field: `wealth:${field}`, oldValue: current || null, newValue: value }], summary: { wealthEdit: true, cptid, field, from: current, to: value } });
        return NextResponse.json({ ok: true });
      }
      if (b.op === "requestScreening") {
        const cptid = Number(b.cptid);
        if (!(cptid > 0)) return bad("cptid required");
        const inputs: Record<string, string> = {};
        for (const k of ["first", "last", "street", "city", "state", "zip", "spouseFirst", "spouseLast"]) if (txt(b.inputs?.[k], 100)) inputs[k] = txt(b.inputs[k], 100);
        if (!inputs.first || !inputs.last || !inputs.state) return bad("DonorSearch needs a first name, last name and state");
        await queueScreening(client, cptid, inputs, by);
        return NextResponse.json({ ok: true, queued: true });
      }
      if (b.op === "mergeRecords") {
        const keep = Number(b.keep), merge = (Array.isArray(b.merge) ? b.merge : []).map(Number).filter((x: number) => x > 0 && x !== keep);
        if (!(keep > 0) || !merge.length) return bad("Pick the record to keep and at least one record to merge into it");
        const ov = buildOverlay((await engage<PortalState>(client, "state")).updates as unknown as UpdateRow[]);
        if (ov.deleted.has(keep)) return bad(`CPTID ${keep} is deleted. Restore it first.`);
        if (ov.mergedInto.has(keep)) return bad(`CPTID ${keep} was already merged into CPTID ${finalId(ov, keep)}. Merge into that record instead.`);
        for (const m of merge) if (finalId(ov, m) !== m) return bad(`CPTID ${m} was already merged into CPTID ${finalId(ov, m)}`);
        await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `Merge into CPTID ${keep}`, by, newRows: [], gifts: [],
          updates: merge.map((m: number) => ({ cptid: m, field: "merged_into", oldValue: null, newValue: String(keep) })), summary: { mergeRecords: true, keep, merged: merge, note: txt(b.note, 300) } });
        return NextResponse.json({ ok: true, keep, merged: merge });
      }
      if (b.op === "unmerge" || b.op === "restoreRecord") {
        const cptid = Number(b.cptid);
        if (!(cptid > 0)) return bad("cptid required");
        const ov = buildOverlay((await engage<PortalState>(client, "state")).updates as unknown as UpdateRow[]);
        const field = b.op === "unmerge" ? "merged_into" : "deleted";
        const old = b.op === "unmerge" ? ov.mergedInto.get(cptid) : ov.deleted.get(cptid)?.reason;
        if (!old) return bad(b.op === "unmerge" ? "That record is not merged" : "That record is not deleted");
        await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `${b.op === "unmerge" ? "Unmerge" : "Restore"} CPTID ${cptid}`, by, newRows: [], gifts: [],
          updates: [{ cptid, field, oldValue: String(old), newValue: "" }], summary: { [b.op]: true, cptid } });
        return NextResponse.json({ ok: true });
      }
      if (b.op === "deleteRecord") {
        const cptid = Number(b.cptid), reason = txt(b.reason, 500);
        if (!(cptid > 0)) return bad("cptid required");
        if (!reason) return bad("Please enter a reason for deleting this record");
        await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `Delete CPTID ${cptid}`, by, newRows: [], gifts: [],
          updates: [{ cptid, field: "deleted", oldValue: null, newValue: reason }], summary: { deleteRecord: true, cptid, reason } });
        return NextResponse.json({ ok: true });
      }
      if (b.op === "notDuplicate") {
        const key = txt(b.key, 900);
        if (!/^\d+(\|\d+)+$/.test(key)) return bad("group key required");
        await engage(client, "applyBatch", { floor: 0, skip: [], fileName: `Not duplicates (${key})`, by, newRows: [], gifts: [],
          updates: [{ cptid: Number(key.split("|")[0]), field: "notdup", oldValue: null, newValue: key }], summary: { notDuplicate: key } });
        return NextResponse.json({ ok: true });
      }
      if (b.op === "duplicates") {
        const state = await engage<PortalState>(client, "state");
        const ov = buildOverlay(state.updates as unknown as UpdateRow[]);
        const data = (await RECORDS[client]()) as unknown as { index: { cptid: number; name: string; city?: string; lifetime?: number; kind?: string }[]; records?: Record<string, { contact?: Record<string, string>; clientDupOf?: number }> } | null;
        const seen = new Set<number>(); const cands: DupCandidate[] = [];
        const gone = (c: number) => ov.mergedInto.has(c) || ov.deleted.has(c);
        for (const r of data?.index ?? []) {
          if (gone(r.cptid) || seen.has(r.cptid)) continue; seen.add(r.cptid);
          const c = { ...(data?.records?.[String(r.cptid)]?.contact ?? {}), ...(ov.contact.get(r.cptid) ?? {}) } as Record<string, string>;
          cands.push({ cptid: r.cptid, name: r.name, city: c.city || r.city || "", street: c.street || c.address || "", lifetime: r.lifetime ?? 0, kind: r.kind, dupOf: data?.records?.[String(r.cptid)]?.clientDupOf });
        }
        for (const p of state.prospects) if (!seen.has(p.cptid) && !gone(p.cptid)) { seen.add(p.cptid); const c = ov.contact.get(p.cptid) ?? {}; cands.push({ cptid: p.cptid, name: p.full_name, city: c.city || p.city || "", street: c.street || p.address1 || "", lifetime: 0, kind: p.org_name ? "Organization" : "Individual" }); }
        const minS = Number(b.minStrength) || 0, ql = txt(b.q, 100).toLowerCase();
        const groups = findDuplicates(cands, ov.notdup, 100000).filter((g) => g.strength >= minS && (!ql || g.members.some((m) => `${m.name} ${m.city ?? ""} ${m.cptid}`.toLowerCase().includes(ql))));
        const names = new Map(cands.map((c) => [c.cptid, c.name]));
        const log = ov.log.slice(-300).reverse().map((l) => ({ ...l, name: names.get(l.cptid) ?? data?.index.find((r) => r.cptid === l.cptid)?.name ?? `CPTID ${l.cptid}`, targetName: l.target ? names.get(l.target) ?? `CPTID ${l.target}` : undefined,
          current: l.action === "merged" ? ov.mergedInto.get(l.cptid) === l.target : l.action === "deleted" ? ov.deleted.has(l.cptid) : false }));
        return NextResponse.json({ total: groups.length, groups: groups.slice(0, Math.min(Number(b.limit) || 300, 1000)), log });
      }
      if (b.op === "pirWealth") {
        const pir = txt(b.pirName, 300), name = txt(b.name, 300);
        return NextResponse.json(await pirWealth(pir, name));
      }
      if (b.op === "undo") return NextResponse.json(await engage(client, "undoBatch", { batchId: Number(b.batchId), by }));
      return bad("unknown op");
    } catch (e) {
      return bad((e as Error).message || "error", 500);
    }
  }
  return { GET, POST };
}
