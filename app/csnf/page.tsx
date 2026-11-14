import type { Metadata } from "next";
import CsnfCampaignPage from "@/components/csnf-campaign-page";

// Resource-only case and FAQ destination linked from the separate online survey.
// /csnfvip keeps its existing interview invitation and scheduling experience.
// Unlisted: noindex/nofollow, robots disallow, absent from sitemap/navigation.
export const metadata: Metadata = {
  title: { absolute: "CSN Northwest Campus Campaign | CSN Foundation" },
  description:
    "Learn about the College of Southern Nevada Northwest Campus and the CSN Foundation's $10 million philanthropic campaign.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "https://www.catapultfr.com/csnf" },
};

export default function Page() {
  return <CsnfCampaignPage resourceOnly />;
}
