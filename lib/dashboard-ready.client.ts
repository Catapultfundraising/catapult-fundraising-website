"use client";
import { completePvasUploadHistory } from "./portal-v2/pvas-upload-history";
import type { PortalClient } from "./portal-v2/clients";
type Bundle = { mode?: "uncached"; generation?: string; index: unknown[]; tracking: unknown; state: Record<string, unknown>;
  directSourceRevision?: string };
export type DashboardReadStatus = "current" | "refreshing" | "failed" | "unconfirmed";
const readStatuses = new Map<string, DashboardReadStatus>();
const statusListeners = new Map<string, Set<(status: DashboardReadStatus) => void>>();
export function dashboardReadStatus(client: string): DashboardReadStatus { return readStatuses.get(client) ?? "current"; }
export function subscribeDashboardReadStatus(client: string, listener: (status: DashboardReadStatus) => void) {
  let set = statusListeners.get(client);
  if (!set) { set = new Set(); statusListeners.set(client, set); }
  set.add(listener);
  return () => { set!.delete(listener); };
}
function publishReadStatus(client: string, status: DashboardReadStatus) {
  readStatuses.set(client, status);
  for (const listener of statusListeners.get(client) ?? []) listener(status);
}
const refreshBarriers = new Map<string, number>();
/** Receipt remains committed; this flag is ONLY cache delivery uncertainty.
 * Never turn it into a write retry. Clear only on a later verified ready read. */
export function noteDashboardRefreshResponse(client: string, response: Response): boolean {
  if (response.headers.get("X-Dashboard-Refresh") !== "unconfirmed") return false;
  const raw = response.headers.get("X-Dashboard-Refresh-After");
  const at = raw && /^[1-9][0-9]{0,15}$/.test(raw) ? Number(raw) : Date.now();
  refreshBarriers.set(client, Math.max(refreshBarriers.get(client) ?? 0, at));
  invalidateDashboardReady(client);
  publishReadStatus(client, "unconfirmed");
  if (typeof window !== "undefined") window.dispatchEvent(new Event("dashboard-refresh-unconfirmed"));
  return true;
}
const pending = new Map<string, Promise<Bundle>>();
const listeners = new Map<string, Set<(bundle: Bundle) => void>>();
const epochs = new Map<string, number>();
export function invalidateDashboardReady(client: string) {
  epochs.set(client, (epochs.get(client) ?? 0) + 1); selected.delete(client); pending.delete(client);
  publishReadStatus(client, "refreshing");
}
const selected = new Map<string, Bundle>();
export function subscribeDashboardReady(client: string, listener: (bundle: Bundle) => void) {
  let set = listeners.get(client);
  if (!set) { set = new Set(); listeners.set(client, set); }
  set.add(listener);
  return () => { set!.delete(listener); };
}
/** Both providers receive the same whole generation, not independently cached
 * endpoints. Publication is after complete archive pagination too. */
export function loadDashboardReady(client: string): Promise<Bundle> {
  const existing = pending.get(client);
  if (existing) return existing;
  const epoch = epochs.get(client) ?? 0, previous = selected.get(client);
  if (dashboardReadStatus(client) !== "current") publishReadStatus(client, "refreshing");
  const job = (async () => {
    const r = await fetch(`/api/dashboard-ready?client=${encodeURIComponent(client)}${previous?.generation ? `&known=${encodeURIComponent(previous.generation)}` : ""}`, { cache: "no-store" });
    if (!r.ok) throw Error("Complete ready view unavailable");
    const response = await r.json();
    let bundle: Bundle = response;
    if (response.unchanged === true) {
      if (!previous || response.generation !== previous.generation) throw Error("Unpaired ready verification");
      bundle = { ...previous, state: { ...previous.state, dashboardFreshness: response.freshness } };
    }
    if (bundle.mode === "uncached") {
      // Explicit operational mode only (TTL=0 / genuinely unconfigured store).
      // Transient ready failures never take this branch. Preserve the original
      // current index/state/tracking reads and their revision/owner guards.
      const replies = await Promise.all([fetch(`/api/${client}-data-records`, {cache:"no-store"}),
        fetch(`/api/${client}-data-tracking`, {cache:"no-store"}), fetch(`/api/${client}-data-v2`, {cache:"no-store"})]);
      if (replies.some(x => !x.ok)) throw Error("Current uncached view unavailable");
      const [records,tracking,state] = await Promise.all(replies.map(x => x.json()));
      if (!Array.isArray(records.index) || !tracking?.prospects || !state || state.configured !== true || state.error ||
          records.directSourceRevision && records.directSourceRevision !== tracking.directSourceRevision ||
          state.directSourceRevision && state.directSourceRevision !== records.directSourceRevision)
        throw Error("Uncached source layers changed during read");
      bundle = {mode:"uncached",index:records.index,tracking,state,directSourceRevision:records.directSourceRevision};
      if (client === "pvas") bundle.state = await completePvasUploadHistory(state, async before => {
        const page = await fetch("/api/pvas-data-v2",{method:"POST",cache:"no-store",headers:{"content-type":"application/json"},
          body:JSON.stringify({op:"pvasHistoricalUploads",before,limit:200})});
        if(!page.ok)throw Error("Uncached archive unavailable");return page.json();
      });
    }
    if (!bundle || bundle.mode !== "uncached" && typeof bundle.generation !== "string" || !Array.isArray(bundle.index) ||
        !bundle.tracking || !bundle.state || bundle.state.configured !== true || bundle.state.error ||
        bundle.mode !== "uncached" && bundle.state.dashboardGeneration !== bundle.generation) throw Error("Incomplete ready view");
    const barrier = refreshBarriers.get(client);
    if (barrier) {
      const freshness = bundle.state.dashboardFreshness as { verifiedAt?: number } | undefined;
      if (bundle.mode !== "uncached" && typeof freshness?.verifiedAt === "number" && freshness.verifiedAt > barrier)
        { refreshBarriers.delete(client); bundle = { ...bundle, state: { ...bundle.state, dashboardRefreshUnconfirmed: false } }; }
      else bundle = { ...bundle, state: { ...bundle.state, dashboardRefreshUnconfirmed: true } };
    }
    if (bundle.mode !== "uncached") Object.defineProperty(bundle.index, "dashboardGeneration", { value: bundle.generation });
    if (bundle.directSourceRevision)
      Object.defineProperty(bundle.index, "directSourceRevision", { value: bundle.directSourceRevision });
    if ((epochs.get(client) ?? 0) !== epoch) return selected.get(client) ?? pending.get(client) ?? loadDashboardReady(client);
    selected.set(client, bundle);
    for (const listener of listeners.get(client) ?? []) listener(bundle);
    const freshness = bundle.state.dashboardFreshness as { stale?: boolean; failedAt?: number } | undefined;
    publishReadStatus(client, bundle.state.dashboardRefreshUnconfirmed ? "unconfirmed" : freshness?.stale || freshness?.failedAt ? "failed" : "current");
    return bundle;
  })().catch(error => {
    // A superseded failure is not a verdict on the newer paired read.
    if ((epochs.get(client) ?? 0) === epoch) publishReadStatus(client, "failed");
    throw error;
  }).finally(() => { if (pending.get(client) === job) pending.delete(client); });
  pending.set(client, job);
  return job;
}
export function dashboardGeneration(index: unknown) {
  return (index as { dashboardGeneration?: string } | null)?.dashboardGeneration;
}
/** No record request may outrun the paired read or silently follow a newer
 * generation. Invalidation of the selected generation fails closed on server. */
export async function fetchDashboardRecord(client: PortalClient, id: number) {
  const bundle = selected.get(client) ?? await loadDashboardReady(client);
  const suffix = bundle.mode === "uncached" ? "" : `&generation=${encodeURIComponent(bundle.generation!)}`;
  return fetch(`/api/${client}-data-records?id=${id}${suffix}`, { cache: "no-store" });
}
