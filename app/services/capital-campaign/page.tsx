import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { ClipboardList } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Capital Campaign Counsel | Catapult Fundraising",
  description:
    "Feasibility studies, campaign planning, quiet-phase major gift strategy, and public-phase calling, with one accountable partner from start to finish.",
  keywords: [
    "capital campaign consultant",
    "capital campaign counsel",
    "feasibility study nonprofit",
    "campaign planning phase",
    "quiet phase fundraising",
    "public phase calling",
  ],
  alternates: { canonical: "/services/capital-campaign" },
};

const SECTIONS = [
  {
    title: "Planning: Feasibility Study & Case Development",
    description:
      "Every strong campaign starts with an honest read of the field. We interview board members, staff, and top prospects to pressure-test the goal, then help you write the case statement, build the campaign budget, and assemble the gift table.",
    bullets: [
      "Feasibility or planning study to confirm the campaign dollar goal",
      "Case statement, budget, and project prioritization",
      "Recruitment of a Campaign Chair and Steering Committee",
      "Development assessment of current staffing and systems",
    ],
  },
  {
    title: "Campaign Planning",
    description:
      "With the feasibility findings confirmed, we turn strategy into an execution-ready blueprint. Over a focused 3-6 month runway, we prioritize prospect data, finalize campaign materials, and build the committee structure the quiet phase will run on.",
    bullets: [
      "Prospect data review and prioritization",
      "Drafting and finalizing campaign materials and collateral",
      "Recruiting and training the Campaign Committee",
      "Building the detailed campaign timeline, budget, and gift table",
    ],
  },
  {
    title: "Quiet Phase: Major Gift Solicitation",
    description:
      "Over a typical 24-36 month runway, we work alongside your Campaign Chair and Steering Committee to identify and solicit major gifts from individuals, foundations, and corporations, securing the majority of the campaign goal before the public announcement.",
  },
  {
    title: "Campaign Connect: Public or Community Phase",
    description:
      "Catapult is the industry leader in this phase: the only firm that treats public-phase calling as a campaign discipline, not an afterthought. We reach your core constituencies (alumni, parents, grateful patients, members, subscribers) to raise 10-20% of the goal while dramatically expanding your donor base.",
    bullets: [
      "Experienced, client-trained Engagement Officers who bond prospects to the mission",
      "Database managers using prospect research to set personalized ask amounts",
      "Staff writers preparing solicitation emails, letters, and calling scripts",
    ],
  },
];

const FAQS = [
  {
    question: "What is a nonprofit capital campaign?",
    answer:
      "A capital campaign is a structured, time-bound fundraising effort to raise a specific dollar goal, typically for a building project, endowment, or major program. Catapult runs campaigns through five phases: Feasibility Study, Campaign Planning, Quiet Phase, Campaign Connect (public phase), and stewardship.",
  },
  {
    question: "How long does a capital campaign quiet phase take?",
    answer:
      "The quiet phase, when major gifts are solicited from individuals, foundations, and corporations, typically runs 24-36 months before public-phase calling begins.",
  },
  {
    question: "What happens during the Campaign Planning phase?",
    answer:
      "Campaign Planning is the second phase of a Catapult capital campaign, typically lasting 3-6 months. It includes prospect data prioritization, drafting and finalizing campaign materials and collateral, and recruiting and training the Campaign Committee, among other preparation tasks, before the quiet phase begins.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Capital Campaign Counsel",
      serviceType: "Nonprofit capital campaign consulting",
      url: `${SITE_URL}/services/capital-campaign`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description:
        "Feasibility studies, campaign planning, quiet-phase major gift strategy, and public-phase calling, with one accountable partner from start to finish.",
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
        { "@type": "ListItem", position: 2, name: "Capital Campaign Counsel", item: `${SITE_URL}/services/capital-campaign` },
      ],
    },
  ],
};

export default function CapitalCampaignPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Capital Campaign Services"
        title="The full-service firm that carries your campaign from first feasibility call to final pledge."
        description="Catapult is the only national firm that plans your capital campaign from the earliest quiet-phase strategy through a professionally staffed public-phase calling program, wrapping every campaign in one accountable partner instead of three vendors."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/62ebe036-cc54-4a61-8952-61060ecd662c.jpeg"
      />
      <ServiceDetail
        sections={SECTIONS}
        sidebarTitle="What You Get"
        sidebarIcon={ClipboardList}
        sidebarItems={[
          "A single point of accountability across every campaign phase",
          "Board-ready feasibility findings and campaign plan",
          "Trained, monitored Engagement Officers for the public phase",
          "Weekly progress reporting against the gift table",
        ]}
      />
      <CtaBand />
    </>
  );
}
