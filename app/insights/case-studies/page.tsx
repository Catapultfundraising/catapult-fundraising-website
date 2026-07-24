import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { CaseStudyCard } from "@/components/case-study-card";
import { CASE_STUDIES } from "@/lib/case-studies";

export const metadata = {
  title: "Case Studies | Insights | Catapult Fundraising",
  description:
    "Documented results from Catapult Fundraising's capital campaign, calling program, and legacy giving engagements.",
  alternates: { canonical: "/insights/case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Insights / Case Studies"
        title="Documented results from campaigns we've carried start to finish."
        description="Every engagement is confidential to the client board, but these results reflect what's possible when planning, calling, and gift-planning specialists work as one accountable team."
      />
      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2">
          {CASE_STUDIES.map((cs) => (
            <CaseStudyCard key={cs.slug} caseStudy={cs} />
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
