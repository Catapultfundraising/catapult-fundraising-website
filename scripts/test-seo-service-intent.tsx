import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PageHero } from '../components/page-hero';
import { CtaBand } from '../components/cta-band';
import { FeasibilityReportOutline } from '../components/feasibility-report-outline';
import { WebinarCallout } from '../components/webinar-callout';
import { CGA_WEBINAR, isUpcomingWebinar } from '../lib/webinars';
import { getAnswerBySlug } from '../lib/answers';
import { MEETING_LINK } from '../lib/constants';
(globalThis as any).React = React;
const source = (p: string) => readFileSync(p, 'utf8');
const services = ['mid-level-donor-program','planned-giving','capital-campaign','feasibility-study','telefundraising'];

test('opt-in service hero has one service-name H1 and a paragraph benefit', () => {
 const html = renderToStaticMarkup(<PageHero eyebrow="Service name" title="Benefit statement" description="Scope" serviceHeading />);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html, /<h1[^>]*>Service name<\/h1>/);
 assert.match(html, /<p[^>]*>Benefit statement<\/p>/);
 assert.doesNotMatch(html, /<h1[^>]*>[^]*Benefit statement[^]*<\/h1>/);
});
test('article hero and legacy eyebrow-in-heading behavior stay unchanged', () => {
 const article=renderToStaticMarkup(<PageHero eyebrow="Insights" title="Article title" description="Dek" />);
 assert.match(article,/<h1[^>]*>Article title<\/h1>/);
 assert.match(article,/<p[^>]*>Insights<\/p>/);
 const legacy=renderToStaticMarkup(<PageHero eyebrow="Hub" title="Benefit" description="Scope" eyebrowInHeading />);
 assert.match(legacy,/<h1><span[^>]*>Hub<\/span><span[^>]*>Benefit<\/span><\/h1>/);
});
test('only the five core routes opt into new service heading', () => {
 for(const slug of services) {
  const s=source(`app/services/${slug}/page.tsx`);
  assert.match(s, /<PageHero\s+serviceHeading/);
  assert.doesNotMatch(s, /eyebrowInHeading/);
  assert.match(s,new RegExp(`canonical: "/services/${slug}"`));
 }
});
test('service-specific CTA preserves contact and booking destinations and generic default', () => {
 const generic=renderToStaticMarkup(<CtaBand />);
 assert.match(generic,/Ready to catapult your next campaign/);
 assert.match(generic,/Start the Conversation/);
 const scoped=renderToStaticMarkup(<CtaBand heading="Review legacy" description="Your program" contactLabel="Review a Legacy Program" />);
 assert.match(scoped,/Review legacy/);assert.match(scoped,/Review a Legacy Program/);
 assert.ok(scoped.includes('href="/contact"'));
 assert.ok(scoped.includes(MEETING_LINK.replace(/&/g,'&amp;')));
 assert.doesNotMatch(scoped,/next campaign/);
 for(const [slug,label] of Object.entries({'mid-level-donor-program':'Discuss a Mid-Level Program','planned-giving':'Review a Legacy Program','feasibility-study':'Scope a Feasibility Study','telefundraising':'Discuss a Calling Program'})) {
  assert.ok(source(`app/services/${slug}/page.tsx`).includes(`contactLabel="${label}"`));
 }
 assert.match(source('app/services/capital-campaign/page.tsx'),/<CtaBand \/>/);
});
test('existing answer cards remain the single contextual primary service destination',()=>{
 const pairs=[['what-is-a-mid-level-donor-program','mid-level-donor-program'],['how-do-you-choose-a-capital-campaign-consulting-firm','capital-campaign'],['what-is-a-capital-campaign-feasibility-study','feasibility-study']];
 for(const [slug,dest] of pairs) {
  const a=getAnswerBySlug(slug)!;assert.equal(a.primaryService?.href,`/services/${dest}`);
  assert.match(a.primaryService!.blurb,/Review/);
 }
 const renderer=source('app/answers/[slug]/page.tsx');
 assert.equal((renderer.match(/href=\{a\.primaryService\.href\}/g)||[]).length,1);
 assert.match(renderer,/2026-11-07/);
});
test('three answer sections link to distinct service next steps without duplicate related links',()=>{
 for(const [slug,heading,dest] of [
  ['how-do-you-choose-a-capital-campaign-consulting-firm','How the feasibility study is run','feasibility-study'],
  ['what-is-a-capital-campaign-feasibility-study','What you get at the end','capital-campaign'],
  ['what-is-a-mid-level-donor-program','Start with loyalty, not just wealth','planned-giving']]) {
  const a=getAnswerBySlug(slug)!;
  const sec=a.sections!.find(s=>s.heading===heading)!;
  assert.equal(sec.serviceLink?.href,`/services/${dest}`);
  assert.notEqual(a.primaryService?.href,sec.serviceLink?.href);
  assert.ok(!a.related.some(r=>r.href===sec.serviceLink?.href));
 }
 assert.match(source('app/answers/[slug]/page.tsx'),/href=\{sec\.serviceLink\.href\}/);
});
test('five existing article links are relocated into relevant body sections, never duplicated',()=>{
 for(const [slug,dest] of [
 ['how-to-start-a-planned-giving-program','planned-giving'],
 ['is-the-phonathon-dead','telefundraising'],
 ['donor-engagement-strategies-mid-level-donors','mid-level-donor-program'],
 ['why-a-feasibility-study-matters-before-a-capital-campaign','feasibility-study'],
 ['planning-a-capital-campaign-gift-chart-quiet-phase','capital-campaign']]){
  const s=source(`app/blog/${slug}/page.tsx`);
  assert.equal((s.match(new RegExp(`href="/services/${dest}"`,'g'))||[]).length,1,slug);
  const at=s.indexOf(`href="/services/${dest}"`);
  assert.ok(at>s.indexOf('<article'));assert.ok(at<s.lastIndexOf('<h2'),slug);
  assert.ok(source(`app/services/${dest}/page.tsx`));
 }
});
test('buyer summaries precede detail, with planned giving choices and intact proof/journey/tools/FAQ',()=>{
 for(const slug of ['mid-level-donor-program','planned-giving']){
  const s=source(`app/services/${slug}/page.tsx`);
  assert.ok(s.indexOf('<ServiceBuyerSummary')<s.indexOf('<ServiceDetail'));
  for(const retained of ['<ServiceProof','<TestimonialQuote','<LoyaltyCalloutCard','<ServiceFaq']) assert.ok(s.includes(retained),retained);
 }
 const pg=source('app/services/planned-giving/page.tsx');
 for(const label of ['Start','Grow','Reignite'])assert.ok(pg.includes(`>${label}</dt>`));
 assert.ok(source('app/services/mid-level-donor-program/page.tsx').includes('The 8-Stage Engagement Journey'));
 assert.ok(source('app/services/mid-level-donor-program/page.tsx').includes('Digital Layer Included'));
});
test('report outline is illustrative, uses three stated report parts, not a client result',()=>{
 const html=renderToStaticMarkup(<FeasibilityReportOutline />);
 for(const phrase of ['Illustrative outline','not a client report','1. Findings','2. Observations','3. Recommendations','gift chart scenarios','leadership prospect list']) assert.ok(html.includes(phrase),phrase);
 assert.doesNotMatch(html,/\$|%|guarantee|weeks|months|PBS|university/i);
 assert.match(source('app/services/feasibility-study/page.tsx'),/<FeasibilityReportOutline \/>/);
});
test('upcoming invitation date boundaries fail closed, including after November 4',()=>{
 const start=Date.parse(CGA_WEBINAR.startIso);
 assert.equal(isUpcomingWebinar(CGA_WEBINAR,start-1),true);
 assert.equal(isUpcomingWebinar(CGA_WEBINAR,start),false);
 assert.equal(isUpcomingWebinar(CGA_WEBINAR,start+1),false);
 assert.equal(isUpcomingWebinar(CGA_WEBINAR,Date.parse('2026-11-07T12:00:00Z')),false);
 assert.equal(isUpcomingWebinar({startIso:'bad'},start),false);
 assert.equal(isUpcomingWebinar(CGA_WEBINAR,NaN),false);
});
test('callout is suppressed in initial HTML, with both promos sharing upcoming check',()=>{
 assert.equal(renderToStaticMarkup(<WebinarCallout />),'');
 for(const p of ['components/webinar-callout.tsx','components/webinar-bar.tsx'])assert.match(source(p),/isUpcomingWebinar\(CGA_WEBINAR\)/);
 assert.doesNotMatch(source('lib/webinars.ts'),/recordingUrl|onDemandUrl/);
});
