import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { TestimonialStrip } from "@/components/testimonial-strip";

export const metadata = {
  title: "Results & Case Studies | Catapult Fundraising",
  description:
    "Representative outcomes from Catapult's capital campaign and annual fund calling programs across nonprofit sectors nationwide.",
};

const CASE_STUDIES = [
  {
    sector: "Human Services",
    goal: "$12M Capital Campaign",
    result:
      "Quiet phase secured 78% of goal from 40 major donors within 20 months; public-phase calling added another 14% while onboarding 900+ new donors.",
  },
  {
    sector: "Faith-Based Organization",
    goal: "$8M Facilities Campaign",
    result:
      "Feasibility study reset an unrealistic $15M goal to an achievable $8M target; campaign closed above goal with a Steering Committee-led quiet phase.",
  },
  {
    sector: "Behavioral Health Nonprofit",
    goal: "Annual Fund Growth",
    result:
      "AF Connect segmentation and personalized asks lifted average gift size and reactivated a lapsed-donor segment representing 22% of prior-year revenue.",
  },
  {
    sector: "Arts & Culture Center",
    goal: "Capital + Endowment Campaign",
    result:
      "Combined capital and endowment case statement clarified donor intent options, accelerating major gift commitments during the quiet phase.",
  },
];

export default function ResultsPage() {
  return (
    <>
      <PageHero
        eyebrow="Results"
        title="Representative outcomes from campaigns we've carried start to finish."
        description="Every nonprofit's numbers are confidential to their board, but the patterns below reflect the kind of results clients see when planning, major gifts, and public-phase calling are handled by one accountable team."
      />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          {CASE_STUDIES.map((cs) => (
            <div
              key={cs.sector}
              className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                {cs.sector}
              </p>
              <h3 className="mt-3 font-display text-2xl text-[rgb(var(--navy))]">
                {cs.goal}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/70">
                {cs.result}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-[rgb(var(--ink))]/40">
          Figures are illustrative composites reflecting typical program outcomes.
          Ask us for named, board-approved case studies specific to your sector.
        </p>
      </section>

      <section className="border-t border-[rgb(var(--line))] bg-[rgb(var(--paper))] py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
            How Our Services Fit Together
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-5xl tracking-tight text-[rgb(var(--navy))] sm:text-6xl">
            A quick look at what we do and how a legacy gift comes together.
          </h2>

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--line))] shadow-sm">
              <Image
                src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ba2651fa-5d0a-422f-bd44-e23dbe1ce0b8.png"
                alt="Four ways Catapult grows your donor base: Capital Campaign Counsel, Annual Fund Calling, Mid-Level Donor Engagement, and Legacy & Planned Giving"
                width={1024}
                height={1536}
                className="h-auto w-full"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--line))] shadow-sm">
              <Image
                src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/bd7a2d2c-1aed-41b7-8020-2ffefe64aa42.png"
                alt="The Legacy Call process: a seven-step journey to a confirmed planned gift"
                width={1024}
                height={1536}
                className="h-auto w-full"
              />
            </div>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--line))] shadow-sm lg:col-start-1">
              <Image
                src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/d97f64ed-c5c0-4c43-8f37-e6f98fbc3073.png"
                alt="The Mid-Level Donor Engagement Journey: an eight-stage pathway to a confirmed increased gift"
                width={1024}
                height={1536}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <TestimonialStrip />
      <CtaBand />
    </>
  );
}
