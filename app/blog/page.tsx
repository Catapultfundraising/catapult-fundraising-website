import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Fundraising Insights & Best Practices | Catapult Fundraising",
  description:
    "Practical guidance on capital campaigns, mid-level donor engagement, and legacy giving, plus how Catapult Fundraising compares to other nonprofit fundraising consultants.",
  keywords: [
    "nonprofit fundraising blog",
    "capital campaign best practices",
    "mid-level donor engagement best practices",
    "legacy giving best practices",
    "fundraising consultant comparison",
    "major donor solicitation",
    "telefundraising best practices",
    "multi-channel fundraising",
  ],
  alternates: { canonical: "/blog" },
};

const POSTS = [
  {
    slug: "catapult-vs-fundraising-consultants",
    title: "Catapult Fundraising vs. Other Fundraising Consultants: What Sets Us Apart",
    description:
      "Most firms plan a campaign or make the calls, rarely both. See how Catapult's one-firm, every-phase model compares to campaign-only counsel, calling-only vendors, and major gift specialists.",
    readTime: "11 min read",
  },
  {
    slug: "capital-campaign-donor-engagement-legacy-giving-best-practices",
    title:
      "Capital Campaigns, Mid-Level Donor Engagement, and Legacy Giving: A Best Practices Guide",
    description:
      "Feasibility studies, gift charts, donor upgrade paths, and legacy call scripts, the practical playbook nonprofits use to raise more at every donor level.",
    readTime: "14 min read",
  },
  {
    slug: "key-steps-for-soliciting-major-donors",
    title: "Key Steps for Soliciting Major Donors",
    description:
      "Diane Carlson's “four-right rule” for turning long-time supporters into major gift donors: the right person asking the right prospect for the right amount at the right time.",
    readTime: "4 min read",
  },
  {
    slug: "how-to-effectively-use-the-phone-today",
    title: "How to Effectively Use the Phone Today",
    description:
      "Anthony R. Alonso on why telefundraising is far from dead, and the two-step, personalized method that lifts gift sizes 25 to 30 percent.",
    readTime: "3 min read",
  },
  {
    slug: "multi-channel-fundraising-are-you-missing-the-mark",
    title: "Multi-Channel Fundraising — Are You Missing the Mark?",
    description:
      "Anthony Alonso on why digital fundraising alone can't upgrade donors or build a major gift pipeline, and the segmentation, storytelling, and calling strategy that can.",
    readTime: "6 min read",
  },
];

export default function BlogIndexPage() {
  return (
    <>
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
              className="group block rounded-2xl border border-[rgb(var(--line))] bg-white p-8 transition-colors hover:border-[rgb(var(--brass))] lg:p-10"
            >
              <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                {post.readTime}
              </p>
              <h2 className="mt-3 font-display text-3xl text-[rgb(var(--navy))] sm:text-[38px]">
                {post.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[rgb(var(--ink))]/70">
                {post.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-[rgb(var(--navy))]">
                Read the article
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
