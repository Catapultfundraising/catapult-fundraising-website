import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { Users2 } from "lucide-react";

export const metadata = {
  title: "Mid-Level Donor Engagement | Catapult Fundraising",
  description:
    "A multi-channel Donor Engagement program that upgrades mid-level donors, deepens retention, and builds a qualified major-gift pipeline.",
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

export default function DonorEngagementPage() {
  return (
    <>
      <PageHero
        eyebrow="Mid-Level Donor Engagement"
        title="Turn your best-kept fundraising secret — mid-level donors — into your next major gift pipeline."
        description="A dedicated Engagement Officer treats every qualifying donor like a portfolio assignment, building the relationship before the ask and reporting results daily."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/f814dca4-4b83-4023-925a-9a7274bbf2d2.jpeg"
      />
      <ServiceDetail
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
