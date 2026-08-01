import { ResearchProfileForm } from "@/components/research-profile-form";

export const metadata = {
  title: "Prospect Research Profile Builder | Catapult Fundraising",
  robots: { index: false, follow: false },
};

export default function ResearchNewPage() {
  return <ResearchProfileForm />;
}
