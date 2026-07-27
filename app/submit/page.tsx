import { PageHero } from "@/components/page-hero";
import { SubmitToHubspotForm } from "@/components/submit-to-hubspot-form";

export const metadata = {
  title: "Partner Intake | Catapult Fundraising",
  description:
    "Share information about your organization, donor base, and case for support so our team can follow up on a potential partnership.",
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <>
      <PageHero
        eyebrow="Partner With Us"
        title="Tell us about your donor base and case for support."
        description="Share some information about your organization, donor giving history, and fundraising goals below. Our team reviews every submission personally and will follow up to discuss next steps."
      />
      <section className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-16">
        <SubmitToHubspotForm />
      </section>
    </>
  );
}
