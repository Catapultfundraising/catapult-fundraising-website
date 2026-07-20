import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FIRM_PHONE, FIRM_EMAIL, FIRM_ADDRESS_LINES } from "@/lib/constants";

const SITE_URL = "https://www.catapultfr.com";
const OG_IMAGE = "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e656b128-f2e0-427e-a4c2-07e58fa6812e.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Catapult Fundraising | Capital Campaign & Donor Calling Consultants",
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
    title: "Catapult Fundraising | Capital Campaign & Donor Calling Consultants",
    description:
      "Full-service capital campaign counsel, annual fund calling, mid-level donor engagement, and legacy giving, all from one accountable nonprofit fundraising partner.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Catapult Fundraising" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Catapult Fundraising | Capital Campaign & Donor Calling Consultants",
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
  logo: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3b507e74-308f-4ba5-aaac-554b31247f7e.png",
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
      </body>
    </html>
  );
}
