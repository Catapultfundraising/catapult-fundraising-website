import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "how-much-does-a-capital-campaign-cost";

export const metadata = {
  title: "How Much Does a Capital Campaign Cost? | Catapult Fundraising",
  description:
    "What drives capital campaign consulting fees, typical fee structures, and how to think about ROI before you sign a contract.",
  keywords: [
    "capital campaign cost",
    "capital campaign consultant fees",
    "how much does a capital campaign cost",
    "nonprofit fundraising consultant pricing",
    "capital campaign budget",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "How Much Does a Capital Campaign Cost?",
    description:
      "What drives capital campaign consulting fees, typical fee structures, and how to think about ROI before you sign a contract.",
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [{ url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/a71dcf44-5db6-48bb-9179-843db4b80626.png", width: 1536, height: 1024, alt: "A board member and fundraising consultant reviewing a capital campaign budget and financial charts" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "How Much Does a Capital Campaign Cost?",
  description:
    "What drives capital campaign consulting fees, typical fee structures, and how to think about ROI before you sign a contract.",
  author: {
    "@type": "Person",
    name: "Anthony R. Alonso",
    jobTitle: "President & CEO",
    url: `${SITE_URL}/our-team`,
    worksFor: { "@id": `${SITE_URL}/#organization` },
  },
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

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How much does a capital campaign consultant cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Capital campaign consulting fees are typically structured as a monthly or phased professional fee and vary based on campaign goal, timeline, and scope, from a feasibility study alone through full quiet-phase and public-phase management. Most consultants provide a customized proposal after an initial conversation about your organization's readiness and goals, rather than a flat published rate.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in a typical capital campaign consulting fee?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A full-service engagement typically includes the feasibility study, case statement and campaign material development, gift table design, committee recruitment and training, quiet-phase strategy and coaching, and a public-phase calling program. Some firms unbundle these into separate contracts; others, like Catapult, carry a single accountable fee across every phase.",
      },
    },
    {
      "@type": "Question",
      name: "Is a capital campaign consultant worth the cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A capital campaign consultant's value shows up in three places: a realistic dollar goal set from real feasibility data instead of guesswork, a trained committee and calling program that actually reaches your donor base, and campaign discipline that keeps a multi-year effort on schedule. Organizations that skip professional counsel often under-raise, over-run their timeline, or burn out volunteer leadership.",
      },
    },
  ],
};

export default function HowMuchDoesACapitalCampaignCostPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="How Much Does a Capital Campaign Cost?"
        description="Board members ask this question before anything else. Here's what actually drives the price, and how to think about it as an investment instead of a line-item expense."
      />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
      <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/a71dcf44-5db6-48bb-9179-843db4b80626.png"
            alt="A board member and fundraising consultant reviewing a capital campaign budget and financial charts"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Every board conversation about a capital campaign eventually lands on the same question:
          what is this going to cost us? It&rsquo;s a fair question, and it deserves a direct answer,
          not a vague &ldquo;it depends.&rdquo; Here&rsquo;s what actually drives capital campaign
          consulting fees, and how the smartest organizations think about the number before they sign
          anything.
        </p>
      <div className="clear-both" />


        <h2 className="mt-10 font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
          What drives the fee
        </h2>
        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Campaign goal and complexity.</span>{" "}
            A $2 million campaign for a single building project requires far less staff time than a
            $50 million campaign spanning a capital project, an endowment, and a program expansion.
            Fee structures scale with the scope of work, not just the dollar target.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Timeline.</span> Capital
            campaigns typically run 24&ndash;36 months through the quiet phase alone. A longer
            engagement means more months of consulting fees, but rushing a campaign to save on fees
            almost always costs more in under-raised dollars.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Scope of services.</span> Some
            organizations only need a feasibility study. Others need the full runway: case
            development, campaign planning, quiet-phase coaching, and a staffed public-phase calling
            program. Each additional phase adds cost, but also adds a team that would otherwise have
            to be hired, trained, and managed in-house.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">In-house capacity.</span> An
            organization with an experienced development team may only need strategic counsel and a
            feasibility study. A smaller shop may need a consultant to essentially run the campaign
            day-to-day. The gap between what your team can do and what the campaign requires is what
            you&rsquo;re really pricing.
          </li>
        </ol>

        <blockquote className="mt-8 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          The real question isn&rsquo;t &ldquo;what does it cost?&rdquo; It&rsquo;s &ldquo;what does
          it cost to raise this goal well, versus raising it badly, or not raising it at all?&rdquo;
        </blockquote>

        <h2 className="mt-10 font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
          How fees are typically structured
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Most capital campaign consultants bill on a monthly or phased professional fee rather than a
          percentage of funds raised. Percentage-based compensation for fundraising counsel is
          explicitly discouraged by the Association of Fundraising Professionals&rsquo; Code of
          Ethical Standards, because it can pressure a consultant toward the wrong donors or the wrong
          ask amounts. A transparent monthly fee, scoped to a defined set of deliverables per phase,
          is the industry standard for ethical, sustainable campaign counsel.
        </p>

        <h2 className="mt-10 font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
          What to ask before you sign
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Before comparing quotes, get clarity on scope: Does the fee include the feasibility study,
          or is that priced separately? Is public-phase calling included, or will you need a second
          vendor? Is there one accountable point of contact across the whole campaign, or will
          responsibility be split across a planning firm, a calling firm, and your own staff? The
          fee number matters far less than what it actually buys you.
        </p>

        <p className="mt-8 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Want a straight answer for your specific campaign?{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            Start a conversation with Catapult Fundraising
          </Link>{" "}
          and we&rsquo;ll walk through a customized scope and fee based on your goal, timeline, and
          in-house capacity.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
