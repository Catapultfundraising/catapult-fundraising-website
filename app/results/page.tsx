import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { TestimonialStrip } from "@/components/testimonial-strip";

export const metadata = {
  title: "Results & Case Studies | Catapult Fundraising",
  description:
    "Representative outcomes from Catapult's capital campaign, annual fund, mid-level donor engagement, and legacy giving programs across nonprofit sectors nationwide.",
};

const SERVICE_RESULTS = [
  {
    sector: "Capital Campaign Counsel",
    goal: "Feasibility to Public Phase",
    result:
      "Structured feasibility studies and quiet-phase major gift strategy carried clients through a 24–36 month runway into a confidently launched public phase.",
  },
  {
    sector: "Legacy & Planned Giving",
    goal: "Bequest Identification",
    result:
      "Legacy Call conversations with long-tenured donors identified and closed bequests and beneficiary designations that would otherwise have gone unrecorded.",
  },
  {
    sector: "Mid-Level Donor Engagement",
    goal: "Average Gift Growth",
    result:
      "Personalized outreach from a dedicated Engagement Officer, paired with a story-driven pre-call letter, increased average mid-level gift size by 20-30% at renewal.",
  },
  {
    sector: "Mid-Level Donor Engagement",
    goal: "Donor Engagement Lift",
    result:
      "Layering calls, letters, digital voicemail, and text touchpoints doubled meaningful donor engagement compared to mail-only outreach, a 100% increase in response.",
  },
  {
    sector: "Mid-Level Donor Engagement",
    goal: "Major Gift Pipeline",
    result:
      "Structured qualification conversations identified passion and capacity among existing mid-level donors, building a qualified pipeline of future major gift prospects.",
  },
  {
    sector: "Annual Fund Calling",
    goal: "Participation & Retention",
    result:
      "Trained Engagement Officers running segmented outreach and personalized asks lifted annual fund participation and donor retention above industry norms.",
  },
];

export default function ResultsPage() {
  return (
    <>
      <PageHero
        eyebrow="Results"
        title="Representative outcomes from campaigns we've carried start to finish."
        description="Every nonprofit's numbers are confidential to their board, but the patterns below reflect the kind of results clients see across all four of our services when planning, major gifts, and public-phase calling are handled by one accountable team."
      />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-[17.5px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Results Across Every Service
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_RESULTS.map((cs) => (
            <div
              key={`${cs.sector}-${cs.goal}`}
              className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8"
            >
              <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                {cs.sector}
              </p>
              <h3 className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">
                {cs.goal}
              </h3>
              <p className="mt-4 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
                {cs.result}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-[15px] text-[rgb(var(--ink))]/40">
          Figures are illustrative composites reflecting typical program outcomes.
          Ask us for named, board-approved case studies specific to your sector.
        </p>
      </section>

      <section className="border-t border-[rgb(var(--line))] bg-[rgb(var(--paper))] py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <p className="font-display text-xl sm:text-[22.5px] uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
            How Our Services Fit Together
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-6xl tracking-tight text-[rgb(var(--navy))] sm:text-[75px]">
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
                src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/95a7f165-7aa3-4ddc-b0fb-a4021fc35995.png"
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
