import type { Metadata } from "next";
import { CampaignPlatformPreview } from "@/components/campaign-platform-preview";

// Internal preview of the DIY campaign platform slice. Fictional/sample data only; nothing is stored on a server.
export const metadata: Metadata = {
  title: { absolute: "Campaign Platform Preview (internal)" },
  robots: { index: false, follow: false },
};
export default function Page() { return <CampaignPlatformPreview />; }
