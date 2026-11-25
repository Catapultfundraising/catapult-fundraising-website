"use client";
/** Initial route read failed: no invented snapshot and no cache-invalidation POST. */
export function DashboardSnapshotUnavailable({ client }: { client: string }) {
  return <main className="mx-auto max-w-3xl p-10" role="alert">
    <p>{client} data snapshot is not available yet. No current dashboard data has been loaded.</p>
    <p className="mt-2 text-sm">If a save was already accepted, do not enter it again. Retry only reads the page; it does not replay a save or force cache invalidation.</p>
    <button type="button" className="mt-4 rounded border px-4 py-2 text-sm" onClick={() => window.location.reload()}>Retry dashboard read</button>
  </main>;
}
