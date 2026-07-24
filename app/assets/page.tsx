import { PageHero } from "@/components/page-hero";
import { SignatureGeneratorForm } from "@/components/signature-generator-form";
import { BrandResources } from "@/components/brand-resources";
import { OneSheets } from "@/components/one-sheets";

export const metadata = {
  title: "Brand Assets & Tools | Catapult Fundraising",
  description:
    "Internal hub for the Catapult Fundraising team: build your email signature, download brand fonts, logo files, letterhead, and social banners, and grab print-ready one-sheets for every conversation.",
  robots: { index: false, follow: false },
};

export default function AssetsPage() {
  return (
    <>
      <PageHero
        eyebrow="Internal Tool"
        title="Your brand assets, all in one place."
        description="Build your email signature, download brand fonts, logos, letterhead, and social banners, and grab print-ready one-sheets for every conversation, all from a single page."
      />
      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-16">
        <SignatureGeneratorForm />
        <BrandResources />
        <OneSheets />
      </section>
    </>
  );
}
