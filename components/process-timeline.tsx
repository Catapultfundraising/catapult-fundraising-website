import Image from "next/image";

const STEPS = [
  {
    phase: "Planning",
    title: "Feasibility & Case Development",
    description:
      "We interview leadership and top prospects, stress-test the campaign goal, and draft the case statement, budget, and gift table before a dollar is asked.",
  },
  {
    phase: "Campaign Planning",
    title: "Data, Materials & Committee Prep",
    description:
      "Over a focused 3-6 months, we prioritize prospect data, draft and finalize campaign materials, and recruit and train the Campaign Committee before quiet-phase solicitation begins.",
  },
  {
    phase: "Quiet Phase",
    title: "Major Gift Solicitation",
    description:
      "Over 24–36 months, your Campaign Chair and Steering Committee secure the majority of the goal from identified individual, foundation, and corporate donors.",
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
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-80 md:w-96">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/b60d98ca-622e-4611-bcd6-1607f1d5ce1a.png"
              alt="Illustration of the five connected phases of a Catapult Fundraising capital campaign"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="max-w-2xl">
          <p className="font-display text-xl sm:text-[22.5px] uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
            How A Campaign Moves
          </p>
          <h2 className="mt-4 font-display text-6xl tracking-tight text-[rgb(var(--navy))] sm:text-[75px]">
            Five phases. One firm carrying you through all of them.
          </h2>
        </div>

        <div className="clear-both mt-10 grid gap-0 border-t border-[rgb(var(--line))] lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <div
              key={step.phase}
              className="relative border-b border-[rgb(var(--line))] px-2 py-8 lg:border-b-0 lg:border-r lg:px-6 lg:last:border-r-0"
            >
              <span className="font-display text-6xl text-[rgb(var(--navy))]/10">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-4 text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                {step.phase}
              </p>
              <h3 className="mt-2 font-display text-[25px] text-[rgb(var(--navy))]">
                {step.title}
              </h3>
              <p className="mt-3 text-[17.5px] leading-relaxed text-[rgb(var(--ink))]/65">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
