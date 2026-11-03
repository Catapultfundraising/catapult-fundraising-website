// Durable gift-ID website gateway (REVIEW-ONLY, DISABLED). Server-side helpers for /api/research-source-import.
// - The website copy of the gift registrations is EMPTY; commits additionally need sourceApplyConfigured(), which is
//   hard-gated by SOURCE_TRANSPORT_APPROVED=false. Nothing here can activate writes.
// - Plans are built server-side from the re-parsed CSV + explicit per-row operator decisions; a signed job token binds
//   the manifest hash (jobId) and every input that is not inside the manifest (mapping digest, expiry).
// - Committed IDs reach an export only through server-signed per-batch proofs re-validated against the manifest slice.
//   Browser-asserted outcomes are never accepted; held/uncommitted/unproven rows stay blank; PROV values never appear.
// - Reload recovery is NOT implemented (same-session only). Baseline attestation of adopted gifts is NOT implemented.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { parseCsv } from "./csv-updates";
import { neutralize, APPENDED } from "./gift-preview";
import { planGiftJob, verifyGiftJob, validateGiftRequest, validValue, previewRowCap, validateManifest, validOutcome, validGiftId, giftJobId, giftRegDigest, giftEnvelopeBytes, jobRequestId, canonManifestJson, SourceImportError, GIFT_MAX_ENVELOPE_BYTES, type GiftRegistration, type GiftRow, type GiftJobManifest, type GiftCommitRequest } from "./gift-identity-plan";

export class DurableGiftError extends Error { constructor(message: string, public status = 400) { super(message); } }
function bad(m: string, s = 400): never { throw new DurableGiftError(m, s); }
export const DURABLE_MAX_BODY = 4_000_000;      // exact serialized request bytes for plan/export
export const DURABLE_MAX_RESPONSE = 4_000_000;  // exact serialized response bytes (deployed limit ~4.5 MB)
export const JOB_TOKEN_TTL_MS = 60 * 60_000, PROOF_TTL_MS = 60 * 60_000;
export const EXPORT_COLS = ["Catapult Gift ID", "Gift ID Status"] as const;
const foldH = (h: string) => h.trim().replace(/\s+/g, " ").toLowerCase();
const RESERVED = new Set([...EXPORT_COLS, ...APPENDED].map(foldH));

let REGS: readonly GiftRegistration[] = Object.freeze([]);
/** Website copy of the reviewed gift registrations: EMPTY. Test hook only with SOURCE_PREPARED_TEST_HOOK=1 outside production. */
export const giftRegistrations = () => REGS;
export function __setGiftRegistrationsForTests(r: GiftRegistration[]) {
  if (process.env.SOURCE_PREPARED_TEST_HOOK !== "1" || process.env.NODE_ENV === "production") throw new Error("test hook disabled");
  REGS = Object.freeze([...r]);
}
export function registrationFor(client: string) {
  const g = REGS.filter((x) => x.client === client);
  return g.length === 1 ? g[0] : null;
}

// ---------- signing (domain-separated: a job token can never stand in for a proof or vice versa) ----------
type Signed<T> = { p: T; s: string };
const key = (secret: string, domain: string) => createHmac("sha256", secret).update(`catapult-durable-gift/${domain}/v1`).digest();
/** Same minimum as the existing source-token key guard: a configured secret of at least 24 characters. */
const goodSecret = (s: string | undefined): s is string => typeof s === "string" && s.length >= 24;
function sign<T>(secret: string | undefined, domain: "job" | "proof", p: T): string {
  if (!goodSecret(secret)) bad("server secret not configured", 500);
  const body = Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
  return `${body}.${createHmac("sha256", key(secret!, domain)).update(body).digest("base64url")}`;
}
function verify<T extends { typ: string; exp: number }>(tok: unknown, secret: string | undefined, domain: "job" | "proof", now: number): T {
  if (!goodSecret(secret)) bad("server secret not configured", 500);
  if (typeof tok !== "string" || tok.length > 400_000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(tok)) bad(`bad ${domain} token`);
  const [body, mac] = (tok as string).split(".");
  const want = createHmac("sha256", key(secret!, domain)).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) bad(`${domain} token signature invalid`);
  let p: T; try { p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { return bad(`bad ${domain} token`); }
  if (!p || p.typ !== domain) bad(`wrong token type (expected ${domain})`);
  if (!(typeof p.exp === "number" && p.exp > now)) bad(`${domain} token expired; plan again`);
  return p;
}
void ({} as Signed<unknown>);

const sha = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const mapDigest = (m: Record<string, string>) => sha(JSON.stringify(Object.keys(m).sort().map((k) => [k, m[k]])));
export interface JobToken { typ: "job"; jobId: string; client: string; registrationId: string; registrationVersion: number; registrationDigest: string; mappingDigest: string; fileDigest: string; fileName: string; totalOrdinals: number; actor: string; fileDate: string | null; batchHashes: string[]; exp: number }
export interface ProofRow { o: number; a: "new" | "adopt" | "correct"; u: string; p: number; l: number }
export interface BatchProof { typ: "proof"; jobId: string; client: string; fileDigest: string; registrationDigest: string; batchIndex: number; requestId: string; rows: ProofRow[]; exp: number }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const sized = <T,>(o: T): T => { if (Buffer.byteLength(JSON.stringify(o), "utf8") > DURABLE_MAX_RESPONSE) bad("Result too large for one response; split the file", 413); return o; };
const posInt = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= 2147483647;
/** exact positive int32 as written: no sign, no leading zeros, no spaces/fractions */
const exactInt = (s: string) => (/^[1-9]\d{0,9}$/.test(s) && Number(s) <= 2147483647 ? Number(s) : null);

export type Decision = { o: number; d: "held" } | { o: number; d: "new" } | { o: number; d: "adopt"; locator: number; expected: Record<string, string | null> } | { o: number; d: "correct"; giftId: string; expected: Record<string, string | null> };

/** Build a signed plan. mapping: CSV header -> registered column, plus exactly one header mapped to "@person" (donor CPTID). */
export function buildDurablePlan(o: { client: string; csv: string; mapping: unknown; decisions: unknown; actor: unknown; fileName: unknown; fileDate: unknown; secret: string | undefined; now: number }) {
  const g = registrationFor(o.client); if (!g) bad("No reviewed gift registration for this client", 404);
  if (typeof o.actor !== "string" || !o.actor.trim() || o.actor.length > 200 || o.actor !== o.actor.trim()) bad("Enter your name (recorded as stated, not a verified identity)");
  if (typeof o.fileName !== "string" || !o.fileName || o.fileName.length > 300) bad("bad file name");
  if (o.fileDate !== null && !(typeof o.fileDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.fileDate))) bad("Source export date must be YYYY-MM-DD or unknown");
  const grid = parseCsv(o.csv); if (grid.length < 2) bad("CSV needs a header and at least one row");
  const headers = grid[0]; const rows = grid.slice(1);
  if (rows.some((r) => r.length !== headers.length)) bad("Every row must have exactly as many cells as the header");
  // Returned-ID reimport is NOT implemented: a file that already carries Catapult Gift ID / status / provisional columns is
  // refused (never read as an unverified UUID, never used to infer new/adopt/correct, never duplicated in the export).
  if (headers.some((h) => RESERVED.has(foldH(h)))) bad("This file already has a Catapult Gift ID, Gift ID Status or provisional preview column. Returned-ID files are not supported yet; use the original source export.");
  if (!isObj(o.mapping)) bad("bad mapping");
  const mapping = o.mapping as Record<string, unknown>;
  const regCols = new Set(g!.columns.map((c) => c.col)); const used = new Set<string>(); let personH: string | null = null;
  for (const [h, c] of Object.entries(mapping)) {
    if (typeof c !== "string" || !headers.includes(h) || headers.filter((x) => x === h).length !== 1) bad(`mapping header "${h}" is not a unique CSV header`);
    if (c === "@person") { if (personH) bad("map exactly one donor CPTID column"); personH = h; continue; }
    if (!regCols.has(c as string) || used.has(c as string)) bad(`"${c}" is not a registered column or is mapped twice`);
    used.add(c as string);
  }
  if (!personH) bad("map the donor CPTID column");
  if (!Array.isArray(o.decisions) || o.decisions.length !== rows.length) bad("one decision per CSV row is required");
  const idx = (h: string) => headers.indexOf(h);
  const decided: GiftRow[] = [], held: number[] = [];
  (o.decisions as unknown[]).forEach((d0, i) => {
    if (!isObj(d0) || d0.o !== i) bad("decisions must be in row order", 400);
    const d = d0 as unknown as Decision;
    const keys = JSON.stringify(Object.keys(d0).sort());
    const want = d.d === "held" || d.d === "new" ? ["d", "o"] : d.d === "adopt" ? ["d", "expected", "locator", "o"] : d.d === "correct" ? ["d", "expected", "giftId", "o"] : null;
    if (!want || keys !== JSON.stringify(want)) bad(`row ${i + 1}: decision has missing or unexpected fields`);
    if (d.d === "held") { held.push(i); return; }
    const person = exactInt(rows[i][idx(personH!)]); if (person === null) bad(`row ${i + 1}: donor CPTID is not an exact positive whole number`);
    const mapped: Record<string, string> = {};
    for (const [h, c] of Object.entries(mapping)) if (c !== "@person") { const v = rows[i][idx(h)]; if (v !== "") mapped[c as string] = v; }
    if (d.d === "new") { decided.push({ ordinal: i, action: "new", person: person!, values: mapped, expected: null }); return; }
    if (!isObj(d.expected)) bad(`row ${i + 1}: expected snapshot required`);
    const exp = d.expected as Record<string, string | null>;
    if (d.d === "adopt") { if (!posInt(d.locator)) bad(`row ${i + 1}: bad locator`); decided.push({ ordinal: i, action: "adopt", locator: d.locator, person: person!, values: {}, expected: exp }); return; }
    if (d.d === "correct") {
      if (!validGiftId(d.giftId)) bad(`row ${i + 1}: bad Catapult Gift ID`);
      const values = Object.fromEntries(Object.entries(mapped).filter(([c, v]) => exp[c] !== v));
      if (!Object.keys(values).length) { held.push(i); return; } // nothing changed: not a write, keep it held/unchanged
      decided.push({ ordinal: i, action: "correct", giftId: d.giftId, person: person!, values, expected: exp }); return;
    }
    bad(`row ${i + 1}: unknown decision`);
  });
  held.sort((a, b) => a - b);
  const fileDigest = sha(o.csv);
  const base = { client: o.client, registrationId: g!.id, registrationVersion: g!.version, registrationDigest: giftRegDigest(g!), actor: o.actor as string, fileName: o.fileName as string, fileDigest, fileDate: o.fileDate as string | null };
  let plan: ReturnType<typeof planGiftJob>;
  try { plan = planGiftJob(base, decided, held, rows.length, g!.columns.length); } catch (e) { if (e instanceof SourceImportError) bad(e.message, e.status); throw e; }
  for (const r of plan.requests) {
    // backend-equivalent row contract (types, required values, expected keys, budget) BEFORE anything is signed
    try { validateGiftRequest(r, [g!]); } catch (e) { if (e instanceof SourceImportError) bad(`Not plannable: ${e.message}${typeof e.detail === "number" ? ` (row ${e.detail + 1})` : ""}`, e.status === 409 ? 400 : e.status); throw e; }
    if (giftEnvelopeBytes(r) > GIFT_MAX_ENVELOPE_BYTES) bad("a batch exceeds the request byte budget", 413);
  }
  const token: JobToken = { typ: "job", jobId: plan.jobId, client: o.client, registrationId: g!.id, registrationVersion: g!.version, registrationDigest: base.registrationDigest, mappingDigest: mapDigest(mapping as Record<string, string>), fileDigest, fileName: base.fileName, totalOrdinals: rows.length, actor: base.actor, fileDate: base.fileDate, batchHashes: plan.manifest.batches.map((b) => b.hash), exp: o.now + JOB_TOKEN_TTL_MS };
  return sized({ token: sign(o.secret, "job", token), jobId: plan.jobId, manifest: plan.manifest, batches: plan.requests.map((r) => r.rows), summary: { batches: plan.requests.length, decided: decided.length, held: held.length, total: rows.length } });
}

/** Verify a job token + manifest binding. Returns the token payload. */
export function verifyJob(token: unknown, manifest: unknown, secret: string | undefined, now: number, client: string): { t: JobToken; m: GiftJobManifest } {
  const t = verify<JobToken>(token, secret, "job", now);
  if (t.client !== client) bad("job belongs to another client");
  if (!isObj(manifest)) bad("bad manifest");
  const m = manifest as unknown as GiftJobManifest;
  try { validateManifest(m); } catch (e) { if (e instanceof SourceImportError) bad(e.message, e.status); throw e; }
  if (giftJobId(m) !== t.jobId) bad("manifest does not match the signed job");
  const eq = m.client === t.client && m.registrationId === t.registrationId && m.registrationVersion === t.registrationVersion && m.registrationDigest === t.registrationDigest && m.fileDigest === t.fileDigest && m.fileName === t.fileName && m.totalOrdinals === t.totalOrdinals && m.actor === t.actor && m.fileDate === t.fileDate && JSON.stringify(m.batches.map((b) => b.hash)) === JSON.stringify(t.batchHashes);
  if (!eq) bad("manifest fields differ from the signed job");
  const g = registrationFor(client); if (!g || g.id !== t.registrationId || g.version !== t.registrationVersion || giftRegDigest(g) !== t.registrationDigest) bad("gift registration changed since planning; plan again", 409);
  return { t, m };
}

/** Upstream giftCommit body for one batch (rows must equal the manifest slice; backend re-checks). */
export function commitBody(o: { client: string; token: unknown; manifest: unknown; batchIndex: unknown; rows: unknown; secret: string | undefined; now: number }) {
  const { t, m } = verifyJob(o.token, o.manifest, o.secret, o.now, o.client);
  if (!Number.isSafeInteger(o.batchIndex) || (o.batchIndex as number) < 0 || (o.batchIndex as number) >= m.batchCount) bad("bad batch index");
  if (!Array.isArray(o.rows)) bad("bad rows");
  const i = o.batchIndex as number;
  const request: GiftCommitRequest = { client: m.client, registrationId: m.registrationId, registrationVersion: m.registrationVersion, registrationDigest: m.registrationDigest, actor: m.actor, fileName: m.fileName, fileDigest: m.fileDigest, fileDate: m.fileDate, requestId: jobRequestId(t.jobId, i), rows: o.rows as GiftRow[], job: { expectedJobId: t.jobId, batchIndex: i, manifest: m } };
  try { verifyGiftJob(request); } catch (e) { if (e instanceof SourceImportError) bad(e.message, e.status); throw e; }
  if (giftEnvelopeBytes(request) > GIFT_MAX_ENVELOPE_BYTES) bad("batch too large", 413);
  return { op: "giftCommit", request };
}

/** Turn an upstream giftStatus body for batch i into a signed proof, or null (unconfirmed/inconsistent). */
export function proofFor(o: { client: string; token: unknown; manifest: unknown; batchIndex: unknown; status: unknown; secret: string | undefined; now: number }): string | null {
  const { t, m } = verifyJob(o.token, o.manifest, o.secret, o.now, o.client);
  if (!Number.isSafeInteger(o.batchIndex) || (o.batchIndex as number) < 0 || (o.batchIndex as number) >= m.batchCount) bad("bad batch index");
  const i = o.batchIndex as number, rq = jobRequestId(t.jobId, i), sl = m.batches[i];
  const slice = m.decided.slice(sl.first, sl.last + 1);
  if (!isObj(o.status) || o.status.confirmed !== true || o.status.found !== true) return null;
  const out = o.status.outcome;
  if (!validOutcome(out, { requestId: rq, client: m.client, registrationId: m.registrationId, targets: slice.map((e) => ({ o: e.o, a: e.a, t: e.t, l: e.l })) })) return null;
  const by = new Map(out.rows.map((x) => [x.ordinal, x]));
  const rows: ProofRow[] = slice.map((e) => { const x = by.get(e.o)!; return { o: e.o, a: e.a, u: x.giftId, p: e.p, l: x.locator }; });
  const p: BatchProof = { typ: "proof", jobId: t.jobId, client: m.client, fileDigest: m.fileDigest, registrationDigest: m.registrationDigest, batchIndex: i, requestId: rq, rows, exp: o.now + PROOF_TTL_MS };
  return sign(o.secret, "proof", p);
}

const safeName = (n: string) => (n.replace(/\.csv$/i, "").replace(/[^A-Za-z0-9 .-]+/g, "-").replace(/_/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "gifts");
const q = (c: string) => `"${c.replace(/"/g, '""')}"`;
/** Augmented REVIEW copy: original cells (formula-neutralized, so NOT a reimport-safe exact copy) + Catapult Gift ID only for proven rows. */
export function durableExport(o: { client: string; csv: string; token: unknown; manifest: unknown; proofs: unknown; secret: string | undefined; now: number }) {
  const { t, m } = verifyJob(o.token, o.manifest, o.secret, o.now, o.client);
  if (sha(o.csv) !== t.fileDigest) bad("This is not the file that was planned");
  if (!Array.isArray(o.proofs) || o.proofs.length > m.batchCount) bad("bad proofs");
  const ids = new Map<number, string>(); const seenB = new Set<number>();
  for (const s of o.proofs as unknown[]) {
    const p = verify<BatchProof>(s, o.secret, "proof", o.now);
    if (p.jobId !== t.jobId || p.client !== m.client || p.fileDigest !== m.fileDigest || p.registrationDigest !== m.registrationDigest) bad("proof belongs to another job/file/registration");
    if (!Number.isSafeInteger(p.batchIndex) || p.batchIndex < 0 || p.batchIndex >= m.batchCount || seenB.has(p.batchIndex) || p.requestId !== jobRequestId(t.jobId, p.batchIndex)) bad("bad or duplicate proof batch");
    seenB.add(p.batchIndex);
    const sl = m.batches[p.batchIndex], slice = m.decided.slice(sl.first, sl.last + 1);
    if (!Array.isArray(p.rows) || p.rows.length !== slice.length) bad("proof does not cover its whole batch");
    p.rows.forEach((r, k) => { const e = slice[k];
      if (r.o !== e.o || r.a !== e.a || r.p !== e.p || !validGiftId(r.u) || (e.a === "correct" && r.u !== e.t) || (e.a === "adopt" && r.l !== e.l) || !posInt(r.l) || ids.has(r.o)) bad("proof row does not match the manifest");
      ids.set(r.o, r.u); });
  }
  const grid = parseCsv(o.csv); const headers = grid[0], rows = grid.slice(1);
  if (rows.length !== m.totalOrdinals || rows.some((r) => r.length !== headers.length)) bad("Every row must have exactly as many cells as the header");
  if (headers.some((h) => RESERVED.has(foldH(h)))) bad("The file already has a Catapult Gift ID, Gift ID Status or provisional preview column");
  const held = new Set(m.held), decided = new Set(m.decided.map((e) => e.o));
  const line = (cells: string[]) => cells.map((c) => q(neutralize(c).v)).join(",");
  const out = [line([...headers, ...EXPORT_COLS])];
  rows.forEach((r, i) => { const id = ids.get(i);
    const status = id ? "saved (committed, verified)" : held.has(i) ? "held - not saved" : decided.has(i) ? "not confirmed - check status" : "not in plan";
    out.push(line([...r, id ?? "", status])); });
  const text = out.join("\r\n") + "\r\n";
  return sized({ fileName: `${safeName(t.fileName)}-catapult-gift-ids.csv`, csv: text, proven: ids.size, held: held.size, unconfirmed: decided.size - ids.size, note: "Review copy: formula-like cells are escaped with a leading apostrophe, so this is not a reimport-safe exact copy." });
}
export { canonManifestJson };

/** Strict website preflight for a preview query (kind/keys/ints/UUIDs/limit R) before any upstream read. */
export function previewQuery(q: unknown, g: GiftRegistration) {
  const R = previewRowCap(g.columns.length);
  if (!isObj(q)) bad("bad preview query");
  const ks = JSON.stringify(Object.keys(q).sort()); const uniq = (a: unknown[]) => new Set(a).size === a.length;
  const list = (k: string, ok: (v: unknown) => boolean) => { const a = q[k]; if (!Array.isArray(a) || !a.length || a.length > R || !a.every(ok) || !uniq(a)) bad(`1..${R} unique ${k} per preview call`); };
  if (q.kind === "locators" && ks === '["kind","locators"]') list("locators", posInt);
  else if (q.kind === "gifts" && ks === '["giftIds","kind"]') list("giftIds", validGiftId);
  else if (q.kind === "persons" && ks === '["kind","persons"]') list("persons", posInt);
  else if (q.kind === "history" && (ks === '["kind","person"]' || ks === '["after","kind","person"]')) { if (!posInt(q.person) || (q.after !== undefined && !(Number.isSafeInteger(q.after) && (q.after as number) >= 0 && (q.after as number) <= 2147483647))) bad("bad history query"); }
  else bad("bad preview query");
  return q;
}
/** Strict projection of the upstream preview: everything is rebuilt from validated known fields for THIS registration and
 *  THIS query; any mismatch is 502 (never relayed). Flags stay advisory; commit re-checks under lock. */
export function projectPreview(body: unknown, g: GiftRegistration, query: Record<string, unknown>) {
  const no = (): never => bad("Preview unavailable (unexpected response)", 502);
  const R = previewRowCap(g.columns.length);
  if (!isObj(body) || body.registrationId !== g.id || body.rowCap !== R || typeof body.giftOverridesActive !== "boolean") no();
  const b = body as Record<string, unknown>;
  const bool = (v: unknown) => (typeof v === "boolean" ? v : no());
  const nn = (v: unknown) => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : no());
  const cols = new Map(g.columns.map((c) => [c.col, c]));
  const row = (x: unknown) => {
    if (!isObj(x) || !posInt(x.locator)) no();
    const r = x as Record<string, unknown>;
    const gid = r.giftId === undefined || r.giftId === null ? null : validGiftId(r.giftId) ? r.giftId : no();
    const conflict = r.identityConflict === undefined ? false : bool(r.identityConflict);
    if (conflict && gid !== null) no();
    if (r.matches !== undefined) { const m = nn(r.matches); if (m === 1) no(); return { locator: r.locator as number, matches: m, giftId: gid, identityConflict: conflict }; }
    const person = r.person === null ? null : posInt(r.person) ? (r.person as number) : no();
    if (bool(r.personReadable) !== (person !== null)) no();
    if (!isObj(r.values) || Object.keys(r.values).length !== cols.size) no();
    const values: Record<string, { v: string | null; readable: true } | { readable: false }> = {};
    for (const [c, d] of cols) { const cv = (r.values as Record<string, unknown>)[c];
      if (!isObj(cv)) no(); const cell = cv as Record<string, unknown>;
      if (cell.readable === false) { values[c] = { readable: false }; continue; } // any relayed v is dropped
      if (cell.readable !== true || !(cell.v === null || validValue(d as never, cell.v))) no();
      values[c] = { v: cell.v as string | null, readable: true }; }
    let baseline: Record<string, { present: boolean; provenance: "source" | null; equalsCurrent: boolean | null }> | null = null;
    if (r.baseline !== null && r.baseline !== undefined) {
      if (gid === null || !isObj(r.baseline) || Object.keys(r.baseline).length !== cols.size) no();
      baseline = {};
      for (const c of cols.keys()) { const e = (r.baseline as Record<string, unknown>)[c]; if (!isObj(e)) no(); const f = e as Record<string, unknown>;
        const present = bool(f.present); const prov = f.provenance === null ? null : f.provenance === "source" ? "source" as const : no();
        const eq = f.equalsCurrent === null ? null : bool(f.equalsCurrent);
        if (!present && (prov !== null || eq !== null)) no();
        baseline[c] = { present, provenance: prov, equalsCurrent: eq }; }
    }
    return { locator: r.locator as number, person, personReadable: person !== null, values, giftId: gid, identityConflict: conflict, donorMismatch: r.donorMismatch === undefined ? false : bool(r.donorMismatch), baseline };
  };
  const out: Record<string, unknown> = { registrationId: g.id, rowCap: R, giftOverridesActive: b.giftOverridesActive, note: "Read-only preview; every save re-checks under lock. Flags are advisory." };
  const rowsOf = () => { if (!Array.isArray(b.rows)) no(); const rs = (b.rows as unknown[]).map(row); if (new Set(rs.map((r) => r.locator)).size !== rs.length) no(); return rs; };
  if (query.kind === "persons") {
    const ps = query.persons as number[];
    if (!Array.isArray(b.persons) || b.persons.length !== ps.length) no();
    out.persons = (b.persons as unknown[]).map((x, i) => { if (!isObj(x) || x.person !== ps[i]) no(); const y = x as Record<string, unknown>; return { person: ps[i], masterMatches: nn(y.masterMatches), portalOverlay: bool(y.portalOverlay), portalProspect: bool(y.portalProspect) }; });
  } else if (query.kind === "locators") {
    const ls = query.locators as number[]; const rs = rowsOf();
    if (rs.length !== ls.length || rs.some((r, i) => r.locator !== ls[i])) no();
    out.rows = rs;
  } else if (query.kind === "gifts") {
    const ids = query.giftIds as string[];
    if (!Array.isArray(b.gifts) || b.gifts.length !== ids.length) no();
    const gifts = (b.gifts as unknown[]).map((x, i) => { if (!isObj(x) || x.giftId !== ids[i]) no(); const y = x as Record<string, unknown>;
      if (bool(y.found)) { if (!posInt(y.locator) || !(y.person === undefined || posInt(y.person))) no(); return { giftId: ids[i], found: true, locator: y.locator as number, person: (y.person as number | undefined) ?? null }; }
      return { giftId: ids[i], found: false }; });
    const locs = [...new Set(gifts.filter((x) => x.found).map((x) => (x as { locator: number }).locator))];
    const rs = rowsOf(); if (rs.length !== locs.length || rs.some((r, i) => r.locator !== locs[i])) no();
    out.gifts = gifts; out.rows = rs;
  } else if (query.kind === "history") {
    const after = (query.after as number | undefined) ?? 0; const rs = rowsOf();
    if (rs.length > R || rs.some((r, i) => r.locator <= (i ? rs[i - 1].locator : after))) no();
    const hasMore = bool(b.hasMore); const next = b.next === null ? null : posInt(b.next) ? b.next : no();
    if (hasMore ? next !== rs[rs.length - 1]?.locator : next !== null) no();
    // a candidate whose readable donor differs from the queried donor is held (never eligible)
    out.rows = rs.map((r) => ("person" in r && r.person !== query.person ? { ...r, donorMismatch: true } : r));
    out.hasMore = hasMore; out.next = next;
  } else no();
  return sized(out);
}
