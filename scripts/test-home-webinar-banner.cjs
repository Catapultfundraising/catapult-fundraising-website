const assert = require("node:assert/strict");
const fs = require("node:fs");

const home = fs.readFileSync("app/page.tsx", "utf8");
const layout = fs.readFileSync("app/layout.tsx", "utf8");
const component = fs.readFileSync("components/home-webinar-banner.tsx", "utf8");
const banner = component.match(/<aside aria-label="2027 webinar series"[\s\S]*?<\/aside>/)?.[0];
assert.ok(banner, "Homepage must include the named webinar announcement");
assert.ok(layout.indexOf("<HomeWebinarBanner />") > -1, "Layout must mount the homepage announcement");
assert.ok(layout.indexOf("<HomeWebinarBanner />") < layout.indexOf("<SiteHeader />"), "Announcement must be at the very top above navigation");
assert.ok(layout.indexOf("<HomeWebinarBanner />") < layout.indexOf("<main>"), "Announcement must not sit inside the page below navigation");
assert.ok(component.includes('if (pathname !== "/") return null;'), "Announcement must render only on the homepage");
assert.ok(!home.includes('aria-label="2027 webinar series"') && !home.includes("<HomeWebinarBanner"), "Do not duplicate the announcement below the navigation");
for (const copy of ["Free 2027 Webinar Series", "Begins in January", "View the series &amp; register"]) {
  assert.ok(banner.includes(copy), `Announcement must include: ${copy}`);
}
assert.equal((banner.match(/href="/g) || []).length, 1, "Announcement has one clear CTA");
assert.ok(banner.includes('href="/webinars"'), "CTA uses the canonical series route");
assert.ok(banner.includes("flex-col") && banner.includes("sm:flex-row"), "Copy and CTA stack on mobile");
assert.ok(banner.includes("min-h-11") && banner.includes("focus-visible:outline"), "CTA retains a touch target and visible keyboard focus");
assert.doesNotMatch(banner, /\b(?:fixed|sticky|absolute)\b|CGA_WEBINAR|cga-webinar|zoom\.us/, "Announcement stays in document flow and separate from retired CGA/registration data");
console.log("Homepage webinar banner: copy, canonical CTA, very-top placement above navigation, responsive/accessibility classes and homepage-only scope PASS");
