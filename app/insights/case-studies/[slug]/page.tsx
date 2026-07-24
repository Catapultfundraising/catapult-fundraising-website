import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ContentBlocks } from "@/components/content-blocks";
import { CtaBand } from "@/components/cta-band";
import { CASE_STUDIES, getCaseStudyBySlug } from "@/lib/case-studies";

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
    title: `${cs.title} | Insights | Catapult Fundraising`,
    description: cs.summary,
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

  return (
    <>
      <PageHero
        eyebrow={`Insights / Case Study / ${cs.sector}`}
        title={cs.title}
        description={cs.summary}
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
