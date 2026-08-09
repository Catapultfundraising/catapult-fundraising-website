import type { MetadataRoute } from "next";

const SITE_URL = "https://www.catapultfr.com";

const HIGH_PRIORITY_WEEKLY = new Set([
  "/services/capital-campaign",
  "/services/legacy-giving",
  "/services/donor-engagement",
  "/services/annual-fund",
]);

const SUPPORTING_MONTHLY = new Set(["/about", "/our-team", "/contact", "/results"]);

function priorityFor(route: string): number {
  if (route === "") return 1;
  if (HIGH_PRIORITY_WEEKLY.has(route)) return 0.9;
  if (SUPPORTING_MONTHLY.has(route)) return 0.8;
  if (route === "/insights" || route === "/blog" || route === "/insights/case-studies") return 0.7;
  return 0.6;
}

function frequencyFor(route: string): "weekly" | "monthly" {
  if (route === "" || HIGH_PRIORITY_WEEKLY.has(route)) return "weekly";
  return "monthly";
}

// Real last-edited dates per route, instead of stamping every URL with the
// current build time. A sitemap where every page always says "modified
// today" is a well-known freshness-signal red flag that search engines
// increasingly discount -- accurate dates are a stronger, more trustworthy
// signal. FALLBACK_DATE covers older pages that predate this dating system;
// update an entry here whenever that page's content actually changes.
const ROUTE_LAST_MODIFIED: Record<string, string> = {
  "": "2026-08-02",
  "/about": "2026-08-02",
  "/our-team": "2026-08-02",
  "/contact": "2026-08-02",
  "/blog/capital-campaign-donor-engagement-legacy-giving-best-practices": "2026-07-22",
  "/blog/giving-usa-2026-record-giving-wealth-transfer": "2026-07-25",
};

const FALLBACK_DATE = "2026-07-22";

function lastModifiedFor(route: string): Date {
  return new Date(ROUTE_LAST_MODIFIED[route] ?? FALLBACK_DATE);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/about",
    "/our-team",
    "/contact",
    "/results",
    "/services/capital-campaign",
    "/services/legacy-giving",
    "/services/donor-engagement",
    "/services/annual-fund",
    "/insights",
    "/insights/case-studies",
    "/insights/case-studies/legacy-call-northeast-university",
    "/insights/case-studies/legacy-call-new-jersey-hospital",
    "/insights/case-studies/legacy-calls-hill-school",
    "/insights/case-studies/legacy-call-international-ministry",
    "/insights/case-studies/legacy-call-presidential-library",
    "/insights/case-studies/af-connect-special-olympics-indiana",
    "/blog",
    "/blog/giving-usa-2026-record-giving-wealth-transfer",
    "/blog/how-much-does-a-capital-campaign-cost",
    "/blog/capital-campaign-donor-engagement-legacy-giving-best-practices",
    "/blog/understanding-latino-philanthropy",
    "/blog/the-ask-ladder-structuring-a-major-gift-solicitation",
    "/blog/planning-a-capital-campaign-gift-chart-quiet-phase",
    "/blog/growing-your-legacy-society-why-arent-we-asking",
    "/blog/seven-touchpoints-donor-loyalty-between-asks",
    "/blog/key-steps-for-soliciting-major-donors",
    "/blog/how-to-effectively-use-the-phone-today",
    "/blog/multi-channel-fundraising-are-you-missing-the-mark",
    "/blog/the-state-of-fundraising-in-nevada",
    // NOTE: /resources/associations is intentionally excluded here. That page
    // sets `robots: { index: false, follow: false }` (it's an internal
    // reference list, not a public SEO page), so listing it in the sitemap
    // sends Google a contradictory signal and shows up in Search Console as
    // "Excluded by noindex tag." A noindex page should never appear in the
    // sitemap. The route itself still resolves at /resources/associations;
    // it just isn't submitted for indexing.
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: lastModifiedFor(route),
    changeFrequency: frequencyFor(route),
    priority: priorityFor(route),
  }));
}
