const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const SLUG = "charitable-gift-annuities-loyal-donors";
const route = path.join("app/blog", SLUG);
const assets = path.join("public/blog", SLUG);
const content = fs.readFileSync(path.join(route, "article-content.json"));
const a = JSON.parse(content);
test("preserves Anthony's edited copy and corrected source-photo caption", () => {
  assert.equal(crypto.createHash("sha256").update(content).digest("hex"), "e1a4dc84010eb1c2ab00679d52abaf8fde1c6aafa8958818e8e06d2194400b98");
  assert.equal(a.blocks.filter(([k]) => k === "h2").length, 5);
  assert.equal(a.blocks.filter(([k]) => k === "graphic").length, 5);
  assert.equal(a.blocks.filter(([k]) => k === "video").length, 1);
  assert.match(a.hero_caption, /Photo from the webinar presentation/);
  assert.doesNotMatch(a.hero_caption, /Editorial illustration/);
});
test("includes all source imagery and a durable native-player recording", () => {
  for (const f of ["hero-susan.jpg", "graphic-lifetime-promise-v2.jpg", "graphic-loyalty-signals-v2.jpg", "graphic-catapult-calling-v2.jpg", "graphic-endowment-services-v2.jpg", "graphic-fit-review-v2.jpg", "webinar-poster.jpg", "og-cga.jpg"]) {
    assert.ok(fs.statSync(path.join(assets, f)).size > 5000, f);
  }
  const video = path.join(assets, "cga-webinar-replay-privacy-edited-2026-11-09.mp4");
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(video)).digest("hex"), "bc2eddb64d4a4a6be247c762afa44f74053c164014dafc544d77caeaa6e75c27");
  const size = fs.statSync(video).size;
  assert.ok(size > 1000000 && size < 100 * 1024 * 1024);
  const fd = fs.openSync(video, "r");
  const bytes = Buffer.alloc(12);
  fs.readSync(fd, bytes, 0, 12, 0);
  fs.closeSync(fd);
  assert.equal(bytes.subarray(4, 8).toString(), "ftyp");
  const page = fs.readFileSync(path.join(route, "page.tsx"), "utf8");
  assert.match(page, /controls playsInline preload="metadata"/);
  assert.match(page, /<video className="block h-auto w-full"/);
  assert.doesNotMatch(page, /download_token|access_token|zoom\.us\/rec\/download/);
});
test("credits Diane and offers separate next steps to both firms", () => {
  assert.match(JSON.stringify(a.blocks), /Diane Tuntland/);
  assert.equal(a.service_ctas[0].url, "https://go.catapultfr.com/meetings/anthonya");
  assert.equal(a.service_ctas[1].url, "https://www.endowmentpartners.com/get-started-now");
});
test("registers a dated article in discovery and sitemap", () => {
  const posts = fs.readFileSync("lib/posts.ts", "utf8");
  assert.ok(posts.includes(SLUG));
  const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");
  assert.equal(sitemap.split(`/blog/${SLUG}`).length - 1, 2);
  assert.ok(sitemap.includes('"/blog": "2026-11-06"'));
  const page = fs.readFileSync(path.join(route, "page.tsx"), "utf8");
  assert.match(page, /"BlogPosting"/);
  assert.match(page, /datePublished: DATE/);
});

test("uses the explicit Phonathon reference style and versioned verified graphic assets", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(assets, "graphic-style-manifest.json"), "utf8"));
  assert.equal(manifest.reference_url, "https://www.catapultfr.com/blog/is-the-phonathon-dead");
  assert.equal(Object.keys(manifest.graphics).length, 5);
  const page = fs.readFileSync(path.join(route, "page.tsx"), "utf8");
  for (const [file, digest] of Object.entries(manifest.graphics)) {
    assert.match(file, /-v2\.jpg$/);
    assert.ok(page.includes(file));
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(assets, file))).digest("hex"), digest);
    assert.ok(!fs.existsSync(path.join(assets, file.replace("-v2.jpg", ".jpg"))));
  }
});
// Both native playback and the browser fallback must use the reviewed edit.
test("article replay uses only the versioned privacy-edited recording", () => {
  const page = fs.readFileSync(path.join(route, "page.tsx"), "utf8");
  assert.equal(page.split("cga-webinar-replay-privacy-edited-2026-11-09.mp4").length - 1, 3);
  assert.doesNotMatch(page, /cga-webinar-replay\.mp4|zoom\.us|<iframe/);
  assert.match(page, /<source src=\{`\$\{IMG\}\/cga-webinar-replay-privacy-edited-2026-11-09\.mp4`\} type="video\/mp4"/);
  assert.ok(page.includes('href={`${IMG}/cga-webinar-replay-privacy-edited-2026-11-09.mp4`}'));
  assert.match(page, /poster=\{`\$\{IMG\}\/webinar-poster\.jpg`\}/);
  assert.match(page, /61 minutes\. Recorded November 4, 2026\./);
  assert.equal(fs.existsSync(path.join(assets, "cga-webinar-replay.mp4")), false);
});

test("replay uses native document flow and offers a visible direct playback link", () => {
  const page = fs.readFileSync(path.join(route, "page.tsx"), "utf8");
  const replay = page.split("function WebinarReplay() {")[1].split("export default function")[0];
  assert.match(replay, /<video className="block h-auto w-full" controls playsInline preload="metadata"/);
  assert.doesNotMatch(replay, /<div|absolute|inset-0|h-full|overflow-hidden|rounded-|shadow-|transform|filter|aspect-video/);
  const afterVideo = replay.split("<\/video>")[1];
  assert.ok(afterVideo.includes('href={`${IMG}/cga-webinar-replay-privacy-edited-2026-11-09.mp4`}'));
  assert.match(afterVideo, /target="_blank" rel="noopener noreferrer"/);
  assert.match(afterVideo, /Open the recording in a new tab/);
  assert.doesNotMatch(afterVideo, /hidden|aria-hidden/);
});
