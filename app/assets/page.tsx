import { PageHero } from "@/components/page-hero";
import { SignatureGeneratorForm } from "@/components/signature-generator-form";
import { BusinessCardGeneratorForm } from "@/components/business-card-generator-form";
import { BrandResources } from "@/components/brand-resources";
import { BrandColors } from "@/components/brand-colors";
import { OneSheets } from "@/components/one-sheets";
import { SocialKit } from "@/components/social-kit";
import { VirtualBackgrounds } from "@/components/virtual-backgrounds";

export const metadata = {
  title: "Brand Assets & Tools | Catapult Fundraising",
  description:
    "Internal hub for the Catapult Fundraising team: build your email signature, generate a print-ready business card PDF, download brand fonts, logo files, letterhead, and social banners, grab print-ready one-sheets, get ready-to-post social media content, and download our virtual meeting background.",
  robots: { index: false, follow: false },
};

export default function AssetsPage() {
  return (
    <>
      <PageHero
        eyebrow="Internal Tool"
        title="Your brand assets, all in one place."
        description="Build your email signature, generate a print-ready business card, download brand fonts, logos, letterhead, and social banners, grab print-ready one-sheets, get ready-to-post social media content, and download your Teams/Zoom background, all from a single page."
      />
      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-16">
        <SignatureGeneratorForm />
        <BusinessCardGeneratorForm />
        <BrandResources />
        <BrandColors />
        <VirtualBackgrounds />
        <OneSheets />
        <SocialKit />
      </section>
    </>
  );
}
