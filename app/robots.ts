import type { MetadataRoute } from "next";

const SITE_URL = "https://www.catapultfr.com";

// Password-gated internal tools (see middleware.ts) -- disallowed here in
// addition to each page's own noindex meta tag. Note the noindex tag is
// still the primary mechanism keeping these out of search results: if a
// crawler already indexed a URL from an external link, blocking it here
// stops the tag from ever being (re)read, so this is a belt-and-suspenders
// addition on top of the noindex tags in app/research/layout.tsx,
// app/assets/layout.tsx, and app/jag-dashboard/layout.tsx, not a substitute
// for them.
const DISALLOWED_INTERNAL_TOOLS = ["/research", "/assets", "/jag-dashboard", "/jag-admin"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_INTERNAL_TOOLS,
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "ClaudeBot",
          "anthropic-ai",
          "PerplexityBot",
          "CCBot",
          "Applebot-Extended",
        ],
        allow: "/",
        disallow: DISALLOWED_INTERNAL_TOOLS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
