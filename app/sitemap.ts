import type { MetadataRoute } from "next";
import { ANSWERS } from "@/lib/answers";

const SITE_URL = "https://www.catapultfr.com";

const HIGH_PRIORITY_WEEKLY = new Set([
  "/services/capital-campaign",
  "/services/feasibility-study",
  "/services/capital-campaign/education",
  "/services/capital-campaign/churches",
  "/services/capital-campaign/social-service",
  "/services/capital-campaign/healthcare",
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
// signal. Every date below was pulled from this route's own page file's
// real git history (or the shared data file it renders from, for the
// dynamic /answers and case-study routes), not guessed. FALLBACK_DATE
// covers any future route added here without a matching entry -- update
// this map whenever a route's content actually changes rather than relying
// on the fallback.
const ROUTE_LAST_MODIFIED: Record<string, string> = {
  "": "2026-08-17",
  "/about": "2026-08-12",
  "/our-team": "2026-08-12",
  "/contact": "2026-08-03",
  "/results": "2026-08-12",
  "/services/capital-campaign": "2026-09-04",
  "/services/feasibility-study": "2026-09-04",
  "/services/capital-campaign/education": "2026-09-05",
  "/services/capital-campaign/churches": "2026-09-05",
  "/services/capital-campaign/social-service": "2026-09-05",
  "/services/capital-campaign/healthcare": "2026-09-05",
  "/services/legacy-giving": "2026-08-17",
  "/services/donor-engagement": "2026-08-17",
  "/services/annual-fund": "2026-08-17",
  "/insights": "2026-08-29",
  "/insights/case-studies": "2026-08-29",
  "/insights/case-studies/legacy-call-northeast-university": "2026-08-29",
  "/insights/case-studies/legacy-call-new-jersey-hospital": "2026-08-29",
  "/insights/case-studies/legacy-calls-hill-school": "2026-08-29",
  "/insights/case-studies/legacy-call-international-ministry": "2026-08-29",
  "/insights/case-studies/legacy-call-presidential-library": "2026-08-29",
  "/insights/case-studies/af-connect-special-olympics-indiana": "2026-08-29",
  "/blog": "2026-08-29",
  "/blog/why-a-feasibility-study-matters-before-a-capital-campaign": "2026-08-29",
  "/blog/giving-usa-2026-record-giving-wealth-transfer": "2026-08-29",
  "/blog/how-much-does-a-capital-campaign-cost": "2026-08-29",
  "/blog/capital-campaign-donor-engagement-legacy-giving-best-practices": "2026-08-12",
  "/blog/understanding-latino-philanthropy": "2026-08-29",
  "/blog/the-ask-ladder-structuring-a-major-gift-solicitation": "2026-08-29",
  "/blog/planning-a-capital-campaign-gift-chart-quiet-phase": "2026-08-29",
  "/blog/growing-your-legacy-society-why-arent-we-asking": "2026-08-29",
  "/blog/seven-touchpoints-donor-loyalty-between-asks": "2026-08-29",
  "/blog/key-steps-for-soliciting-major-donors": "2026-08-29",
  "/blog/how-to-effectively-use-the-phone-today": "2026-08-29",
  "/blog/multi-channel-fundraising-are-you-missing-the-mark": "2026-08-29",
  "/blog/the-state-of-fundraising-in-nevada": "2026-08-29",
  "/blog/catapult-vs-fundraising-consultants": "2026-08-12",
  "/blog/national-make-a-will-month-planned-giving-conversation": "2026-08-29",
  "/answers": "2026-08-29",
};

// Every /answers/[slug] page renders from the single shared lib/answers.ts
// data file, so they all share that file's own last-real-edit date rather
// than needing 31 separate entries above.
const ANSWERS_LAST_MODIFIED = "2026-08-29";

const FALLBACK_DATE = "2026-08-29";

function lastModifiedFor(route: string): Date {
  if (route.startsWith("/answers/")) return new Date(ANSWERS_LAST_MODIFIED);
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
    "/services/feasibility-study",
    "/services/capital-campaign/education",
    "/services/capital-campaign/churches",
    "/services/capital-campaign/social-service",
    "/services/capital-campaign/healthcare",
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
    "/blog/why-a-feasibility-study-matters-before-a-capital-campaign",
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
    "/blog/catapult-vs-fundraising-consultants",
    "/blog/national-make-a-will-month-planned-giving-conversation",
    // Answers hub + individual AEO question pages -- not linked from the
    // primary nav (see components/site-header.tsx / site-footer.tsx), but
    // fully indexable, so they still need to be listed here for search
    // engines and AI answer engines to discover them.
    "/answers",
    ...ANSWERS.map((a) => `/answers/${a.slug}`),
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
