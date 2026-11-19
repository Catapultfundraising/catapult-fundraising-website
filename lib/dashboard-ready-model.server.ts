import "server-only";
import type { PortalClient, PortalState } from "./portal-v2/clients";
import type { Data } from "./portal-v2/records-route";
import type { PvasTracking } from "./pvas-tracking-types";
import type { LiveBuild, LiveClient } from "./client-live-data.server";
import { pvasCanonicalEnabled } from "./portal-v2/pvas-canonical";

/** Bump on any incompatible serialized shape, owner/projection semantics or
 * read capability change. Deployment IDs are deliberately NOT compatibility. */
export const DASHBOARD_READY_COMPATIBILITY = "sql-ready-v1";
export interface PreparedRead {
  records: NonNullable<Data>; state: PortalState & { directView?: unknown; directSourceRevision?: string };
  tracking: PvasTracking;
}
type BaseBuild = { snapshot: unknown; records: NonNullable<Data>; pirs?: unknown };
/** Uses the actual full campaign gateway (native V3 stream/pagination and audit
 * validation for PVAS), NEVER snapshot.committed or history-only gifts. */
export async function prepareDashboardRead(client: PortalClient, built: BaseBuild): Promise<PreparedRead> {
  const server = await import("./portal-v2/server");
  const direct = await import("./portal-v2/direct-source-state.server");
  let state = await server.portalCampaignStateSafe(client, { pvasRecords: built.records.records, buildRecords: built.records.records, buildingReady: true }, true);
  direct.requireCurrentSql(client, state);
  if (!state) throw Error("Complete ready campaign state unavailable");
  let tracking: PvasTracking;
  if (pvasCanonicalEnabled(client)) {
    const { completePvasUploadHistory } = await import("./portal-v2/pvas-upload-history");
    state = await completePvasUploadHistory(state, async before => {
      const page = await server.engageCall(client, "pvasHistoricalUploads", { before, limit: 200 });
      if (page.status !== 200) throw Error("Ready upload history unavailable");
      return page.body;
    });
    tracking = await (await import("./pvas-tracking")).getPvasTracking();
  }
  else {
    const { sqlTracking } = await import("./client-live-data.server");
    const { applyTrackingBases, recordBase } = await import("./portal-v2/sql-newer");
    const raw = await sqlTracking(client as LiveClient);
    // All four production dashboards have moved to SQL. No silent legacy
    // empty/blob fallback is suitable for a durable complete ready generation.
    if (!raw) throw Error("Ready SQL tracking unavailable");
    tracking = { ...raw, prospects: applyTrackingBases(raw.prospects as Record<string, Record<string, unknown>>,
      recordBase(client as LiveClient, built.records.records)), pirs: (built as LiveBuild).pirs } as unknown as PvasTracking;
  }
  const observed = await direct.observeDirectForReady(client, state);
  const records = observed ? direct.composeDirectData(built.records, "records", observed) : built.records;
  const pairedTracking = { ...(observed ? direct.composeDirectTracking(tracking, observed) : tracking), pirs: tracking.pirs };
  const pairedState = { ...state, ...(observed ? {
    directView: direct.directClientView(observed), directSourceRevision: observed.state.revision,
  } : {}) };
  const prepared: PreparedRead = { records, state: pairedState, tracking: pairedTracking };
  const { currentRecordProjection } = await import("./portal-v2/records-route");
  const { currentDashboardSnapshot } = await import("./portal-v2/current-dashboard-snapshot");
  const projection = currentRecordProjection(client, prepared.records, pairedState, pairedTracking);
  // Validate the real downstream owner/assignment composition before publishing.
  currentDashboardSnapshot(client, built.snapshot as object, projection.index, pairedTracking, pairedState.updates, pairedState.directView as never);
  return prepared;
}
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
export function validateReadyBuild(value: unknown): asserts value is BaseBuild & { readyRead: PreparedRead } {
  if (!object(value) || !object(value.snapshot) || !object(value.records) || !Array.isArray(value.records.index) ||
      !value.records.index.length || !object(value.records.records) || !object(value.readyRead)) throw Error("Incomplete ready build");
  const read = value.readyRead;
  if (!object(read.records) || !Array.isArray(read.records.index) || !object(read.records.records) ||
      !object(read.state) || read.state.configured === false || read.state.error ||
      !["prospects", "gifts", "updates", "batches"].every(k => Array.isArray((read.state as Record<string, unknown>)[k])) ||
      !object(read.tracking) || !object(read.tracking.prospects) || !Array.isArray(read.tracking.activity) ||
      !object(read.tracking.pirs)) throw Error("Incomplete ready read projection");
}
