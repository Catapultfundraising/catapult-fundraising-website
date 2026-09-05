import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ArrowRight } from "lucide-react";
import { POSTS } from "@/lib/posts";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Fundraising Insights & Best Practices",
  description:
    "Practical guidance on capital campaigns, major gift asks, legacy giving, and donor engagement from Catapult Fundraising's consulting team.",
  keywords: [
    "nonprofit fundraising blog",
    "capital campaign feasibility study",
    "capital campaign best practices",
    "mid-level donor engagement best practices",
    "legacy giving best practices",
    "fundraising consultant comparison",
    "major donor solicitation",
    "telefundraising best practices",
    "multi-channel fundraising",
    "Latino philanthropy",
  ],
  alternates: { canonical: "/blog" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Fundraising Insights & Best Practices",
  description:
    "Practical guidance on capital campaigns, major gift asks, legacy giving, and donor engagement from Catapult Fundraising's consulting team.",
  url: `${SITE_URL}/blog`,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
  ],
};

const FEATHER = {
  WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as const;


export default function BlogIndexPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PageHero
        eyebrow="Insights"
        title="Practical guidance for nonprofit fundraising leaders."
        description="Deep dives on capital campaigns, mid-level donor engagement, and legacy giving, drawn from decades of feasibility studies, quiet-phase asks, and public-phase calling programs."
      />

      <section className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="space-y-8">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-[rgb(var(--line))] bg-white p-6 transition-colors hover:border-[rgb(var(--brass))] sm:p-8 lg:p-10"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-2xl sm:w-48 lg:w-56" style={FEATHER}>
                  <Image
                    src={post.image}
                    alt={post.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 224px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                    {post.readTime}
                  </p>
                  <h2 className="mt-3 font-display text-2xl text-[rgb(var(--navy))] sm:text-3xl lg:text-[32px]">
                    {post.title}
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
                    {post.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-[rgb(var(--navy))]">
                    Read the article
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[rgb(var(--line))] bg-[rgb(var(--paper))] py-12">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          <h2 className="font-display text-3xl text-[rgb(var(--navy))]">
            Looking for a straight answer instead of an article?
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            Our answers library covers the specific questions nonprofit leaders ask about
            capital campaigns, feasibility studies, major gifts, planned giving, and annual
            fund calling.
          </p>
          <Link
            href="/answers"
            className="mt-6 inline-flex items-center gap-2 font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-8 hover:text-[rgb(var(--brass))]"
          >
            Browse fundraising questions, answered
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
