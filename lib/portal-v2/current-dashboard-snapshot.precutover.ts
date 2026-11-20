import type { PortalClient } from "./clients";
import { assignmentSnapshot, type Assignment, type AssignmentTracking } from "./effective-assignment";
import { askEdits, overlayCampaignAsks } from "./effective-ask";
import { buildOverlay, type UpdateRow } from "./record-overlay";
import { directSnapshot, type DirectClientView } from "./direct-snapshot";

/** Exact visible dashboard composition; shared with authoritative table exports. Financial arrays remain excluded. */
export function currentDashboardSnapshot<T extends object>(
  client: PortalClient, snapshot: T, index: ({ cptid: number } & Partial<Assignment>)[] | null,
  tracking: AssignmentTracking | undefined, updates: UpdateRow[], directView?: DirectClientView | null,
): T {
  const overlay = buildOverlay(updates);
  const source = directSnapshot(snapshot, directView, client !== "wcbhc" && client !== "baq" && client !== "imas");
  const asks = overlayCampaignAsks(source, overlay, askEdits(updates), client !== "wcbhc" && client !== "baq" && client !== "imas");
  return tracking ? assignmentSnapshot(asks, index, tracking, overlay) : asks;
}
