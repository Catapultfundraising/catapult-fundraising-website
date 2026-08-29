import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ContentBlocks } from "@/components/content-blocks";
import { CtaBand } from "@/components/cta-band";
import { CASE_STUDIES, getCaseStudyBySlug } from "@/lib/case-studies";

const SITE_URL = "https://www.catapultfr.com";
// Case studies don't carry their own edit history the way blog posts do
// (lib/case-studies.ts is one shared data file for all six), so every
// case study uses that file's own last-real-edit date for both Article
// dates rather than inventing a per-case-study publish calendar.
const CASE_STUDY_DATA_LAST_UPDATED = "2026-08-12";

export function generateStaticParams() {
  return CASE_STUDIES.map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) return {};
  return {
    title: cs.metaTitle,
    description: cs.metaDescription,
    alternates: { canonical: `/insights/case-studies/${cs.slug}` },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cs.metaTitle,
    description: cs.metaDescription,
    image: cs.image,
    datePublished: CASE_STUDY_DATA_LAST_UPDATED,
    dateModified: CASE_STUDY_DATA_LAST_UPDATED,
    author: { "@type": "Organization", name: "Catapult Fundraising", "@id": `${SITE_URL}/#organization` },
    publisher: {
      "@type": "Organization",
      name: "Catapult Fundraising",
      logo: {
        "@type": "ImageObject",
        url: "/images/generated/3b507e74-308f-4ba5-aaac-554b31247f7e.webp",
      },
    },
    mainEntityOfPage: `${SITE_URL}/insights/case-studies/${cs.slug}`,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Insights", item: `${SITE_URL}/insights` },
      { "@type": "ListItem", position: 3, name: "Case Studies", item: `${SITE_URL}/insights/case-studies` },
      { "@type": "ListItem", position: 4, name: cs.title, item: `${SITE_URL}/insights/case-studies/${cs.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PageHero
        eyebrow={`Insights / Case Study / ${cs.sector}`}
        title={cs.title}
        description={cs.summary}
        backgroundImage={cs.image}
      />

      <section className="border-b border-[rgb(var(--line))] bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cs.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-3xl text-[rgb(var(--navy))] sm:text-4xl">
                  {stat.value}
                </dt>
                <dd className="mt-2 text-xs uppercase tracking-wider text-[rgb(var(--ink))]/50">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <Link
          href="/insights/case-studies"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]/60 hover:text-[rgb(var(--navy))]"
        >
          <ArrowLeft className="h-4 w-4" />
          All case studies
        </Link>
        <div className="mt-8">
          <ContentBlocks blocks={cs.content} />
        </div>
      </article>

      <CtaBand />
    </>
  );
}
