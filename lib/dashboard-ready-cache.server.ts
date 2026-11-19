import { createHash, randomUUID } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { deserialize, serialize } from "node:v8";

export const READY_REFRESH_STAGES = ["lease-read", "lease-acquire", "marker", "current", "fingerprint-before", "build-base", "prepare-state", "prepare-history", "prepare-tracking", "prepare-direct", "validate", "fingerprint-after", "publish-data", "publish-metadata", "publish-fence", "publish-pointer"] as const;
export function readyFailureStage(error: unknown): string | undefined {
  const stage = error && typeof error === "object" && "readyStage" in error ? error.readyStage : undefined;
  return typeof stage === "string" && (READY_REFRESH_STAGES as readonly string[]).includes(stage) ? stage : undefined;
}
export interface ReadyStore {
  read(path: string): Promise<{ body: Buffer; etag: string } | null>;
  /** null creates only; a string replaces only that exact ETag. */
  put(path: string, body: Buffer, expected: string | null): Promise<string>;
}
export interface ReadyFreshness {
  generation: string; builtAt: number; verifiedAt: number;
  stale: boolean; failedAt?: number;
}
type Pointer = { compatibility: string; generation: string; path: string; digest: string;
  startedAt: number; verifiedAt: number; fingerprint: string };
type Entry<T> = { built: T; pointer: Pointer };
type Options<T> = {
  compatibility: string; prefix: string; markerPath: string;
  store: ReadyStore | null; build(): Promise<T>; fingerprint(): Promise<string>;
  validate(value: unknown): asserts value is T;
  background(p: Promise<unknown>): void;
  canPublish: boolean; enabled?: boolean; now?: () => number; leaseMs?: number;
};
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const time = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
/** Durable, compatible last-good reads. SQL is the owner; these private blobs
 * are disposable validated generations. No old generation may cross an edit
 * marker. Publication requires both the current lease and pointer ETags. */
export function createDashboardReadyCache<T>(o: Options<T>) {
  const now = o.now ?? Date.now, leaseMs = o.leaseMs ?? 330_000;
  const root = `${o.prefix}/${o.compatibility}`, pointerPath = `${root}/ready.json`;
  const leasePath = `${root}/lease.json`, failurePath = `${root}/failure.json`;
  let memory: Entry<T> | null = null;
  let pending: Promise<Entry<T>> | null = null;
  let localMarker = 0;
  async function marker() {
    if (!o.store) return localMarker;
    const raw = await o.store.read(o.markerPath);
    if (!raw) return localMarker;
    const value: unknown = JSON.parse(raw.body.toString());
    if (!obj(value) || !time(value.at)) throw Error("Ready invalidation unavailable");
    return Math.max(localMarker, value.at);
  }
  function pointer(raw: Buffer): Pointer {
    const p: unknown = JSON.parse(raw.toString());
    if (!obj(p) || p.compatibility !== o.compatibility || typeof p.generation !== "string" ||
        !/^[a-f0-9-]{36}$/.test(p.generation) || p.path !== `${root}/${p.generation}.bin.gz` ||
        typeof p.digest !== "string" || !/^[a-f0-9]{64}$/.test(p.digest) ||
        !time(p.startedAt) || !time(p.verifiedAt) || p.verifiedAt < p.startedAt ||
        p.startedAt > now() + 1000 || p.verifiedAt > now() + 1000 || typeof p.fingerprint !== "string" || !p.fingerprint)
      throw Error("Incompatible ready pointer");
    return p as Pointer;
  }
  async function read(p: Pointer): Promise<Entry<T>> {
    if (memory?.pointer.generation === p.generation) return { ...memory, pointer: p };
    const blob = await o.store!.read(p.path);
    if (!blob || sha(blob.body) !== p.digest) throw Error("Ready generation unavailable");
    const raw: unknown = deserialize(gunzipSync(blob.body));
    if (!obj(raw) || raw.compatibility !== o.compatibility || raw.generation !== p.generation)
      throw Error("Incompatible ready generation");
    o.validate(raw.built);
    return { built: raw.built, pointer: p };
  }
  async function current() {
    const r = await o.store!.read(pointerPath);
    if (!r) return { raw: r, entry: null };
    try { return { raw: r, entry: await read(pointer(r.body)) }; }
    catch { return { raw: r, entry: null }; } // corrupt/incompatible is never served; refresh may replace by ETag

  }
  async function failure() {
    try {
      const r = await o.store!.read(failurePath);
      const v: unknown = r && JSON.parse(r.body.toString());
      return obj(v) && time(v.at) && v.at <= now() ? v.at : undefined;
    } catch { return undefined; }
  }
  async function run(publish: boolean): Promise<Entry<T>> {
    if (!o.store || o.enabled === false) {
      const startedAt = now(), built = await o.build(); o.validate(built);
      return { built, pointer: { compatibility: o.compatibility, generation: randomUUID(), path: "",
        digest: "", startedAt, verifiedAt: startedAt, fingerprint: "uncached" } };
    }
    if (!publish) throw Error("Ready publication not authorized");
    let stage: typeof READY_REFRESH_STAGES[number] = "lease-read";
    const oldLease = await o.store.read(leasePath).catch(() => { throw Object.assign(Error("Ready lease unavailable"), { readyStage: stage }); });
    if (oldLease) {
      const l: unknown = JSON.parse(oldLease.body.toString());
      if (!obj(l) || typeof l.expiresAt !== "number") throw Error("Ready lease unavailable");
      if (l.expiresAt > now()) throw Error("Ready refresh already running");
    }
    const token = randomUUID();
    stage = "lease-acquire";
    const leaseEtag = await o.store.put(leasePath, Buffer.from(JSON.stringify({ token, expiresAt: now() + leaseMs })), oldLease?.etag ?? null).catch(() => { throw Object.assign(Error("Ready lease unavailable"), { readyStage: stage }); });
    try {
      stage = "marker";
      const inv = await marker();
      stage = "current";
      const before = await current();
      stage = "fingerprint-before";
      const fp = await o.fingerprint();
      let entry = before.entry;
      if (!entry || entry.pointer.startedAt <= inv || entry.pointer.fingerprint !== fp) {
        const startedAt = Math.max(now(), inv + 1);
        stage = "build-base";
        const built = await o.build();
        stage = "validate"; o.validate(built);
        // Never publish a mixture collected across a concurrent SQL change.
        stage = "fingerprint-after";
        if (await o.fingerprint() !== fp) throw Error("SQL changed during ready build");
        const generation = randomUUID(), path = `${root}/${generation}.bin.gz`;
        const body = gzipSync(serialize({ compatibility: o.compatibility, generation, built }), { level: 1 });
        if (await marker() >= startedAt) throw Error("Ready build invalidated");
        stage = "publish-data";
        await o.store.put(path, body, null); // immutable, complete before pointer
        entry = { built, pointer: { compatibility: o.compatibility, generation, path, digest: sha(body),
          startedAt, verifiedAt: Math.max(now(), startedAt), fingerprint: fp } };
        stage = "publish-metadata";
        await o.store.put(`${root}/${generation}.json`, Buffer.from(JSON.stringify(entry.pointer)), null);
      } else entry = { ...entry, pointer: { ...entry.pointer, verifiedAt: now() } };
      // Recheck BOTH fences immediately before the pointer CAS. An expired
      // worker must not publish after a replacement lease or newer edit.
      stage = "publish-fence";
      const lease = await o.store.read(leasePath);
      const held: unknown = lease && JSON.parse(lease.body.toString());
      if (lease?.etag !== leaseEtag || !obj(held) || held.token !== token ||
          typeof held.expiresAt !== "number" || held.expiresAt <= now() ||
          await marker() >= entry.pointer.startedAt) throw Error("Ready publication superseded");
      stage = "publish-pointer";
      await o.store.put(pointerPath, Buffer.from(JSON.stringify(entry.pointer)), before.raw?.etag ?? null);
      memory = entry;
      return entry;
    } catch (e) {
      // Persist only an allowlisted outcome and timestamp, never raw SQL,
      // integration messages, IDs, donor values, or credentials.
      try {
        const previous = await o.store.read(failurePath);
        await o.store.put(failurePath, Buffer.from(JSON.stringify({ at: now(), outcome: "refresh-failed", stage: readyFailureStage(e) ?? stage })), previous?.etag ?? null);
      } catch { /* diagnostic failure never overwrites the last-good pointer */ }
      throw Object.assign(Error("Ready refresh unavailable"), { readyStage: readyFailureStage(e) ?? stage });
    } finally {
      try { await o.store.put(leasePath, Buffer.from(JSON.stringify({ token, expiresAt: 0 })), leaseEtag); }
      catch { /* a successor owns the lease, or expiry will release it */ }
    }
  }
  function refresh(options: { allowPreview?: boolean } = {}) {
    if (!pending) {
      const job = run(o.canPublish || options.allowPreview === true).finally(() => { if (pending === job) pending = null; });
      pending = job;
    }
    return pending;
  }
  async function inspect(generation?: string): Promise<{ built: T; freshness: ReadyFreshness }> {
    if (!o.store || o.enabled === false) {
      if (generation) throw Error("Generation cache disabled");
      const entry = await refresh();
      return { built: entry.built, freshness: { generation: entry.pointer.generation,
        builtAt: entry.pointer.startedAt, verifiedAt: entry.pointer.verifiedAt, stale: false } };
    }
    const inv = await marker();
    let entry: Entry<T> | null = null;
    if (generation) {
      if (!/^[a-f0-9-]{36}$/.test(generation)) throw Error("Invalid ready generation");
      // Immutable generation metadata is independently stored, so a record can
      // retain its displayed identity across a later pointer swap.
      const latest = await current();
      if (latest.entry?.pointer.generation === generation) entry = latest.entry;
      else {
        const raw = await o.store.read(`${root}/${generation}.json`);
        if (raw) entry = await read(pointer(raw.body));
      }
      if (!entry || entry.pointer.generation !== generation) throw Error("Ready generation expired");
    } else entry = (await current()).entry;
    if (!entry || entry.pointer.startedAt <= inv) {
      if (generation) throw Error("Displayed ready generation invalidated; reload");
      entry = await refresh();
    }
    if (await marker() >= entry.pointer.startedAt) throw Error("Ready view invalidated; reload");
    memory = entry;
    const failedAt = await failure();
    const stale = now() - entry.pointer.verifiedAt >= 120_000;
    if (!generation && stale && o.canPublish && !pending && (!failedAt || now() - failedAt >= 120_000))
      o.background(refresh().catch(() => {}));
    return { built: entry.built, freshness: { generation: entry.pointer.generation, builtAt: entry.pointer.startedAt,
      verifiedAt: entry.pointer.verifiedAt, stale, ...(failedAt && failedAt >= entry.pointer.verifiedAt ? { failedAt } : {}) } };
  }
  async function invalidate() {
    let at = Math.max(now(), await marker() + 1, memory?.pointer.startedAt ?? 0);
    localMarker = at; memory = null;
    if (!o.store || o.enabled === false) return;
    let published = false;
    // A conflicting concurrent edit is expected: reread and advance its marker.
    // Bounded attempts, no sleep; storage outages remain explicitly unconfirmed.
    for (let attempt = 0; attempt < 3; attempt++) {
      const old = await o.store.read(o.markerPath);
      if (old) {
        const prior: unknown = JSON.parse(old.body.toString());
        if (!obj(prior) || !time(prior.at)) throw Error("Ready invalidation unavailable");
        at = Math.max(at, prior.at + 1); localMarker = at;
      }
      try {
        await o.store.put(o.markerPath, Buffer.from(JSON.stringify({ at })), old?.etag ?? null);
        published = true; break;
      } catch { /* fresh read on the next bounded CAS attempt */ }
    }
    if (!published) throw Error("Ready invalidation unconfirmed");
    const active = pending;
    o.background((async () => { await active?.catch(() => {}); await refresh(); })().catch(() => {}));
  }
  return { get: async () => (await inspect()).built, inspect, refresh, invalidate };
}
