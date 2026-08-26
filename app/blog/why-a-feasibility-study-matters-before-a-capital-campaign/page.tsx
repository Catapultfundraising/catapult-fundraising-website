import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "why-a-feasibility-study-matters-before-a-capital-campaign";
const HERO_IMAGE = "/blog/why-a-feasibility-study-matters/hero-board-meeting.jpg";

const FEATHER = {
  WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as const;

export const metadata = {
  title: "Why a Feasibility Study Matters Before a Capital Campaign",
  description:
    "Jeff Grandy on why capital campaigns rarely fail because of a weak mission, and how a feasibility study tests the goal, the case, the leadership, and the prospect pipeline before the campaign goes public.",
  keywords: [
    "capital campaign feasibility study",
    "campaign readiness assessment",
    "capital campaign planning",
    "campaign goal setting",
    "gift chart",
    "quiet phase",
    "major gift prospect strategy",
    "nonprofit campaign consulting",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Why a Feasibility Study Matters Before a Capital Campaign",
    description:
      "Campaigns rarely struggle because the mission is weak. They struggle because nobody checked whether the goal, leadership, project, and donor base lined up before the campaign went public.",
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [
      {
        url: `${SITE_URL}${HERO_IMAGE}`,
        width: 1536,
        height: 1024,
        alt: "Nonprofit leadership team in a planning conversation around a conference table",
      },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Why a Feasibility Study Matters Before a Capital Campaign",
  description:
    "Campaigns rarely struggle because the mission is weak. They struggle because nobody checked whether the goal, leadership, project, and donor base lined up before the campaign went public.",
  image: `${SITE_URL}${HERO_IMAGE}`,
  author: {
    "@type": "Person",
    name: "Jeff J. Grandy, M.Ed",
    jobTitle: "Vice President of Client Development",
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

export default function FeasibilityStudyPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Campaigns rarely fail because the mission is weak."
        description="They struggle because nobody stopped to check whether the goal, leadership, project, and donor base actually lined up before the campaign went public. A feasibility study is how you check."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons
          url={`/blog/${SLUG}`}
          title="Why a Feasibility Study Matters Before a Capital Campaign"
        />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Jeff Grandy, Vice President of Client Development, Catapult Fundraising
        </p>

        <div className="mt-6 mb-6 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image
              src={HERO_IMAGE}
              alt="Nonprofit leadership team in a planning conversation around a conference table before a capital campaign"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Launching a capital campaign is a major commitment. It requires board leadership, staff
          capacity, a compelling case for support, disciplined prospect strategy, and the confidence
          to ask donors for transformational gifts.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I&rsquo;ve been doing this long enough to know campaigns rarely struggle because the
          mission is weak. They struggle because nobody stopped to check whether the goal,
          leadership, project, and donor base actually lined up before the campaign went public.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A feasibility study is how you check.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          It is not a test of whether donors like the project. Most people are polite. They will tell
          you they like the project. What matters is whether they believe the vision is clear, the
          leadership is credible, the goal is realistic, and the right donors are willing to engage.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Those answers are much harder to fake.
        </p>

        <div className="mt-10 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image
              src="/blog/why-a-feasibility-study-matters/what-the-study-tests.png"
              alt="What a feasibility study actually tests: the goal, the case, the leadership, the prospects, and the timing"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Setting a goal you can actually reach
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Most organizations begin a campaign conversation with a number based on need. That makes
          sense. A new facility costs what it costs. A program expansion has a real price tag.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          But what an organization needs and what it can raise within a particular timeline are two
          different questions. A feasibility study helps leadership reconcile those two realities
          before a goal is printed, promised, or announced.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I worked on an endowment campaign with an initial goal range of $8 million to $12 million.
          We designed the plan so the final goal would be based on what we learned through the
          feasibility process. We also left room to extend the quiet phase if the findings showed the
          organization needed more time to develop major gift prospects.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          That flexibility is not a lack of confidence. It is good campaign planning.
        </blockquote>

        <div className="mt-8 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image
              src="/blog/why-a-feasibility-study-matters/giving-usa-2026.png"
              alt="Infographic: total U.S. charitable giving reached $617.2 billion in 2025, up 5.7% over the prior year, but campaign dollars still start at the top of the gift chart"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Giving USA reported that charitable giving in the United States reached $617.2 billion in
          2025, an increase of 5.7% over the prior year. That is encouraging, but it does not mean
          every organization has equal access to those dollars.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Capital campaigns still depend on a relatively small number of donors willing and able to
          make transformational gifts. The real question is not only how much you need. It is whether
          you have the relationships, leadership, and strategy to raise it.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Finding the weak spots while you can still fix them
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A polished brochure does not raise money on its own. Clear priorities, credible leadership,
          strong donor relationships, a realistic gift chart, and a case for support people genuinely
          believe in are what raise money.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A feasibility study shows you which of those pieces are in place and which need work. That
          might mean refining the project scope, strengthening the case, recruiting campaign
          leadership, cleaning up donor data, or building a deeper prospect pipeline.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          On one campaign, we could not move into serious fundraising until the organization settled
          several fundamental questions involving land, project costs, the business plan, and
          construction phases.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          None of those questions was particularly glamorous. Capital campaign planning rarely is.
          But each answer affected what the organization could credibly present to donors.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That is the value of doing this work early. It is much easier to solve a problem before a
          campaign becomes public than after donors have already been asked to invest in it.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Letting donors and community leaders talk first
        </h2>

        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:mt-2 sm:w-72 md:w-80" style={FEATHER}>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl">
            <Image
              src="/blog/why-a-feasibility-study-matters/donor-conversation.jpg"
              alt="A confidential one-on-one conversation between a fundraiser and a major donor"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A well-run feasibility study creates space for confidential conversations with the people
          who matter most: major donors, board members, former leaders, foundation representatives,
          community partners, and potential campaign volunteers.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Those conversations provide much more than a dollar estimate. They tell you how people see
          the organization, whether the vision connects, what concerns need to be addressed, and who
          may be willing to lead.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I advised on a campaign where community confidence had declined after a lengthy closure. In
          that situation, visible progress mattered as much as anything we could put in the case for
          support. The planning process allowed us to hear those concerns before asking anyone for a
          major gift.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Sometimes the most important thing you learn is not how much someone might give. It is what
          must happen before that person is ready to consider giving at all.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That is valuable information, even when it is not the answer everyone wanted to hear.
        </p>

        <div className="clear-both" />

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Determining whether leadership is ready
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Major gifts happen because of relationships, not paperwork. A campaign needs board members,
          committee members, and campaign chairs who are willing to open doors, tell the story, and
          participate in donor conversations.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I tell boards much the same thing every time:
        </p>

        <ul className="mt-6 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Confirm the need</span> before
            anything else moves
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Approve the campaign policies</span>{" "}
            so the rules are settled early
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Make your own gift</span>, and
            make it first
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Attend cultivation events</span>{" "}
            where donors can see you
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">
              Help the community believe in the vision
            </span>
          </li>
        </ul>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Donors read the room. They pay attention to the people behind the campaign as closely as
          they examine the project.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A feasibility study helps determine whether that leadership is present. It can also
          identify people who may serve as campaign chairs, connectors, advocates, or volunteers. Not
          everyone needs to be the person who asks for the gift. Some people create far more value by
          opening the right door and helping someone else walk through it.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Testing the prospect strategy
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The early dollars in a campaign generally come from a small number of large gifts. There is
          no clever workaround for that. It is simply how capital campaigns work.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That is why I begin prospect strategy at the top of the gift chart. Do we have multiple
          qualified prospects at each leadership level? Do we understand their capacity, interest,
          and relationship with the organization? Or did someone put their name on a spreadsheet
          because they once attended a luncheon?
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          A name is not a prospect strategy.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The feasibility process tests those assumptions through research and confidential
          conversations. It helps an organization distinguish between people who appear capable of
          giving and people who have the connection, interest, and trust necessary to consider a
          significant investment.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A campaign&rsquo;s outcome may depend on a handful of relationships. Leadership should know
          who those people are and where they stand before announcing the campaign publicly.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Knowing when not to launch
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The purpose of a feasibility study is not to produce a predetermined yes.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Sometimes the responsible recommendation is to adjust the goal, phase the project,
          strengthen the case, recruit additional leadership, develop more prospects, or wait. That
          is not failure. It is good judgment.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Launching before the case is clear, the budget is credible, the leadership is committed,
          and the prospect base is qualified creates unnecessary pressure for staff and volunteers.
          It can also damage donor confidence in ways that take years to repair.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Occasionally, circumstances make a traditional feasibility study impractical. I worked with
          one organization that needed to move quickly after a two-year closure had weakened
          community confidence. The timeline did not allow for a full study, so we conducted an
          accelerated readiness assessment focused on the same essential questions:
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          What would the project cost? Who were the strongest prospects? Who would lead? Was the case
          credible? Were donors ready to engage?
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The format can change when circumstances demand it. The discipline cannot.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Moving forward without answering those questions does not save time. It simply moves the
          risk to a point in the campaign where fixing the problem becomes more difficult and more
          public.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The study is not a delay. It is the first move.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Do not think of a feasibility study as something that slows a campaign down. It is the
          first serious investment an organization makes in getting the campaign right.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          It turns enthusiasm into a plan: a realistic goal, a stronger case, defined leadership
          roles, a qualified donor pipeline, and a roadmap for securing the first gifts.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Every organization I have seen struggle after skipping this work had a worthwhile mission.
          The problem was not the mission. Leadership had never determined whether the goal, project,
          people, and donors were moving in the same direction.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A feasibility study gives you the opportunity to find out while there is still time to do
          something about it.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Catapult Fundraising conducts feasibility studies, readiness assessments, and capital
          campaign planning for nonprofits across the country. If you are weighing a campaign and
          want an honest read on whether you are ready,{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            let&rsquo;s start the conversation
          </Link>
          .
        </p>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Sources: Total giving figures are drawn from Giving USA 2026, reporting on 2025 giving,
          Indiana University Lilly Family School of Philanthropy. Campaign examples reflect Catapult
          Fundraising&rsquo;s own client experience and are not industry-wide statistics.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
