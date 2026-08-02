import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieConsent } from "@/components/cookie-consent";
import { FIRM_PHONE, FIRM_EMAIL, FIRM_ADDRESS_LINES } from "@/lib/constants";

const SITE_URL = "https://www.catapultfr.com";
const OG_IMAGE = "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e656b128-f2e0-427e-a4c2-07e58fa6812e.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Catapult Fundraising | Capital Campaign and Donor Engagement Consultants",
    template: "%s | Catapult Fundraising",
  },
  description:
    "Catapult Fundraising guides nonprofits from feasibility study through public-phase calling, raising more from major donors, annual funds, and community campaigns. Based in Henderson, NV, serving clients nationwide.",
  keywords: [
    "capital campaign consultant",
    "nonprofit fundraising consultant",
    "donor calling program",
    "feasibility study nonprofit",
    "annual fund calling services",
    "mid-level donor engagement",
    "legacy and planned giving consultant",
    "Las Vegas fundraising consultant",
    "capital campaign counsel",
    "nonprofit consulting firm",
    "RNL",
    "Ruffalo Noel Levitz",
    "Telemarketing",
    "Phonathon",
    "The Phonathon",
    "Student Calling Program",
    "CCS Fundraising",
    "Grenzebach Glier",
    "Convergent Nonprofit Solutions",
    "M. Gale & Associates",
    "Beacon",
    "Gailerry",
    "Walsh & Associates",
    "Graham-Pelton",
    "Marts & Lundy",
    "Capital Campaign Pro",
    "DCM",
    "Telephone fundraising",
    "Major Gifts Consulting",
    "Capacity Building",
    "Mid Level Donor",
    "Veritus Group",
    "NextAfter",
    "Team Allegiance",
    "EAB",
    "Neon One",
    "We Are Moore",
    "Mission Wired",
    "Telefundraising",
    "Public Phase",
    "capital campaign consulting firm",
    "nonprofit capital campaign consultant",
    "capital campaign feasibility study",
    "capital campaign planning services",
    "capital campaign case for support",
    "capital campaign strategy consultant",
    "nonprofit fundraising consultant near me",
    "nonprofit phonathon services",
    "public phase calling campaign",
    "nonprofit calling campaign services",
    "alumni annual giving program",
    "donor participation rate consultant",
    "mid-level donor engagement program",
    "donor engagement officer program",
    "donor upgrade strategy",
    "major gift pipeline development",
    "donor cultivation consultant",
    "donor stewardship program",
    "capacity building fundraising",
    "board fundraising training",
    "major gift officer training",
    "donor segmentation strategy",
    "legacy giving consultant",
    "bequest program for nonprofits",
    "legacy call program",
    "deferred gift fundraising",
    "planned giving outreach services",
    "faith-based capital campaign consultant",
    "diocesan capital campaign consultant",
    "higher education capital campaign consultant",
    "hospital foundation fundraising consultant",
    "healthcare capital campaign consultant",
    "arts and culture fundraising consultant",
    "youth development fundraising consultant",
    "human services capital campaign",
    "Henderson NV nonprofit consultant",
    "Nevada capital campaign consultant",
    "New Jersey capital campaign consultant",
    "Texas nonprofit fundraising consultant",
    "Catapult Fundraising",
    "national capital campaign consultant",
    "nationwide nonprofit fundraising consultant",
    "national fundraising consulting firm",
    "moves management",
    "wealth screening",
    "donor pyramid",
    "gift table",
    "case for support",
    "silent phase capital campaign",
    "campaign readiness assessment",
    "campaign steering committee",
    "donor-advised fund",
    "charitable remainder trust",
    "charitable lead trust",
    "charitable gift annuity",
    "IRA charitable rollover",
    "qualified charitable distribution",
    "beneficiary designation gifts",
    "BWF",
    "Orr Group",
    "Alexander Haas",
    "Gail Perry Group",
    "Generis",
    "Donorly",
    "Blackbaud",
    "Bloomerang",
    "DonorPerfect",
    "Virtuous",
    "synagogue capital campaign",
    "Jewish federation campaign",
    "YMCA capital campaign",
    "library foundation capital campaign",
    "Scouting capital campaign",
    "performing arts center capital campaign",
    "capital campaign consultant cost",
    "capital campaign consultant fees",
    "hire a fundraising consultant",
    "capital campaign consultant RFP",
    "best capital campaign consultants",
  ],
  authors: [{ name: "Catapult Fundraising" }],
  creator: "Catapult Fundraising",
  publisher: "Catapult Fundraising",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Catapult Fundraising",
    title: "Catapult Fundraising | Capital Campaign and Donor Engagement Consultants",
    description:
      "Full-service capital campaign counsel, annual fund calling, mid-level donor engagement, and legacy giving, all from one accountable nonprofit fundraising partner.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Catapult Fundraising" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Catapult Fundraising | Capital Campaign and Donor Engagement Consultants",
    description:
      "Full-service capital campaign counsel, annual fund calling, mid-level donor engagement, and legacy giving, all from one accountable nonprofit fundraising partner.",
    images: [OG_IMAGE],
  },
  category: "business",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}/#organization`,
  name: "Catapult Fundraising",
  alternateName: "Catapult Fundraising Consulting",
  url: SITE_URL,
  logo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/42ba78de-233b-4e8c-9f6c-bbdd4f9ab4ff.png",
  image: OG_IMAGE,
  description:
    "Catapult Fundraising is a full-service fundraising consulting firm guiding nonprofits from feasibility study through public-phase calling, specializing in capital campaigns, annual fund calling, mid-level donor engagement, and legacy and planned giving.",
  telephone: FIRM_PHONE,
  email: FIRM_EMAIL,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${FIRM_ADDRESS_LINES[0]}, ${FIRM_ADDRESS_LINES[1]}`,
    addressLocality: "Henderson",
    addressRegion: "NV",
    postalCode: "89014",
    addressCountry: "US",
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  additionalLocations: [
    { "@type": "Place", address: { "@type": "PostalAddress", addressRegion: "NJ", addressCountry: "US" } },
    { "@type": "Place", address: { "@type": "PostalAddress", addressRegion: "TX", addressCountry: "US" } },
  ],
  priceRange: "$$$",
  // Real client testimonials shown on the homepage (components/testimonial-strip.tsx),
  // shared with client permission. Deliberately omits reviewRating/aggregateRating
  // since no client supplied an actual numeric star rating -- fabricating one would
  // violate Google's structured data guidelines for reviews.
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Bill LaBore" },
      reviewBody:
        "Loma Linda University Health has partnered with Catapult Fundraising for several years, and the results have consistently exceeded our expectations. Catapult has generated qualified leads that have developed into meaningful planned gifts, delivering a strong return on our investment. Maria Healy has been exceptional to work with, responsive, attentive, and highly professional. I highly recommend Catapult Fundraising for its professionalism, service, and proven results.",
      publisher: { "@type": "Organization", name: "Loma Linda University Health" },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Matthew Talley" },
      reviewBody:
        "Catapult Fundraising has been a fantastic partner in relaunching and growing UMGC's Annual Giving telemarketing program. Since restarting the program in FY24, their team's personalized approach has helped us steadily strengthen our annual fund by increasing both our average gift and pledge rate year over year. We're grateful for the partnership and look forward to continuing to grow this program together.",
      publisher: { "@type": "Organization", name: "University of Maryland Global Campus" },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Colleen Schulman, CFRE, CSPG" },
      reviewBody:
        "Legacy Call was a gamechanger for us. As a small shop, it helped us reach a much wider audience of planned giving donors, and the response was incredible: several new gifts and a full pool of new prospects.",
      publisher: { "@type": "Organization", name: "PBS KVIE" },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Christine Ann Stevens" },
      reviewBody:
        "Catapult's fractional officers seamlessly amplified our staff capacity. We grew our total donor households, increased funds raised from our mid-level base, and strengthened our major gifts pipeline. True partners, not just a vendor.",
      publisher: { "@type": "Organization", name: "Houston Symphony" },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Erica Kobbe" },
      reviewBody:
        "Catapult's multi-channel outreach, phone, text, and email woven into one plan, increased both donor participation and dollars raised. Their callers are exceptionally well-trained, authentic, and a true extension of our advancement team.",
      publisher: { "@type": "Organization", name: "Sacramento State University" },
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Fundraising Consulting Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Capital Campaign Counsel",
          url: `${SITE_URL}/services/capital-campaign`,
          description:
            "Feasibility studies, campaign planning, quiet-phase major gift strategy, and public-phase calling for nonprofit capital campaigns.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Legacy & Planned Giving",
          url: `${SITE_URL}/services/legacy-giving`,
          description:
            "Legacy Call identifies and closes bequests, beneficiary designations, and other deferred gifts from loyal, long-tenured donors.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Mid-Level Donor Engagement",
          url: `${SITE_URL}/services/donor-engagement`,
          description:
            "An 8-stage, relationship-first program that upgrades mid-level donors and builds a qualified major gift pipeline.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Annual Fund Calling",
          url: `${SITE_URL}/services/annual-fund`,
          description:
            "Trained Engagement Officers deliver segmented outreach, personalized asks, and digital stewardship for annual fund programs.",
        },
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[rgb(var(--paper))] text-[rgb(var(--ink))] antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
