import type { MetadataRoute } from "next";

const SITE_URL = "https://www.catapultfr.com";

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
    "/blog",
    "/blog/catapult-vs-fundraising-consultants",
    "/blog/capital-campaign-donor-engagement-legacy-giving-best-practices",
    "/blog/key-steps-for-soliciting-major-donors",
    "/blog/how-to-effectively-use-the-phone-today",
    "/blog/multi-channel-fundraising-are-you-missing-the-mark",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
