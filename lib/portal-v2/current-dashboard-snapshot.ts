import type { PortalClient } from "./clients";
import { pvasCanonicalEnabled } from "./pvas-canonical";
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
  const source = directSnapshot(snapshot, pvasCanonicalEnabled(client) ? null : directView, client !== "wcbhc" && client !== "baq");
  const asks = overlayCampaignAsks(source, overlay, askEdits(updates), client !== "wcbhc" && client !== "baq");
  return tracking ? assignmentSnapshot(asks, index, tracking, overlay) : asks;
}
