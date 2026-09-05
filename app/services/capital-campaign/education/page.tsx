import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { Users } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  "title": "Capital Campaigns for Schools and Universities",
  "description": "How alumni and education donors actually behave in a capital campaign: wealth capacity versus real giving, dual goal scenarios, alumni file hygiene, and why timing follows leadership.",
  "keywords": [
    "university capital campaign consultant",
    "higher education capital campaign",
    "school capital campaign",
    "independent school capital campaign",
    "alumni giving behavior",
    "college capital campaign feasibility study",
    "university feasibility study",
    "private school fundraising consultant",
    "alumni wealth screening",
    "education fundraising consultant",
    "campus capital campaign",
    "endowment campaign consultant",
    "school capital campaign planning study",
    "college campaign feasibility study"
  ],
  "alternates": {
    "canonical": "/services/capital-campaign/education"
  }
};

const SECTIONS = [
  {
    "title": "Capacity in an Alumni File Usually Exceeds What Alumni Are Actually Giving",
    "description": "This is the most common finding in education feasibility studies, and it is good news. In a study Catapult conducted for a law school preparing a nine-figure campaign, wealth screening showed capacity substantially greater than the amounts that same group was donating. That gap is not a donor problem. It is an asking problem, and it usually traces back to a development office that was never staffed to do major gift work.",
    "bullets": [
      "Screen for capacity before you set a goal, then compare capacity against actual giving history",
      "A large gap means the goal can be more ambitious than the giving record suggests",
      "It also means the campaign has to fund the fundraising, because nobody is currently doing that work",
      "Capacity without contact history is a list, not a pipeline"
    ]
  },
  {
    "title": "Bring the Board Two Goals, Not One",
    "description": "In that same law school study, Catapult modeled the campaign at two levels and built a full gift chart for each, at $225 million and at $250 million. We do that deliberately. A single number invites a yes or no argument about ambition. Two charts turn the board conversation into a question of evidence: which chart can we actually populate with named prospects at every tier, and what would have to be true to reach the higher one.",
    "bullets": [
      "Build a complete gift chart for each scenario rather than scaling one proportionally",
      "Test the top of each chart against real names before the board votes",
      "The gap between the two scenarios is almost always concentrated in the lead gifts",
      "A goal you can populate beats a goal you can defend rhetorically"
    ]
  },
  {
    "title": "Your Alumni Data Will Change Once You Start Looking Closely",
    "description": "Education files are large, old, and dirty. In one Catapult campaign engagement a 57,400-name alumni list covering fifteen years had to be filtered by proximity to the campaign's geography, filtered again by zip code affluence, and deduplicated against the donor file before wealth screening was worth running. Data append raised phone coverage from about 55 percent to 74 percent and email from 46 percent to 55 percent. Records older than roughly fifteen years were judged too outdated to be actionable at all.",
    "bullets": [
      "Budget time and money for data work before the study, not during the campaign",
      "Deduplicate against the donor file first, or you pay to screen the same people twice",
      "Expect to discard a meaningful share of the file and plan around what is left",
      "Append phone and email before any outreach, or your contact rate will decide your campaign for you"
    ]
  },
  {
    "title": "Filter by Age at Graduation, Not by Graduation Year",
    "description": "This one small decision changes prospect quality more than any other filter in an education file. Alumni who graduated at thirty or older are more likely to be career-motivated and, critically, more likely to have their own address on file rather than a parent's. Screening a young graduate still listed at the family home returns the parents' wealth, which sends the campaign after the wrong person with the wrong number. In the engagement above, that filter plus geography and affluence screens narrowed 57,400 names to roughly 6,562 worth appending, and the wealth screen that followed targeted the $500,000 and $1 million capacity thresholds and projected 300 to 400 qualified prospects.",
    "bullets": [
      "Age at graduation is a proxy for both capacity and address reliability",
      "Screen against explicit capacity thresholds rather than pulling everyone with a rating",
      "Prioritize within the results by degree or program, because affinity is not evenly distributed",
      "Newly identified alumni prospects need roughly 12 to 18 months of cultivation before a campaign ask"
    ]
  },
  {
    "title": "Your Reputation Matters More Than Your Database",
    "description": "Education donors track their school's standing closely, and their giving follows it. In one feasibility study, interviewees praised the quality of the education and the faculty while raising real concerns about a recent name change, a decline in bar passage rates, and limited recognition outside the immediate region. Those concerns did not stop the campaign. They shaped the case for support, and they had to be surfaced in confidential interviews rather than discovered after a public announcement.",
    "bullets": [
      "Alumni will tell a third-party interviewer things they will not tell the advancement office",
      "Ranking movement, leadership changes, and naming decisions all show up in interview transcripts",
      "The case for support has to answer the objection, not avoid it"
    ]
  },
  {
    "title": "Leadership Has a Lot to Do With Timing",
    "description": "In education, donors give while a president, dean, or head of school they trust is still in place. In one study the most common comment about timing was a version of the same thought: do it while the current dean is here. That comment reflects a real scheduling constraint on the campaign timetable. It also means a leadership transition mid-campaign is a bigger risk in education than in almost any other sector.",
    "bullets": [
      "Confirm the tenure horizon of your leader before setting a five-year campaign timetable",
      "Trustee and alumni confidence attaches to individuals, not to the org chart",
      "If a transition is coming, front-load the quiet phase"
    ]
  },
  {
    "title": "What Donors Tend to Support in Education Campaigns",
    "description": "Across education studies, the parts of the menu that draw the strongest donor support are consistent: scholarships and financial aid, faculty recruitment and retention, and endowment. Facilities projects test well when donors can see that the building matches the institution the school is trying to become. Interviewees are also generous with suggestions, and their additions are worth listening to, because they reveal what they are willing to fund.",
    "bullets": [
      "Scholarships have the broadest appeal across every alumni generation",
      "Endowment resonates most with older alumni who think in terms of permanence",
      "Facilities need a story about trajectory, not just square footage",
      "Ask interviewees what is missing from the menu, then read the pattern in the answers"
    ]
  }
];

const FAQS = [
  {
    "question": "Why does wealth screening show more capacity than our alumni actually give?",
    "answer": "Because capacity measures what a person could give and giving history measures what someone has asked them for. In education campaigns the gap is usually large, and it almost always points to a development office that has never been staffed for major gift work rather than to disinterested alumni. Closing that gap is normally the first recommendation in the study."
  },
  {
    "question": "How should we filter our alumni file for a campaign?",
    "answer": "By age at graduation rather than graduation year alone, combined with geography and a wealth screen against explicit capacity thresholds. Filtering for alumni who graduated at thirty or older removes recent graduates still listed at a parent's address, which otherwise returns the parents' wealth and sends the campaign after the wrong person with the wrong number."
  },
  {
    "question": "Do we need to clean our alumni data before a feasibility study?",
    "answer": "Yes, and it usually takes longer than institutions expect. Large alumni files need deduplication against the donor file, geographic filtering, and phone and email append before wealth screening produces anything useful. In one Catapult engagement, append raised phone coverage from roughly 55 percent to 74 percent, and records older than about fifteen years were not usable at all."
  },
  {
    "question": "Should our board set one campaign goal or several?",
    "answer": "Model at least two. In a recent Catapult study for a university preparing a nine-figure campaign, full gift charts were built at both $225 million and $250 million so the board could compare them side by side. Two charts move the decision away from an argument about ambition and toward a question you can answer with your file: which one can we populate with named prospects at every tier."
  },
  {
    "question": "How much does a feasibility study cost for a school or university?",
    "answer": "Feasibility study cost varies with the size of the prospect universe, the number of interviews, travel, and how many regions have to be covered. As a working range, a well-run feasibility study runs between $50,000 and $75,000. Studies retained alongside campaign planning and the quiet phase are priced more favorably than the same phases purchased separately."
  }
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Capital Campaign Donor Behavior: Schools and Universities",
      serviceType: "Nonprofit capital campaign counsel",
      url: `${SITE_URL}/services/capital-campaign/education`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description: "How alumni and education donors actually behave in a capital campaign: wealth capacity versus real giving, dual goal scenarios, alumni file hygiene, and why timing follows leadership.",
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
          name: "Schools and Universities",
          item: `${SITE_URL}/services/capital-campaign/education`,
        },
      ],
    },
  ],
};

export default function EducationDonorBehaviorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Capital Campaigns by Sector"
        title="Schools and universities."
        description="Alumni are not simply giving to an institution. They are often giving to a part of their own story. That connection matters. It affects what they care about, how they respond to a campaign, and sometimes how quickly they are willing to make a gift."
      />
      <ServiceDetail
        heroImage="/blog/why-a-feasibility-study-matters/hero-board-meeting.jpg"
        heroImageAlt="University advancement team reviewing capital campaign plans"
        sections={SECTIONS}
        sidebarTitle="What Changes in This Sector"
        sidebarIcon={Users}
        sidebarItems={[
  "Capacity in an Alumni File Usually Exceeds What Alumni Are Actually Giving",
  "Bring the Board Two Goals, Not One",
  "Your Alumni Data Will Change Once You Start Looking Closely",
  "Filter by Age at Graduation, Not by Graduation Year",
  "Your Reputation Matters More Than Your Database",
  "Leadership Has a Lot to Do With Timing",
  "What Donors Tend to Support in Education Campaigns"
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
            Education is one of four sectors where Catapult runs campaigns with materially different playbooks.{" "}
            See also{" "}<Link href="/services/capital-campaign/churches" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Churches & Faith Communities</Link>,{" "}<Link href="/services/capital-campaign/social-service" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Social Service Organizations</Link>, and{" "}<Link href="/services/capital-campaign/healthcare" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Healthcare Organizations</Link>.
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
