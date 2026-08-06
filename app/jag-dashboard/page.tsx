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

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--line))] bg-white px-4 py-3">
      <p className="font-display text-xl text-[rgb(var(--navy))]">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl text-[rgb(var(--navy))]">{children}</h2>;
}

export default async function JagDashboardPage() {
  const data = await getJagDashboardData();
  const quotes = pickRandomQuotes(data.quotes, 2);

  return (
    <>
      <PageHero
        eyebrow="JAG Nevada · Donor Assessment Study"
        title="Weekly Interview &amp; Calling Status"
        description={`Prospect outreach, completed interviews, and feasibility signals for the JAG Nevada donor assessment study. Updated ${data.reportDate}.`}
      />

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
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
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
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
        <div className="mt-14">
          <SectionTitle>This Week&apos;s Snapshot</SectionTitle>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard value={data.stats.totalProspects} label="Total Prospects" />
            <StatCard value={data.stats.dials.toLocaleString()} label="Number of Dials" />
            <StatCard value={data.stats.emailsSent} label="Emails Sent" />
            <StatCard value={data.stats.completed} label="Interviews Completed" />
            <StatCard value={data.stats.scheduled} label="Interviews Scheduled" />
            <StatCard value={data.stats.toBeRescheduled} label="To Be Rescheduled" />
            <StatCard value={data.stats.declined} label="Declined" />
            <StatCard value={data.stats.inCallingProcess} label="In Calling Process" />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
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
        </div>

        {/* Feasibility Signals */}
        {data.feasibilitySignals.length > 0 && (
          <div className="mt-14">
            <SectionTitle>Feasibility Signals</SectionTitle>
            <p className="mt-1 text-xs text-[rgb(var(--ink))]/55">
              Based on {data.surveyRespondentCount} completed interview surveys
            </p>
            <div className="mt-4 divide-y divide-[rgb(var(--line))] border-t border-[rgb(var(--line))]">
              {data.feasibilitySignals.map((f) => (
                <div key={f.label} className="flex items-start gap-4 py-3">
                  <p className="w-16 shrink-0 font-display text-2xl text-[rgb(var(--brass))]">{f.stat}</p>
                  <div>
                    <p className="text-sm font-semibold text-[rgb(var(--navy))]">{f.label}</p>
                    <p className="mt-0.5 text-xs text-[rgb(var(--ink))]/60">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mission Themes */}
        {data.missionThemes.length > 0 && (
          <div className="mt-14">
            <SectionTitle>Mission Themes That Resonate Most</SectionTitle>
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
          </div>
        )}

        {/* Completed Interviews */}
        {data.completedInterviews.length > 0 && (
          <div className="mt-14 overflow-x-auto">
            <SectionTitle>Completed Interviews ({data.completedInterviews.length})</SectionTitle>
            <table className="mt-4 w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-[rgb(var(--brass))] text-left text-[rgb(var(--navy))]">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Organization</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.completedInterviews.map((row, i) => (
                  <tr
                    key={row.name + row.date}
                    className={`border-b border-[rgb(var(--line))] ${i % 2 === 1 ? "bg-[#F1ECE0]/50" : ""}`}
                  >
                    <td className="px-3 py-2 text-[rgb(var(--ink))]">{row.name}</td>
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/80">{row.org || "—"}</td>
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/80">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Scheduled Interviews */}
        {data.scheduledInterviews.length > 0 && (
          <div className="mt-14 overflow-x-auto">
            <SectionTitle>Scheduled Interviews ({data.scheduledInterviews.length})</SectionTitle>
            <table className="mt-4 w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-[rgb(var(--brass))] text-left text-[rgb(var(--navy))]">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Organization</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.scheduledInterviews.map((row, i) => (
                  <tr
                    key={row.name + row.date}
                    className={`border-b border-[rgb(var(--line))] ${i % 2 === 1 ? "bg-[#F1ECE0]/50" : ""}`}
                  >
                    <td className="px-3 py-2 text-[rgb(var(--ink))]">{row.name}</td>
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/80">{row.org || "—"}</td>
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/80">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* To Be Rescheduled */}
        {data.toBeRescheduled.length > 0 && (
          <div className="mt-14 overflow-x-auto">
            <SectionTitle>To Be Rescheduled ({data.toBeRescheduled.length})</SectionTitle>
            <table className="mt-4 w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="bg-[rgb(var(--brass))] text-left text-[rgb(var(--navy))]">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Organization</th>
                </tr>
              </thead>
              <tbody>
                {data.toBeRescheduled.map((row, i) => (
                  <tr
                    key={row.name}
                    className={`border-b border-[rgb(var(--line))] ${i % 2 === 1 ? "bg-[#F1ECE0]/50" : ""}`}
                  >
                    <td className="px-3 py-2 text-[rgb(var(--ink))]">{row.name}</td>
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/80">{row.org || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Declined to Interview */}
        {data.declined.length > 0 && (
          <div className="mt-14 overflow-x-auto">
            <SectionTitle>Declined to Interview ({data.declined.length})</SectionTitle>
            <table className="mt-4 w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="bg-[rgb(var(--brass))] text-left text-[rgb(var(--navy))]">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Organization</th>
                  <th className="px-3 py-2 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.declined.map((row, i) => (
                  <tr
                    key={row.name}
                    className={`border-b border-[rgb(var(--line))] ${i % 2 === 1 ? "bg-[#F1ECE0]/50" : ""}`}
                  >
                    <td className="px-3 py-2 text-[rgb(var(--ink))]">{row.name}</td>
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/80">{row.org || "—"}</td>
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/80">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Deceased */}
        {data.deceased.length > 0 && (
          <div className="mt-14 overflow-x-auto">
            <SectionTitle>Deceased ({data.deceased.length})</SectionTitle>
            <table className="mt-4 w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="bg-[rgb(var(--brass))] text-left text-[rgb(var(--navy))]">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.deceased.map((row, i) => (
                  <tr
                    key={row.name}
                    className={`border-b border-[rgb(var(--line))] ${i % 2 === 1 ? "bg-[#F1ECE0]/50" : ""}`}
                  >
                    <td className="px-3 py-2 text-[rgb(var(--ink))]">{row.name}</td>
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/80">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
