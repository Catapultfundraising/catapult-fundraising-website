import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { LoyaltyCalloutCard } from "@/components/tool-callout";
import { Landmark } from "lucide-react";
import { testimonialsFor } from "@/lib/testimonials";
import { TestimonialQuote } from "@/components/testimonial-quote";
import { ServiceProof, ServiceFaq } from "@/components/service-proof";
import { WebinarCallout } from "@/components/webinar-callout";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Planned Giving Consulting & Legacy Call Programs",
  description:
    "Start, grow or reignite your planned giving program. Legacy Call finds and confirms bequests and other planned gifts from your most loyal donors.",
  keywords: [
    "planned giving consultant",
    "planned giving consulting",
    "how to start a planned giving program",
    "planned giving program",
    "legacy society",
    "legacy giving consultant",
    "planned giving program",
    "Legacy Call",
    "bequest fundraising",
    "nonprofit planned giving",
    "bequest program for nonprofits",
    "legacy call program",
    "deferred gift fundraising",
    "planned giving outreach services",
    "donor-advised fund",
    "charitable remainder trust",
    "charitable lead trust",
    "charitable gift annuity",
    "IRA charitable rollover",
    "qualified charitable distribution",
    "beneficiary designation gifts",
    "estate and will bequest planning",
    "national planned giving consultant",
  ],
  alternates: { canonical: "/services/planned-giving" },
};

const SECTIONS = [
  {
    title: "The Untapped Gift Behind Every Loyal Donor",
    description:
      "Planned giving prospects rarely make large outright gifts, but their loyalty often translates into deferred commitments worth 200-300 times their largest annual gift. Legacy Call is Catapult's full-service, two-tier methodology for identifying and closing bequests, beneficiary designations, life-income gifts, and other planned commitments.",
    bullets: [
      "41% of planned giving donors give 10+ consecutive years to the organizations they value",
      "Tier 1 qualifying calls reach 60-70% of prospects, with 10-15% positive response",
      "Tier 2 gift-planning follow-up closes 25-32% of qualified leads",
      "Average confirmed gift commitment: roughly $48,500",
    ],
  },
  {
    title: "The Legacy Call Process",
    description:
      "A structured, seven-step donor journey, personalized enough to feel like a face-to-face planned-giving visit, scaled to reach your entire loyal donor base.",
    bullets: [
      "1. Prospect identification using proprietary donor-data analysis",
      "2. Donor list review & approval alongside your team",
      "3. Pre-call letter previewing the conversation and sharing an impact story",
      "4. Prospect qualification calls from a trained Stewardship Officer",
      "5. Gift phase: referral to a Gift Planning Specialist for eligible prospects",
      "6. Confirmation, fulfillment, recognition & daily reporting",
      "7. Warm hand-off to your internal planned giving / stewardship team",
    ],
  },
  {
    title: "Start, Grow or Reignite a Planned Giving Program",
    description:
      "Some clients come to us with no planned giving program at all. Others have a legacy society that stopped growing years ago. Either way, we start with the same question: who in your file has the loyalty, affinity and life stage to leave a gift, and has anyone asked them? From there we build what you need around it.",
    bullets: [
      "Readiness review of your donor file, materials and past planned giving efforts",
      "Gift acceptance policy, ways-to-give, gift commitment forms and recognition plan",
      "A planned giving case statement and donor cultivation kit",
      "Website and marketing messaging for planned gifts",
      "Prospect portfolios, ask strategy and coaching for staff, board and volunteers",
      "Best practices for stewarding donors and processing gifts after a donor passes",
    ],
  },
  {
    title: "Built to Extend Your Existing Team",
    description:
      "Our Gift Planning Specialists don't replace your development office. They extend it, confirming intentions your team is already working and surfacing new ones your team hasn't found yet.",
  },
];

const FAQS = [
  {
    question: "How do you start a planned giving program?",
    answer:
      "Start with your loyal donors, not a brochure. Find the people who have given consistently for years, put basic infrastructure in place (a gift acceptance policy, simple ways-to-give language and a way to recognize legacy donors), then start asking. Most organizations wait too long because they think they need everything perfect first. In practice, the conversations come first and the infrastructure grows with them.",
  },
  {
    question: "Who are the best planned giving prospects?",
    answer:
      "Loyalty is the strongest signal. Donors who have given for many years, even at modest levels, are often your best legacy prospects. We also look at affinity, life stage and wealth capacity. Many planned gift donors don't have the capacity for a large gift today but can make a much larger gift through their estate.",
  },
  {
    question: "Can a small shop run a planned giving program?",
    answer:
      "Yes. PBS KVIE described itself as a small shop that needed help connecting with planned giving donors. Through Legacy Call, the station closed $4.62 million in planned gifts, secured 63 planned gifts and added 106 donors to its pipeline.",
  },
  {
    question: "What is Legacy Call?",
    answer:
      "Legacy Call is Catapult's full-service, two-tier planned giving methodology for identifying and closing bequests, beneficiary designations, life-income gifts, and other deferred commitments from an organization's most loyal donors.",
  },
  {
    question: "How much is an average planned gift commitment?",
    answer:
      "Through the Legacy Call process, the average confirmed gift commitment is roughly $48,500, often 200-300 times a donor's largest annual gift.",
  },
  {
    question: "How does the Legacy Call process work?",
    answer:
      "It follows a seven-step journey: prospect identification, donor list review, a pre-call letter, qualification calls from a trained Stewardship Officer, referral to a Gift Planning Specialist, confirmation and reporting, and a warm hand-off to the organization's internal planned giving team.",
  },
  {
    question: "Who is a good prospect for Legacy Call?",
    answer:
      "The best Legacy Call prospects are an organization's most loyal, longest-tenured donors, often those who have given consistently for 10 or more years but at modest annual levels. Their loyalty frequently signals capacity for a much larger deferred gift than their giving history alone would suggest.",
  },
  {
    question: "How is Legacy Call different from a traditional planned giving newsletter or mailing?",
    answer:
      "Unlike a static newsletter or mailing, Legacy Call is a live, two-tier phone-based methodology: trained Stewardship Officers have real qualifying conversations with donors, and qualified leads are handed to a Gift Planning Specialist for a genuine planned-giving conversation, not just information delivery.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Planned Giving Consulting & Legacy Call",
      serviceType: "Nonprofit planned giving consulting and legacy gift program",
      url: `${SITE_URL}/services/planned-giving`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description:
        "Catapult's Legacy Call program uncovers bequests, beneficiary designations, and other deferred gifts from an organization's most loyal donors.",
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
        { "@type": "ListItem", position: 2, name: "Planned Giving", item: `${SITE_URL}/services/planned-giving` },
      ],
    },
  ],
};

export default function LegacyGivingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrowInHeading
        eyebrow="Planned Giving Consulting & Legacy Programs"
        title="Your most loyal donors are ready for a legacy conversation. Legacy Call finds them."
        description="A full-service, two-tier planned giving methodology, not a single survey, that uncovers bequests and deferred gifts most capital campaigns leave on the table."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/2a0d01eb-79d6-4dfe-b7ce-54b1b8418ee0.png"
      />
      <ServiceDetail
        heroImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3774d10f-a730-4365-a433-58fea8d6d1a6.png"
        heroImageAlt="A donor's hands writing in a personal journal, symbolizing legacy and planned giving"
        sections={SECTIONS}
        sidebarTitle="What You Get"
        sidebarIcon={Landmark}
        sidebarItems={[
          "A dedicated Stewardship Officer & Gift Planning Specialist team",
          "Confidential confirmation of bequests & other commitments",
          "Daily results tracked through an online portal",
          "A growing portfolio of confirmed & prospective planned gifts",
          "Seamless hand-off to your planned giving team",
        ]}
      />
      <ServiceProof
        heading="Planned gifts our clients have closed and confirmed."
        stats={[
          { value: "$4.62M", label: "In planned gifts closed for PBS KVIE" },
          { value: "63", label: "Planned gifts secured for PBS KVIE, plus 106 donors added to the pipeline" },
          { value: "$4.89M", label: "In confirmed planned gifts from 500 loyal donors at a Northeast university" },
          { value: "50", label: "Confirmed planned gifts in that 500-donor program" },
        ]}
        stories={[
          {
            title: "PBS KVIE: a small shop builds a legacy pipeline",
            body: "We reviewed the database, selected loyal donors and called them to say thank you and identify planned giving interest. Our planned giving consultants then followed up to educate donors and discuss commitments. The program closed $4.62 million in planned gifts.",
            href: "/insights/case-studies/legacy-call-pbs-kvie",
          },
          {
            title: "A Northeast university: 500 donors, 50 confirmed gifts",
            body: "Of 500 loyal donors contacted, 116 expressed planned giving interest and 50 confirmed planned gifts totaling $4,894,000. We also identified another $328,500 in gift potential.",
            href: "/insights/case-studies/legacy-call-northeast-university",
          },
        ]}
      />
      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            What Clients Say
          </p>
          <div className="mt-8 space-y-12">
            {testimonialsFor("legacy-giving").map((t) => (
              <TestimonialQuote key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 lg:px-10">
        <LoyaltyCalloutCard note="Before you build a legacy program, find out how many loyal donors you actually have. Our free report card grades your legacy readiness, shows what a pool that size is worth on average, and tells you where to start. Estimates are welcome." />
      </section>

      <ServiceFaq heading="Planned giving questions." faqs={FAQS} />

      <WebinarCallout lead="Ready to start the gift annuity conversation with your loyal donors? Join our free live webinar with Endowment Partners." />
      <RelatedReading
        heading="Legacy and planned giving guidance."
        postSlugs={[
          "planned-giving-loyalty-jeff-grandy-first-day-podcast",
          "growing-your-legacy-society-why-arent-we-asking",
          "capital-campaign-donor-engagement-legacy-giving-best-practices",
          "national-make-a-will-month-planned-giving-conversation",
          "giving-usa-2026-record-giving-wealth-transfer",
        ]}
        pillars={["Planned Giving"]}
      />

      <CtaBand />
    </>
  );
}
