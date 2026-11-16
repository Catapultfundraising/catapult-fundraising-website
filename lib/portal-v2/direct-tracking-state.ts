/**
 * Strict tracking owner for the OFF direct-business lane. Node/server only.
 * Do not replace this with get*Tracking(): those legacy readers turn errors into EMPTY.
 * No network callback, SQL, write, cache or effective/source-state recursion here.
 */
import "server-only";
import { createHash } from "node:crypto";

export const DIRECT_CLIENTS = ["jag", "csnf", "pvas", "wcbhc", "baq"] as const;
export type DirectClient = typeof DIRECT_CLIENTS[number];
export type DirectField = "ask" | "primarySolicitor" | "secondarySolicitor";
type Obj = Record<string, unknown>;
export type TrackingDocument = { prospects: Record<string, Obj>; activity: Obj[]; removed?: Obj[] };
export type RawRead = { kind: "absent" } | { kind: "bytes"; bytes: Uint8Array };
export type StrictTracking =
  | { kind: "absent"; revision: string; document: TrackingDocument }
  | { kind: "present"; revision: string; document: TrackingDocument }
  | { kind: "unavailable"; reason: "read-failed" | "invalid" | "too-large" };
export type ManualState = {
  revision: string;
  fields: Record<DirectField, { present: boolean }>;
  notesReviewed: boolean;
  notes: { date: string; body: string }[];
};
export const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const object = (x: unknown): x is Obj => !!x && typeof x === "object" && !Array.isArray(x);
const id = (x: unknown): x is number => Number.isInteger(x) && Number(x) > 0 && Number(x) <= 2147483647;
export const trackingPath = (client: DirectClient) => `${client}-data/tracking.json`;
export function directClient(v: unknown): v is DirectClient {
  return typeof v === "string" && (DIRECT_CLIENTS as readonly string[]).includes(v);
}
const hash = (client: DirectClient, tag: string, bytes?: Uint8Array) =>
  createHash("sha256").update(`direct-tracking-v1\0${trackingPath(client)}\0${tag}\0`).update(bytes ?? new Uint8Array()).digest("hex");
function validDocument(x: unknown): x is TrackingDocument {
  if (!object(x) || !object(x.prospects) || !Array.isArray(x.activity) ||
      (own(x, "removed") && !Array.isArray(x.removed))) return false;
  if (Object.keys(x.prospects).length > 10000 || x.activity.length + ((x.removed as unknown[])?.length ?? 0) > 10000) return false;
  for (const [key, p] of Object.entries(x.prospects)) {
    if (!/^[1-9]\d*$/.test(key) || !id(Number(key)) || !object(p)) return false;
    for (const f of ["solicitor", "solicitor2"] as const) {
      if (own(p, f) && p[f] !== null && (typeof p[f] !== "string" || p[f].length > 300)) return false;
    }
    if (own(p, "ask") && p.ask !== null && typeof p.ask !== "string" && typeof p.ask !== "number") return false;
    if (own(p, "updatedAt") && typeof p.updatedAt !== "string") return false;
    if (own(p, "solicitorEdited") && typeof p.solicitorEdited !== "boolean") return false;
  }
  return [...x.activity, ...((x.removed as unknown[]) ?? [])].every(a =>
    object(a) && id(a.cptid) && typeof a.note === "string" && a.note.length <= 4000 &&
    typeof a.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.date) &&
    Number.isFinite(Date.parse(`${a.date}T00:00:00Z`)) && new Date(`${a.date}T00:00:00Z`).toISOString().slice(0, 10) === a.date);
}
/** Exact original bytes, including BOM/whitespace, are revision input. Bad UTF-8 fails. */
export async function readStrictTracking(client: DirectClient, read: (path: string) => Promise<RawRead>): Promise<StrictTracking> {
  if (!directClient(client)) return { kind: "unavailable", reason: "invalid" };
  let raw: RawRead;
  try { raw = await read(trackingPath(client)); } catch { return { kind: "unavailable", reason: "read-failed" }; }
  if (!raw || typeof raw !== "object") return { kind: "unavailable", reason: "invalid" };
  if (raw.kind === "absent") return { kind: "absent", revision: hash(client, "absent"), document: { prospects: {}, activity: [], removed: [] } };
  if (raw.kind !== "bytes" || !(raw.bytes instanceof Uint8Array)) return { kind: "unavailable", reason: "invalid" };
  if (raw.bytes.byteLength > 4 * 1024 * 1024) return { kind: "unavailable", reason: "too-large" };
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw.bytes);
    // A BOM is valid UTF-8, but is not JSON. Refuse rather than normalize revision/parser meaning.
    const document: unknown = JSON.parse(text);
    if (!validDocument(document)) return { kind: "unavailable", reason: "invalid" };
    return { kind: "present", revision: hash(client, "bytes", raw.bytes), document };
  } catch { return { kind: "unavailable", reason: "invalid" }; }
}
/** Trusted projection only of tracking, not SQL or effective values.
 * Backend MUST independently read its SQL manual/prospect guards in its transaction.
 * Legacy primary clears were encoded by updatedAt with omitted solicitor.
 * Include removed history conservatively; never call an audit receipt the current history.
 */
export function projectTrackingManual(state: StrictTracking, cptids: number[]): Record<string, ManualState> | null {
  if (state.kind === "unavailable" || !Array.isArray(cptids) || !cptids.length || cptids.length > 100 ||
      cptids.some(c => !id(c)) || new Set(cptids).size !== cptids.length) return null;
  const allNotes = [...state.document.activity, ...(state.document.removed ?? [])];
  const requested = new Set(cptids);
  if (allNotes.filter(n => requested.has(n.cptid as number)).length > 100) return null;
  return Object.fromEntries(cptids.map(c => {
    const p = state.document.prospects[String(c)] ?? {};
    const primary = own(p, "solicitor") || (!!p.updatedAt && p.solicitorEdited !== false);
    return [String(c), {
      revision: state.revision,
      fields: { ask: { present: own(p, "ask") }, primarySolicitor: { present: primary }, secondarySolicitor: { present: own(p, "solicitor2") } },
      notesReviewed: true,
      notes: allNotes.filter(n => n.cptid === c).map(n => ({ date: n.date as string, body: n.note as string })),
    }];
  }));
}
