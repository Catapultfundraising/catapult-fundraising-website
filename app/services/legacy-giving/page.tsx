import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { Landmark } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Legacy & Planned Giving Programs",
  description:
    "Catapult's Legacy Call program uncovers bequests, beneficiary designations, and other deferred gifts from your most loyal donors, the segment most capital campaigns never fully engage.",
  keywords: [
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
  alternates: { canonical: "/services/legacy-giving" },
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
    title: "Built to Extend Your Existing Team",
    description:
      "Our Gift Planning Specialists don't replace your development office. They extend it, confirming intentions your team is already working and surfacing new ones your team hasn't found yet.",
  },
];

const FAQS = [
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
      name: "Legacy & Planned Giving (Legacy Call)",
      serviceType: "Nonprofit planned giving and legacy gift program",
      url: `${SITE_URL}/services/legacy-giving`,
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
        { "@type": "ListItem", position: 2, name: "Legacy & Planned Giving", item: `${SITE_URL}/services/legacy-giving` },
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
        eyebrow="Legacy & Planned Giving"
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
      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            What Clients Say
          </p>
          <blockquote className="mt-8 space-y-5 font-display text-[25px] leading-snug text-[rgb(var(--navy))] text-balance">
            <p>
              &ldquo;Loma Linda University Health has partnered with Catapult Fundraising for
              several years, and the results have consistently exceeded our expectations. Catapult
              has generated qualified leads that have developed into meaningful planned gifts,
              delivering a strong return on our investment. Maria Healy has been exceptional to work
              with, responsive, attentive, and highly professional. She communicates with our team
              regularly and ensures that every detail is carefully managed and implemented.
            </p>
            <p>
              Our partnership has now expanded to include the scheduling of Zoom and
              face-to-face donor appointments, helping us deepen relationships with prospective
              donors and advance more meaningful conversations. I highly recommend Catapult
              Fundraising for its professionalism, service, and proven results.&rdquo;
            </p>
          </blockquote>
          <p className="mt-6 text-[17.5px] text-[rgb(var(--ink))]/60">
            <span className="font-semibold text-[rgb(var(--navy))]">Bill LaBore</span>
            <br />
            Director of Planned Giving, Loma Linda University Health | Philanthropy
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
