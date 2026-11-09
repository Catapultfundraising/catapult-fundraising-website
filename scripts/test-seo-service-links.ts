import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { getAnswerBySlug } from "../lib/answers";

const answer = getAnswerBySlug("how-do-you-choose-a-capital-campaign-consulting-firm");
assert.ok(answer);
assert.equal(answer.primaryService?.href, "/services/capital-campaign");
for (const heading of ["Who will actually do the work", "What happens in the public phase"]) {
  const link: { lead: string; label: string; href: string } | undefined = answer.sections?.find(section => section.heading === heading)?.serviceLink;
  assert.equal(link?.href, "/services/capital-campaign");
  assert.match(link?.label ?? "", /capital campaign consult/);
}
const readiness = readFileSync("app/resources/campaign-readiness-assessment/page.tsx", "utf8");
const callout = readiness.slice(readiness.indexOf("<aside"), readiness.indexOf("</aside>"));
assert.match(callout, /aria-labelledby="feasibility-next-step"/);
assert.match(callout, /href="\/services\/feasibility-study"/);
assert.match(callout, /Explore our capital campaign feasibility study/);
assert.ok(readiness.indexOf("<aside") < readiness.indexOf(">Common questions<"));
assert.match(readiness, /<CampaignReadinessAssessment/);
for (const route of ["feasibility-study", "capital-campaign"]) {
  assert.ok(existsSync(`app/services/${route}/page.tsx`));
}
console.log("SEO service links: all assertions passed");
