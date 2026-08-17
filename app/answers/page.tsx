import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { PILLARS, answersByPillar } from "@/lib/answers";

const SITE_URL = "https://www.catapultfr.com";

// Intentionally not linked from the primary nav (components/site-header.tsx /
// site-footer.tsx) -- this hub and its individual question pages are meant
// to be found through search engines, AI answer engines, and internal links
// from articles/case studies/service pages, not through another dropdown.
// It is still fully indexable (no noindex here, and every route below is
// listed in app/sitemap.ts) so answer engines can actually find and cite it.
export const metadata = {
  title: "Fundraising Questions, Answered",
  description:
    "Direct answers to the questions nonprofit leaders ask most about capital campaigns, major gifts, planned giving, annual fund calling, and fundraising strategy, grounded in Catapult Fundraising's own methodology and documented results.",
  alternates: { canonical: "/answers" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Fundraising Questions, Answered", item: `${SITE_URL}/answers` },
  ],
};

export default function AnswersHubPage() {
  const grouped = answersByPillar();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        eyebrow="Answers"
        title="Fundraising questions, answered."
        description="Direct, practical answers to what nonprofit leaders actually ask about capital campaigns, major gifts, planned giving, annual fund calling, and fundraising strategy, grounded in Catapult's own methodology and documented client results."
      />
      <section className="bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          {PILLARS.map((pillar) => {
            const items = grouped[pillar];
            if (!items || items.length === 0) return null;
            return (
              <div key={pillar} className="mb-12 last:mb-0">
                <h2 className="font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">{pillar}</h2>
                <div className="mt-2 h-[2px] w-14 bg-[rgb(var(--brass))]" />
                <ul className="mt-6 space-y-4">
                  {items.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/answers/${a.slug}`}
                        className="group flex items-start gap-3 text-lg leading-snug text-[rgb(var(--navy))]/85 hover:text-[rgb(var(--navy))]"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--brass))]" />
                        <span className="underline decoration-[rgb(var(--brass))]/40 decoration-2 underline-offset-4 group-hover:decoration-[rgb(var(--brass))]">
                          {a.question}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
