export const SERVICE_LINKS = [
  { href: "/services/capital-campaign", label: "Capital Campaigns" },
  { href: "/services/feasibility-study", label: "Feasibility Studies" },
  { href: "/services/legacy-giving", label: "Legacy Giving" },
  { href: "/services/donor-engagement", label: "Donor Engagement" },
  { href: "/services/annual-fund", label: "Annual Fund Calling" },
];

export const CAMPAIGN_SECTOR_LINKS = [
  { href: "/services/capital-campaign/education", label: "Schools and Universities" },
  { href: "/services/capital-campaign/churches", label: "Churches and Faith Communities" },
  { href: "/services/capital-campaign/social-service", label: "Social Service Organizations" },
  { href: "/services/capital-campaign/healthcare", label: "Healthcare Organizations" },
];

// HubSpot meeting scheduler for Anthony. Used by the "Book a call" buttons.
export const MEETING_LINK = "https://go.catapultfr.com/meetings/anthonya";

// Catapult Shares, the single client access point. Clients enter their email
// and receive a one-time code, so there is nothing to configure on this site.
export const CLIENT_PORTAL_LINK = "https://catapultshares.com";

export const RESOURCE_LINKS = [
  { href: "/resources", label: "All Free Tools" },
  { href: "/resources/gift-chart-calculator", label: "Gift Chart Calculator" },
  { href: "/resources/campaign-readiness-assessment", label: "Campaign Readiness Report Card" },
  { href: "/resources/donor-loyalty-assessment", label: "Donor Loyalty and Legacy Report Card" },
];

// Desktop + mobile "Free Tools" menu. The same tools also stay listed under
// Insights (Resources) so visitors find them from either place.
export const FREE_TOOLS_LINKS = [
  { href: "/resources/gift-chart-calculator", label: "Gift Chart Calculator" },
  { href: "/resources/campaign-readiness-assessment", label: "Readiness Report Card" },
  { href: "/resources/donor-loyalty-assessment", label: "Donor Loyalty Report Card" },
  { href: "/resources", label: "All Free Tools" },
];

export const INSIGHTS_LINKS = [
  { href: "/blog", label: "Articles" },
  { href: "/insights/case-studies", label: "Case Studies" },
  { href: "/resources", label: "Free Fundraising Tools" },
  { href: "/resources/gift-chart-calculator", label: "Gift Chart Calculator" },
  { href: "/resources/campaign-readiness-assessment", label: "Readiness Report Card" },
  { href: "/resources/donor-loyalty-assessment", label: "Donor Loyalty Report Card" },
];

// Desktop header groups About and Our Team under one "About" menu so the row
// fits at 1024-1280px; NAV_LINKS stays the flat list the mobile menu uses.
export const ABOUT_LINKS = [
  { href: "/about", label: "About Catapult" },
  { href: "/our-team", label: "Our Team" },
];

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/our-team", label: "Our Team" },
];

export const FIRM_PHONE = "(702) 508-0101";
export const FIRM_PHONE_HREF = "+17025080101";
export const FIRM_EMAIL = "info@catapultfr.com";
export const FIRM_ADDRESS = "2551 N. Green Valley Parkway, Suite 202B, Henderson, NV 89014";
export const FIRM_ADDRESS_LINES = [
  "2551 N. Green Valley Parkway",
  "Suite 202B",
  "Henderson, NV 89014",
];

// Where new website leads (contact form submissions) are routed.
export const LEAD_EMAILS = ["anthonya@catapultfr.com", "jeffg@catapultfr.com"];

// Who is notified when someone completes a free tool (gift chart calculator,
// readiness report card, donor loyalty report card). See lib/tool-lead-email.ts.
export const TOOL_LEAD_EMAILS = ["anthonya@catapultfr.com", "jeffg@catapultfr.com"];

// HubSpot tracking script portal ID. Loaded only after a visitor accepts
// analytics cookies via the CookieConsent banner (see components/cookie-consent.tsx).
export const HUBSPOT_PORTAL_ID = "3043836";

// LinkedIn Insight Tag partner ID. Also gated behind cookie consent.
export const LINKEDIN_PARTNER_ID = "9688940";

// Google Analytics 4 Measurement ID. Also gated behind cookie consent.
export const GA4_MEASUREMENT_ID = "G-E2KGR5T6R1";

// Leadfeeder (Dealfront) visitor identification tracker ID. Also gated behind cookie consent.
export const LEADFEEDER_TRACKER_ID = "3P1w24d305B7mY5n";
