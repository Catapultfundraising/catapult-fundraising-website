import { PageHero } from "@/components/page-hero";
import { SubmitToHubspotForm } from "@/components/submit-to-hubspot-form";

export const metadata = {
  title: "Submit (HubSpot Test) | Catapult Fundraising",
  description: "Test page: submissions from this form are sent directly into HubSpot as contacts.",
  robots: { index: false, follow: false },
};

export default function SubmitPage() {
  return (
    <>
      <PageHero
        eyebrow="Test Page — HubSpot Integration"
        title="Tell us about your donor base and case for support."
        description="This is a test version of our intake form. Submissions here are sent directly into HubSpot as contact records, instead of by email."
      />
      <section className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-16">
        <SubmitToHubspotForm />
      </section>
    </>
  );
}
