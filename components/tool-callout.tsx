import Link from "next/link";
import { ArrowRight, Calculator, ClipboardCheck, HeartHandshake } from "lucide-react";

/**
 * Inline pointer to the gift chart calculator, for the service pages and
 * articles where a reader is already doing the math in their head.
 */
export function GiftChartCalloutCard({ note }: { note?: string }) {
  return (
    <div className="my-10 rounded-2xl border border-[rgb(var(--brass))]/40 bg-[rgb(var(--paper))] p-6 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        <Calculator className="h-4 w-4" />
        Free tool
      </p>
      <h3 className="mt-3 font-display text-2xl text-[rgb(var(--navy))]">
        See the gift chart for your goal
      </h3>
      <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
        {note ??
          "Enter a campaign goal and our calculator builds the gift chart and pyramid behind it: how many gifts you need at each level, how many prospects it takes to produce them, and how much of the goal rides on the top ten gifts."}
      </p>
      <Link
        href="/resources/gift-chart-calculator"
        className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-[rgb(var(--paper))] transition-transform hover:scale-[1.02]"
      >
        Open the gift chart calculator
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

/**
 * Inline pointer to the campaign readiness report card, for the pages where a
 * reader is asking whether they are ready rather than how big the chart is.
 */
export function ReadinessCalloutCard({ note }: { note?: string }) {
  return (
    <div className="my-10 rounded-2xl border border-[rgb(var(--brass))]/40 bg-[rgb(var(--paper))] p-6 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        <ClipboardCheck className="h-4 w-4" />
        Free tool
      </p>
      <h3 className="mt-3 font-display text-2xl text-[rgb(var(--navy))]">
        Grade your campaign readiness
      </h3>
      <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
        {note ??
          "Sixteen questions, about three minutes. Our report card grades seven areas, names the single biggest risk to your campaign, and gives you three next steps you can take this quarter."}
      </p>
      <Link
        href="/resources/campaign-readiness-assessment"
        className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-[rgb(var(--paper))] transition-transform hover:scale-[1.02]"
      >
        Open the readiness report card
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

/**
 * Inline pointer to the donor loyalty and legacy report card, for the legacy
 * giving and donor engagement pages, where the reader is trying to work out
 * which of the two programs their file actually calls for.
 */
export function LoyaltyCalloutCard({ note }: { note?: string }) {
  return (
    <div className="my-10 rounded-2xl border border-[rgb(var(--brass))]/40 bg-[rgb(var(--paper))] p-6 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        <HeartHandshake className="h-4 w-4" />
        Free tool
      </p>
      <h3 className="mt-3 font-display text-2xl text-[rgb(var(--navy))]">
        Find the donors nobody is talking to
      </h3>
      <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
        {note ??
          "Sixteen questions, about three minutes. Our report card grades your readiness for a legacy program and a mid-level engagement program, tells you which one to start with, and shows what your loyal donor pool is worth on average. Estimates are welcome."}
      </p>
      <Link
        href="/resources/donor-loyalty-assessment"
        className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-[rgb(var(--paper))] transition-transform hover:scale-[1.02]"
      >
        Open the donor loyalty report card
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
