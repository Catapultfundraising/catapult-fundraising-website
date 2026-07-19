import Link from "next/link";
import { ArrowRight, Briefcase, Phone, Users2, Landmark } from "lucide-react";

const SERVICES = [
  {
    icon: Briefcase,
    label: "Planning Through Public Phase",
    title: "Capital Campaign Counsel",
    description:
      "Feasibility studies, case development, and quiet-phase major gift strategy, carried through an 18–24 month runway into public-phase calling.",
    href: "/services/capital-campaign",
  },
  {
    icon: Phone,
    label: "Community & Annual Fund",
    title: "Annual Fund Calling",
    description:
      "Trained Engagement Officers treat every prospect like a major donor-in-waiting, with segmented outreach, personalized asks, and digital stewardship included.",
    href: "/services/annual-fund",
  },
  {
    icon: Users2,
    label: "Between Annual & Major Gifts",
    title: "Mid-Level Donor Engagement",
    description:
      "An 8-stage, relationship-first program that upgrades mid-level donors and builds a qualified pipeline for future major gifts.",
    href: "/services/donor-engagement",
  },
  {
    icon: Landmark,
    label: "Bequests & Deferred Gifts",
    title: "Legacy & Planned Giving",
    description:
      "Legacy Call identifies and closes bequests, beneficiary designations, and other deferred gifts from your most loyal, longest-tenured donors.",
    href: "/services/legacy-giving",
  },
];

export function ServicesOverview() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-20">
      <div className="max-w-2xl">
        <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
          What We Do
        </p>
        <h2 className="mt-4 font-display text-5xl tracking-tight text-[rgb(var(--navy))] sm:text-6xl">
          Four ways we grow your donor base — one accountable partner.
        </h2>
      </div>

      <div className="mt-14 grid gap-8 sm:grid-cols-2">
        {SERVICES.map((service) => (
          <Link
            key={service.title}
            href={service.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white p-9 transition-shadow hover:shadow-xl hover:shadow-[rgb(var(--navy))]/5"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
                  <service.icon className="h-5 w-5 text-[rgb(var(--brass))]" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--navy))]/50">
                  {service.label}
                </span>
              </div>
              <h3 className="mt-6 font-display text-2xl text-[rgb(var(--navy))]">
                {service.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/70">
                {service.description}
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
              Learn more
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
