import { PageHero } from "@/components/page-hero";
import { Download } from "lucide-react";
import { getJagDashboardData, pickRandomQuotes } from "@/lib/jag-data";

export const metadata = {
  title: "JAG Nevada Interview Tracker | Catapult Fundraising",
  description:
    "JAG Nevada Donor Assessment Study — weekly interview and calling status, prepared by Catapult Fundraising.",
  robots: { index: false, follow: false },
};

// Re-rendered on every request so the quotes below are freshly randomized
// each time someone loads the page, and so the latest saved data (from
// /jag-admin) always shows without needing a redeploy.
export const dynamic = "force-dynamic";

// Every section below shares the same card treatment as the original
// updated-info strip (rounded-2xl white card, thin line border) so the page
// keeps its original clean look — the difference from before is only that
// this content is now real, live data instead of a separate uncontrolled
// iframe.
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-6">{children}</div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-lg text-[rgb(var(--navy))]">{children}</h2>;
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="border-b border-[rgb(var(--line))] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/55"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[rgb(var(--line))]/70 last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 ${j === 0 ? "text-[rgb(var(--navy))]" : "text-[rgb(var(--ink))]/75"}`}
                >
                  {cell || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function JagDashboardPage() {
  const data = await getJagDashboardData();
  const quotes = pickRandomQuotes(data.quotes, 2);

  return (
    <>
      <PageHero
        eyebrow="JAG Nevada · Donor Assessment Study"
        title="Weekly Interview &amp; Calling Status"
        description={`Prospect outreach, completed interviews, and donor signals for the JAG Nevada donor assessment study. Updated ${data.reportDate}.`}
      />

      <section className="mx-auto max-w-7xl space-y-8 px-6 py-10 lg:px-10 lg:py-14">
        {/* Updated-info strip + PDF download */}
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{data.stats.totalProspects}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Total Prospects</p>
            </div>
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{data.stats.dials.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Dials</p>
            </div>
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{data.stats.emailsSent}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Emails Sent</p>
            </div>
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{data.stats.completed}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Interviews Completed</p>
            </div>
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{data.stats.inCallingProcess}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">In Calling Process</p>
            </div>
          </div>
          <a
            href="/api/jag-summary-pdf"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:bg-[rgb(var(--navy-deep))]"
          >
            <Download className="h-4 w-4" />
            Download PDF Summary
          </a>
        </div>

        {/* Quotes */}
        {quotes.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {quotes.map((q) => (
              <blockquote key={q} className="border-l-2 border-[rgb(var(--brass))] pl-5">
                <p className="font-display text-lg italic leading-snug text-[rgb(var(--navy))]">
                  &ldquo;{q}&rdquo;
                </p>
              </blockquote>
            ))}
          </div>
        )}

        {/* This Week's Snapshot */}
        <Card>
          <CardTitle>This Week&apos;s Snapshot</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {[
              ["Interviews Scheduled", data.stats.scheduled],
              ["To Be Rescheduled", data.stats.toBeRescheduled],
              ["Declined", data.stats.declined],
              ["Deceased", data.stats.deceased],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="font-display text-2xl text-[rgb(var(--navy))]">{value}</p>
                <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[rgb(var(--line))] pt-4">
            {[
              ["Tier 1", data.stats.tier1],
              ["Tier 2", data.stats.tier2],
              ["Tier 3", data.stats.tier3],
              ["Tier 4", data.stats.tier4],
              ["Tier 5", data.stats.tier5],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center gap-1.5 text-sm text-[rgb(var(--ink))]/75">
                <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--brass))]" />
                {label}: {value}
              </div>
            ))}
          </div>
        </Card>

        {/* Donor Signals */}
        {data.feasibilitySignals.length > 0 && (
          <Card>
            <CardTitle>Donor Signals</CardTitle>
            <p className="mt-1 text-xs text-[rgb(var(--ink))]/55">
              Based on {data.surveyRespondentCount} completed interview surveys
            </p>
            <div className="mt-4 divide-y divide-[rgb(var(--line))]">
              {data.feasibilitySignals.map((f) => (
                <div key={f.label} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <p className="w-16 shrink-0 font-display text-2xl text-[rgb(var(--brass))]">{f.stat}</p>
                  <div>
                    <p className="text-sm font-semibold text-[rgb(var(--navy))]">{f.label}</p>
                    <p className="mt-0.5 text-xs text-[rgb(var(--ink))]/60">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Mission Themes */}
        {data.missionThemes.length > 0 && (
          <Card>
            <CardTitle>Mission Themes That Resonate Most</CardTitle>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.missionThemes.map((m) => (
                <span
                  key={m.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--brass))] px-4 py-1.5 text-sm"
                >
                  <span className="font-semibold text-[rgb(var(--navy))]">{m.label}</span>
                  <span className="font-semibold text-[rgb(var(--brass))]">{m.pct}</span>
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Completed Interviews */}
        {data.completedInterviews.length > 0 && (
          <Card>
            <CardTitle>Completed Interviews ({data.completedInterviews.length})</CardTitle>
            <DataTable
              columns={["Name", "Organization", "Date"]}
              rows={data.completedInterviews.map((r) => [r.name, r.org, r.date])}
            />
          </Card>
        )}

        {/* Scheduled Interviews */}
        {data.scheduledInterviews.length > 0 && (
          <Card>
            <CardTitle>Scheduled Interviews ({data.scheduledInterviews.length})</CardTitle>
            <DataTable
              columns={["Name", "Organization", "Date"]}
              rows={data.scheduledInterviews.map((r) => [r.name, r.org, r.date])}
            />
          </Card>
        )}

        {/* To Be Rescheduled */}
        {data.toBeRescheduled.length > 0 && (
          <Card>
            <CardTitle>To Be Rescheduled ({data.toBeRescheduled.length})</CardTitle>
            <DataTable
              columns={["Name", "Organization"]}
              rows={data.toBeRescheduled.map((r) => [r.name, r.org])}
            />
          </Card>
        )}

        {/* Declined to Interview */}
        {data.declined.length > 0 && (
          <Card>
            <CardTitle>Declined to Interview ({data.declined.length})</CardTitle>
            <DataTable
              columns={["Name", "Organization", "Reason"]}
              rows={data.declined.map((r) => [r.name, r.org, r.reason])}
            />
          </Card>
        )}

        {/* Deceased */}
        {data.deceased.length > 0 && (
          <Card>
            <CardTitle>Deceased ({data.deceased.length})</CardTitle>
            <DataTable columns={["Name", "Reason"]} rows={data.deceased.map((r) => [r.name, r.reason])} />
          </Card>
        )}
      </section>
    </>
  );
}
