"use client";
import { PortalV2Provider, CampaignDonors } from "@/components/portal-v2";

export function GiftEditDemo() {
  return <PortalV2Provider client="wcbhc"><CampaignDonors /></PortalV2Provider>;
}
