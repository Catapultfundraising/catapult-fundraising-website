// Content smoke test. Run: node scripts/test-cultivation-article.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const slug = "dont-ask-at-the-party-cultivation-events-major-donors";
const page = fs.readFileSync(`app/blog/${slug}/page.tsx`, "utf8");
const posts = fs.readFileSync("lib/posts.ts", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");
assert.equal((page.match(/<H2>/g) || []).length, 8);
assert.equal((page.match(/<li className=/g) || []).length, 12);
assert.equal((page.match(/<Figure src=/g) || []).length, 8);
assert(page.includes("By Anthony R. Alonso, President and CEO, Catapult Fundraising"));
assert(page.includes('href="https://go.catapultfr.com/meetings/anthonya"'));
assert(page.includes('datePublished: "2026-10-30"'));
assert(page.includes("alternates: { canonical: `/blog/${SLUG}` }"));
assert(page.includes("$25,000"));
assert(page.includes("$150,000"));
assert(posts.includes(`"slug": "${slug}"`));
assert(sitemap.includes(`"/blog/${slug}": "2026-10-30"`));
assert(sitemap.includes(`    "/blog/${slug}",`));
for (const image of [
  "hero-reception-v2", "purpose", "guest-list", "rsvp", "story",
  "seating", "corporate", "follow-up", "question", "social-cultivation-events-v2",
]) {
  assert(fs.statSync(path.join("public", "blog", slug, `${image}.jpg`)).size > 10000);
}
console.log("Cultivation article: content, structure, metadata, sitemap, CTA and 10 images pass.");
