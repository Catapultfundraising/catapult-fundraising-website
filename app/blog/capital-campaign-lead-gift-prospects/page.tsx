import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";
import { RelatedReading } from "@/components/related-reading";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "capital-campaign-lead-gift-prospects";
const IMG = `/blog/${SLUG}`;
const HEADLINE = "Your Donor File Has No $1M Prospects. Now What?";
const DESCRIPTION =
  "A strong feasibility study but no $1 million prospects in your database? Anthony Alonso on finding lead gifts outside your file, building the committee, and a gift chart you can raise.";

export const metadata = {
  title: { absolute: "Capital Campaign Lead Gift Prospects | Catapult" },
  description:
    "No $1M prospects in your donor file? How to find capital campaign lead gift prospects, build a relationship-driven committee, and set a gift chart you can raise.",
  keywords: [
    "capital campaign lead gift prospects",
    "how to find major donors for a capital campaign",
    "capital campaign gift chart",
    "wealth screening",
    "campaign committee",
    "major gift prospect research",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: HEADLINE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [
      {
        url: `${SITE_URL}${IMG}/og-hero-reviewing-building-plans.jpg`,
        width: 1536,
        height: 1024,
        alt: "Three people leaning over architectural plans for a new building",
      },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: HEADLINE,
  datePublished: "2026-10-10",
  dateModified: "2026-10-10",
  description: DESCRIPTION,
  image: `${SITE_URL}${IMG}/og-hero-reviewing-building-plans.jpg`,
  author: {
    "@type": "Person",
    name: "Anthony R. Alonso",
    jobTitle: "President and CEO",
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

// Same soft-edged, right-floated figure treatment as the Understanding Latino
// Philanthropy article.
const FEATHER = {
  WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as const;

function Figure({
  src,
  alt,
  aspect = "aspect-[3/2]",
  priority = false,
}: {
  src: string;
  alt: string;
  aspect?: string;
  priority?: boolean;
}) {
  return (
    <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
      <div className={`relative ${aspect} w-full overflow-hidden rounded-2xl`} style={FEATHER}>
        <Image src={src} alt={alt} fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" priority={priority} />
      </div>
    </div>
  );
}

function P({ children, className = "mt-4" }: { children: ReactNode; className?: string }) {
  return <p className={`${className} text-lg leading-relaxed text-[rgb(var(--ink))]/70`}>{children}</p>;
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">{children}</h2>;
}

function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
      {children}
    </blockquote>
  );
}

const Clear = () => <div className="clear-both" />;

export default function LeadGiftProspectsPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Your Donor File Has No $1M Prospects. Now What?"
        description="You have a big goal, a community that believes in the project, and a donor database with nobody in it who can make a lead gift. We see this a lot. The fix starts outside your database."
      />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={HEADLINE} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Anthony R. Alonso, President and CEO, Catapult Fundraising
        </p>

        <Figure
          src={`${IMG}/hero-reviewing-building-plans.jpg`}
          alt="Three people leaning over architectural plans for a new building"
          aspect="aspect-[4/3]"
          priority
        />
        <P>
          Last week I met with a pastor and his wealth advisor to plan next steps for their capital campaign. The church wants to build a community center that serves children and families all week, not just on Sundays.
        </P>
        <P>
          The feasibility study gave us plenty to like. Nearly everyone interviewed supported the project. More than nine in ten would consider a gift, and close to half wanted to serve on the campaign committee. The pastor has earned a lot of trust.
        </P>
        <P>
          Then we looked at the wealth screening.
        </P>
        <P>
          Nobody in the church&rsquo;s database looked capable of a $1 million gift. Based on the study, we estimated the congregation could cover about a third of the goal. So where would the rest come from?
        </P>
        <P>
          The pastor didn&rsquo;t flinch. He was already a step ahead of me: he had met with the mayor about a city grant for nonprofits, and a staff member at a large local trust who attends his church had opened a door to a meeting there.
        </P>
        <P>
          I don&rsquo;t think a gap like that is a reason to cut the goal. It is a reason to do some homework before you launch. Here&rsquo;s how I&rsquo;d do it.
        </P>

        <Clear />

        <H2>Start with the top of the gift chart</H2>
        <Figure src={`${IMG}/top-of-chart.jpg`} alt="Graphic: a gift chart pyramid with empty top tiers, where about 60 percent of the goal comes from the top 10 gifts" />
        <P>
          In most capital campaigns, a few donors supply most of the money. We plan on about 60% of the goal coming from the top 10 gifts.
        </P>
        <P>
          Those 10 gifts are the campaign. If you can&rsquo;t name credible prospects for them, you have a hole at the top, and no number of $25,000 or $50,000 gifts will fill it.
        </P>
        <P>
          I&rsquo;ve watched organizations spend six months on the gifts they were sure of and end up nowhere near the goal. By the time they noticed, the pipeline for the big gifts was empty.
        </P>
        <P>
          You don&rsquo;t need every lead prospect identified before you start. You do need a plan for finding them, and I&rsquo;d rather delay a campaign than launch without one.
        </P>

        <Clear />

        <H2>Wealth ratings are a starting point</H2>
        <Figure src={`${IMG}/ratings-vs-giving.jpg`} alt="Graphic: donors rated at $10,000 to $15,000 who had actually given more than $100,000" />
        <P>
          We run wealth screenings on almost every campaign. I just don&rsquo;t let them make the call.
        </P>
        <P>
          Two of this church&rsquo;s most generous donors were rated at $10,000 to $15,000. Each had given well over $100,000 in recent years. The screening missed them completely.
        </P>
        <P>
          The person with the highest rating among those we interviewed had given a few hundred dollars. I don&rsquo;t know him well enough yet to say what he&rsquo;ll do, and neither does the screening.
        </P>
        <P>
          When I review a prospect list, I put the rating next to actual giving, involvement and interest in the project. People who give far above their rating get my attention first. They&rsquo;ve put their money where their mouth is, and others in the congregation tend to respect them, which makes them good committee candidates.
        </P>

        <Clear />

        <H2>Where the lead gifts may be hiding</H2>
        <Figure src={`${IMG}/where-to-look.jpg`} alt="Graphic: four places to look for lead gifts, local families and business leaders, foundations and trusts, corporations, and government funding" />
        <P>
          When your file comes up short, widen the search. Start here.
        </P>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Local families and business leaders.</span>{" "}
            Find out who has funded other big projects in town. Local news, annual reports and donor announcements from hospitals, universities and YMCAs will show you. A family that has backed several community projects is worth a closer look.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Foundations and trusts.</span>{" "}
            Look for funders whose priorities match yours. A foundation focused on children and families is a natural fit for a community center, but read its guidelines before you call.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Corporations.</span>{" "}
            Think past cash. A local building supply company might donate materials or services, and that can cut construction costs. Make sure the campaign budget accounts for it.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Government funding.</span>{" "}
            Grants and public dollars can help, but they come with eligibility rules and long timelines. I don&rsquo;t count on them until there&rsquo;s a solid reason to.
          </li>
        </ul>
        <P>
          In this campaign, the feasibility interviews gave us our first leads. People pointed us to local business families, regional foundations and the county. Our research also turned up several people in the community with estimated capacity around $1 million. None of them have given a dime to this project yet. They&rsquo;re prospects, and that&rsquo;s all.
        </P>
        <P>
          Your database can&rsquo;t tell you any of this, but your community can. In every feasibility interview, ask: &ldquo;Who else in this community should know about this project?&rdquo; Then ask why they thought of that person, how they know each other, and whether they&rsquo;d make the introduction.
        </P>

        <Clear />

        <H2>Ask for advice before you ask for money</H2>
        <Figure src={`${IMG}/advice-first.jpg`} alt="Graphic: share the vision, listen, and agree on a next step before any ask" />
        <P>
          Someone outside your donor base may know nothing about your organization. They have no reason to care about your project yet, however much you do.
        </P>
        <P>
          We don&rsquo;t make these calls for our clients. The relationship has to belong to the organization, so the pastor, executive director or a committee member goes to the meeting. Our job is to prepare them: who the person is, what they&rsquo;ve supported before, and what to listen for.
        </P>
        <P>
          We coach leaders to open with the vision and then ask what the prospect thinks. What do they see happening in the community? What concerns them? What have they supported before?
        </P>
        <P>
          Most first meetings shouldn&rsquo;t end with an ask. The leader is looking for the overlap between what the organization wants to build and what this person wants to see in town. When it&rsquo;s there, you can feel it. When it&rsquo;s not, it&rsquo;s better to find out early and ask who else they should talk to.
        </P>
        <P>
          If the conversation turns to giving on its own, great. But go in with a reason for the meeting that isn&rsquo;t the check. Afterward, we debrief with the leader and plan the next step together.
        </P>

        <Clear />

        <H2>Build the committee around relationships</H2>
        <Figure src={`${IMG}/committee-network.jpg`} alt="Graphic: a campaign committee connecting the organization with community leaders, businesses, foundations and families" />
        <P>
          When your best prospects are outside your database, you need people who can reach them. For this church, I&rsquo;d build a committee of 10 to 12 with two co-chairs: one with deep roots in the church, and one with standing in the wider community.
        </P>
        <P>
          Start with proven givers, whatever their wealth rating says. Then add connectors, the people who know the business owners, foundation trustees and families you want to reach and will make the call. They don&rsquo;t have to be your biggest donors. One board member here knows hundreds of people who could give at a major level, and that network is worth more than another round of screening.
        </P>
        <P>
          Give every member real work: a short list of prospects to help reach, a clear ask of them, and a follow-up from campaign staff. Without that, a committee turns into an honorary board.
        </P>
        <P>
          Think about the order of solicitation, too. For a church, I&rsquo;d line up a small group of key donors and work the community prospects before approaching the whole congregation. People give more readily when they can see who has already stepped forward.
        </P>

        <Clear />

        <H2>Build a gift chart you can raise</H2>
        <Figure src={`${IMG}/three-million-gifts.jpg`} alt="Graphic: three $1 million gifts at the top of the chart with three to four qualified prospects for each" />
        <P>
          As you learn more, redo the chart. The first version was built on what you knew at the start, and by now some of it is wrong.
        </P>
        <P>
          For this campaign, we recommended planning on three $1 million gifts instead of betting on one enormous lead gift. That gives the campaign more than one path to the goal, and it gives the research a clearer target.
        </P>
        <P>
          I like to have three to four qualified prospects for every gift. Three $1 million gifts means nine to twelve names. &ldquo;Qualified&rdquo; means evidence of capacity, a tie to the mission or project, and a realistic way to start a relationship. A high rating doesn&rsquo;t qualify anyone.
        </P>
        <P>
          If you can&rsquo;t fill the list, that tells you where to work next: more research, more introductions, or a hard look at how well the project resonates outside your walls. Foundation, corporate and government money can all help, but don&rsquo;t treat any of it as committed until it&rsquo;s in hand.
        </P>
        <P>
          Give it time, too. In our experience, the first major gifts often take six to eight months after kickoff. Use those early months to find the right people and build the relationships.
        </P>

        <Clear />

        <H2>Before you launch</H2>
        <P>
          Strong support doesn&rsquo;t mean the money is there. Before you launch, pull the actual giving history on your best donors, ask your board who they know, and research who has funded other projects in your community. Then rebuild the gift chart around what you find.
        </P>
        <P>
          On a social service capital campaign I worked on, one of the biggest wins never showed up in any screening. The construction company agreed to take $1 million off the cost of the building as an in-kind gift. Nobody in the donor file could have written that check. A conversation with the builder did the same job.
        </P>

        <Clear />

        <P className="mt-12">
          <span className="font-semibold text-[rgb(var(--navy))]">Planning a capital campaign with an ambitious goal?</span>{" "}
          Catapult Fundraising helps nonprofits identify major gift prospects, build effective campaign committees and develop gift charts grounded in real giving potential. If you&rsquo;re not sure where your lead gifts will come from, let&rsquo;s talk.{" "}
          <a href="https://go.catapultfr.com/meetings/anthonya" className="font-semibold text-[rgb(var(--navy))] underline">
            Schedule a conversation
          </a>
          .
        </P>

        <p className="mt-10 text-base leading-relaxed text-[rgb(var(--ink))]/70">
          Working on your own chart? Try the{" "}
          <Link href="/resources/gift-chart-calculator" className="font-semibold text-[rgb(var(--navy))] underline">
            gift chart calculator
          </Link>
          , or see how we approach{" "}
          <Link href="/services/capital-campaign/churches" className="font-semibold text-[rgb(var(--navy))] underline">
            church
          </Link>{" "}
          and{" "}
          <Link href="/services/capital-campaign/social-service" className="font-semibold text-[rgb(var(--navy))] underline">
            social service
          </Link>{" "}
          capital campaigns.
        </p>

        <p className="mt-6 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Client details are anonymized. Figures reflect Catapult Fundraising&rsquo;s own campaign experience and are not industry-wide statistics.
        </p>
      </article>

      <RelatedReading
        postSlugs={["planning-a-capital-campaign-gift-chart-quiet-phase", "why-a-feasibility-study-matters-before-a-capital-campaign"]}
        answerLimit={0}
      />
      <CtaBand />
    </>
  );
}
