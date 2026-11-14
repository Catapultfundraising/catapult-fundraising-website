const assert = require('node:assert/strict');
const fs = require('node:fs');
const config = require('../next.config.js');
const oldRoute = '/resources/cga-webinar';
const articleRoute = '/blog/charitable-gift-annuities-loyal-donors';
(async () => {
  assert.equal(fs.existsSync('app/resources/cga-webinar/page.tsx'), false);
  for (const path of ['lib/constants.ts', 'app/sitemap.ts', 'app/resources/page.tsx']) {
    const source = fs.readFileSync(path, 'utf8');
    assert.ok(!source.includes(oldRoute), `${path} must not advertise the retired registration page`);
  }
  const resources = fs.readFileSync('app/resources/page.tsx', 'utf8');
  assert.ok(!resources.includes('CGA_WEBINAR'));
  assert.ok(!resources.includes('Save my seat'));
  for (const tool of ['gift-chart-calculator', 'campaign-readiness-assessment', 'donor-loyalty-assessment']) {
    assert.ok(resources.includes(`/resources/${tool}`));
  }
  const redirect = (await config.redirects()).find(rule => rule.source === oldRoute);
  assert.deepEqual(redirect, { source: oldRoute, destination: articleRoute, permanent: true });
  const article = fs.readFileSync(`app${articleRoute}/page.tsx`, 'utf8');
  assert.ok(article.includes('cga-webinar-replay-privacy-edited-2026-11-09.mp4'));
  assert.ok(fs.readFileSync('app/sitemap.ts', 'utf8').includes(articleRoute));
  console.log('CGA retirement: page removed, listings removed, tools and replay article preserved, old links redirected');
})().catch(error => { console.error(error); process.exitCode = 1; });
