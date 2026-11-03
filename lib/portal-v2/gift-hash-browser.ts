// Browser-safe (WebCrypto, no node: imports) copy of the owning gift batch-hash functions in gift-identity-plan.ts:
// giftRowHash = sha256(JSON.stringify(canon(row))), batch hash = sha256(JSON.stringify(rowHashes)). Used to verify every
// recovery-file part against the signed manifest batch hashes BEFORE anything is sent. Parity is tested against the server.
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const canon = (x: unknown): unknown => (Array.isArray(x) ? x.map(canon) : isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
async function sha256Hex(s: string) {
  const d = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
export const browserGiftRowHash = (row: unknown) => sha256Hex(JSON.stringify(canon(row)));
export async function browserBatchHash(rows: unknown[]) { const hs: string[] = []; for (const r of rows) hs.push(await browserGiftRowHash(r)); return sha256Hex(JSON.stringify(hs)); }
export const RECOVERY_FILE_KEYS = ["header", "headerMac", "jobToken", "parts"] as const;
/** Structural + hash check of a downloaded recovery file (exact keys, parts 0..n-1 once each, every part hash equal to
 *  the signed header/manifest hashes). Unknown fields such as "states" are refused, never used to skip a status check. */
export async function verifyRecoveryFile(f: unknown): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isObj(f) || Object.keys(f).length !== 4 || !RECOVERY_FILE_KEYS.every((k) => k in f)) return { ok: false, reason: "not a recovery file (unexpected or missing fields)" };
  const h = f.header, parts = f.parts;
  if (!isObj(h) || !isObj(h.manifest) || !Array.isArray(h.partHashes) || !Array.isArray(parts) || typeof f.headerMac !== "string" || typeof f.jobToken !== "string") return { ok: false, reason: "malformed recovery file" };
  const mb = h.manifest.batches;
  if (!Array.isArray(mb) || !mb.every((b) => isObj(b) && typeof b.hash === "string")) return { ok: false, reason: "batch list does not match the signed job" };
  const mh = mb.map((b) => (b as { hash: string }).hash);
  if ( JSON.stringify(mh) !== JSON.stringify(h.partHashes) || parts.length !== mh.length || h.batchCount !== mh.length) return { ok: false, reason: "batch list does not match the signed job" };
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!isObj(p) || Object.keys(p).length !== 2 || p.index !== i || !Array.isArray(p.rows) || !p.rows.length) return { ok: false, reason: `part ${i + 1} is malformed` };
    if ((await browserBatchHash(p.rows)) !== mh[i]) return { ok: false, reason: `part ${i + 1} does not match the signed job` };
  }
  return { ok: true };
}
