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

// Buying decisions belong to the service pages; definitions and fee guidance remain here.
const commissioningLinks = [
  {
    slug: "how-much-does-a-capital-campaign-consultant-cost",
    heading: "What you should get for the fee",
    href: "/services/capital-campaign",
    intent: /ready to hire counsel/,
  },
  {
    slug: "what-is-a-capital-campaign-feasibility-study",
    heading: "Why it has to be an outside consultant",
    href: "/services/feasibility-study",
    intent: /commission independent donor interviews rather than assess readiness internally/,
  },
  {
    slug: "how-much-does-a-feasibility-study-cost",
    heading: "What a study should include for that fee",
    href: "/services/feasibility-study",
    intent: /commission a study with these deliverables/,
  },
];
for (const { slug, heading, href, intent } of commissioningLinks) {
  const page = getAnswerBySlug(slug);
  assert.ok(page, slug);
  const section = page.sections?.find(item => item.heading === heading);
  assert.ok(section, heading);
  assert.equal(section.serviceLink?.href, href);
  assert.match(section.serviceLink?.lead ?? "", intent);
  assert.match(section.serviceLink?.label ?? "", /(?:campaign consulting|feasibility study) service/);
  assert.ok((section.body?.length ?? 0) + (section.bullets?.length ?? 0) > 0);
  assert.equal(page.primaryService?.href, href);
  assert.equal(page.sections?.filter(item => item.serviceLink?.href === href).length, 1,
    `${slug}: one contextual link to the primary service, not a repeated CTA`);
}
const definition = getAnswerBySlug("what-is-a-capital-campaign-feasibility-study");
assert.match(definition?.answer[0] ?? "", /^A feasibility study is the first phase/);
assert.match(getAnswerBySlug("how-much-does-a-feasibility-study-cost")?.answer[0] ?? "",
  /\$50,000 and \$75,000/);
console.log("Campaign/feasibility commissioning links: all assertions passed");
