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

export default async function JagDashboardPage() {
  const data = await getJagDashboardData();
  const quotes = pickRandomQuotes(data.quotes, 2);

  return (
    <>
      <PageHero
        eyebrow="JAG Nevada · Donor Assessment Study"
        title="Weekly Interview &amp; Calling Status"
        description={`Live tracker of prospect outreach, completed interviews, and feasibility signals for the JAG Nevada donor assessment study. Updated ${data.reportDate}.`}
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
