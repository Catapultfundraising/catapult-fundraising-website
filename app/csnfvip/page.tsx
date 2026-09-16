import type { Metadata } from "next";
import CsnfCampaignPage from "@/components/csnf-campaign-page";

// CSN Foundation Northwest Campus campaign page (tier 1 interview list).
// Layout and copy live in components/csnf-campaign-page.tsx, shared with
// /csnf. Only the Calendly scheduling link differs between the two.
// Deliberately NOT indexed: noindex/nofollow below, disallowed in
// app/robots.ts, absent from app/sitemap.ts and all navigation.

export const metadata: Metadata = {
  title: { absolute: "CSN Northwest Campus Campaign | CSN Foundation" },
  description:
    "Learn about the College of Southern Nevada Northwest Campus and the CSN Foundation's $10 million philanthropic campaign before your feasibility study interview.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "https://www.catapultfr.com/csnfvip" },
};

export default function Page() {
  return (
    <CsnfCampaignPage schedulingLink="https://calendly.com/catapultfr/csnf-tier-1-interview" />
  );
}
