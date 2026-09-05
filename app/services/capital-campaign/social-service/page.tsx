import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { Users } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  "title": "Capital Campaigns for Social Service Organizations",
  "description": "How donors behave in social service capital campaigns: why the people you serve cannot fund you, how many gifts a goal actually takes, and where community-service money really comes from.",
  "keywords": [
    "social service capital campaign",
    "human services capital campaign",
    "nonprofit capital campaign consultant",
    "Salvation Army capital campaign",
    "community services capital campaign",
    "shelter capital campaign",
    "assisted living capital campaign",
    "memory care capital campaign",
    "community center capital campaign",
    "social service feasibility study",
    "human services fundraising consultant",
    "corps capital campaign",
    "social service organization fundraising",
    "community service campaign consultant"
  ],
  "alternates": {
    "canonical": "/services/capital-campaign/social-service"
  }
};

const SECTIONS = [
  {
    "title": "Your Constituency May Not Be Your Donor Base",
    "description": "In education the people served become the donors. In social service they generally cannot. The campaign has to be funded by people with no personal experience of your programs, which means the case for support does an education job before it does a persuasion job. That work takes time, and it is the most underestimated line item in a social service campaign plan.",
    "bullets": [
      "Budget cultivation time for donors who have never used and will never use your services",
      "Lead with the population served and the outcome, not with internal organizational milestones",
      "Corporate and foundation money carries more weight here than in sectors with a built-in donor constituency",
      "Expect to spend part of the campaign simply making high-capacity people aware you exist"
    ]
  },
  {
    "title": "A First Campaign Has to Establish Credibility",
    "description": "In a Catapult feasibility study for a century-old organization attempting its first significant campaign, interviewees called the $14.4 million goal aggressive and gave consistent reasons: the organization had never had a strong development program, fundraising had not been a priority for most of its existence, the donor pipeline was not deep enough, and development staffing had been pleasant but not professionally strong. Their conclusion was blunt and worth repeating, because it is right. A first campaign of any size must succeed, or fundraising credibility is damaged for years.",
    "bullets": [
      "A smaller campaign you complete beats a larger one you abandon, by a wide margin",
      "Interviewees will assess your staffing honestly, and a study is where you find that out safely",
      "Fund the development function inside the campaign, because the current team cannot absorb it",
      "Set the goal against the pipeline you can document, not the need you can describe"
    ]
  },
  {
    "title": "Start With the Gifts, Then Look at the Goal",
    "description": "In two more recent Catapult feasibility studies for community service organizations, both testing $10 million facility projects, the gift chart called for roughly 230 gifts to reach the goal. That is the number worth putting in front of a board. It reframes the conversation away from whether the dollar figure sounds large and toward whether you can name enough people at each level, which is a question you can actually answer with your file.",
    "bullets": [
      "Build the gift chart before the goal is announced, then test whether real names exist at each tier",
      "The top ten gifts decide the campaign, and the study should ask interviewees to name candidates for them",
      "Test donor willingness at the $100,000 and above level specifically, because that is where feasibility is proven or disproven",
      "If you cannot populate the top of the chart, the goal is wrong, not the donors"
    ]
  },
  {
    "title": "Some of Your Best Prospects May Already Be in Your File",
    "description": "Wealth screening on social service files reliably turns up substantial capacity. The problem is the dates. In one study, when Catapult reviewed giving history for high-capacity donors, the gifts were often years old with little current relationship behind them. Many of the largest past donors were former constituents and their families, people whose connection had lapsed quietly while nobody was assigned to maintain it. Reactivation, not acquisition, is usually the fastest path to a lead gift.",
    "bullets": [
      "Cross-reference capacity against last gift date before you build the prospect list",
      "Lapsed high-capacity donors are the best pre-campaign investment available to most social service organizations",
      "A feasibility study invitation is a legitimate, non-soliciting reason to reopen those conversations"
    ]
  },
  {
    "title": "Wealth Screening Does Not Tell the Whole Story",
    "description": "Most wealth capacity ratings are built largely on real estate holdings and public income indicators. In one study, most residents of the organization's own community could not be screened at all, because entrance fees are not real estate assets. The same blind spot appears with renters, recent arrivals, and anyone whose wealth sits in vehicles the screening data does not see. Treat screening as one input among several rather than as the prospect list itself.",
    "bullets": [
      "Screening misses people without property, which in this sector can be most of your closest constituents",
      "Combine screening with giving history, board knowledge, and staff relationship intelligence",
      "Do not let a blank screening result remove someone from the interview list"
    ]
  },
  {
    "title": "Donors Will Tell You What They Really Think",
    "description": "Social service donors are candid in confidential interviews in a way they never are in a meeting. In one study the positive comments were genuinely warm, calling the organization a landmark with a hundred-year reputation and a competitive cost of service. The negative comments in the same set of interviews were equally direct: it needs updating, it is not competitive with the for-profits, staff turnover at the top is high, and a recent service closure was handled poorly. We included both sides in the report because both belonged in the campaign plan.",
    "bullets": [
      "Deferred maintenance reads to donors as organizational decline, whether or not it is",
      "Leadership turnover is a recurring theme and needs an answer in the case for support",
      "Competition from for-profit providers is a live concern donors raise unprompted",
      "Publish the hard findings to your board: a study that only reports the warm comments is worthless"
    ]
  },
  {
    "title": "Donors Will Help You Decide What Belongs in the Campaign",
    "description": "Social service interviewees are unusually willing to tell you which parts of your project they will and will not fund. In one study, donors strongly supported memory care, dining improvements, renovation, elevators, and historic preservation, and showed almost no support for a townhome construction component. Several said plainly that the townhomes should be financed rather than raised for, and should come out of the campaign menu. We would not treat that as a rejection. The donors were telling us what they actually wanted to support, which is valuable information.",
    "bullets": [
      "Test every line of the menu separately, not the project as a whole",
      "Revenue-generating components usually belong in financing, not in the campaign",
      "Donors fund care, access, and mission delivery more readily than they fund real estate plays",
      "Cut the weak menu items before the public phase, not after"
    ]
  },
  {
    "title": "Bring Government and Foundation Funding Into the Plan Early",
    "description": "Social service is one of the few sectors where a capital campaign routinely draws on four funding sources rather than one. In the two $10 million studies above, the fundraising sources were individuals, foundations, corporations, and government, all treated as primary rather than as a supplement to individual giving. Community-serving facilities qualify for public and institutional money that a program-only appeal does not, and those requests have long lead times.",
    "bullets": [
      "Identify government and public funding opportunities during the study, not after the quiet phase",
      "Many foundations require a set percentage of the goal to be committed before they will consider a request",
      "Corporate partners want measurable outcomes, co-branding, and a reporting cadence, not a logo on a banner",
      "Aim for 100 percent board participation and be able to state it in writing, because funders treat it as a proxy for seriousness"
    ]
  },
  {
    "title": "Give Major Donors Enough Naming Choices",
    "description": "This is a standing Catapult recommendation and it surprises most boards. A $10 million campaign should have roughly $30 million in naming opportunities available. Top donors expect recognition commensurate with their gift, and giving them a genuine choice of what to name is a large part of how a lead gift gets closed. A short naming list forces donors into whatever is left rather than into what they care about.",
    "bullets": [
      "Build the naming schedule off the actual renderings, room by room and program by program",
      "Offer naming at every level, not only at the seven-figure top",
      "Recognition and stewardship are the least considered part of the donor cycle and the most important for the next campaign",
      "Bundle the campaign ask with the annual gift ask, or the campaign will quietly eat the annual fund that pays for your programs"
    ]
  }
];

const FAQS = [
  {
    "question": "Why is a social service capital campaign harder than a school or church campaign?",
    "answer": "Because the people your organization serves generally cannot fund it. Schools raise from alumni and churches raise from members, both of whom have a direct personal relationship with the institution. Social service organizations have to build a donor base out of people with no lived experience of their work, which adds an education phase to the front of the campaign that other sectors do not carry."
  },
  {
    "question": "What goal should we set for our first capital campaign?",
    "answer": "One you can document, not one that matches the need. In a Catapult study for an organization attempting its first significant campaign, interviewees called the goal aggressive for concrete reasons: no fundraising history, a thin pipeline, and under-resourced development staffing. Their advice, which Catapult endorses, was to run a smaller campaign that succeeds, because a first campaign that misses damages fundraising credibility for years."
  },
  {
    "question": "How many gifts does a $10 million social service campaign take?",
    "answer": "In two recent Catapult feasibility studies for community service organizations testing $10 million facility projects, the gift chart called for roughly 230 gifts, drawn from individuals, foundations, corporations, and government sources. The question we would put in front of a board is not simply whether the number sounds achievable. It is whether you can name real prospects at each level of the gift chart."
  },
  {
    "question": "Our wealth screening came back thin. Does that mean we cannot run a campaign?",
    "answer": "Not necessarily. Wealth capacity ratings are built largely on real estate and income data, so they systematically miss renters, residents of managed communities where entrance fees are not counted as property, and anyone whose assets sit outside those data sources. Screening should be one input alongside giving history, board intelligence, and staff relationships, not the prospect list itself."
  },
  {
    "question": "How many naming opportunities should we offer?",
    "answer": "Roughly three times the campaign goal. For a $10 million campaign that means about $30 million in available naming opportunities, built off the actual renderings and covering every gift level rather than only the largest. Top donors expect recognition commensurate with their giving, and a short naming list forces them to choose from what is left instead of what they care about."
  },
  {
    "question": "How much does a feasibility study cost for a social service organization?",
    "answer": "Pricing is driven by the size of the prospect pool, the interview count, travel needs, and the number of sites or regions involved. Most well-run studies land in the $50,000 to $75,000 range, with better pricing available when the study is bundled with campaign planning and the quiet phase."
  }
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Capital Campaign Donor Behavior: Social Service Organizations",
      serviceType: "Nonprofit capital campaign counsel",
      url: `${SITE_URL}/services/capital-campaign/social-service`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description: "How donors behave in social service capital campaigns: why the people you serve cannot fund you, how many gifts a goal actually takes, and where community-service money really comes from.",
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Capital Campaign Counsel",
          item: `${SITE_URL}/services/capital-campaign`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Social Service Organizations",
          item: `${SITE_URL}/services/capital-campaign/social-service`,
        },
      ],
    },
  ],
};

export default function SocialServiceDonorBehaviorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Capital Campaigns by Sector"
        title="Social service organizations."
        description="One of the realities of social service fundraising is that the people who benefit most from the organization's work are often not the people who can make the largest gifts. That changes the campaign strategy from the beginning. You have to build relationships with people who may know very little about the organization or the people it serves."
      />
      <ServiceDetail
        heroImage="/blog/why-a-feasibility-study-matters/donor-conversation.jpg"
        heroImageAlt="Social service organization board and staff planning a capital campaign"
        sections={SECTIONS}
        sidebarTitle="What Changes in This Sector"
        sidebarIcon={Users}
        sidebarItems={[
  "Your Constituency May Not Be Your Donor Base",
  "A First Campaign Has to Establish Credibility",
  "Start With the Gifts, Then Look at the Goal",
  "Some of Your Best Prospects May Already Be in Your File",
  "Wealth Screening Does Not Tell the Whole Story",
  "Donors Will Tell You What They Really Think",
  "Donors Will Help You Decide What Belongs in the Campaign",
  "Bring Government and Foundation Funding Into the Plan Early",
  "Give Major Donors Enough Naming Choices"
]}
      />

      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Common Questions
          </p>
          <dl className="mt-8 space-y-8">
            {FAQS.map((f) => (
              <div key={f.question}>
                <dt className="font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
                  {f.question}
                </dt>
                <dd className="mt-3 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
                  {f.answer}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-xl text-[rgb(var(--ink))]/70">
            Social service is one of four sectors where Catapult runs campaigns with materially different playbooks.{" "}
            See also{" "}<Link href="/services/capital-campaign/education" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Schools and Universities</Link>,{" "}<Link href="/services/capital-campaign/churches" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Churches & Faith Communities</Link>, and{" "}<Link href="/services/capital-campaign/healthcare" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Healthcare Organizations</Link>.
            {" "}The phases themselves are the same everywhere: see{" "}
            <Link
              href="/services/capital-campaign"
              className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4"
            >
              Capital Campaign Counsel
            </Link>{" "}
            and{" "}
            <Link
              href="/services/feasibility-study"
              className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4"
            >
              Feasibility Studies
            </Link>
            .
          </p>
          <p className="mt-6 text-lg text-[rgb(var(--ink))]/60">
            Figures on this page come from Catapult feasibility studies and calling programs.
            Client organizations are described by type rather than by name to protect
            confidentiality.
          </p>
        </div>
      </section>

      <RelatedReading
        heading="Related reading."
        postSlugs={[
          "why-a-feasibility-study-matters-before-a-capital-campaign",
          "planning-a-capital-campaign-gift-chart-quiet-phase",
          "how-much-does-a-capital-campaign-cost",
        ]}
        pillars={["Capital Campaigns", "Feasibility Studies"]}
      />

      <CtaBand />
    </>
  );
}
