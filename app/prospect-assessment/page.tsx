import { PageHero } from "@/components/page-hero";
import { ProspectAssessmentForm } from "@/components/prospect-assessment-form";

export const metadata = {
  title: "Prospect Research Intake | Catapult Fundraising",
  description:
    "Share your organization's donor data, case for support, and prior solicitation history with Catapult Fundraising.",
  robots: { index: false, follow: false },
};

export default function ProspectAssessmentPage() {
  return (
    <>
      <PageHero
        eyebrow="Prospect Research Intake"
        title="Tell us about your donor base and case for support."
        description="This information helps our team scope your feasibility study and prospect research with precision. It takes about ten minutes to complete."
      />
      <section className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-16">
        <ProspectAssessmentForm />
      </section>
    </>
  );
}
