import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { Users2 } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Mid-Level Donor Engagement",
  description:
    "A multi-channel Donor Engagement program that upgrades mid-level donors, deepens retention, and builds a qualified major-gift pipeline.",
  keywords: [
    "mid-level donor engagement",
    "donor engagement officer program",
    "major gift pipeline",
    "donor upgrade program",
    "nonprofit donor retention",
    "mid-level donor engagement program",
    "donor upgrade strategy",
    "major gift pipeline development",
    "donor cultivation consultant",
    "donor stewardship program",
    "capacity building fundraising",
    "board fundraising training",
    "major gift officer training",
    "donor segmentation strategy",
    "donor participation rate consultant",
    "moves management",
    "wealth screening",
    "donor pyramid",
    "national donor engagement consultant",
  ],
  alternates: { canonical: "/services/donor-engagement" },
};

const SECTIONS = [
  {
    title: "Built for the Donors Between Annual Fund and Major Gifts",
    description:
      "Your mid-level donors are your most under-cultivated asset, too valuable for a form letter and not yet assigned to a major gift officer. Catapult's Donor Engagement program closes that gap with an 8-stage, multi-channel methodology that simulates a face-to-face relationship at scale.",
    bullets: [
      "Donor identification using wealth screening and giving-pattern analysis",
      "Donor list review and portfolio deconfliction with your team",
      "Personalized letter of introduction from your leadership",
      "An Engagement Officer assigned like a major-gift portfolio manager",
    ],
  },
  {
    title: "The 8-Stage Engagement Journey",
    description:
      "Every donor moves through a structured, relationship-first sequence designed to increase affinity before ever asking for the next gift.",
    bullets: [
      "1. Donor identification & prioritization",
      "2. Donor list review & approval",
      "3. Letter of introduction from leadership",
      "4. Area-of-impact conversation & qualification call",
      "5. Pre-call introductory letter previewing the ask",
      "6. Gift phase: the Engagement Officer cultivates and solicits",
      "7. Fulfillment, recognition & daily reporting",
      "8. Ongoing stewardship touchpoints (thank-you calls, special-occasion calls, digital voicemail, handwritten notes)",
    ],
  },
  {
    title: "Digital Layer Included",
    description:
      "Every engagement program is reinforced with modern touchpoints that keep pace with the donor's moment, not just the calendar.",
    bullets: [
      "Instant post-call emails tailored to pledge vs. non-pledge outcomes",
      "Personalized text messaging for solicitation and stewardship",
      "Monthly pledge-fulfillment statements with direct payment links",
      "Digital voicemail outreach before and after the ask",
      "Up to 15 differentiated engagement attempts per donor, matched to local caller ID",
    ],
  },
];

const FAQS = [
  {
    question: "What is mid-level donor engagement?",
    answer:
      "Mid-level donor engagement is a fundraising program for donors between annual fund and major gift status, too significant for a form letter but not yet assigned a major gift officer. Catapult's program assigns a dedicated Engagement Officer to build the relationship before asking for the next gift.",
  },
  {
    question: "How many stages does Catapult's Donor Engagement program have?",
    answer:
      "The program moves donors through 8 stages: identification and prioritization, list review and approval, a leadership introduction letter, a qualification call, a pre-call letter, the gift phase, fulfillment and reporting, and ongoing stewardship.",
  },
  {
    question: "What results does mid-level donor engagement typically produce?",
    answer:
      "Clients typically see 20-30% average gift growth at renewal and up to a 100% increase in meaningful donor engagement compared to mail-only outreach, while building a qualified pipeline of future major gift prospects.",
  },
  {
    question: "How is Donor Engagement different from assigning a major gift officer?",
    answer:
      "A major gift officer typically manages a portfolio of already-identified major donors. Catapult's Donor Engagement program works one tier below that, identifying and cultivating mid-level donors who aren't yet qualified for major gift portfolios, so your major gift team receives a pipeline of warmed, qualified prospects.",
  },
  {
    question: "How much does the Donor Engagement program cost?",
    answer:
      "Pricing depends on the size of the donor segment engaged, the number of Engagement Officer touchpoints, and program length. Catapult builds a customized proposal after reviewing your donor file and goals.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Mid-Level Donor Engagement",
      serviceType: "Nonprofit mid-level donor engagement program",
      url: `${SITE_URL}/services/donor-engagement`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description:
        "A multi-channel Donor Engagement program that upgrades mid-level donors, deepens retention, and builds a qualified major-gift pipeline.",
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
        { "@type": "ListItem", position: 2, name: "Mid-Level Donor Engagement", item: `${SITE_URL}/services/donor-engagement` },
      ],
    },
  ],
};

export default function DonorEngagementPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Mid-Level Donor Engagement"
        title="Turn your best-kept fundraising secret — mid-level donors — into your next major gift pipeline."
        description="A dedicated Engagement Officer treats every qualifying donor like a portfolio assignment, building the relationship before the ask and reporting results daily."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/f814dca4-4b83-4023-925a-9a7274bbf2d2.jpeg"
      />
      <ServiceDetail
        heroImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e7459f00-18d5-4f0b-b9ee-658a617fb8e3.png"
        heroImageAlt="Illustration of a donor upgrade funnel moving mid-level donors toward major gift status"
        sections={SECTIONS}
        sidebarTitle="Program Benefits"
        sidebarIcon={Users2}
        sidebarItems={[
          "Increased donor engagement and retention",
          "A qualified, growing major-gift pipeline",
          "Cost-effective, scalable relationship building",
          "Daily reporting through an online portal",
          "Flexible, phased engagement design",
        ]}
      />
      <CtaBand />
    </>
  );
}
