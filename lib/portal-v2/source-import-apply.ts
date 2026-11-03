// Website side of the guarded source import (REVIEW-ONLY; hidden/disabled until configured AND reviewed).
// Live preview and status lookups need SOURCE_IMPORT_PREVIEW=enabled + ENGAGE_SOURCE_IMPORT_URL + PORTAL_WRITE_SECRET (all absent by default).
// Apply additionally needs SOURCE_IMPORT_APPLY=enabled AND the hard SOURCE_TRANSPORT_APPROVED constant (false).
// The browser never sees the bearer secret or SQL credentials; previews are HMAC-bound and expire in 15 minutes.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { REGISTRY_META } from "./source-registry";
import { planWrites, reconcile, SOURCE_TRANSPORT_APPROVED, SourceError, type ReconInput, type ReconResult, type WriteOp } from "./source-reconcile";

type Env = Record<string, string | undefined>;
export const SOURCE_TOKEN_TTL_MS = 15 * 60_000;
const url = (env: Env) => env.ENGAGE_SOURCE_IMPORT_URL?.trim() || "";
const secretOk = (env: Env) => (env.PORTAL_WRITE_SECRET ?? "").length >= 24;
export const sourcePreviewConfigured = (env: Env = process.env) => env.SOURCE_IMPORT_PREVIEW === "enabled" && !!url(env) && secretOk(env);
export const sourceApplyConfigured = (env: Env = process.env, transportApproved: boolean = SOURCE_TRANSPORT_APPROVED) => transportApproved && env.SOURCE_IMPORT_APPLY === "enabled" && sourcePreviewConfigured(env);

export interface EngageState { registryRev: string; duplicateKeys: number[]; current: { key: number; values: Record<string, string | null>; unreadable: string[] }[]; baseline: { key: number; col: string; value: string | null }[]; overlayKeys: number[]; prospectKeys: number[] }
/** Engage preview state -> reconciliation inputs. Only source-provenance baseline rows count; unreadable values are omitted (=> held). */
export function stateToInputs(s: EngageState): Pick<ReconInput, "baseline" | "current" | "overlays" | "heldKeys"> {
  if (s.registryRev !== REGISTRY_META.rev) throw new SourceError("Engage registry revision differs from this website; deploy both together");
  if (!Array.isArray(s.duplicateKeys) || !Array.isArray(s.current)) throw new SourceError("Engage preview state is malformed");
  const heldKeys = new Map<number, string>(s.duplicateKeys.map((k) => [k, "destination has more than one row for this ID"]));
  const current = new Map<number, Record<string, string | null>>();
  for (const r of s.current) {
    if (current.has(r.key)) { heldKeys.set(r.key, "destination reported this ID twice"); continue; } const v: Record<string, string | null> = {}; for (const [c, x] of Object.entries(r.values)) if (!r.unreadable.includes(c)) v[c] = x; current.set(r.key, v); }
  const baseline = new Map<number, Record<string, string | null>>();
  for (const b of s.baseline) baseline.set(b.key, { ...(baseline.get(b.key) ?? {}), [b.col]: b.value });
  const overlays = [...s.overlayKeys.map((key) => ({ key, col: "portal_updates", provenance: "unknown" as const })), ...s.prospectKeys.map((key) => ({ key, col: null, provenance: "unknown" as const }))];
  for (const k of heldKeys.keys()) current.delete(k);
  return { baseline, current, overlays, heldKeys };
}

export interface SourceTokenPayload { v: 1; client: string; table: string; mode: "update" | "first-load"; preparedApproval: string | null; requestId: string; fileName: string; fileDigest: string; fileDate: string | null; registryRev: string; exp: number; ops: WriteOp[] }
const key = (secret: string | undefined) => { if (!secret || secret.length < 24) throw new SourceError("Source import is not configured"); return createHmac("sha256", secret).update("source-import/v1").digest(); };
export const fileDigest = (csv: string) => createHash("sha256").update(csv, "utf8").digest("hex");
export const newSourceRequestId = () => randomBytes(16).toString("hex");
export function signSourceToken(p: SourceTokenPayload, secret: string | undefined) {
  const body = Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
  return `${body}.${createHmac("sha256", key(secret)).update(body).digest("base64url")}`;
}
/** allowExpired: only for forwarding an already-issued request (Engage replays a committed request or refuses as expired). */
export function verifySourceToken(token: unknown, secret: string | undefined, now = Date.now(), allowExpired = false) {
  if (typeof token !== "string" || token.length > 3_000_000) throw new SourceError("Preview token missing");
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) throw new SourceError("Preview token malformed");
  const want = createHmac("sha256", key(secret)).update(body).digest(); const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new SourceError("Preview token is not valid; preview again");
  const json = Buffer.from(body, "base64url").toString("utf8");
  const payload = JSON.parse(json) as SourceTokenPayload;
  if (payload.v !== 1 || payload.registryRev !== REGISTRY_META.rev) throw new SourceError("Preview token is for another registry revision; preview again");
  if (!allowExpired && !(payload.exp > now)) throw new SourceError("This preview expired; preview again");
  return { payload, previewHash: createHash("sha256").update(json).digest("hex") };
}

/** Builds the reconciliation + signed token from Engage state. Returns no token when nothing is applicable. */
export function livePreview(base: Omit<ReconInput, "baseline" | "current" | "overlays" | "heldKeys">, state: EngageState, meta: { fileName: string; csv: string; fileDate: string | null; secret: string | undefined; now?: number }) {
  const result: ReconResult = reconcile({ ...base, ...stateToInputs(state) });
  const ops = planWrites(result);
  const requestId = newSourceRequestId();
  const token = ops.length ? signSourceToken({ v: 1, client: base.client, table: base.table, mode: base.mode, preparedApproval: base.prepared?.approvalId ?? null, requestId, fileName: meta.fileName.slice(0, 300), fileDigest: fileDigest(meta.csv), fileDate: meta.fileDate, registryRev: REGISTRY_META.rev, exp: (meta.now ?? Date.now()) + SOURCE_TOKEN_TTL_MS, ops }, meta.secret) : null;
  return { result, ops: ops.length, token, requestId };
}

export function applyRequestBody(token: unknown, actor: unknown, secret: string | undefined, now = Date.now()) {
  if (typeof actor !== "string" || !actor.trim() || actor.length > 200) throw new SourceError("Enter your name (recorded as the shared-login author)");
  const { payload, previewHash } = verifySourceToken(token, secret, now, true);
  const { v: _v, exp, ...rest } = payload;
  return { op: "apply", client: payload.client, request: { ...rest, actor: actor.trim(), previewHash, previewExp: exp } };
}

export type ApplyOutcome = { ok: true; body: Record<string, unknown> } | { ok: false; unconfirmed: true; requestId: string } | { ok: false; unconfirmed: false; status: number; body: Record<string, unknown> };
/** One POST, no automatic retry. Network failure / 5xx / unreadable reply => unconfirmed (check status with the same requestId). */
export async function postToEngage(fetchImpl: typeof fetch, env: Env, body: Record<string, unknown>, requestId: string): Promise<ApplyOutcome> {
  let res: Response;
  try { res = await fetchImpl(url(env), { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${env.PORTAL_WRITE_SECRET}` }, body: JSON.stringify(body), cache: "no-store" }); }
  catch { return { ok: false, unconfirmed: true, requestId }; }
  const j = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!j || res.status >= 500) return res.status === 503 && j?.code === "disabled" ? { ok: false, unconfirmed: false, status: 503, body: j } : { ok: false, unconfirmed: true, requestId };
  return res.ok ? { ok: true, body: j } : { ok: false, unconfirmed: false, status: res.status, body: j };
}
