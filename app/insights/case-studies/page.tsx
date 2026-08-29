import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { CaseStudyCard } from "@/components/case-study-card";
import { CASE_STUDIES } from "@/lib/case-studies";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Case Studies | Insights | Catapult Fundraising",
  description:
    "Documented results from Catapult Fundraising's capital campaign, calling program, and legacy giving engagements.",
  alternates: { canonical: "/insights/case-studies" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Case Studies",
  description:
    "Documented results from Catapult Fundraising's capital campaign, calling program, and legacy giving engagements.",
  url: `${SITE_URL}/insights/case-studies`,
  isPartOf: { "@id": `${SITE_URL}/#organization` },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Insights", item: `${SITE_URL}/insights` },
    { "@type": "ListItem", position: 3, name: "Case Studies", item: `${SITE_URL}/insights/case-studies` },
  ],
};

export default function CaseStudiesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PageHero
        eyebrow="Insights / Case Studies"
        title="Documented results from our partnerships."
        description="Millions of dollars in confirmed gifts, re-energized donor bases, and pipelines built for the future — this is what happens when strategic planning meets disciplined execution and a true partnership between consulting firm and client. See what's possible for your organization."
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
