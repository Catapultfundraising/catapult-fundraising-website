import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Capital Campaign Feasibility Study",
  description:
    "Catapult conducts confidential feasibility studies that test your campaign goal, case for support, and prospect capacity before you go public. Most well-run studies range from $50,000 to $75,000.",
  keywords: [
    "feasibility study",
    "capital campaign feasibility study",
    "fundraising feasibility study",
    "feasibility study consultant",
    "nonprofit feasibility study",
    "feasibility study cost",
    "how much does a feasibility study cost",
    "campaign readiness assessment",
    "donor assessment study",
    "planning study fundraising",
    "feasibility study interviews",
    "feasibility study report",
    "capital campaign goal setting",
    "gift chart feasibility study",
    "national feasibility study firm",
  ],
  alternates: { canonical: "/services/feasibility-study" },
};

const SECTIONS = [
  {
    title: "Find Out What Your Donors Will Actually Give, Before You Announce a Goal",
    description:
      "A feasibility study is a confidential interview process, not a survey. Catapult sits down with your board, staff, and top prospects, one conversation at a time, to test whether your case for support resonates, whether your leadership will make and ask for gifts, and whether the money behind your goal is really there. The result is a goal you can defend to your board with data instead of optimism.",
    bullets: [
      "Up to 60 confidential interviews, drawn from a wealth-screened pool of your top prospects",
      "30 to 40 minute conversations, in person, by video, or by phone at the donor's preference",
      "No solicitation during the study, so relationships are protected while the truth comes out",
      "Written case summary and FAQs your board approves before a single invitation goes out",
      "Roughly three months of interviewing, then four weeks to the finished report",
    ],
  },
  {
    title: "How the Study Runs",
    description:
      "Catapult manages the process end to end. Your team approves the list and the materials, and we do the rest, including scheduling every interview.",
    bullets: [
      "1. Prospect prioritization: we build the interview list with you from wealth and affinity indicators",
      "2. Materials: we write the case summary, letter of invitation, and FAQs for your approval",
      "3. Invitations: sent on your letterhead over your board chair's or president's signature",
      "4. Interviews: tiered so your most significant prospects are handled by senior Catapult staff",
      "5. Analysis: responses sorted by theme and respondent type, with quotes and sentiment",
      "6. Report and presentation: findings, observations, and recommendations, presented live to your board",
    ],
  },
  {
    title: "What Lands on Your Board Table",
    description:
      "Every study ends in a written report and a board presentation built from it, not a verbal summary. The report is transparent, structured in three parts, and specific enough to run a campaign from.",
    bullets: [
      "Study findings, including actual interview comments and the giving range each key prospect signaled",
      "Observations on which parts of your case resonate and which parts get in the way",
      "A recommended dollar goal, with gift chart scenarios at more than one goal level",
      "A leadership prospect list: who said yes to committee service and who said maybe",
      "Recommended campaign timetable, staffing, and communications priorities",
      "Two report versions where needed, one for the board and one for staff with wealth detail",
    ],
  },
  {
    title: "You Can Watch It Happen in Real Time",
    description:
      "Clients get a password-protected dashboard during the study: interviews completed versus scheduled, response rates, gift-tier data, and rotating quotes attributed by sector rather than by name. You can look up where a specific prospect stands without calling us, and we still check in with your team on a set schedule throughout.",
  },
  {
    title: "What a Feasibility Study Costs",
    description:
      "Cost varies with the size of your prospect universe, how many interviews are needed, whether they are in person or virtual, and how many regions or chapters have to be covered. As a working range, a well-run feasibility study runs between $50,000 and $75,000. A study priced far below that usually means fewer interviews, a thinner report, or a junior team, and that is where campaigns get goals they cannot reach. Studies bundled into a broader campaign engagement are priced more favorably than the same phases bought one at a time.",
    bullets: [
      "Well-run feasibility study: roughly $50,000 to $75,000",
      "Driven by interview volume, travel, and the number of markets covered",
      "In-person interviews carry travel cost, which we scope with you up front",
      "Lower total cost when the study is retained alongside campaign planning and the quiet phase",
    ],
  },
  {
    title: "What Your Team Provides",
    description:
      "A study works when the organization stays close to it. The lift on your side is real but contained: a single point of contact, your donor data, and timely approvals.",
    bullets: [
      "One staff liaison to partner with Catapult",
      "Donor data for analysis and screening",
      "Partnership on the interview invitation list",
      "Approval of the case summary and FAQs",
      "Availability for meetings during the study",
      "Arrangement of the board presentation of the report",
    ],
  },
];

const FAQS = [
  {
    question: "How much does a capital campaign feasibility study cost?",
    answer:
      "Feasibility study cost varies with the size of the prospect universe, the number of interviews, travel, and how many regions or chapters have to be covered. As a working range, a well-run feasibility study runs between $50,000 and $75,000. Catapult prices each study after an initial conversation, and studies retained alongside campaign planning and the quiet phase are priced more favorably than the same phases purchased separately.",
  },
  {
    question: "How long does a feasibility study take?",
    answer:
      "Interviews generally take about three months to complete, and the written report follows within four weeks of the final interview. Larger studies covering multiple markets can run closer to five months end to end.",
  },
  {
    question: "How many interviews are in a feasibility study?",
    answer:
      "Catapult typically conducts up to 60 confidential interviews, drawn from a wealth-screened pool of an organization's top prospects. The number invited is set during the planning phase, and if there is an opportunity to interview more than 60, Catapult does so.",
  },
  {
    question: "Are feasibility study interviews confidential, and do you ask for money?",
    answer:
      "Yes, every interview is confidential, and no solicitation takes place during the study. Comments appear in the report without attribution to a named individual, which is what allows prospects to be candid about the goal and the case for support.",
  },
  {
    question: "What is the difference between a feasibility study and a campaign readiness assessment?",
    answer:
      "A feasibility study looks outward: it tests donor interest, capacity, and the case for support with the people who would fund the campaign. A campaign readiness assessment looks inward at staffing, systems, data, and governance to confirm the organization can run the campaign the study recommends. Many organizations need both, and Catapult can run them together.",
  },
  {
    question: "What do we get at the end of the study?",
    answer:
      "A written report in three parts, findings with actual interview comments, observations on the case for support, and recommendations, plus a recommended dollar goal, gift chart scenarios, a leadership prospect list, a campaign timetable, and an executive presentation delivered live to your board.",
  },
  {
    question: "Do we have to run a campaign after the study?",
    answer:
      "No. A study can and sometimes should conclude that the goal needs to change, that the launch should be delayed, or that readiness work comes first. That answer is worth far more before a public announcement than after one.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Capital Campaign Feasibility Study",
      serviceType: "Nonprofit capital campaign feasibility study",
      url: `${SITE_URL}/services/feasibility-study`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description:
        "Catapult conducts confidential capital campaign feasibility studies: up to 60 interviews with board, staff, and top prospects, a written report with a recommended goal and gift chart scenarios, and a board presentation.",
      offers: {
        "@type": "Offer",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "USD",
          minPrice: 50000,
          maxPrice: 75000,
          description:
            "Feasibility study cost varies by scope; a well-run study generally ranges from $50,000 to $75,000.",
        },
      },
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
          name: "Feasibility Study",
          item: `${SITE_URL}/services/feasibility-study`,
        },
      ],
    },
  ],
};

export default function FeasibilityStudyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Feasibility Study"
        title="Test the goal before you announce it."
        description="Catapult's feasibility study puts a confidential conversation in front of every prospect who would have to fund your campaign, then hands your board a defensible goal, a gift chart, and a leadership list instead of a guess."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/2a0d01eb-79d6-4dfe-b7ce-54b1b8418ee0.png"
      />
      <ServiceDetail
        heroImage="/blog/why-a-feasibility-study-matters/hero-board-meeting.jpg"
        heroImageAlt="Nonprofit board and staff reviewing feasibility study findings around a conference table"
        sections={SECTIONS}
        sidebarTitle="What You Get"
        sidebarIcon={ClipboardCheck}
        sidebarItems={[
          "Up to 60 confidential prospect interviews",
          "Approved case summary, invitation letter, and FAQs",
          "A live, password-protected study dashboard",
          "Written report: findings, observations, recommendations",
          "Recommended goal with gift chart scenarios",
          "Leadership prospect and donor consideration lists",
          "Board presentation built from the final report",
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
            A study is the first of five phases in a Catapult campaign. See how the rest runs on{" "}
            <Link
              href="/services/capital-campaign"
              className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4"
            >
              Capital Campaign Counsel
            </Link>
            .
          </p>
        </div>
      </section>

      <RelatedReading
        heading="Reading before you commission a study."
        postSlugs={[
          "why-a-feasibility-study-matters-before-a-capital-campaign",
          "how-much-does-a-capital-campaign-cost",
          "planning-a-capital-campaign-gift-chart-quiet-phase",
        ]}
        pillars={["Feasibility Studies"]}
      />

      <CtaBand />
    </>
  );
}
