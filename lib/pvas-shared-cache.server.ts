import { gunzipSync, gzipSync } from "node:zlib";
import { deserialize, serialize } from "node:v8";

// Short shared cache for the canonical PVAS SQL build (Anthony approved 2026-11-17).
// - A completed build is reused for at most PVAS_CACHE_TTL_SECONDS (default 120; 0 disables).
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
  store: CacheBlobStore | null; // null when no blob token is configured
  now?: () => number;
  ttlMs?: number;
  deployment?: string;
  background?: (p: Promise<unknown>) => void;
  log?: (msg: string) => void;
  /** Blob paths for this cache (defaults to PVAS). Other dashboards pass their own pair. */
  paths?: { data: string; marker: string };
}
interface Entry<T> { startedAt: number; built: T }

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
  const DATA_PATH = deps.paths?.data ?? PVAS_CACHE_PATH, MARKER_PATH = deps.paths?.marker ?? PVAS_CACHE_MARKER_PATH;

  const fresh = (e: Entry<T> | null, inv: number): e is Entry<T> =>
    !!e && e.startedAt > inv && now() - e.startedAt < ttl;

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
    const v = deserialize(gunzipSync(b)) as { deployment?: string; startedAt?: number; built?: T };
    if (v.deployment !== deployment || typeof v.startedAt !== "number" || v.built === undefined) return null;
    return { startedAt: v.startedAt, built: v.built };
  }
  async function writeShared(e: Entry<T>): Promise<void> {
    const body = gzipSync(serialize({ deployment, startedAt: e.startedAt, built: e.built }), { level: 1 });
    await deps.store!.write(DATA_PATH, body, "application/octet-stream");
  }
  async function buildFresh(share: boolean): Promise<T> {
    const startedAt = now();
    const built = await deps.build();
    // Edits confirmed on this instance during the build make it stale already.
    if (startedAt > localInvalidatedAt) {
      mem = { startedAt, built };
      if (share && ttl > 0) background(writeShared(mem).catch(e => log(`pvas cache write skipped: ${String(e)}`)));
    }
    return built;
  }

  async function get(): Promise<T> {
    if (ttl <= 0 || !deps.store) {
      if (!pending) { const job = deps.build().finally(() => { if (pending === job) pending = null; }); pending = job; }
      return pending;
    }
    let inv: number;
    try { inv = Math.max(await marker(), localInvalidatedAt); }
    catch (e) { log(`pvas cache marker unavailable, reading SQL: ${String(e)}`); return buildFresh(false); }
    if (fresh(mem, inv)) return mem.built;
    if (!pending) {
      const job = (async () => {
        try {
          const shared = await readShared();
          if (fresh(shared, inv)) { mem = shared; return shared.built; }
        } catch (e) { log(`pvas cache read skipped: ${String(e)}`); }
        return buildFresh(true);
      })().finally(() => { if (pending === job) pending = null; });
      pending = job;
    }
    return pending;
  }

  async function invalidate(): Promise<void> {
    const at = now();
    localInvalidatedAt = Math.max(localInvalidatedAt, at);
    mem = null; pending = null;
    if (!deps.store || ttl <= 0) return;
    await deps.store.write(MARKER_PATH, Buffer.from(JSON.stringify({ at })), "application/json");
  }

  return { get, invalidate };
}
