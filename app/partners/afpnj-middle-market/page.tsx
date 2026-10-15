import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { PartnerSignup } from "@/components/partner-signup";
import { BOOKING_URL, getPartner } from "@/lib/partners";
import { POSTS } from "@/lib/posts";

const SLUG = "afpnj-middle-market";

export const metadata = {
  title: {
    absolute:
      "Unlocking the Middle: How to Build a High-Performing Mid-Level Donor Program | Catapult Fundraising",
  },
  description:
    "AFP-NJ webinar resources for Unlocking the Middle: How to Build a High-Performing Mid-Level Donor Program. Download the slides and explore free tools and practical fundraising articles.",
  alternates: { canonical: "/partners/afpnj-middle-market" },
  openGraph: {
    title:
      "Unlocking the Middle: How to Build a High-Performing Mid-Level Donor Program | Catapult Fundraising",
    description:
      "AFP-NJ webinar resources: download the slides, explore free tools, and read practical fundraising articles.",
    url: "https://www.catapultfr.com/partners/afpnj-middle-market",
  },
  robots: { index: false, follow: false },
};

const TOOLS = [
  {
    href: "/resources/donor-loyalty-assessment",
    title: "Donor Loyalty and Legacy Report Card",
    description:
      "Assess your legacy-giving readiness and mid-level donor engagement, then see which program to start with.",
  },
  {
    href: "/resources/campaign-readiness-assessment",
    title: "Campaign Readiness Report Card",
    description:
      "See where your organization is ready for a campaign and what needs attention first.",
  },
  {
    href: "/resources/gift-chart-calculator",
    title: "Gift Chart Calculator",
    description:
      "Build a suggested gift chart and prospect pyramid for your campaign goal.",
  },
];

const ARTICLE_SLUGS = [
  "seven-touchpoints-donor-loyalty-between-asks",
  "annual-fund-donor-relationships-lasting-philanthropy",
  "growing-your-legacy-society-why-arent-we-asking",
  "planned-giving-loyalty-jeff-grandy-first-day-podcast",
];

export default function Page() {
  const partner = getPartner(SLUG);
  if (!partner) notFound();
  const articles = POSTS.filter((post) => ARTICLE_SLUGS.includes(post.slug)).map(
    ({ slug, title, description, image, alt, readTime }) => ({
      slug,
      title,
      description,
      image,
      alt,
      readTime,
    }),
  );

  return (
    <>
      <PageHero
        eyebrow="AFP-NJ Webinar Follow-Up"
        title="Unlocking the Middle"
        description={partner.intro}
      />
      <section className="bg-[rgb(var(--paper))] px-6 py-16 lg:py-20">
        <PartnerSignup
          partnerSlug={SLUG}
          partnerName={partner.name}
          bookingUrl={BOOKING_URL}
          articles={articles}
          tools={TOOLS}
          serviceChoices={partner.serviceChoices}
          deck={partner.deck}
        />
      </section>
    </>
  );
}
