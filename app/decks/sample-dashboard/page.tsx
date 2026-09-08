import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { JagContactList } from "@/components/jag-contact-list";
import { SAMPLE_ORG_NAME, SAMPLE_STUDY_DATA } from "@/lib/sample-study-data";
import {
  buildContactList,
  deltaLabel,
  computeResponseRate,
  generateObservations,
} from "@/lib/jag-data";

export const metadata = {
  title: "Sample Feasibility Study Dashboard | Catapult Fundraising",
  description:
    "Anonymized sample of the live feasibility study dashboard Catapult builds for capital campaign clients while the study is underway.",
  robots: { index: false, follow: false },
};

function StatTile({ label, value, delta }: { label: string; value: string | number; delta?: string | null }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--line))] bg-white px-4 py-3">
      <p className="font-display text-xl text-[rgb(var(--navy))]">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>
      {delta && <p className="mt-1 text-[11px] font-medium text-[rgb(var(--ink))]/50">{delta}</p>}
    </div>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div>
      <h2 className="font-display text-xl text-[rgb(var(--navy))]">{children}</h2>
      {subtitle && <p className="mt-1 text-xs text-[rgb(var(--ink))]/55">{subtitle}</p>}
    </div>
  );
}

export default function SampleStudyDashboardPage() {
  const data = SAMPLE_STUDY_DATA;
  const { stats, previousStats } = data;
  const quotes = data.quotes.slice(0, 2);

  const contacts = buildContactList(data);
  const observations = generateObservations(data);
  const responseRate = computeResponseRate(stats);

  const breakdown: { label: string; value: number }[] = [
    { label: "Completed", value: stats.completed },
    { label: "Scheduled", value: stats.scheduled },
    { label: "To Be Rescheduled", value: stats.toBeRescheduled },
    { label: "Declined", value: stats.declined },
    { label: "Deceased", value: stats.deceased },
  ];
  const maxBreakdown = Math.max(...breakdown.map((b) => b.value), 1);

  return (
    <>
      <PageHero
        eyebrow={`${SAMPLE_ORG_NAME} · Feasibility Study`}
        title="Weekly Interview &amp; Calling Status"
        description={`Sample of the live dashboard every Catapult feasibility study client gets while their study is underway: prospect outreach, interviews, and donor signals, updated weekly. Report date ${data.reportDate}.`}
      />

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        <div className="rounded-2xl border border-[rgb(var(--brass))]/40 bg-[rgb(var(--paper))] px-6 py-4 text-sm leading-relaxed text-[rgb(var(--ink))]/75">
          <span className="font-semibold text-[rgb(var(--navy))]">Sample dashboard.</span> This is a
          study in progress, captured mid-stream, with 210 prospects still in the calling process.
          The organization name, contact names, and employers are fictional, so nothing identifies a
          client or the people interviewed.
        </div>

        {/* Updated-info strip */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{stats.totalProspects}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Total Prospects</p>
            </div>
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{stats.dials.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Dials</p>
            </div>
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{stats.emailsSent}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Emails Sent</p>
            </div>
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{stats.completed}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Interviews Completed</p>
            </div>
            <div>
              <p className="font-display text-2xl text-[rgb(var(--navy))]">{stats.inCallingProcess}</p>
              <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">In Calling Process</p>
            </div>
          </div>
          <a
            href="/decks/sample-dashboard/summary-pdf"
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

        <div className="mt-14 space-y-10">
          <div>
            <SectionTitle>Weekly Outreach Snapshot</SectionTitle>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile
                label="Total Prospects"
                value={stats.totalProspects}
                delta={deltaLabel(stats.totalProspects, previousStats?.totalProspects)}
              />
              <StatTile
                label="Interviews Completed"
                value={stats.completed}
                delta={deltaLabel(stats.completed, previousStats?.completed)}
              />
              <StatTile
                label="Scheduled"
                value={stats.scheduled}
                delta={deltaLabel(stats.scheduled, previousStats?.scheduled)}
              />
              <StatTile
                label="To Be Rescheduled"
                value={stats.toBeRescheduled}
                delta={deltaLabel(stats.toBeRescheduled, previousStats?.toBeRescheduled)}
              />
              <StatTile
                label="Declined"
                value={stats.declined}
                delta={deltaLabel(stats.declined, previousStats?.declined)}
              />
              <StatTile
                label="In Calling Process"
                value={stats.inCallingProcess}
                delta={deltaLabel(stats.inCallingProcess, previousStats?.inCallingProcess)}
              />
              <StatTile
                label="Number of Dials"
                value={stats.dials.toLocaleString()}
                delta={deltaLabel(stats.dials, previousStats?.dials)}
              />
              <StatTile
                label="Emails Sent"
                value={stats.emailsSent}
                delta={deltaLabel(stats.emailsSent, previousStats?.emailsSent)}
              />
              <StatTile label="Response Rate" value={`${responseRate}%`} delta="Reached vs. total prospects" />
              <StatTile label="Deceased" value={stats.deceased} />
            </div>
          </div>

          <div>
            <SectionTitle subtitle="Named contacts by outreach outcome">Status Breakdown</SectionTitle>
            <div className="mt-4 space-y-2.5">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-[rgb(var(--ink))]/65">{b.label}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-[rgb(var(--paper))]">
                    <div
                      className="h-full rounded-full bg-[rgb(var(--brass))]"
                      style={{ width: `${Math.max((b.value / maxBreakdown) * 100, b.value > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold text-[rgb(var(--navy))]">
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle subtitle={`Total ${stats.totalProspects} prospects across 5 tiers`}>
              Prospect Tiers
            </SectionTitle>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["Tier 1", stats.tier1],
                ["Tier 2", stats.tier2],
                ["Tier 3", stats.tier3],
                ["Tier 4", stats.tier4],
                ["Tier 5", stats.tier5],
              ].map(([label, value]) => (
                <StatTile key={label as string} label={label as string} value={value as number} />
              ))}
            </div>
          </div>

          {data.feasibilitySignals.length > 0 && (
            <div>
              <SectionTitle subtitle={`From the ${stats.completed} interview surveys completed so far`}>
                Feedback Trends
              </SectionTitle>
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

          <div>
            <SectionTitle subtitle="Fictional names and employers in this sample">Contact List</SectionTitle>
            <div className="mt-4">
              <JagContactList rows={contacts} />
            </div>
          </div>

          {observations.length > 0 && (
            <div>
              <SectionTitle subtitle="Themes from completed interviews">General Observations</SectionTitle>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[rgb(var(--ink))]/80">
                {observations.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12">
          <Link
            href="/decks/capital-campaign"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))] underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to the Capital Campaign deck
          </Link>
        </div>
      </section>
    </>
  );
}
