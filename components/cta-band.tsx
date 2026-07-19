import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-[rgb(var(--navy))] py-16 text-[rgb(var(--paper))]">
      <div
        className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--brass)) 0%, transparent 70%)" }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-end lg:px-10">
        <div className="max-w-xl">
          <h2 className="font-display text-4xl tracking-tight text-balance sm:text-5xl">
            Ready to catapult your next campaign?
          </h2>
          <p className="mt-4 text-[rgb(var(--paper))]/70">
            Tell us about your goal, timeline, and donor base. We&rsquo;ll respond within one business day.
          </p>
        </div>
        <Link
          href="/contact"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[rgb(var(--brass))] px-7 py-3.5 text-sm font-semibold text-[rgb(var(--navy-deep))] transition-transform hover:scale-[1.02]"
        >
          Start the Conversation
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
