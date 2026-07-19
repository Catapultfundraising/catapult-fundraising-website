const STEPS = [
  {
    phase: "Planning",
    title: "Feasibility & Case Development",
    description:
      "We interview leadership and top prospects, stress-test the campaign goal, and draft the case statement, budget, and gift table before a dollar is asked.",
  },
  {
    phase: "Quiet Phase",
    title: "Major Gift Solicitation",
    description:
      "Over 18–24 months, your Campaign Chair and Steering Committee secure the majority of the goal from identified individual, foundation, and corporate donors.",
  },
  {
    phase: "Campaign Connect",
    title: "Public Phase Calling",
    description:
      "Our trained Engagement Officers reach alumni, patients, members, and subscribers with personalized asks, raising 10–20% of the goal while expanding the donor base.",
  },
  {
    phase: "Stewardship",
    title: "Fulfillment & Renewal",
    description:
      "Thank-you letters within 24–48 hours, pledge fulfillment support, and digital stewardship keep every new donor engaged for the next ask.",
  },
];

export function ProcessTimeline() {
  return (
    <section className="bg-[rgb(var(--paper))] py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
            How A Campaign Moves
          </p>
          <h2 className="mt-4 font-display text-5xl tracking-tight text-[rgb(var(--navy))] sm:text-6xl">
            Four phases. One firm carrying you through all of them.
          </h2>
        </div>

        <div className="mt-16 grid gap-0 border-t border-[rgb(var(--line))] lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.phase}
              className="relative border-b border-[rgb(var(--line))] px-2 py-8 lg:border-b-0 lg:border-r lg:px-8 lg:last:border-r-0"
            >
              <span className="font-display text-5xl text-[rgb(var(--navy))]/10">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                {step.phase}
              </p>
              <h3 className="mt-2 font-display text-xl text-[rgb(var(--navy))]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--ink))]/65">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
