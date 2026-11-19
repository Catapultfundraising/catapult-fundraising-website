// Review/release guards for the Jeff Grandy article. No private draft in repo.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const slug = "mission-before-recognition";
const page = fs.readFileSync(`app/blog/${slug}/page.tsx`, "utf8");
const posts = fs.readFileSync("lib/posts.ts", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");

assert(page.includes('const DATE = "2026-11-18"'), "Pending release date changed");
assert(page.includes('name: "Jeff Grandy"'), "Metadata must credit Jeff");
assert(page.includes("BY JEFF GRANDY, CATAPULT FUNDRAISING"), "Source byline missing");
assert(!/Anthony|Alonso/.test(page), "Wrong author");
for (const url of ["https://afpglobal.org/donor-bill-rights", "https://afpglobal.org/ethicsmain/code-ethical-standards"]) {
  assert.equal(page.split(`href="${url}"`).length - 1, 2, `Inline and further-reading link required: ${url}`);
}
for (const heading of [
  "The easy site and the right site",
  "A taller cross is always possible",
  "Relationships carry the weight when the need is urgent",
  "Recognition is the donor's call",
  "Keep the promise after the gift",
]) assert(page.includes(heading), `Missing source section: ${heading}`);
assert(posts.includes(`"slug": "${slug}"`), "Shared index entry missing");
assert.equal(sitemap.split(`"/blog/${slug}"`).length - 1, 2, "Sitemap route and date required");
for (const name of ["mission-first.svg", "listen-before-asking.svg", "keep-the-promise.svg", "social-card.svg", "social-card.png"]) {
  assert(fs.statSync(path.join("public/blog", slug, name)).size > 500, `Graphic missing: ${name}`);
}
const social = fs.readFileSync(`public/blog/${slug}/social-card.svg`, "utf8");
assert(social.includes("BY JEFF GRANDY, CATAPULT FUNDRAISING"), "Social image wrong byline");
assert(!/Anthony|Alonso/i.test(social), "Social image wrong author");
assert(page.includes('href="https://go.catapultfr.com/meetings/jeff-grandy"'), "Jeff booking link missing");
assert(page.includes("Vice President for Client Development"), "Jeff title missing");
assert(page.includes("Book a 30-minute call with Jeff"), "Jeff CTA missing");
assert(page.includes("hero-donor-conversation-v2.jpg"), "Photographic hero missing");
assert(page.includes("social-card-v2.png"), "Revised social image missing");
console.log("PASS: Jeff byline, release date, sections, AFP links, shared index, sitemap and graphics.");

assert(posts.includes(`/blog/${slug}/hero-donor-conversation-v2.jpg`), "Article card must use revised hero");
assert(!page.includes("hero-building-plans.jpg"), "Old construction photo must not be the hero");
assert(fs.statSync(path.join("public/blog", slug, "hero-donor-conversation-v2.jpg")).size > 10000, "New hero asset missing");
