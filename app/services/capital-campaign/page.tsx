import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { ClipboardList } from "lucide-react";

export const metadata = {
  title: "Capital Campaign Counsel | Catapult Fundraising",
  description:
    "Feasibility studies, campaign planning, quiet-phase major gift strategy, and public-phase calling, with one accountable partner from start to finish.",
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
      "Finalizing case statements, pledge materials, and campaign collateral",
      "Recruiting and training the Campaign Committee",
      "Building the detailed campaign timeline, budget, and gift table",
    ],
  },
  {
    title: "Quiet Phase: Major Gift Solicitation",
    description:
      "Over a typical 18-24 month runway, we work alongside your Campaign Chair and Steering Committee to identify and solicit major gifts from individuals, foundations, and corporations, securing the majority of the campaign goal before the public announcement.",
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

export default function CapitalCampaignPage() {
  return (
    <>
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
