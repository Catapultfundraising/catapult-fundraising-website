"use client";

import { isCampaignProspect, viewAssignment, type Assignment, type AssignmentTracking } from "@/lib/portal-v2/effective-assignment";

/** Read-only classification, independent of stored prospect status and giving.
 * Require the paired CRM index; an early/stale detail is not assignment authority.
 */
export function CampaignProspectTag({ row, index, tracking }: {
  row: { cptid: number } & Partial<Assignment>;
  index: readonly ({ cptid: number } & Partial<Assignment>)[] | null;
  tracking: AssignmentTracking;
}) {
  if (!index?.some(r => r.cptid === row.cptid) || !isCampaignProspect(viewAssignment(row, index, tracking))) return null;
  return <span className="rounded-full bg-[rgb(var(--navy))] px-2.5 py-0.5 text-xs text-white">Campaign Prospect</span>;
}
