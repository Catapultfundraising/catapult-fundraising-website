import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { Landmark } from "lucide-react";

export const metadata = {
  title: "Legacy & Planned Giving Programs | Catapult Fundraising",
  description:
    "Catapult's Legacy Call program uncovers bequests, beneficiary designations, and other deferred gifts from your most loyal donors, the segment most capital campaigns never fully engage.",
};

const SECTIONS = [
  {
    title: "The Untapped Gift Behind Every Loyal Donor",
    description:
      "Planned giving prospects rarely make large outright gifts, but their loyalty often translates into deferred commitments worth 200–300 times their largest annual gift. Legacy Call is Catapult's full-service, two-tier methodology for identifying and closing bequests, beneficiary designations, life-income gifts, and other planned commitments.",
    bullets: [
      "41% of planned giving donors give 10+ consecutive years to the organizations they value",
      "Tier 1 qualifying calls reach 60–70% of prospects, with 10–15% positive response",
      "Tier 2 gift-planning follow-up closes 25–32% of qualified leads",
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

export default function LegacyGivingPage() {
  return (
    <>
      <PageHero
        eyebrow="Legacy & Planned Giving"
        title="Your most loyal donors are ready for a legacy conversation. Legacy Call finds them."
        description="A full-service, two-tier planned giving methodology, not a single survey, that uncovers bequests and deferred gifts most capital campaigns leave on the table."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e6d5927c-17e7-4f71-93d5-86fdf9bbdae6.jpeg"
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
