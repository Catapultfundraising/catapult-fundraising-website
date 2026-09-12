import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";

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
