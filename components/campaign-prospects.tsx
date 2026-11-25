"use client";
import { useMemo, useState, type ComponentType } from "react";
import { assignmentMembers, belongsToSolicitor, isCampaignProspect, type Assignment } from "@/lib/portal-v2/effective-assignment";
import type { CurrentExportPayload } from "@/lib/portal-v2/dashboard-export-types";

/** Receives the FULL currentAssignmentIndex from each client's paired CRM owner,
 * never a screened pool, gift-chart seating or source-only portfolio. */
export function CampaignProspects<I extends { cptid: number } & Partial<Assignment>>({
  index, PeopleTable, DownloadButtons, indexPayload,
}: {
  index: I[];
  PeopleTable: ComponentType<{ rows: I[] }>;
  DownloadButtons: ComponentType<{ get: () => CurrentExportPayload }>;
  indexPayload: (title: string, subtitle: string, rows: I[]) => CurrentExportPayload;
}) {
  const [solicitor, setSolicitor] = useState("");
  const assigned = useMemo(() => index.filter(isCampaignProspect), [index]);
  const solicitors = useMemo(() => Array.from(new Set(assigned.flatMap(assignmentMembers))).sort((a, b) => a.localeCompare(b)), [assigned]);
  const rows = useMemo(() => solicitor ? assigned.filter(row => belongsToSolicitor(row, solicitor)) : assigned, [assigned, solicitor]);
  return <div className="min-w-0 rounded-xl border border-[rgb(var(--line))] bg-white p-4 sm:p-5">
    <h2 className="font-display text-xl text-[rgb(var(--navy))]">Campaign Prospects</h2>
    <p className="mt-1 text-sm text-[rgb(var(--ink))]/60">Everyone with a current primary or secondary solicitor assignment, including records outside screened pools and the gift chart. All statuses are included.</p>
    <p className="my-3 text-sm font-medium">{assigned.length.toLocaleString("en-US")} assigned prospects</p>
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <label className="text-xs">Solicitor
        <select aria-label="Solicitor" value={solicitor} onChange={e => setSolicitor(e.target.value)} className="ml-2 rounded-md border border-[rgb(var(--line))] bg-white px-3 py-1.5">
          <option value="">All solicitors</option>
          {solicitors.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <DownloadButtons get={() => indexPayload("Campaign Prospects", solicitor ? `Primary or secondary solicitor: ${solicitor}` : "All current primary or secondary solicitor assignments", rows)} />
    </div>
    <p className="mb-2 text-xs text-[rgb(var(--ink))]/55">Downloads include the full solicitor selection; the table search and sort are for browsing.</p>
    <PeopleTable rows={rows} />
  </div>;
}
