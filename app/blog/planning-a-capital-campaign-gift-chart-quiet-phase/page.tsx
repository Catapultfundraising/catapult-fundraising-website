import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "planning-a-capital-campaign-gift-chart-quiet-phase";

export const metadata = {
  title: "Planning a Capital Campaign: The Gift Chart and Quiet Phase | Catapult Fundraising",
  description:
    "The gift chart math, feasibility study, board participation standard, and quiet-phase discipline behind a successful capital campaign, Catapult Fundraising's field-tested framework.",
  keywords: [
    "capital campaign gift chart",
    "capital campaign feasibility study",
    "capital campaign quiet phase",
    "capital campaign board participation",
    "capital campaign chair role",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Planning a Capital Campaign: The Gift Chart and Quiet Phase",
    description:
      "The gift chart math, feasibility study, board participation standard, and quiet-phase discipline behind a successful capital campaign.",
    url: `${SITE_URL}/blog/${SLUG}`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Planning a Capital Campaign: The Gift Chart and Quiet Phase",
  description:
    "The gift chart math, feasibility study, board participation standard, and quiet-phase discipline behind a successful capital campaign.",
  author: { "@type": "Organization", name: "Catapult Fundraising", url: SITE_URL },
  publisher: {
    "@type": "Organization",
    name: "Catapult Fundraising",
    logo: {
      "@type": "ImageObject",
      url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3b507e74-308f-4ba5-aaac-554b31247f7e.png",
    },
  },
  mainEntityOfPage: `${SITE_URL}/blog/${SLUG}`,
};

export default function CapitalCampaignGiftChartPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Planning a capital campaign: the gift chart and the quiet phase."
        description="A capital campaign starts with a BHAG, a big, hairy, audacious goal, and gets built on a gift chart worked top down, never bottom up."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A capital campaign is the right tool when an organization has a goal too large to fund
          through annual giving alone, a BHAG, a big, hairy, audacious goal, that will
          substantially change the organization&rsquo;s impact. Before setting a dollar figure,
          two separate steps have to happen: a needs assessment, which defines exactly what the
          money is for and what it will cost, and a feasibility study, which tests that menu,
          dollar goal, and timeline against real donor and stakeholder feedback.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Run a real feasibility study, not a formality
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A feasibility study should include at least 60 confidential interviews across board
          members, previous donors, lapsed major donors, foundations, and corporations, not the
          30 or so some firms treat as sufficient. That volume of feedback is what allows a firm
          to confidently recommend a campaign menu that will sell, a dollar goal that is
          achievable, and a timeline that fits the organization&rsquo;s actual readiness, rather
          than an optimistic guess.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Build the gift chart, and work it top down
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A gift chart is the roadmap for exactly which gifts have to close to hit the goal, and
          it follows a fairly consistent pattern. For a $10,000,000 campaign as an example: the
          lead gift should be roughly 20 percent of the goal, the second gift around 10 percent,
          and the top 10 gifts combined should account for close to 60 percent of the total.
          Mid-level gifts typically fill another 20 percent, and gifts under $25,000 fill the
          remainder. For every one of those top 10 gift levels, identify three prospects capable
          of it, not one.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          A successful capital campaign starts at the top and works down. In the quiet phase, you
          are not down soliciting $25,000 gifts, that&rsquo;s too soon. Your focus is the top 10.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          If an organization doesn&rsquo;t have three prospects capable of the lead gift, that
          doesn&rsquo;t mean the campaign can&rsquo;t succeed, it means it will likely take
          longer. Checking the pipeline against the top of the gift chart before launch is one of
          the clearest early signals of whether a stated goal is realistic.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The board has to have skin in the game
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          100 percent board participation in a campaign is non-negotiable, not because boards
          typically give a large share of the goal (a common target is 10 percent of the campaign
          total, though few boards actually hit it), but because many foundations and corporations
          simply will not fund a campaign without full board participation. Every board member
          should also be expected to bring their personal network of prospects to the campaign,
          whether or not they serve on the campaign committee itself.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Recruit real campaign leadership
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Alongside the gift chart, campaign volunteer leadership is the other factor that most
          determines success. A campaign chair or co-chairs should lend their name to the effort,
          make a pacesetting gift that qualifies as one of the top 10, help recruit and lead a
          committee of roughly 12 to 15 people, and personally solicit peers, work volunteers do
          best precisely because it&rsquo;s peer to peer. A typical time commitment for a chair or
          co-chair runs 10 to 15 hours a month; committee members, closer to 10.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Don&rsquo;t launch publicly until the quiet phase has done its job
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Aim to raise at least 50 percent of the campaign goal quietly, from top prospects, before
          any public announcement, some organizations target 70 percent in more uncertain economic
          periods. This protects the campaign&rsquo;s credibility at launch and ensures the
          largest donors get first choice of the best naming opportunities, since major donors are
          solicited before the public and community phase moves down the gift chart to mid-level
          and smaller donors.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A public or community phase is worth running even after the quiet-phase goal is
          technically met: it&rsquo;s a genuine opportunity to add new donors to the pipeline,
          re-engage lapsed supporters with an exciting BHAG case, and increase mid-range gift
          sizes, using every channel available, phone, direct mail, email, social, and text.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Considering a capital campaign and want an honest read on your gift chart and readiness?{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            Start a conversation with Catapult Fundraising
          </Link>
          .
        </p>
      </article>

      <CtaBand />
    </>
  );
}
