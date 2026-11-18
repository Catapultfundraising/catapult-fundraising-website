import "server-only";
import type { PvasTracking } from "@/lib/pvas-tracking-types";
import { pvasCanonicalEnabled } from "./portal-v2/pvas-canonical";
import { validCanonicalTrackingProspect } from "./portal-v2/pvas-tracking-presence";
import { decodePvasTrackingCompact, encodePvasTrackingCompact } from "./portal-v2/pvasTrackingCompact";
import * as legacy from "./pvas-tracking.legacy";

// Legacy refresh/upload destination only; dashboard PIR reads come from SQL.
export const PVAS_PIRS_PATH = "pvas-data/pirs.json";

const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const int = (x: unknown, min: number) => typeof x === "number" && Number.isInteger(x) && x >= min && x <= 2147483647;
const nullableText = (x: unknown) => x === null || typeof x === "string";
function displayDate(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const iso = us ? `${us[3]}-${us[1].padStart(2,"0")}-${us[2].padStart(2,"0")}` : raw;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(Date.parse(iso)) && new Date(iso).toISOString().slice(0,10) === iso ? iso : "";
}
function canonicalHistory(raw: unknown): boolean {
  if (!object(raw) || typeof raw.id !== "string" || !object(raw._canonical)) return false;
  const n = raw._canonical;
  const date = raw.date;
  const validDay = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
  return (date === "" || validDay) && date === displayDate(n.date) &&
    (raw.sourceDate === undefined || raw.sourceDate === n.date) &&
    (date !== "" || n.date === null || n.date === "" || raw.sourceDate === n.date) &&
    typeof raw.note === "string" && typeof raw.by === "string" && typeof raw.at === "string" && raw.kind === (n.source === null || n.source === "" ? "Note" : n.source) &&
    int(n.noteId, 1) && int(n.rowId, -2147483648) && int(n.cptid, 1) && n.cptid === raw.cptid &&
    int(n.version, 0) && nullableText(n.text) && nullableText(n.date) && nullableText(n.source) &&
    (n.order === null || typeof n.order === "number" && Number.isFinite(n.order)) && typeof n.deleted === "boolean" && raw.id === `sql:${n.noteId}`;
}

/** Existing authenticated Engage gateway owns all PVAS tracking persistence.
 * getTracking returns canonical portfolio assignments, never legacy tracking
 * assignment overrides. No Blob/local fixture fallback, even on read failure. */
export async function getPvasTracking(): Promise<PvasTracking> {
  if (!pvasCanonicalEnabled("pvas")) return legacy.getPvasTracking();
  const { engageCall } = await import("./portal-v2/server");
  const r = await engageCall("pvas", "getTrackingCompactV1");
  if (r.status !== 200 || r.body.configured !== true || r.body.error || !object(r.body.state)) throw new Error("PVAS SQL tracking unavailable");
  const state = decodePvasTrackingCompact(r.body.state);
  if (!object(state.prospects) || !Array.isArray(state.activity) || !Array.isArray(state.removed) ||
      !Object.entries(state.prospects).every(([key,p]) => /^[1-9]\d*$/.test(key) && int(Number(key),1) && validCanonicalTrackingProspect(p)) ||
      typeof state.revision !== "string" || !/^[a-f0-9]{64}$/.test(state.revision) || !object(state.pirs) ||
      !Object.values(state.pirs).every(p => object(p) && typeof p.name === "string" && typeof p.url === "string")) throw new Error("Invalid PVAS SQL tracking");
  const all = [...(state.activity as unknown[]), ...((state.removed as unknown[]) ?? [])];
  if (!all.every(canonicalHistory) || new Set(all.map(x => (x as { id: string }).id)).size !== all.length) throw new Error("Invalid canonical note identity/metadata");
  return state as unknown as PvasTracking;
}

export async function savePvasTracking(state: PvasTracking, action?: { requestId: string; by: string }): Promise<void> {
  if (!pvasCanonicalEnabled("pvas")) return legacy.savePvasTracking(state);
  if (!action || !/^[a-f0-9]{32}$/.test(action.requestId) || !action.by.trim() || !state.revision) throw new Error("PVAS canonical tracking requires action identity and revision");
  const { engageCall } = await import("./portal-v2/server");
  const r = await engageCall("pvas", "setTrackingCompactV1", { data: encodePvasTrackingCompact(state), ...action });
  if (r.status !== 200 || r.body.ok !== true || r.body.requestId !== action.requestId ||
      typeof r.body.revision!=="string" || !/^[a-f0-9]{64}$/.test(r.body.revision) || r.body.error) throw new PvasTrackingSaveError(r.status);
}

export class PvasTrackingSaveError extends Error {
  constructor(readonly status: number) { super(status === 409 ? "PVAS tracking changed; reload before saving" : "PVAS SQL tracking save unconfirmed; reconcile the same requestId"); }
}
