"use client";
import { useMemo, useState, type ComponentType } from "react";
import { portfolioAsk, portfolioModel, type PortfolioAskRow } from "@/lib/portal-v2/portfolio";
import type { CurrentExportPayload } from "@/lib/portal-v2/dashboard-export-types";

type PortfolioIntent = { kind: "portfolio"; solicitor: string; summary?: boolean };
const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = (value: number) => value.toLocaleString("en-US");
const card = "min-w-0 rounded-xl border border-[rgb(var(--line))] bg-white p-4 sm:p-5";

/** Full paired index only. PeopleTable search/sort is browsing-only; downloads
 * carry a selector for the server to reconstruct, never the visible page's IDs. */
export function Portfolio<I extends PortfolioAskRow>({
  index, committedCount, PeopleTable, DownloadButtons, indexPayload,
}: {
  index: I[];
  committedCount?: number;
  PeopleTable: ComponentType<{ rows: I[]; max?: number }>;
  DownloadButtons: ComponentType<{ get: () => CurrentExportPayload }>;
  indexPayload: (title: string, subtitle: string, rows: I[]) => CurrentExportPayload;
}) {
  const [solicitor, setSolicitor] = useState("");
  const model = useMemo(() => portfolioModel(index, portfolioAsk, solicitor), [index, solicitor]);
  const subtitle = solicitor ? `Primary or secondary solicitor: ${solicitor}` : "All current primary or secondary solicitor assignments";
  const payload = (summary: boolean): CurrentExportPayload => {
    const intent: PortfolioIntent = { kind: "portfolio", solicitor, summary };
    // Keep the existing placeholder payload for DownloadButtons' transport.
    return { ...indexPayload(summary ? "Solicitor assignments" : "Portfolio prospects", subtitle, model.rows),
      ...(summary ? { notes: [] } : {}),
      intent };
  };
  return <div className="space-y-6">
    <div className={card}>
      <h2 className="font-display text-xl text-[rgb(var(--navy))]">Portfolio</h2>
      <p className="mt-1 text-sm text-[rgb(var(--ink))]/60">Everyone with a current primary or secondary solicitor assignment, including records outside screened pools and the gift chart. All statuses are included.</p>
      <label className="mt-3 block text-xs">Solicitor
        <select aria-label="Portfolio solicitor" value={solicitor} onChange={event => setSolicitor(event.target.value)} className="ml-2 max-w-full rounded-md border border-[rgb(var(--line))] bg-white px-3 py-1.5">
          <option value="">All assigned prospects</option>
          {model.solicitors.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[
        ["Portfolio prospects", num(model.stats.assigned), "Current solicitor selection"],
        ["With a Campaign Ask", num(model.stats.withAsk), "Current solicitor selection"],
        ["Total Campaign Asks", model.stats.assigned > 0 && model.stats.askReview + model.stats.askMissing === model.stats.assigned ? "Not available" : usd(model.stats.askTotal), `Known amounts only; ${num(model.stats.askReview)} need review, ${num(model.stats.askMissing)} without an amount`],
        ["Committed (Stewardship)", committedCount === undefined ? "Not available" : num(committedCount), "All source Stewardship commitments; not filtered by solicitor"],
      ].map(([label, value, note]) => <div key={label} className={card}>
        <p className="font-display text-2xl text-[rgb(var(--navy))]">{value}</p>
        <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>
        <p className="mt-1 text-[11px] text-[rgb(var(--ink))]/50">{note}</p>
      </div>)}
    </div>
    <section className={card} aria-label="Solicitor assignments">
      <h3 className="font-display text-xl text-[rgb(var(--navy))]">Solicitor assignments</h3>
      <p className="mb-3 text-sm text-[rgb(var(--ink))]/60">All assignments by primary or secondary solicitor. A prospect may appear under both solicitors; each solicitor counts that prospect once. Select a name to view their portfolio below.</p>
      <div className="mb-3"><DownloadButtons get={() => payload(true)} /></div>
      <p className="mb-2 text-xs text-[rgb(var(--ink))]/55">Summary downloads follow the solicitor selection and do not include notes.</p>
      <div className="overflow-auto rounded-lg border border-[rgb(var(--line))]">
        <table className="w-full text-sm">
          <thead className="bg-[rgb(var(--navy))] text-left text-xs uppercase tracking-wider text-white">
            <tr>{["Solicitor", "Prospects", "Primary", "Secondary", "With an Ask", "Campaign Asks (known)", "Need ask review", "Without an amount"].map((label, i) => <th key={label} scope="col" className={`whitespace-nowrap px-3 py-2 ${i ? "text-right" : ""}`}>{label}</th>)}</tr>
          </thead>
          <tbody>{model.summary.map((row, i) => <tr key={row.solicitor} className={i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"}>
            <th scope="row" className="px-3 py-2 text-left font-medium"><button type="button" aria-pressed={solicitor === row.solicitor} onClick={() => setSolicitor(row.solicitor)} className="text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40">{row.solicitor}</button></th>
            {[num(row.prospects), num(row.primary), num(row.secondary), num(row.withAsk), row.askReview + row.askMissing === row.prospects ? "Not available" : usd(row.askTotal), num(row.askReview), num(row.askMissing)].map((value, column) => <td key={column} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{value}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      {!model.summary.length && <p className="mt-3 text-sm text-[rgb(var(--ink))]/60">No current solicitor assignments.</p>}
    </section>
    <section className={card} aria-label="Campaign portfolio">
      <h3 className="font-display text-xl text-[rgb(var(--navy))]">Campaign portfolio</h3>
      <p className="mb-3 text-sm text-[rgb(var(--ink))]/60">{subtitle}. Click a name to open the record.</p>
      {model.rows.some(row => row.campaignAsk?.askConflict) && <p role="status" className="mb-3 text-sm text-[rgb(var(--ink))]/60">Some selected prospects have conflicting campaign asks and need review in their records. These unresolved asks are excluded from totals until reviewed.</p>}
      {model.rows.some(row => row.campaignAsk?.askBlank) && <p className="mb-3 text-xs text-[rgb(var(--ink))]/55">Some selected campaign asks were explicitly cleared; they are not saved zero-dollar asks and add no amount to totals.</p>}
      <div className="mb-3"><DownloadButtons get={() => payload(false)} /></div>
      <p className="mb-2 text-xs text-[rgb(var(--ink))]/55">Downloads include the full solicitor selection; the table search and sort are for browsing.</p>
      <PeopleTable rows={model.rows} max={model.rows.length} />
    </section>
  </div>;
}
