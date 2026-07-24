import { PageHero } from "@/components/page-hero";
import { SignatureGeneratorForm } from "@/components/signature-generator-form";
import { BrandResources } from "@/components/brand-resources";
import { OneSheets } from "@/components/one-sheets";

export const metadata = {
  title: "Email Signature Generator | Catapult Fundraising",
  description: "Generate your Catapult Fundraising email signature for Outlook.",
  robots: { index: false, follow: false },
};

export default function SignatureGeneratorPage() {
  return (
    <>
      <PageHero
        eyebrow="Internal Tool"
        title="Build your email signature."
        description="Fill in your information below, copy the result, and paste it directly into Outlook's signature editor. No code required."
      />
      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-16">
        <SignatureGeneratorForm />
        <BrandResources />
        <OneSheets />
      </section>
    </>
  );
}
