import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";
import { LoyaltyCalloutCard } from "@/components/tool-callout";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "loyal-small-dollar-donors-nobody-visits";
const HERO = "/blog/loyal-small-dollar-donors/hero-loyal-donor.jpg";
const HERO_ALT =
  "Two experienced women smiling as they open a letter together at home";
const TITLE = "The Loyal Small-Dollar Donor Nobody Ever Visits";
const DESCRIPTION =
  "Anthony R. Alonso on the donors who have given every year for a decade without a single conversation, why loyalty predicts legacy gifts better than wealth, and how one list splits into a legacy program and a mid-level program.";

export const metadata = {
  title: { absolute: "The Loyal Small-Dollar Donor Nobody Ever Visits" },
  description: DESCRIPTION,
  keywords: [
    "loyal donors",
    "consecutive years of giving",
    "planned giving prospects",
    "legacy giving program",
    "mid-level donor program",
    "donor engagement strategy",
    "wealth screening limits",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [{ url: `${SITE_URL}${HERO}`, width: 1800, height: 1200, alt: HERO_ALT }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: TITLE,
  datePublished: "2026-09-17",
  dateModified: "2026-09-17",
  description: DESCRIPTION,
  image: `${SITE_URL}${HERO}`,
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

const P = "mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70";
const H2 = "mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]";

export default function LoyalSmallDollarDonorsPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="She has given every year since 2009. Nobody has ever called her."
        description="The most loyal people in your database are usually the ones no gift officer has been assigned to, and loyalty predicts a legacy gift far better than wealth does."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={TITLE} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Anthony R. Alonso, President &amp; CEO, Catapult Fundraising
        </p>

        <div className="mt-6 mb-6 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image src={HERO} alt={HERO_ALT} fill className="object-cover" priority />
          </div>
        </div>

        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Pull up your database and sort it by consecutive years of giving instead of gift size.
          Somewhere near the top you will find a woman who has given every single year since 2009.
          Never more than $75 at a time. She has opened every envelope, read every newsletter, and
          quietly renewed while dozens of larger donors came and went.
        </p>
        <p className={P}>
          Now check her record for a visit, a call, or an assigned staff member. There is nothing
          there. She has never been on anyone&rsquo;s radar, because the systems we use to decide
          who is worth a conversation are built almost entirely around how much someone gave last
          time.
        </p>
        <p className={P}>
          She is the most reliable supporter you have, and she is a stranger to your organization.
          That is the gap I want to talk about, because it is the least expensive gap in
          fundraising to close.
        </p>

        <h2 className={H2}>Loyalty and capacity are not the same signal</h2>
        <p className={P}>
          Wealth screening tells you what somebody could give. Giving history tells you what
          somebody has decided to do, over and over, without being asked in person. Those are two
          different pieces of information, and only one of them is evidence of a relationship.
        </p>
        <p className={P}>
          When a donor gives modestly but gives every year for a decade or more, they are telling
          you something specific: your mission has been part of their routine for a long time.
          People do not write a check to the same organization twelve years in a row out of habit
          alone. They do it because it means something to them.
        </p>
        <p className={P}>
          That is exactly the mindset a legacy gift comes from. A bequest is not a stretch gift out
          of current income. It is a decision about what someone wants to be remembered for. A
          donor of $50 a year can leave a gift that changes your balance sheet, and in our
          experience that donor is far more likely to do it than a lapsed major donor with a bigger
          screening score.
        </p>

        <h2 className={H2}>Why these donors stay invisible</h2>
        <p className={P}>
          Most shops draw a line somewhere around $5,000 and give everyone above it a human being.
          That is sensible. The problem is what happens below the line, where the entire strategy
          becomes mail, email, and a year-end appeal. Two large groups get lost there.
        </p>
        <ul className="mt-4 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">The long-loyal.</span> Ten or
            more consecutive years of giving at any amount. They are your best planned giving
            prospects and nobody has ever asked them about their intentions.
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">The mid-level middle.</span>{" "}
            Donors giving roughly $250 to $4,999 with no assigned relationship manager. Too big to
            be treated as a mail file, too small to make the major gift portfolio.
          </li>
        </ul>
        <p className={P}>
          Neither group is being neglected on purpose. They are being neglected because nobody has
          the hours. That is a capacity problem, not a strategy problem, and it is solvable.
        </p>

        <LoyaltyCalloutCard />

        <h2 className={H2}>One list, two very different programs</h2>
        <p className={P}>
          When we look at a file, that same overlooked population splits cleanly into two tracks,
          and the tracks do not run the same way.
        </p>
        <p className={P}>
          <span className="font-semibold text-[rgb(var(--navy))]">The legacy track</span> is built
          on loyalty. You start with consecutive years of giving, add age where you have it, and
          begin having conversations about intentions. Many of these conversations end with a donor
          telling you they have already included you in their will and assumed you knew. Others end
          with an invitation to talk again next year, which is still progress, because the door is
          now open.
        </p>
        <p className={P}>
          <span className="font-semibold text-[rgb(var(--navy))]">The mid-level track</span> is
          built on coverage. The goal is not to squeeze a bigger gift out of the year-end appeal.
          It is to give a few hundred people an actual human contact, find out why they give, and
          identify the handful who belong in a major gift portfolio and never got there.
        </p>
        <p className={P}>
          Most organizations should run both, and most should start with legacy, because legacy is
          the one where the outcome is predictable enough to plan around.
        </p>

        <h2 className={H2}>What a legacy program tends to produce</h2>
        <p className={P}>
          Here is the honest version, and the reason we talk about legacy and mid-level differently.
        </p>
        <p className={P}>
          Across the legacy programs we have run, the expected value of the commitments identified
          per 1,000 loyal prospects has ranged from over $850,000 to well over $12 million. That
          spread is not a typo, and it is the most useful thing about the number. It is an average
          across programs, not a forecast for yours. Your file, your mission, and the age of your
          donor base all move it.
        </p>
        <p className={P}>
          Two things about that money matter more than the size of it. First, these are commitments
          from people who were not on your radar at all, so nothing about it is revenue you were
          already going to get. Second, and this is the part boards tend to miss, donors who have a
          legacy conversation with you almost always increase what they give annually afterward.
          Once someone has told you they want your work to outlive them, giving $50 a year stops
          feeling like enough to them.
        </p>
        <p className={P}>
          For mid-level, I will not give you a dollar projection, and you should be suspicious of
          anyone who does. Mid-level results depend so heavily on the shape of an individual file
          that any average is misleading. What we can tell you in advance is how many donors you
          have in that band, how many have never had a personal contact, and how many contacts a
          program would need to cover them.
        </p>

        <h2 className={H2}>How to find them this week</h2>
        <p className={P}>
          You do not need a consultant or a new system to start. You need four counts, and
          estimates are completely fine. Nobody has these numbers memorized, and not knowing them
          is the normal starting point rather than a failing.
        </p>
        <ul className="mt-4 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>
            How many donors have given in ten or more consecutive years, at any gift amount?
          </li>
          <li>
            How many donors give between $250 and $4,999 a year with no assigned staff member?
          </li>
          <li>
            Of those two groups, how many have had a real conversation with someone at your
            organization in the last two years?
          </li>
          <li>
            How many known bequest intentions are documented, and when did anyone last ask?
          </li>
        </ul>
        <p className={P}>
          If the answer to the third question is close to zero, you have not lost anything. You
          have found the cheapest growth available to you, sitting in a file you already own and
          already paid to build.
        </p>

        <h2 className={H2}>The point</h2>
        <p className={P}>
          The donors who love you most are rarely the donors who give you the most in a single
          year. They are the ones who never stopped. They have been telling you how they feel with
          a $50 check every year for a decade, and the only thing missing is somebody willing to
          call and say thank you, then ask a question.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          We built a free report card that grades your readiness for both programs and tells you
          which one to start with:{" "}
          <Link
            href="/resources/donor-loyalty-assessment"
            className="font-semibold text-[rgb(var(--navy))] underline"
          >
            the donor loyalty and legacy report card
          </Link>
          . If you would rather just talk it through,{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            we are happy to look at your file with you
          </Link>
          .
        </p>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Source note: the range of identified legacy commitments per 1,000 prospects reflects
          Catapult Fundraising&rsquo;s own client program results and is an average across
          programs, not a projection for any single organization. It is not an industry statistic.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
