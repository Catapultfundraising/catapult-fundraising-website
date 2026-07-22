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
    "/blog",
    "/blog/catapult-vs-fundraising-consultants",
    "/blog/capital-campaign-donor-engagement-legacy-giving-best-practices",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
