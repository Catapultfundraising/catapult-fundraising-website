// One current read view (records + SQL state + tracking + projection) per shared live build.
// The key is the shared build object itself, so the view follows the build cache's rules exactly:
// SQL-verified every PVAS_CACHE_TTL_SECONDS, replaced on confirmed edits and the Reload link,
// and never reused when the cache is disabled (each call then gets a new build object).
export function createViewMemo<K extends object, V>() {
  const memo = new WeakMap<K, Promise<V>>();
  return (key: K | null, make: () => Promise<V>): Promise<V> => {
    if (!key) return make();
    let p = memo.get(key);
    if (!p) {
      const job = make();
      memo.set(key, job);
      job.catch(() => { if (memo.get(key) === job) memo.delete(key); });
      p = job;
    }
    return p;
  };
}
