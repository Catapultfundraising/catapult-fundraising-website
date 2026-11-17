import "server-only";
import { pvasCanonicalEnabled } from "./pvas-canonical";
import type { PortalClient } from "./clients";
import { DIRECT_STATE_MAX_IDS, DIRECT_STATE_MAX_NOTES, DIRECT_STATE_MAX_BYTES } from "./directFileProtocol";
import { directLaneEnabled } from "./direct-registration.server";
import { strictTrackingFor } from "./direct-tracking-reader.server";
import type { StrictTracking } from "./direct-tracking-state";
import type { DirectState, DirectValueView } from "./direct-wire";
import { DirectReadUnavailable, sourceNoteEntries } from "./direct-effective-state";
import { directSnapshot } from "./direct-snapshot";
import { directSourceCall } from "./direct-source-transport.server";

export interface DirectReadDeps {
  enabled(client: PortalClient): boolean;
  state(client: PortalClient): Promise<unknown>;
  tracking(client: PortalClient): Promise<StrictTracking>;
  sql(client: PortalClient): Promise<unknown>;
}
const defaults: DirectReadDeps = {
  enabled: directLaneEnabled, tracking: strictTrackingFor,
  state: async client => {
    const r = await directSourceCall(client, "directFileState");
    if (r.status !== 200) throw new DirectReadUnavailable();
    return r.body;
  },
  sql: async client => {
    const { engageCall } = await import("./server");
    const r = await engageCall(client, "state");
    if (r.status !== 200) throw new DirectReadUnavailable();
    return r.body;
  },
};
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const id = (x: unknown): x is number => Number.isInteger(x) && Number(x) > 0 && Number(x) <= 2147483647;
const hex = (x: unknown) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const text = (x: unknown, max: number) => typeof x === "string" && x.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x);
const date = (x: unknown) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
export function validateDirectState(raw: unknown, client: PortalClient): DirectState {
  if (Buffer.byteLength(JSON.stringify(raw) ?? "", "utf8") > DIRECT_STATE_MAX_BYTES || !object(raw) || raw.protocol !== "direct-file-v1" || raw.status !== "known" || raw.scope !== "whole-client" || raw.complete !== true ||
      raw.client !== client || !hex(raw.revision) || !text(raw.observedAt, 40) || !Number.isFinite(Date.parse(String(raw.observedAt))) ||
      !Array.isArray(raw.values) || raw.values.length > 3 * DIRECT_STATE_MAX_IDS || !Array.isArray(raw.notes) || raw.notes.length > DIRECT_STATE_MAX_NOTES || !text(raw.note, 1000)) throw new DirectReadUnavailable();
  const ids = new Set<number>(), keys = new Set<string>();
  for (const x of raw.values) {
    if (!object(x) || !id(x.cptid) || !["ask", "primarySolicitor", "secondarySolicitor"].includes(String(x.field)) ||
        !text(x.value, 300) || !text(x.template, 100) || !hex(x.authority_rev) || !text(x.request_id, 100) || !date(x.source_date) || !text(x.committed_at, 40)) throw new DirectReadUnavailable();
    if (x.field === "ask" && !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(String(x.value))) throw new DirectReadUnavailable();
    const key = `${x.cptid}:${x.field}`;
    if (keys.has(key)) throw new DirectReadUnavailable();
    keys.add(key); ids.add(x.cptid);
  }
  for (const x of raw.notes) {
    if (!object(x) || !id(x.cptid) || !hex(x.event_key) || !text(x.body, 4000) || !date(x.note_date) || !text(x.template, 100) ||
        !text(x.request_id, 100) || !date(x.source_date) || !text(x.committed_at, 40) || !text(x.declared_actor, 100) || !text(x.file_name, 200) ||
        !hex(x.file_digest) || !hex(x.authority_rev) || keys.has(`note:${x.event_key}`)) throw new DirectReadUnavailable();
    keys.add(`note:${x.event_key}`); ids.add(x.cptid);
  }
  if (ids.size > DIRECT_STATE_MAX_IDS) throw new DirectReadUnavailable();
  return raw as unknown as DirectState;
}
export type DirectObservation = { state: DirectState; tracking: Exclude<StrictTracking, { kind: "unavailable" }>; sql: { updates: Record<string, unknown>[]; prospects: Record<string, unknown>[] } };
/** Complete source layer (<=5000 IDs), not a first page of the Access baseline. No cache. */
export async function observeDirect(client: PortalClient, deps: DirectReadDeps = defaults): Promise<DirectObservation | null> {
  // PVAS source imports now write canonical SQL tables consumed by buildPvas.
  // Never reapply source_import.direct_* or their manual-precedence projection.
  if (pvasCanonicalEnabled(client)) return null;
  if (!deps.enabled(client)) return null;
  const [source, tracking, sql] = await Promise.all([deps.state(client), deps.tracking(client), deps.sql(client)]);
  if (tracking.kind === "unavailable" || !object(sql) || sql.configured === false || sql.error || !Array.isArray(sql.updates) || !Array.isArray(sql.prospects) ||
      sql.updates.length > 10000 || sql.prospects.length > 10000 ||
      !sql.updates.every(u => object(u) && id(u.cptid) && Number.isSafeInteger(u.id) && typeof u.field === "string" && (u.new_value === null || typeof u.new_value === "string")) ||
      !sql.prospects.every(p => object(p) && id(p.cptid))) throw new DirectReadUnavailable();
  const state = validateDirectState(source, client);
  const sourceIds = new Set([...state.values, ...state.notes].map(v => v.cptid));
  if (sql.prospects.some(p => sourceIds.has((p as { cptid: number }).cptid))) throw new DirectReadUnavailable();
  return { state, tracking, sql: sql as DirectObservation["sql"] };
}
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
/** SQL manual edits have priority; raw tracking presence includes explicit blank/null and legacy primary clears. */
export function currentDirectValues(observed: DirectObservation) {
  const out = new Map<number, Map<DirectValueView["field"], { value: string | null; source: boolean }>>();
  for (const value of observed.state.values) {
    const values = out.get(value.cptid) ?? new Map(); out.set(value.cptid, values);
    const key = value.field === "primarySolicitor" ? "solicitor" : value.field === "secondarySolicitor" ? "solicitor2" : "ask";
    const t = observed.tracking.document.prospects[String(value.cptid)];
    const updates = observed.sql.updates.filter(u => u.cptid === value.cptid && u.field === key).sort((a, b) => Number(a.id) - Number(b.id));
    const manual = updates[updates.length - 1];
    if (manual) values.set(value.field, { value: manual.new_value === null ? null : String(manual.new_value ?? ""), source: false });
    else if (t && (own(t, key) || (key === "solicitor" && t.updatedAt && t.solicitorEdited !== false)))
      values.set(value.field, { value: t[key] === null ? null : String(t[key] ?? ""), source: false });
    else values.set(value.field, { value: value.value, source: true });
  }
  // Preserve the existing SQL manual-secondary owner without copying it into raw tracking.
  for (const u of [...observed.sql.updates].sort((a, b) => Number(a.id) - Number(b.id))) {
    if (u.field !== "solicitor2") continue;
    const cptid = Number(u.cptid), fields = out.get(cptid) ?? new Map();
    fields.set("secondarySolicitor", { value: u.new_value === null ? null : String(u.new_value ?? ""), source: false }); out.set(cptid, fields);
  }
  return out;
}
/** View-only copies: never mutate a cached Access archive or store derived source values into tracking. */
export function composeDirectData<T>(raw: T, kind: "records" | "snapshot", observed: DirectObservation): T {
  if (!raw || typeof raw !== "object") throw new DirectReadUnavailable();
  if (kind === "snapshot") return { ...directSnapshot(raw, directClientView(observed), !["wcbhc", "baq"].includes(observed.state.client)), directSourceRevision: observed.state.revision };
  const values = currentDirectValues(observed);
  const row = (input: unknown, record = false, excludeAsk = false): unknown => {
    if (!object(input)) return input;
    const fields = values.get(Number(input.cptid));
    const notes = record ? sourceNoteEntries(observed.state.notes, Number(input.cptid)) : [];
    if (!fields && !notes.length) return input;
    const out = { ...input };
    const portfolio = { ...(object(input.portfolio) ? input.portfolio : {}) };
    for (const [key, v] of fields ?? []) {
      if (key === "ask") {
        if (excludeAsk) continue;
        const amount = v.value === null || v.value === "" ? null : Number(v.value);
        if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new DirectReadUnavailable();
        const ask = { ask: amount, directAskPresent: v.source, directManualAskPresent: !v.source, ...(v.source ? {} : { askEdited: true, askBlank: amount === null }) };
        Object.assign(record ? portfolio : out, ask);
      } else {
        const field = key === "primarySolicitor" ? "solicitor" : "solicitor2";
        Object.assign(record ? portfolio : out, { [record && field === "solicitor2" ? "secondary" : field]: v.value ?? "" });
      }
    }
    if (record) { if (fields?.size) out.portfolio = portfolio; out.directSourceNotes = notes; }
    return out;
  };
  const source = raw as Record<string, unknown>, out = { ...source };
  if (kind === "records") {
    if (!object(source.records) || !Array.isArray(source.index)) throw new DirectReadUnavailable();
    out.records = Object.fromEntries(Object.entries(source.records).map(([k, v]) => [k, row(v, true)]));
    out.index = source.index.map(v => row(v));
  }
  out.directSourceRevision = observed.state.revision;
  return out as T;
}
export async function directData<T>(client: PortalClient, raw: T, kind: "records" | "snapshot", deps?: DirectReadDeps): Promise<T> {
  const observed = await observeDirect(client, deps);
  return observed ? composeDirectData(raw, kind, observed) : raw;
}
export async function directTrackingView<T>(client: PortalClient, legacy: T, deps?: DirectReadDeps): Promise<T> {
  const observed = await observeDirect(client, deps);
  if (!observed) return legacy;
  const document = structuredClone(observed.tracking.document);
  // Do NOT inject resolved source fields into mutable prospects, even in a GET response:
  // old clients can spread/resubmit those objects. Index fallback owns assignments.
  return { ...document, pirs: (document as Record<string, unknown>).pirs ?? {}, directAssignments: directClientView(observed),
    directSourceNotes: observed.state.notes.map(n => ({ ...n, lane: "direct-source", editable: false })), directSourceRevision: observed.state.revision } as T;
}
export async function currentTracking<T>(client: PortalClient, legacy: () => Promise<T>): Promise<T> {
  if (pvasCanonicalEnabled(client)) return legacy();
  if (!directLaneEnabled(client)) return legacy();
  const raw = await strictTrackingFor(client);
  if (raw.kind === "unavailable") throw new DirectReadUnavailable();
  return { ...raw.document, pirs: (raw.document as Record<string, unknown>).pirs ?? {} } as T;
}
export function requireCurrentSql(client: PortalClient, state: unknown) {
  if ((pvasCanonicalEnabled(client) || directLaneEnabled(client)) && (!object(state) || state.configured === false || state.error || !Array.isArray(state.updates) || !Array.isArray(state.prospects)))
    throw new DirectReadUnavailable();
}
export function directClientView(observed: DirectObservation) {
  return { revision: observed.state.revision, values: [...currentDirectValues(observed)].flatMap(([cptid, fields]) => [...fields].map(([field, v]) => ({ cptid, field, ...v }))) };
}
export function sourceNoteReport(tracking: unknown, cptid: number) {
  const notes = (tracking as { directSourceNotes?: DirectState["notes"] })?.directSourceNotes ?? [];
  return notes.filter(n => n.cptid === cptid).map(n => `Imported source note (read only; declared shared-login attribution): ${n.note_date} · ${n.declared_actor} · ${n.file_name} · ${n.body} [request ${n.request_id}; source ${n.source_date}; event ${n.event_key}]`).join("\n");
}
export function sourceAssignmentReport(tracking: unknown, cptid: number, field: "primarySolicitor" | "secondarySolicitor", fallback = "") {
  const t = tracking as { prospects?: Record<string, Record<string, unknown>>; directAssignments?: ReturnType<typeof directClientView> };
  const key = field === "primarySolicitor" ? "solicitor" : "solicitor2";
  const p = t?.prospects?.[String(cptid)];
  const observed = t?.directAssignments?.values.find(v => v.cptid === cptid && v.field === field);
  // This metadata already includes strict current SQL/manual precedence; never copied into prospects.
  if (observed) return observed.value ?? "";
  if (p && (own(p, key) || (key === "solicitor" && p.updatedAt && p.solicitorEdited !== false))) return String(p[key] ?? "");
  return fallback;
}
