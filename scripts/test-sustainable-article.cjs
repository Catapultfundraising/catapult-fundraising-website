const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const slug = "sustainable-fundraising-diversified-revenue";
const dir = path.join("app/blog", slug);
const assets = path.join("public/blog", slug);
const a = JSON.parse(fs.readFileSync(path.join(dir, "article-content.json")));
const page = fs.readFileSync(path.join(dir, "page.tsx"), "utf8");
const source = fs.readFileSync(path.join(dir, "article-source.md"), "utf8");
test("article body preserves every source paragraph in order, with native replay replacing its marker", () => {
  const sourceParts = source.trim().split("\n\n");
  assert.equal(a.title, sourceParts.shift().slice(2));
  assert.equal(a.byline, sourceParts.shift());
  const expected = sourceParts.flatMap(text => {
    if (text === "[VIDEO PLAYER]") return [["video", ""]];
    if (text.startsWith("### ")) return [["h3", text.slice(4)]];
    if (text.startsWith("## ")) return [["h2", text.slice(3)]];
    if (text.startsWith("**") && text.endsWith("**")) return [["label", text.slice(2, -2)]];
    if (text.startsWith("- ")) return text.split("\n").map(line => ["li", line.slice(2)]);
    return [["p", text]];
  });
  assert.deepEqual(a.blocks.filter(([kind]) => kind !== "graphic"), expected);
  assert.equal(a.blocks.filter(([k]) => k === "video").length, 1);
});
test("each H2 has exactly one local 3:2 infographic, with a complete actual-panel hero", () => {
  assert.equal(a.blocks.filter(([k]) => k === "h2").length, 3);
  assert.equal(a.blocks.filter(([k]) => k === "graphic").length, 3);
  a.blocks.forEach(([kind], i) => {
    if (kind === "h2") assert.equal(a.blocks[i + 1][0], "graphic");
  });
  for (const name of ["funding-mix.png", "donor-path.png", "partnerships.png", "panel-hero.jpg", "panel-poster.jpg", "social-card.png"]) {
    assert.ok(fs.statSync(path.join(assets, name)).size > 5000, name);
    assert.ok(page.includes(name), name);
  }
  assert.match(page, /aspect-\[4\/3\]/);
  assert.match(page, /aspect-\[3\/2\]/);
  assert.match(a.hero_caption, /Still from the recording/);
});
test("credits all five panelists and moderator with verified organizations and conference", () => {
  const copy = JSON.stringify(a);
  for (const name of ["Anthony R. Alonso", "Heather Nelson", "Kia Croom", "Patrice Davis", "Ron Smith", "Andrea Saynes"]) assert.ok(copy.includes(name), name);
  for (const url of ["https://nexusmarketing.com/nonprofit-growth-summit/", "https://www.bridgeraise.com/", "https://kiacroom.com/", "https://grantwinconsulting.com/", "https://www.vitreogroup.ca/"]) assert.ok(copy.includes(url), url);
  assert.equal(a.service_ctas[0].url, "/contact");
  assert.equal(a.service_ctas[0].secondary_url, "https://go.catapultfr.com/meetings/anthonya");
});
test("uses plain native document-flow video and visible durable direct recording link", () => {
  const replay = page.split("function WebinarReplay() {")[1].split("export default function")[0];
  assert.match(replay, /<video className="block h-auto w-full" controls playsInline preload="metadata"/);
  assert.doesNotMatch(replay, /<div|absolute|inset-0|h-full|overflow-hidden|rounded-|shadow-|transform|filter|aspect-video/);
  assert.equal(replay.split("nexus-panel-replay-2026-11-13.mp4").length - 1, 3);
  assert.match(replay.split("</video>")[1], /Open the recording in a new tab/);
  assert.doesNotMatch(page, /<iframe|zoom\.us|download_token|access_token|Diane Tuntland/);
  const video = path.join(assets, "nexus-panel-replay-2026-11-13.mp4");
  const bytes = fs.readFileSync(video);
  assert.ok(bytes.length > 1000000 && bytes.length < 95 * 1024 * 1024);
  assert.equal(bytes.subarray(4, 8).toString(), "ftyp");
});
test("metadata, canonical, share, index and sitemap agree on intended publication", () => {
  const posts = fs.readFileSync("lib/posts.ts", "utf8");
  const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");
  assert.equal(posts.split(`"slug": "${slug}"`).length - 1, 1);
  assert.equal(sitemap.split(`/blog/${slug}`).length - 1, 2);
  assert.match(sitemap, /"\/blog": "2026-11-17"/);
  assert.match(page, /const DATE = "2026-11-17"/);
  assert.match(page, /"BlogPosting"/);
  assert.match(page, /datePublished: DATE/);
  assert.match(page, /dateModified: DATE/);
  assert.match(page, /canonical: `\/blog\/\$\{SLUG\}`/);
  assert.match(page, /<ShareButtons/);
  assert.match(page, /publishedTime: DATE/);
  assert.match(page, /social-card\.png/);
});
