import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { Landmark } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Legacy & Planned Giving Programs | Catapult Fundraising",
  description:
    "Catapult's Legacy Call program uncovers bequests, beneficiary designations, and other deferred gifts from your most loyal donors, the segment most capital campaigns never fully engage.",
  keywords: [
    "legacy giving consultant",
    "planned giving program",
    "Legacy Call",
    "bequest fundraising",
    "nonprofit planned giving",
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
      <CtaBand />
    </>
  );
}
