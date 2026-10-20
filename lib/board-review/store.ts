import { get, put } from "@vercel/blob";
import type { BrAnswer, BrClient, BrList, BrResponses, BrSettings } from "@/lib/board-review/config";

// Prospect Ratings storage = Azure SQL (schema engage, tables ratings_*; every row keyed by client).
// The website only has the read-only portal_reader login and no static IP, so every read and write
// goes to the Catapult Engage project's /api/ratings (Bearer PORTAL_WRITE_SECRET), same pattern as
// portal v2. ENGAGE_RATINGS_URL overrides the URL (preview points at the Engage branch preview);
// otherwise it is derived from ENGAGE_PORTAL_URL. The Monday portal-data-refresh never touches these
// tables. Old Vercel Blob JSON ({client}-data/board-review/*) is imported once by importFromBlob().
export interface BrMember {
  id: string; name: string; email: string; role: string; salt: string; hash: string; version: number;
  invitedAt: string; dueDate?: string; reminderSentAt?: string; inviteCount?: number; createdAt?: string; lastSeen?: string;
  answered?: number; queued?: string;
}

// Until the Engage ratings-queue branch is merged, website previews use that branch's preview (no protection on Engage).
const ENGAGE_PREVIEW = "https://catapult-calling-git-ratings-queue-wwwcatapultfrcom.vercel.app/api/ratings";
function url() {
  const u = process.env.ENGAGE_RATINGS_URL || (process.env.VERCEL_ENV === "preview" ? ENGAGE_PREVIEW : "") || (process.env.ENGAGE_PORTAL_URL ? process.env.ENGAGE_PORTAL_URL.replace(/\/api\/portal-v2\/?$/, "/api/ratings") : "");
  if (!u || !process.env.PORTAL_WRITE_SECRET) throw new Error("Prospect Ratings storage is not configured (ENGAGE_RATINGS_URL / PORTAL_WRITE_SECRET)");
  return u;
}
async function engage<T = Record<string, unknown>>(client: BrClient | null, op: string, body: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(url(), { method: "POST", cache: "no-store", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.PORTAL_WRITE_SECRET}` }, body: JSON.stringify({ ...body, op, client }) });
  const j = await r.json().catch(() => ({ error: `ratings store ${r.status}` }));
  if (!r.ok) throw new Error(j.error || `ratings store ${r.status}`);
  return j as T;
}

export const getList = async (c: BrClient) => (await engage<{ list: BrList | null }>(c, "list")).list;
export const saveList = (c: BrClient, l: BrList) => engage(c, "saveList", { list: l });
export const getMembers = async (c: BrClient) => (await engage<{ members: BrMember[] }>(c, "members")).members;
export const addMember = (c: BrClient, m: Partial<BrMember> & { id: string; name: string; email: string; salt: string; hash: string }) => engage(c, "addMember", { member: m });
export const setPassword = (c: BrClient, id: string, salt: string, hash: string, bump: boolean) => engage(c, "setPassword", { id, salt, hash, bump });
export const touchMember = (c: BrClient, id: string) => engage(c, "touch", { id });
export const removeMember = (c: BrClient, id: string, deleteAnswers: boolean) => engage(c, "removeMember", { id, deleteAnswers });
export async function getResponses(c: BrClient, id: string): Promise<BrResponses> {
  const { answers } = await engage<{ answers: Record<string, BrAnswer> }>(c, "responses", { memberId: id });
  const updatedAt = Object.values(answers).map((a) => a.at).sort().pop() ?? "";
  return { memberId: id, answers, updatedAt };
}
/** changes: cptid -> answer, or null to clear. */
export const saveAnswers = (c: BrClient, memberId: string, changes: Record<string, BrAnswer | null>) => engage(c, "saveAnswers", { memberId, changes });
export async function getState(c: BrClient) {
  return engage<{ list: BrList | null; members: BrMember[]; answers: Record<string, Record<string, BrAnswer>>; settings?: BrSettings }>(c, "state");
}
export const queueInvites = (c: BrClient, items: { memberId: string; kind: "invite" | "resend"; password: string; salt: string; hash: string }[], clientName: string, link: string, by: string) =>
  engage<{ queued: number }>(c, "queueInvites", { items, clientName, link, by });
export const saveSettings = async (c: BrClient, settings: Partial<BrSettings>, by: string) => (await engage<{ settings: BrSettings }>(c, "saveSettings", { settings, by })).settings;
export const inviteLog = async (c: BrClient) => (await engage<{ log: Record<string, unknown>[] }>(c, "inviteLog")).log;

// ---------- one-time import of the old Blob JSON ----------
const base = (c: BrClient) => `${c}-data/board-review`;
async function readBlob<T>(path: string): Promise<T | null> {
  try {
    const r = await get(path, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text()) as T;
  } catch { return null; }
}
type OldMember = { id: string; name: string; email: string; role: string; salt: string; hash: string; version: number; invitedAt: string; lastSeen?: string };
/** Copies list/members/responses from Blob into SQL once (marker blob migrated-sql.json). force=true re-imports
 *  over existing SQL rows for this client (use at merge time if production kept writing to Blob meanwhile). */
export async function importFromBlob(c: BrClient, force = false) {
  const marker = `${base(c)}/migrated-sql.json`;
  if (!force && (await readBlob(marker))) return { skipped: "already imported" };
  const [list, members] = await Promise.all([readBlob<BrList>(`${base(c)}/list.json`), readBlob<OldMember[]>(`${base(c)}/members.json`)]);
  let nm = 0, na = 0;
  if (list) await saveList(c, list);
  const have = new Set((await getMembers(c)).map((m) => m.id));
  for (const m of members ?? []) {
    if (!have.has(m.id)) { await addMember(c, { id: m.id, name: m.name, email: m.email, role: m.role, salt: m.salt, hash: m.hash, version: m.version, createdAt: m.invitedAt, lastSeen: m.lastSeen }); nm++; }
    const r = await readBlob<BrResponses>(`${base(c)}/responses-${m.id}.json`);
    if (r && Object.keys(r.answers).length) { await saveAnswers(c, m.id, r.answers); na += Object.keys(r.answers).length; }
  }
  await put(marker, JSON.stringify({ at: new Date().toISOString(), list: list?.entries.length ?? 0, members: nm, answers: na }), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  return { list: list?.entries.length ?? 0, members: nm, answers: na };
}
