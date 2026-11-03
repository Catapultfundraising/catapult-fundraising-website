// Reusable column-mapping profiles for /research/source-import (staff only). METADATA ONLY: client, table, the
// registry revision, the destination list snapshot, header names in order and the header->destination choices.
// Never CSV rows, values, CPTIDs, actor, request ids, preview tokens or secrets.
// The profile hash is an integrity check only, never an approval or signature. Every use re-resolves the CURRENT
// server context (registry revision, destination types/states, prepared/allocator/insert-policy digests); the profile
// cannot choose that context. Held fields may be mapped only for preview diagnosis (they stay held);
// unsupported/nonwritable destinations are refused.
import { createHash } from "node:crypto";
import { SourceError } from "./source-reconcile";

export const PROFILE_KIND = "catapult-source-mapping-profile";
export const PROFILE_VERSION = 1;
export const PROFILE_MAX_BYTES = 65536;
const MAX_HEADERS = 500;
const MAX_HEADER_LEN = 200;
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u001F\u007F]/;

export type ProfileDest = { col: string; ty: string; len?: number | null; p?: number | null; s?: number | null; st: string; key: string };
export type ProfileContext = {
  client: string; table: string; registryRev: string; keyCol: string; keyKind: string;
  dests: readonly ProfileDest[];
  preparedDigest: string | null; allocatorDigest: string | null; insertPolicyDigest: string | null;
};
export type MappingProfile = {
  kind: string; v: number; client: string; table: string; registryRev: string; keyCol: string; keyKind: string;
  destsDigest: string; ctx: { prepared: string | null; allocator: string | null; insertPolicy: string | null };
  headers: string[]; mapping: [string, string][]; profileHash: string;
};

const sha = (x: string) => createHash("sha256").update(x, "utf8").digest("hex");
const norm = (h: string) => h.trim().toLowerCase();

/** Deterministic digest of the current destination list (name, type, size, state, key). */
export function destsDigest(dests: readonly ProfileDest[]) {
  const rows = [...dests].map((d) => [d.col, d.ty, d.len ?? null, d.p ?? null, d.s ?? null, d.st, d.key === d.col]).sort((a, b) => (String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : 0));
  return sha(JSON.stringify(["dests/v1", rows]));
}
function body(p: Omit<MappingProfile, "profileHash">) {
  // fixed field order; header order and mapping order are part of the hash
  return JSON.stringify([p.kind, p.v, p.client, p.table, p.registryRev, p.keyCol, p.keyKind, p.destsDigest, [p.ctx.prepared, p.ctx.allocator, p.ctx.insertPolicy], p.headers, p.mapping]);
}
export const profileHashOf = (p: Omit<MappingProfile, "profileHash">) => sha(body(p));

function checkHeaders(headers: unknown): string[] {
  if (!Array.isArray(headers) || !headers.length || headers.length > MAX_HEADERS) throw new SourceError("Profile/file headers must be a list of 1 to 500 names");
  for (const h of headers) if (typeof h !== "string" || !h.trim() || h.length > MAX_HEADER_LEN || CTRL.test(h)) throw new SourceError("Every header must be plain text of 1 to 200 characters");
  for (const h of headers as string[]) if (RESERVED.has(h.trim().toLowerCase())) throw new SourceError(`Header name not allowed in a mapping profile: ${h}`);
  const n = (headers as string[]).map(norm);
  if (new Set(n).size !== n.length) throw new SourceError("Duplicate column headers (after trimming and ignoring case)");
  return [...(headers as string[])];
}

/** Validate header->destination choices against the CURRENT destination list. Returns ordered pairs (header order). */
function checkMapping(ctx: ProfileContext, headers: string[], pairs: [string, string][]) {
  const seenH = new Set<string>(); const seenD = new Set<string>(); const held: string[] = [];
  const out: [string, string][] = [];
  for (const [h, d] of pairs) {
    if (!headers.includes(h)) throw new SourceError(`Mapping names a column that is not in the header list: ${h}`);
    if (seenH.has(h)) throw new SourceError(`Column mapped twice: ${h}`); seenH.add(h);
    if (d === "") continue;
    const dest = ctx.dests.find((x) => x.col === d);
    if (!dest) throw new SourceError(`Unknown destination field: ${d}`);
    if (dest.st === "unsupported" || dest.st === "nonwritable") throw new SourceError(`${d} cannot be mapped (${dest.st})`);
    if (dest.st !== "candidate" && dest.st !== "held") throw new SourceError(`${d} has an unknown state`);
    if (seenD.has(d)) throw new SourceError(`Destination mapped twice: ${d}`); seenD.add(d);
    if (dest.st === "held") held.push(d);
    out.push([h, d]);
  }
  if (!ctx.keyCol || !seenD.has(ctx.keyCol)) throw new SourceError(`Map a column to the key ${ctx.keyCol || "(none: table has no verified key)"}`);
  out.sort((a, b) => headers.indexOf(a[0]) - headers.indexOf(b[0]));
  return { pairs: out, held };
}

function pairsFromObject(m: unknown): [string, string][] {
  if (!m || typeof m !== "object" || Array.isArray(m)) throw new SourceError("mapping must be an object");
  const out: [string, string][] = [];
  for (const k of Object.keys(m)) { const v = (m as Record<string, unknown>)[k]; if (typeof v !== "string" || v.length > 128) throw new SourceError(`mapping for ${k} must be text`); out.push([k, v]); }
  return out;
}

/** Server build: profile from the CURRENT context plus the staff member's current choices. */
export function buildProfile(ctx: ProfileContext, headersIn: unknown, mappingIn: unknown): MappingProfile {
  const headers = checkHeaders(headersIn);
  const { pairs } = checkMapping(ctx, headers, pairsFromObject(mappingIn));
  const p: Omit<MappingProfile, "profileHash"> = { kind: PROFILE_KIND, v: PROFILE_VERSION, client: ctx.client, table: ctx.table, registryRev: ctx.registryRev, keyCol: ctx.keyCol, keyKind: ctx.keyKind,
    destsDigest: destsDigest(ctx.dests), ctx: { prepared: ctx.preparedDigest, allocator: ctx.allocatorDigest, insertPolicy: ctx.insertPolicyDigest }, headers, mapping: pairs };
  const out = { ...p, profileHash: profileHashOf(p) };
  // the downloaded file (pretty-printed, as the page writes it) must itself pass parseProfile's 64 KiB bound
  if (Buffer.byteLength(JSON.stringify(out, null, 2), "utf8") > PROFILE_MAX_BYTES) throw new SourceError("This mapping is too large to save as a profile (over 64 KB); use fewer or shorter column names");
  return out;
}

const TOP = ["kind", "v", "client", "table", "registryRev", "keyCol", "keyKind", "destsDigest", "ctx", "headers", "mapping", "profileHash"];
const CTXK = ["prepared", "allocator", "insertPolicy"];
const exactKeys = (o: object, keys: string[]) => { const k = Object.keys(o); return k.length === keys.length && keys.every((x) => Object.prototype.hasOwnProperty.call(o, x)); };
const str = (x: unknown, max = 200) => typeof x === "string" && x.length <= max && !CTRL.test(x);
const dig = (x: unknown) => x === null || (typeof x === "string" && /^[a-f0-9]{64}$/.test(x));

/** Strict parse of an uploaded profile (actual UTF-8 bytes <= 64 KiB). Hash is recomputed from the actual body. */
export function parseProfile(text: unknown): MappingProfile {
  if (typeof text !== "string" || !text) throw new SourceError("Choose a mapping profile file");
  if (Buffer.byteLength(text, "utf8") > PROFILE_MAX_BYTES) throw new SourceError("Mapping profile is larger than 64 KB");
  let j: unknown; try { j = JSON.parse(text); } catch { throw new SourceError("Mapping profile is not valid JSON"); }
  if (!j || typeof j !== "object" || Array.isArray(j) || !exactKeys(j, TOP)) throw new SourceError("Not a mapping profile (unexpected or missing fields)");
  const o = j as Record<string, unknown>;
  if (o.kind !== PROFILE_KIND || o.v !== PROFILE_VERSION) throw new SourceError("Not a supported mapping profile version");
  for (const k of ["client", "table", "keyCol", "keyKind"]) if (!str(o[k], 128)) throw new SourceError(`Profile ${k} is invalid`);
  const hex = (x: unknown) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
  if (!hex(o.registryRev) || !hex(o.destsDigest) || !hex(o.profileHash)) throw new SourceError("Profile digests are invalid");
  const c = o.ctx;
  if (!c || typeof c !== "object" || Array.isArray(c) || !exactKeys(c, CTXK) || !CTXK.every((k) => dig((c as Record<string, unknown>)[k]))) throw new SourceError("Profile context is invalid");
  const headers = checkHeaders(o.headers);
  if (!Array.isArray(o.mapping) || o.mapping.length > MAX_HEADERS || !o.mapping.every((e) => Array.isArray(e) && e.length === 2 && str(e[0], MAX_HEADER_LEN) && str(e[1], 128) && e[1] !== "")) throw new SourceError("Profile mapping is invalid");
  const cc = c as Record<string, string | null>;
  const p: Omit<MappingProfile, "profileHash"> = { kind: PROFILE_KIND, v: PROFILE_VERSION, client: o.client as string, table: o.table as string, registryRev: o.registryRev as string, keyCol: o.keyCol as string, keyKind: o.keyKind as string,
    destsDigest: o.destsDigest as string, ctx: { prepared: cc.prepared, allocator: cc.allocator, insertPolicy: cc.insertPolicy }, headers, mapping: (o.mapping as [string, string][]).map(([a, b]) => [a, b]) };
  if (profileHashOf(p) !== o.profileHash) throw new SourceError("Mapping profile was edited or damaged (integrity check failed)");
  return { ...p, profileHash: o.profileHash as string };
}

/** Check an uploaded profile against the CURRENT server context and the CURRENT file headers (exact names). */
export function checkProfile(text: unknown, ctx: ProfileContext, fileHeadersIn: unknown) {
  const p = parseProfile(text);
  const fileHeaders = checkHeaders(fileHeadersIn);
  if (p.client !== ctx.client || p.table !== ctx.table) throw new SourceError(`This profile is for ${p.client}/${p.table}, not ${ctx.client}/${ctx.table}`);
  const stale: string[] = [];
  if (p.registryRev !== ctx.registryRev) stale.push("field registry revision");
  if (p.keyCol !== ctx.keyCol || p.keyKind !== ctx.keyKind) stale.push("key");
  if (p.destsDigest !== destsDigest(ctx.dests)) stale.push("destination fields or types");
  if (p.ctx.prepared !== ctx.preparedDigest) stale.push("prepared registration");
  if (p.ctx.allocator !== ctx.allocatorDigest) stale.push("allocator registration");
  if (p.ctx.insertPolicy !== ctx.insertPolicyDigest) stale.push("insert policy");
  if (stale.length) throw new SourceError(`Profile is out of date (${stale.join(", ")} changed); map the columns again and download a new profile`);
  const { pairs, held } = checkMapping(ctx, p.headers, p.mapping);
  const missing = p.headers.filter((h) => !fileHeaders.includes(h));
  if (missing.length) throw new SourceError(`This file is missing columns the profile expects: ${missing.join(", ")}`);
  const mapping: Record<string, string> = Object.create(null); // own data only (reserved names are also refused above)
  for (const h of fileHeaders) mapping[h] = "";
  for (const [h, d] of pairs) mapping[h] = d;
  const unmapped = fileHeaders.filter((h) => !p.headers.includes(h));
  return { mapping, unmapped, held, profileHash: p.profileHash };
}
