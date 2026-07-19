import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[rgb(var(--navy))] text-[rgb(var(--paper))]">
      <div className="grain absolute inset-0" />
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(var(--brass)) 0%, transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="reveal max-w-3xl">
          <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass-light))]">
            Capital Campaign &amp; Donor Calling Counsel
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            The full-service firm that carries your campaign from{" "}
            <span className="italic text-[rgb(var(--brass-light))]">first feasibility call</span>{" "}
            to final pledge.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[rgb(var(--paper))]/75">
            Catapult is the only national firm that plans your capital
            campaign from the earliest quiet-phase strategy through a
            professionally staffed public-phase calling program, wrapping
            every campaign in one accountable partner instead of three
            vendors.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-full bg-[rgb(var(--brass))] px-7 py-3.5 text-sm font-semibold text-[rgb(var(--navy-deep))] transition-transform hover:scale-[1.02]"
            >
              Schedule a Feasibility Conversation
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/results"
              className="text-sm font-semibold text-[rgb(var(--paper))]/85 underline decoration-[rgb(var(--brass-light))]/60 underline-offset-8 hover:text-[rgb(var(--paper))]"
            >
              See campaign results
            </Link>
          </div>
        </div>

        <dl className="reveal mt-12 grid grid-cols-2 gap-8 border-t border-[rgb(var(--paper))]/15 pt-8 sm:grid-cols-4">
          {[
            { value: "$400M+", label: "Active campaign portfolio" },
            { value: "18–24 mo.", label: "Typical quiet-phase runway" },
            { value: "10–20%", label: "Raised in public-phase calling" },
            { value: "40+", label: "Donor research sources" },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="font-display text-3xl text-[rgb(var(--brass-light))] sm:text-4xl">
                {stat.value}
              </dt>
              <dd className="mt-2 text-xs uppercase tracking-wider text-[rgb(var(--paper))]/60">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
