import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { PartnerSignup } from "@/components/partner-signup";
import { BOOKING_URL, getPartner } from "@/lib/partners";
import { latestPosts } from "@/lib/posts";

const SLUG = "wayne-olson";

export const metadata = {
  title: { absolute: "Free Fundraising Resources | Catapult Fundraising" },
  description: "Free access to Catapult Fundraising articles and planning tools.",
  robots: { index: false, follow: false },
};

const TOOLS = [
  { href: "/resources/gift-chart-calculator", title: "Gift Chart Calculator", description: "Build a gift range chart for any campaign goal and see how many prospects you need." },
  { href: "/resources/campaign-readiness-assessment", title: "Campaign Readiness Report Card", description: "Grade how ready your organization is for a capital campaign." },
  { href: "/resources/donor-loyalty-assessment", title: "Donor Loyalty Report Card", description: "See the legacy and mid-level potential hiding in your loyal donors." },
];

export default function Page() {
  const partner = getPartner(SLUG);
  if (!partner) notFound();
  const articles = latestPosts(9).map(({ slug, title, description, image, alt, readTime }) => ({ slug, title, description, image, alt, readTime }));
  return (
    <>
      <PageHero eyebrow={`Welcome, friends of ${partner.name}`} title="Free fundraising resources from Catapult" description={partner.intro} />
      <section className="bg-[rgb(var(--paper))] px-6 py-16 lg:py-20">
        <PartnerSignup partnerSlug={SLUG} partnerName={partner.name} bookingUrl={BOOKING_URL} articles={articles} tools={TOOLS} />
      </section>
    </>
  );
}
