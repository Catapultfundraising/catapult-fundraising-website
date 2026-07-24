import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { CaseStudyCard } from "@/components/case-study-card";
import { CASE_STUDIES } from "@/lib/case-studies";

export const metadata = {
  title: "Insights | Catapult Fundraising",
  description:
    "Articles and case studies on capital campaigns, telefundraising, and donor engagement from the Catapult Fundraising team.",
  alternates: { canonical: "/insights" },
};

const ARTICLE_PREVIEWS = [
  {
    slug: "key-steps-for-soliciting-major-donors",
    title: "Key Steps for Soliciting Major Donors",
    description:
      "Catapult's “four-right rule” for turning long-time supporters into major gift donors.",
    readTime: "4 min read",
  },
  {
    slug: "how-to-effectively-use-the-phone-today",
    title: "How to Effectively Use the Phone Today",
    description:
      "Why telefundraising is far from dead, and the two-step, personalized method that lifts gift sizes 25 to 30 percent.",
    readTime: "3 min read",
  },
  {
    slug: "multi-channel-fundraising-are-you-missing-the-mark",
    title: "Multi-Channel Fundraising — Are You Missing the Mark?",
    description:
      "Why digital fundraising alone can't upgrade donors or build a major gift pipeline, and the segmentation, storytelling, and calling strategy that can.",
    readTime: "6 min read",
  },
];

export default function InsightsPage() {
  return (
    <>
      <PageHero
        eyebrow="Insights"
        title="Field notes from three decades of capital campaigns and donor calling programs."
        description="Practical guidance on soliciting major donors, telefundraising, and multi-channel strategy, plus real results from campaigns we've carried start to finish."
      />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
              Articles
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl tracking-tight text-[rgb(var(--navy))] sm:text-5xl">
              Perspective on the art and mechanics of the ask.
            </h2>
          </div>
          <Link
            href="/blog"
            className="group flex shrink-0 items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]"
          >
            View all articles
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLE_PREVIEWS.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-[rgb(var(--line))] bg-white p-8 transition-colors hover:border-[rgb(var(--brass))]"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                  {a.readTime}
                </p>
                <h3 className="mt-3 font-display text-2xl text-[rgb(var(--navy))]">{a.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/70">
                  {a.description}
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
                Read the article
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
                Case Studies
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl tracking-tight text-[rgb(var(--navy))] sm:text-5xl">
                Real outcomes from real campaigns.
              </h2>
            </div>
            <Link
              href="/insights/case-studies"
              className="group flex shrink-0 items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]"
            >
              View all case studies
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {CASE_STUDIES.map((cs) => (
              <CaseStudyCard key={cs.slug} caseStudy={cs} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
