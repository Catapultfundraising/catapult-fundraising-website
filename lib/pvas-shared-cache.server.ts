import { gunzipSync, gzipSync } from "node:zlib";
import { deserialize, serialize } from "node:v8";

// Short shared cache for the canonical PVAS SQL build (Anthony approved 2026-11-17).
// - SQL is rechecked after PVAS_CACHE_TTL_SECONDS (default 120; 0 disables).
//   An unchanged fingerprint extends verification without rebuilding/rewriting the data blob.
// - Every confirmed dashboard edit and the dashboard's Reload link write an invalidation
//   marker; any build that started before the newest marker is never served again.
// - Stored as a private blob so every server instance shares it. It is a temporary
//   speed copy only, never a source of truth: SQL stays the only home of the data.
// - Any blob problem falls back to a fresh SQL build (correctness before speed).

export const PVAS_CACHE_PATH = "pvas-cache/canonical-build-v1.bin.gz";
export const PVAS_CACHE_MARKER_PATH = "pvas-cache/invalidated-v1.json";

export interface CacheBlobStore {
  read(path: string): Promise<Buffer | null>; // null when the blob does not exist
  write(path: string, body: Buffer, contentType: string): Promise<void>;
}
export interface CacheDeps<T> {
  build: () => Promise<T>;
  fingerprint?: () => Promise<string>;
  store: CacheBlobStore | null; // null when no blob token is configured
  now?: () => number;
  ttlMs?: number;
  deployment?: string;
  background?: (p: Promise<unknown>) => void;
  log?: (msg: string) => void;
  /** Blob paths for this cache (defaults to PVAS). Other dashboards pass their own pair. */
  paths?: { data: string; marker: string };
}
interface Entry<T> { startedAt: number; built: T; fp?: string; verifiedAt?: number }

export function cacheTtlMs(raw = process.env.PVAS_CACHE_TTL_SECONDS): number {
  if (raw === undefined || raw.trim() === "") return 120_000;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 600) * 1000 : 0;
}

export function createPvasSharedCache<T>(deps: CacheDeps<T>) {
  const now = deps.now ?? Date.now;
  const ttl = deps.ttlMs ?? cacheTtlMs();
  const deployment = deps.deployment ?? process.env.VERCEL_DEPLOYMENT_ID ?? "local";
  const log = deps.log ?? (() => {});
  const background = deps.background ?? ((p: Promise<unknown>) => { void p.catch(() => {}); });
  let mem: Entry<T> | null = null;
  let pending: Promise<T> | null = null;
  let localInvalidatedAt = 0;
  let pendingInvalidation = 0;
  const DATA_PATH = deps.paths?.data ?? PVAS_CACHE_PATH, MARKER_PATH = deps.paths?.marker ?? PVAS_CACHE_MARKER_PATH;

  const VERIFIED_PATH = DATA_PATH.slice(0, DATA_PATH.lastIndexOf("/") + 1) + "verified-v1.json";

  const fresh = (e: Entry<T> | null, inv: number): e is Entry<T> =>
    !!e && e.startedAt > inv && now() - Math.max(e.startedAt, e.verifiedAt ?? 0) < ttl;

  async function marker(): Promise<number> {
    if (!deps.store) throw new Error("no store");
    const b = await deps.store.read(MARKER_PATH);
    if (!b) return 0;
    const at = Number(JSON.parse(b.toString("utf8")).at);
    if (!Number.isFinite(at)) throw new Error("bad marker");
    return at;
  }
  async function readShared(): Promise<Entry<T> | null> {
    const b = await deps.store!.read(DATA_PATH);
    if (!b) return null;
    const v = deserialize(gunzipSync(b)) as Entry<T> & { deployment?: string };
    if (v.deployment !== deployment || typeof v.startedAt !== "number" || v.built === undefined) return null;
    return { startedAt: v.startedAt, built: v.built, fp: v.fp };
  }
  async function writeShared(e: Entry<T>): Promise<void> {
    const body = gzipSync(serialize({ deployment, startedAt: e.startedAt, built: e.built, fp: e.fp }), { level: 1 });
    await deps.store!.write(DATA_PATH, body, "application/octet-stream");
  }
  async function buildFresh(share: boolean, inv: number): Promise<T> {
    const startedAt = Math.max(now(), inv + 1);
    // Capture BEFORE the build: a change during a build must trigger the next one.
    let fp: string | undefined;
    try { fp = await deps.fingerprint?.(); } catch { /* rebuild without reusable fingerprint */ }
    const built = await deps.build();
    // Edits confirmed on this instance during the build make it stale already.
    if (startedAt > localInvalidatedAt) {
      mem = { startedAt, built, fp };
      if (share && ttl > 0) background(writeShared(mem).catch(e => log(`pvas cache write skipped: ${String(e)}`)));
    }
    return built;
  }

  async function verified(entry: Entry<T>, inv: number): Promise<T | null> {
    if (entry.startedAt <= inv || !deps.fingerprint || entry.fp === undefined) return null;
    try {
      // Another instance may have verified this exact build without rewriting it.
      const raw = await deps.store!.read(VERIFIED_PATH);
      if (raw) {
        const v = JSON.parse(raw.toString("utf8"));
        if (v.deployment === deployment && v.startedAt === entry.startedAt && v.fp === entry.fp &&
            typeof v.verifiedAt === "number" && Number.isFinite(v.verifiedAt) && v.verifiedAt <= now()) {
          entry.verifiedAt = v.verifiedAt;
          if (fresh(entry, inv)) { mem = entry; return entry.built; }
        }
      }
      if (await deps.fingerprint() !== entry.fp) return null;
      entry.verifiedAt = now();
      mem = entry;
      await deps.store!.write(VERIFIED_PATH, Buffer.from(JSON.stringify({
        deployment, startedAt: entry.startedAt, verifiedAt: entry.verifiedAt, fp: entry.fp,
      })), "application/json");
      return entry.built;
    } catch { mem = null; return null; } // fingerprint/store failure: correctness before speed
  }

  async function get(): Promise<T> {
    let inv = localInvalidatedAt;
    let share = ttl > 0 && !!deps.store;
    if (share) {
      try { inv = Math.max(await marker(), localInvalidatedAt); }
      catch (e) { log(`pvas cache marker unavailable, reading SQL: ${String(e)}`); share = false; }
    }
    if (share && fresh(mem, inv)) return mem.built;
    if (!pending) {
      pendingInvalidation = inv;
      const job = (async () => {
        if (ttl <= 0 || !deps.store) return deps.build();
        if (!share) return buildFresh(false, inv);
        try {
          const candidate = mem && mem.startedAt > inv ? mem : await readShared();
          if (fresh(candidate, inv)) { mem = candidate; return candidate.built; }
          if (candidate) {
            const unchanged = await verified(candidate, inv);
            if (unchanged !== null) return unchanged;
          }
        } catch (e) { log(`pvas cache read skipped: ${String(e)}`); }
        return buildFresh(true, inv);
      })().finally(() => { if (pending === job) pending = null; });
      pending = job;
    }
    const generation = pendingInvalidation;
    const result = await pending;
    return Math.max(inv, localInvalidatedAt) > generation ? get() : result;
  }

  async function invalidate(): Promise<void> {
    // A marker must advance even when two edits/builds share a millisecond.
    const previous = deps.store && ttl > 0 ? await marker().catch(() => 0) : 0;
    const at = Math.max(now(), localInvalidatedAt + 1, previous + 1, mem?.startedAt ?? 0);
    localInvalidatedAt = Math.max(localInvalidatedAt, at);
    mem = null;
    if (!deps.store || ttl <= 0) return;
    await deps.store.write(MARKER_PATH, Buffer.from(JSON.stringify({ at })), "application/json");
    // Do not fork a second build if an edit lands during an existing build.
    const active = pending;
    background((async () => { await active?.catch(() => {}); await get(); })()
      .catch(e => log(`pvas cache warm skipped: ${String(e)}`)));
  }

  return { get, invalidate };
}
