import { PageHero } from "@/components/page-hero";
import { Download } from "lucide-react";

export const metadata = {
  title: "JAG Nevada Interview Tracker | Catapult Fundraising",
  description:
    "JAG Nevada Donor Assessment Study — weekly interview and calling status, prepared by Catapult Fundraising.",
  robots: { index: false, follow: false },
};

// ---- Weekly Interview Status Report data ----
// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026.
const REPORT_DATE = "August 5, 2026";

const STAT_CARDS = [
  { value: "268", label: "Total Prospects" },
  { value: "1,982", label: "Number of Dials" },
  { value: "283", label: "Emails Sent" },
  { value: "27", label: "Interviews Completed" },
  { value: "1", label: "Interviews Scheduled" },
  { value: "5", label: "To Be Rescheduled" },
  { value: "23", label: "Declined" },
  { value: "1", label: "Deceased" },
  { value: "211", label: "In Calling Process" },
];

const TIERS = [
  { label: "Tier 1", value: 56 },
  { label: "Tier 2", value: 54 },
  { label: "Tier 3", value: 52 },
  { label: "Tier 4", value: 52 },
  { label: "Tier 5", value: 54 },
];

// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026, "Completed Interviews" (pages 2-3).
const COMPLETED_INTERVIEWS = [
  { name: "Dennis Perea", org: "KGHM", date: "6/15/2026" },
  { name: "Shauna Walch", org: "", date: "6/17/2026" },
  { name: "Jay Bloom", org: "", date: "6/18/2026" },
  { name: "Chris Giunchigliani", org: "Gray's Leadership Academy", date: "6/23/2026" },
  { name: "Tray Abney", org: "Abney Tauchen Group", date: "6/24/2026" },
  { name: "Joselyn Cousins", org: "Federal Reserve Bank", date: "6/24/2026" },
  { name: "Gerri Schroder", org: "", date: "6/26/2026" },
  { name: "Alletha Muzorewa", org: "Anthem", date: "6/30/2026" },
  { name: "Ann Silver", org: "Reno + Sparks Chamber of Commerce", date: "6/30/2026" },
  { name: "Angel Williams", org: "NV Energy", date: "6/30/2026" },
  { name: "Jan Blackhurst", org: "UNLV Black Fire Leadership Initiative", date: "7/6/2026" },
  { name: "David Foster", org: "", date: "7/8/2026" },
  { name: "Katei Horn", org: "Las Vegas Valley Water District", date: "7/8/2026" },
  { name: "Tracy Brown-May", org: "Nevada Legislature", date: "7/13/2026" },
  { name: "Peter Digrazia", org: "", date: "7/14/2026" },
  { name: "Tracy Moore", org: "Former JAG Nevada board member", date: "7/14/2026" },
  { name: "Elaine Silverstone", org: "Nevada Governor's Office of Economic Development", date: "7/14/2026" },
  { name: "George Keyes", org: "", date: "7/15/2026" },
  { name: "Amelia Hippert", org: "Soroptimist International", date: "7/17/2026" },
  { name: "Thomas Burns", org: "", date: "7/20/2026" },
  { name: "Greg Moore", org: "State Farm", date: "7/20/2026" },
  { name: "Catherine Bellver", org: "UNLV and Soroptimist", date: "7/22/2026" },
  { name: "Greg Fine", org: "Marketing Consultant — Greg the Fine", date: "7/23/2026" },
  { name: "Edward Estipona", org: "Estipona Group", date: "7/28/2026" },
  { name: "Magda Iwanska-Hirsch", org: "PNC", date: "7/30/2026" },
  { name: "Chris Reilly", org: "State of Nevada", date: "8/3/2026" },
  { name: "Jane'e Murphy", org: "Al Davis Eddie Robinson Leadership Academy", date: "8/4/2026" },
];

// ---- Feasibility study signals ----
// Source: JAG-Feasibility-Study_Survey_Results_080326.xlsx, 26 completed
// interview surveys analyzed as of 8/3/2026. Percentages computed from the
// raw answer counts in that file.
const FEASIBILITY_SIGNALS = [
  {
    stat: "85%",
    label: "Rate JAG's reputation “Very Good” or “Good”",
    detail: "14 Very Good, 8 Good, 4 Don't Know — out of 26 respondents",
  },
  {
    stat: "69%",
    label: "Would consider a financial gift to JAG if asked",
    detail: "18 Yes, 6 No, 1 Maybe, 1 Don't Know",
  },
  {
    stat: "60%",
    label: "Of likely donors would consider a multi-year commitment",
    detail: "9 of 15 who answered the multi-year follow-up said Yes",
  },
  {
    stat: "73%",
    label: "Are willing to introduce JAG to others in their network",
    detail: "19 of 26 respondents said Yes",
  },
  {
    stat: "42%",
    label: "Would consider a leadership role with JAG",
    detail: "11 Yes, another 6 said Maybe",
  },
];

const MISSION_THEMES = [
  { label: "Workforce development", pct: "73%" },
  { label: "Opportunity & access", pct: "69%" },
  { label: "Mentorship", pct: "54%" },
  { label: "Student success", pct: "50%" },
  { label: "Leadership training", pct: "31%" },
];

export default function JagDashboardPage() {
  return (
    <>
      <PageHero
        eyebrow="JAG Nevada · Donor Assessment Study"
        title="Weekly Interview &amp; Calling Status"
        description={`Live tracker of prospect outreach, completed interviews, and feasibility signals for the JAG Nevada donor assessment study. Updated ${REPORT_DATE}.`}
      />

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              This Week&apos;s Snapshot
            </p>
            <h2 className="mt-1 font-display text-2xl text-[rgb(var(--navy))]">{REPORT_DATE}</h2>
          </div>
          <a
            href="/api/jag-summary-pdf"
            className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:bg-[rgb(var(--navy-deep))]"
          >
            <Download className="h-4 w-4" />
            Download PDF Summary
          </a>
        </div>

        {/* Stat cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {STAT_CARDS.map((s) => (
            <div key={s.label} className="rounded-xl border border-[rgb(var(--line))] bg-white p-5">
              <p className="font-display text-3xl text-[rgb(var(--navy))]">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tier breakdown */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-[rgb(var(--line))] bg-white px-5 py-4">
          {TIERS.map((t) => (
            <div key={t.label} className="flex items-center gap-2 text-sm text-[rgb(var(--navy))]/80">
              <span className="h-2 w-2 rounded-full bg-[rgb(var(--brass))]" />
              <span className="font-semibold">{t.label}:</span> {t.value}
            </div>
          ))}
        </div>

        {/* Feasibility signals */}
        <div className="mt-14">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Feasibility Study Signals
          </p>
          <h2 className="mt-1 font-display text-2xl text-[rgb(var(--navy))]">What prospects are telling us</h2>
          <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--ink))]/65">
            Based on 26 completed interview surveys analyzed as of August 3, 2026.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEASIBILITY_SIGNALS.map((f) => (
              <div
                key={f.label}
                className="flex gap-4 rounded-xl border border-[rgb(var(--line))] bg-white p-5"
              >
                <p className="font-display text-3xl text-[rgb(var(--brass))]">{f.stat}</p>
                <div>
                  <p className="text-sm font-semibold text-[rgb(var(--navy))]">{f.label}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--ink))]/55">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-[rgb(var(--line))] bg-white p-5">
            <p className="text-sm font-semibold text-[rgb(var(--navy))]">Mission themes that resonate most</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MISSION_THEMES.map((m) => (
                <span
                  key={m.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--brass))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--navy))]"
                >
                  {m.label}
                  <span className="text-[rgb(var(--brass))]">{m.pct}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Completed interviews table */}
        <div className="mt-14">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Completed Interviews
          </p>
          <h2 className="mt-1 font-display text-2xl text-[rgb(var(--navy))]">
            {COMPLETED_INTERVIEWS.length} interviews completed to date
          </h2>

          <div className="mt-6 overflow-hidden rounded-xl border border-[rgb(var(--line))] bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[rgb(var(--brass))]/15 text-xs uppercase tracking-wider text-[rgb(var(--navy))]">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {COMPLETED_INTERVIEWS.map((row, i) => (
                  <tr
                    key={row.name + row.date}
                    className={i % 2 === 1 ? "bg-[rgb(var(--paper))]" : undefined}
                  >
                    <td className="px-4 py-2.5 text-[rgb(var(--navy))]">{row.name}</td>
                    <td className="px-4 py-2.5 text-[rgb(var(--ink))]/70">{row.org || "—"}</td>
                    <td className="px-4 py-2.5 text-[rgb(var(--ink))]/70">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live tracker (external) */}
        <div className="mt-14">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Live Tracker
          </p>
          <h2 className="mt-1 font-display text-2xl text-[rgb(var(--navy))]">Full prospect-level detail</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 shadow-sm">
            <iframe
              src="https://jag-nevada-tracker.vercel.app"
              title="JAG Nevada Interview Tracker"
              className="h-[2400px] w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </>
  );
}
