import { PageHero } from "@/components/page-hero";
import { Download } from "lucide-react";

export const metadata = {
  title: "JAG Nevada Interview Tracker | Catapult Fundraising",
  description:
    "JAG Nevada Donor Assessment Study — weekly interview and calling status, prepared by Catapult Fundraising.",
  robots: { index: false, follow: false },
};

// Re-rendered on every request so the quotes below are freshly randomized
// each time someone loads the page (rather than fixed at build time).
export const dynamic = "force-dynamic";

// ---- Weekly Interview Status Report data ----
// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026.
const REPORT_DATE = "August 5, 2026";

const SNAPSHOT_STATS = [
  { value: "268", label: "Total Prospects" },
  { value: "1,982", label: "Dials" },
  { value: "283", label: "Emails Sent" },
  { value: "27", label: "Interviews Completed" },
  { value: "211", label: "In Calling Process" },
];

// ---- Interview quotes ----
// Source: JAG-Feasibility-Study_Survey_Results_080326.xlsx, verbatim
// (lightly trimmed for length) comments from completed interview surveys.
// A random subset is shown on every page load.
const QUOTES: { text: string; name: string }[] = [
  { text: "I believe JAG has a very good reputation among those who know about the organization and understand the work it does in the community.", name: "Jay Bloom" },
  { text: "I believe JAG has a very good reputation because it consistently delivers measurable results for students who are most at risk of not graduating.", name: "Tray Abney" },
  { text: "I feel JAG is a wonderful organization, is well respected, and has a positive reputation.", name: "Ann Silver" },
  { text: "JAG aligns closely with what motivates me because it prepares young people for successful careers while helping them overcome challenges that could prevent them from reaching their goals.", name: "Alletha Muzorewa" },
  { text: "JAG aligns with my passion for public education, helping young people develop meaningful life skills, and creating opportunities for students who may otherwise struggle to find their path.", name: "Chris Giunchigliani" },
  { text: "It aligns completely — I feel a strong sense of ownership and can clearly see the direct impact and immense return on investment it brings to youth.", name: "Dennis Perea" },
  { text: "That alignment is one of the reasons I serve on the board. I believe in the organization's mission, leadership, and ability to produce results.", name: "Tracy Brown-May" },
  { text: "JAG is very valuable and needed in Las Vegas. I see the dropout rates improving and feel JAG is doing a very good job.", name: "Catherine Bellver" },
  { text: "I have seen firsthand the instructors' enthusiasm and passion, and it is very inspirational.", name: "Greg Moore" },
  { text: "From what I've seen, JAG gets really good results for those that need another outlet and need a chance.", name: "David Foster" },
  { text: "JAG's focus on youth and its commitment to preparing students for quality employment strongly align with my values.", name: "Joselyn Cousins" },
  { text: "JAG aligns closely with our organization's priorities because it focuses on education and workforce development.", name: "Angel Williams" },
];

function pickRandomQuotes(count: number) {
  const pool = [...QUOTES];
  const picked: typeof QUOTES = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

export default function JagDashboardPage() {
  const quotes = pickRandomQuotes(2);

  return (
    <>
      <PageHero
        eyebrow="JAG Nevada · Donor Assessment Study"
        title="Weekly Interview &amp; Calling Status"
        description={`Live tracker of prospect outreach, completed interviews, and feasibility signals for the JAG Nevada donor assessment study. Updated ${REPORT_DATE}.`}
      />

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        {/* Updated-info strip + PDF download */}
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {SNAPSHOT_STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl text-[rgb(var(--navy))]">{s.value}</p>
                <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">{s.label}</p>
              </div>
            ))}
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
        <div className="mt-8">
          <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            In Their Own Words
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {quotes.map((q) => (
              <blockquote
                key={q.name}
                className="border-l-2 border-[rgb(var(--brass))] pl-5"
              >
                <p className="font-display text-lg italic leading-snug text-[rgb(var(--navy))]">
                  &ldquo;{q.text}&rdquo;
                </p>
                <cite className="mt-2 block text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))] not-italic">
                  — {q.name}
                </cite>
              </blockquote>
            ))}
          </div>
        </div>

        {/* Live tracker (external) */}
        <div className="mt-14">
          <div className="overflow-hidden rounded-2xl border border-black/10 shadow-sm">
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
