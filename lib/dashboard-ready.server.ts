import "server-only";
import type { PortalClient } from "./portal-v2/clients";
import { PORTAL_V2 } from "./portal-v2/clients";
import type { PreparedRead } from "./dashboard-ready-model.server";
import { currentRecordProjection, httpIndex } from "./portal-v2/records-route";
import type { ReadyFreshness } from "./dashboard-ready-cache.server";

export const READY_CLIENTS = ["pvas", "csnf", "jag", "wcbhc", "baq", "imas"] as const;
export function readyClient(value: unknown): value is PortalClient {
  return typeof value === "string" && (READY_CLIENTS as readonly string[]).includes(value);
}
export async function inspectDashboardReady(client: PortalClient, generation?: string) {
  if (client === "pvas") return (await import("./pvas-data-store")).inspectPvasReady(generation);
  return (await import("./client-live-data.server")).inspectLiveReady(client, generation);
}
export async function refreshDashboardReady(client: PortalClient, allowPreview = false) {
  if (client === "pvas") return (await import("./pvas-data-store")).refreshPvasReady(allowPreview);
  return (await import("./client-live-data.server")).refreshLiveReady(client, allowPreview);
}
export async function readyPayload(client: PortalClient, known?: string | null) {
  const { built, freshness } = await inspectDashboardReady(client);
  if (known === freshness.generation) return { unchanged: true, generation: freshness.generation, freshness };
  const read = built.readyRead as PreparedRead;
  const projection = currentRecordProjection(client, read.records, read.state, read.tracking);
  return {
    generation: freshness.generation, freshness,
    index: httpIndex(client, projection.index), tracking: read.tracking,
    state: { ...read.state, configured: true, goal: PORTAL_V2[client].goal,
      readySnapshot: built.snapshot, dashboardGeneration: freshness.generation, dashboardFreshness: freshness },
    directSourceRevision: read.state.directSourceRevision,
  };
}
export type DashboardReadyStatus = ReadyFreshness;
