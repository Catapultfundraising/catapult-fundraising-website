import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { PhoneCall } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Annual Fund Calling Services (AF Connect) | Catapult Fundraising",
  description:
    "High-end annual fund calling that treats every donor like a major gift prospect, with segmented outreach, personalized ask amounts, and digital stewardship included.",
  keywords: [
    "annual fund calling services",
    "AF Connect",
    "donor calling program",
    "nonprofit phonathon",
    "annual fund consultant",
  ],
  alternates: { canonical: "/services/annual-fund" },
};

const SECTIONS = [
  {
    title: "AF Connect: High-End Annual Fund Calling",
    description:
      "Catapult is the only firm that takes a step back and asks: what would we do if this were a face-to-face solicitation? We apply that standard to every call, treating each prospective donor as if they were a major gift prospect, because someday, many of them will be.",
    bullets: [
      "Engagement Officers trained on-site to understand your mission and case",
      "State-of-the-art conferencing and call monitoring",
      "On-site visits to our calling center for your team's training",
    ],
  },
  {
    title: "Keys to Achieving Success",
    description:
      "Results come from preparation, not volume. Our process combines database precision with a donor-centered script and follow-through.",
    bullets: [
      "Research, cleanup, and management of donor databases",
      "Segmentation by giving history and interest group",
      "Personalized pre- and post-call letters and emails",
      "Individualized ask amounts based on five-year giving history",
      "3–15+ differentiated calling attempts to saturate the base",
      "Thank-you letters sent within 24–48 hours of contact",
      "Fulfillment services to maximize collection of pledged dollars",
    ],
  },
  {
    title: "Digital Enhancements — Included",
    description:
      "Every AF Connect program includes digital stewardship at no additional fee, layering modern touchpoints on top of the phone conversation.",
    bullets: [
      "Text message solicitation, stewardship, and thank-yous",
      "Ringless voicemail for reminders and special announcements",
      "Email solicitations and thank-you sequences",
      "Social media strategy and retargeting",
      "Crowdfunding support",
    ],
  },
];

const FAQS = [
  {
    question: "What is AF Connect?",
    answer:
      "AF Connect is Catapult's high-end annual fund calling program. It combines mission-trained Engagement Officers, donor database segmentation, personalized ask amounts, and digital stewardship (text, email, ringless voicemail, and social) at no additional fee.",
  },
  {
    question: "How many times will a donor be contacted?",
    answer:
      "AF Connect uses 3 to 15 or more differentiated calling attempts per donor, paired with personalized pre- and post-call letters and emails, to reach and steward each prospect appropriately.",
  },
  {
    question: "How quickly are donors thanked after giving?",
    answer:
      "Thank-you letters are sent within 24–48 hours of contact, and fulfillment services help maximize collection of pledged dollars.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Annual Fund Calling (AF Connect)",
      serviceType: "Nonprofit annual fund calling program",
      url: `${SITE_URL}/services/annual-fund`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description:
        "High-end annual fund calling that treats every donor like a major gift prospect, with segmented outreach, personalized ask amounts, and digital stewardship included.",
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
        { "@type": "ListItem", position: 2, name: "Annual Fund Calling", item: `${SITE_URL}/services/annual-fund` },
      ],
    },
  ],
};

export default function AnnualFundPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Annual Fund Calling"
        title="Every donor deserves a face-to-face-quality conversation — even on the phone."
        description="AF Connect combines trained Engagement Officers, donor segmentation, and digital stewardship into one program designed to upgrade donors, re-engage lapsed givers, and acquire new ones."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/513c85b8-7588-44b1-9dcb-41e3cf4f486e.jpeg"
      />
      <ServiceDetail
        sections={SECTIONS}
        sidebarTitle="Program Includes"
        sidebarIcon={PhoneCall}
        sidebarItems={[
          "Mission-trained, monitored Engagement Officers",
          "Database segmentation & prospect research",
          "Personalized ask amounts per donor",
          "Text, voicemail, email & social stewardship",
        ]}
      />
      <CtaBand />
    </>
  );
}
