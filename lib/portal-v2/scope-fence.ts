// One scope-invalidation fence for the source-import page (pure, testable). Any change of client/table/file/mapping/
// date/actor calls bump(); every async callback, send and state write checks its token first, so a read, preview,
// save or status reply that started under an older selection can never touch the new one.
export class StaleScope extends Error { constructor() { super("stale"); } }
export function createScopeFence() {
  let gen = 0;
  return {
    bump() { gen++; },
    get generation() { return gen; },
    token() {
      const t = gen;
      const live = () => t === gen;
      return {
        live,
        /** Resolves only while the scope is unchanged; otherwise rejects with StaleScope (both on success and on error). */
        guard<T>(p: Promise<T>): Promise<T> { return p.then((v) => { if (!live()) throw new StaleScope(); return v; }, (e) => { if (!live()) throw new StaleScope(); throw e; }); },
        /** Wrap a state setter/side effect: runs only while live. */
        run(fn: () => void) { if (live()) fn(); },
      };
    },
  };
}
