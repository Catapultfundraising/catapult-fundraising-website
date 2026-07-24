import type { MetadataRoute } from "next";

const SITE_URL = "https://www.catapultfr.com";

const HIGH_PRIORITY_WEEKLY = new Set([
  "/services/capital-campaign",
  "/services/legacy-giving",
  "/services/donor-engagement",
  "/services/annual-fund",
]);

const SUPPORTING_MONTHLY = new Set(["/about", "/contact", "/results"]);

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

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/about",
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
    "/blog/capital-campaign-donor-engagement-legacy-giving-best-practices",
    "/blog/understanding-latino-philanthropy",
    "/blog/the-ask-ladder-structuring-a-major-gift-solicitation",
    "/blog/planning-a-capital-campaign-gift-chart-quiet-phase",
    "/blog/growing-your-legacy-society-why-arent-we-asking",
    "/blog/seven-touchpoints-donor-loyalty-between-asks",
    "/blog/key-steps-for-soliciting-major-donors",
    "/blog/how-to-effectively-use-the-phone-today",
    "/blog/multi-channel-fundraising-are-you-missing-the-mark",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: frequencyFor(route),
    priority: priorityFor(route),
  }));
}
