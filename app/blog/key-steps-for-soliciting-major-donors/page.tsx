import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "key-steps-for-soliciting-major-donors";

export const metadata = {
  title: "Key Steps for Soliciting Major Donors | Catapult Fundraising",
  description:
    "Catapult's “four-right rule” for turning long-time supporters into major gift donors: the right person asking the right prospect for the right amount at the right time.",
  keywords: [
    "major donor solicitation",
    "how to ask for a major gift",
    "wealth capacity screening",
    "major gifts officer training",
    "donor recognition major gifts",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Key Steps for Soliciting Major Donors",
    description:
      "Catapult's “four-right rule” for turning long-time supporters into major gift donors.",
    url: `${SITE_URL}/blog/${SLUG}`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Key Steps for Soliciting Major Donors",
  description:
    "Catapult's four-right rule for turning long-time supporters into major gift donors: the right person asking the right prospect for the right amount at the right time.",
  author: { "@type": "Organization", name: "Catapult Fundraising" },
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

export default function KeyStepsSolicitingMajorDonorsPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Key Steps for Soliciting Major Donors"
        description="Want to make more successful asks? Use the “four-right rule”: the right person asking the right prospect for the right amount at the right time."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Want to make more successful asks? Use the &ldquo;four-right rule&rdquo;: the right
          person asking the right prospect for the right amount at the right time.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          At most nonprofits, the weakest part of their fundraising is in managing the ask.
          It&rsquo;s important that all of those rights are considered when planning the ask.
        </blockquote>

        <ol className="mt-8 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">The right person</span> can
            vary. Someone who knows the prospect may be a good choice, but not if they can&rsquo;t
            actually get to an ask over their lips. A good strategy is to send two emissaries to
            prospect meetings, so one can focus on body language while the other does most of the
            talking.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">To find the right prospects</span>,
            perform a wealth-capacity screen. We&rsquo;re making sure the right prospect is
            somebody who has the wealth capacity to give the gift we&rsquo;re thinking of as well
            as the interest to give the gift.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Figure the right amount</span>{" "}
            for the ask before your first meeting, because some prospects will want to cut to the
            chase. Building on wealth-capacity screening, our researchers perform an in-house
            review of dozens of resources to learn about prospects&rsquo; capacities and
            interests.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">The best time to make an ask</span>{" "}
            is usually during the second meeting. Use the first to educate and inform and earn
            that second meeting. If the prospect brings new people like family members or
            financial advisors to the next meeting, you may have to bring them up to speed and
            ask for a third meeting. It&rsquo;s usually a case of diminishing returns after that,
            however.
          </li>
        </ol>

        <p className="mt-8 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Many prospects want to be solicited by organizational leaders, like CEOs and board
          chairs, but these leaders often shy away from asking for money. Train them and your
          staff to build confidence through role playing.
        </p>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          When prospecting, give as much weight to frequency of past gifts as to size. Many
          wealthy long-time members of organizations have never made a major gift simply because
          they&rsquo;ve never been asked. Just by belonging to an organization and agreeing to a
          meeting, top prospects are signaling they may be ready to make a major gift.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          It&rsquo;s not unusual to find donors with strong wealth capacity but a modest gift
          history. The challenge then becomes how to take a $50 member and move them toward a
          $100,000 ask.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          When you make your ask, make sure to offer something in return, like a naming
          opportunity. Very few donors want to remain anonymous. Most care a great deal about
          recognition.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Want help building a major gift solicitation strategy for your organization?{" "}
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
