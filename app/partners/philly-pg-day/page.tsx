import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { PartnerSignup } from "@/components/partner-signup";
import { BOOKING_URL, getPartner } from "@/lib/partners";
import { POSTS } from "@/lib/posts";

const SLUG = "philly-pg-day";

export const metadata = {
  title: {
    absolute:
      "Legacy Giving as the Catalyst in Fundraising Strategies | Catapult Fundraising",
  },
  description:
    "Philadelphia Planned Giving Day resources from Gwen Paxon: download the slides and read Catapult's planned giving articles.",
  alternates: { canonical: "/partners/philly-pg-day" },
  openGraph: {
    title:
      "Legacy Giving as the Catalyst in Fundraising Strategies | Catapult Fundraising",
    description:
      "Philadelphia Planned Giving Day resources: download the slides and read our planned giving articles.",
    url: "https://www.catapultfr.com/partners/philly-pg-day",
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
  "growing-your-legacy-society-why-arent-we-asking",
  "national-make-a-will-month-planned-giving-conversation",
  "planned-giving-loyalty-jeff-grandy-first-day-podcast",
  "capital-campaign-donor-engagement-legacy-giving-best-practices",
  "giving-usa-2026-record-giving-wealth-transfer",
  "new-charitable-deduction-2026-donor-conversation",
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
        eyebrow="Philadelphia Planned Giving Day"
        title="Legacy Giving as the Catalyst"
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
          eventWord="session"
          readingList="Our planned giving and legacy giving articles, from legacy societies to the wealth transfer."
        />
      </section>
    </>
  );
}
