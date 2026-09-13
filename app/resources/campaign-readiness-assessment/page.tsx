import { PageHero } from "@/components/page-hero";
import { CampaignReadinessAssessment } from "@/components/campaign-readiness-assessment";
import { CtaBand } from "@/components/cta-band";
import Link from "next/link";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: { absolute: "Free Capital Campaign Readiness Assessment" },
  description:
    "Grade your capital campaign readiness in seven areas, see the single biggest risk to your campaign, and get three next steps. Free assessment with a branded PDF report card.",
  keywords: [
    "capital campaign readiness assessment",
    "campaign readiness checklist",
    "are we ready for a capital campaign",
    "capital campaign readiness report card",
    "nonprofit campaign readiness",
  ],
  alternates: { canonical: "/resources/campaign-readiness-assessment" },
};

const FAQS = [
  {
    question: "What is a campaign readiness assessment?",
    answer:
      "It is a structured look at whether an organization can run the campaign it is considering. It covers board and leadership commitment, the case for support, prospect depth at the top of the gift chart, major gift experience, donor data, annual fund health, and the state of the plan. A readiness assessment answers whether you are prepared to test a goal. A feasibility study answers whether donors will support it.",
  },
  {
    question: "How is the grade calculated?",
    answer:
      "Seven areas are graded and weighted. Board and leadership commitment and prospect depth carry 20 percent each, the case for support and major gift experience 15 percent each, and donor data, annual fund health, and planning 10 percent each. Two questions are scored against your own goal using the same gift chart math as our calculator: the largest gift you have ever received against the lead gift your goal requires, and your prospect count against three qualified prospects per gift.",
  },
  {
    question: "Are we ready for a capital campaign?",
    answer:
      "Most organizations that ask are ready to test a goal but not ready to announce one. The usual gaps are the same three: not every board member has given, no one has been named who can credibly make the lead gift, and there is no written case a donor would repeat. None of those take years to fix, and all three change the goal a study can support.",
  },
  {
    question: "Does a good grade mean we should launch?",
    answer:
      "No. A report card grades what you tell us about your own organization. It cannot talk to your donors, and donor conversations are what set a defensible goal. A strong grade means you are ready for those conversations, which is what a feasibility study is for.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/resources/campaign-readiness-assessment#app`,
      name: "Capital Campaign Readiness Report Card",
      url: `${SITE_URL}/resources/campaign-readiness-assessment`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "Answer sixteen questions to grade capital campaign readiness in seven areas, see the biggest risk named, and get three prioritized next steps plus a branded PDF report card.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Free Tools", item: `${SITE_URL}/resources` },
        {
          "@type": "ListItem",
          position: 3,
          name: "Campaign Readiness Assessment",
          item: `${SITE_URL}/resources/campaign-readiness-assessment`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ],
};

export default function CampaignReadinessAssessmentPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Free Tool"
        title="Campaign readiness report card"
        description="Sixteen questions, about three minutes. You get a grade in seven areas, the single biggest risk to your campaign named plainly, and three next steps you can take this quarter."
      />

      <section className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <CampaignReadinessAssessment />
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16 lg:px-10">
        <h2 className="font-display text-3xl text-[rgb(var(--navy))]">
          What readiness actually means
        </h2>
        <div className="mt-5 space-y-5 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
          <p>
            Readiness is not enthusiasm. Almost every board that starts talking about a campaign is
            enthusiastic, and enthusiasm is not what carries a goal. Readiness is a small set of
            unglamorous conditions: the board has given, someone credible has agreed to lead, the case
            is written and has survived contact with a donor, and there are names behind the top of
            the gift chart rather than an assumption about community support.
          </p>
          <p>
            The top of the chart is where this gets uncomfortable. The largest ten gifts carry 60
            percent or more of any goal, so the honest question is not whether your community believes
            in the work. It is whether three specific prospects could make a gift larger than any gift
            in your history. That is why this report card grades two questions against your own goal
            instead of against a generic checklist.
          </p>
          <p>
            A weak grade is useful. It tells you what to work on for a quarter or two, and the work is
            ordinary fundraising work that pays off whether or not a campaign follows. A strong grade
            means it is time to stop assessing yourself and start listening to donors, which is what a{" "}
            <Link
              href="/services/feasibility-study"
              className="underline decoration-[rgb(var(--brass))]/40 decoration-2 underline-offset-4 hover:decoration-[rgb(var(--brass))]"
            >
              feasibility study
            </Link>{" "}
            does.
          </p>
        </div>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))]">Common questions</h2>
        <dl className="mt-5 space-y-7">
          {FAQS.map((f) => (
            <div key={f.question}>
              <dt className="font-display text-xl text-[rgb(var(--navy))]">{f.question}</dt>
              <dd className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/75">{f.answer}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 rounded-2xl border border-[rgb(var(--line))] bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Keep reading
          </p>
          <ul className="mt-3 space-y-2">
            {[
              {
                href: "/resources/gift-chart-calculator",
                label: "Build the gift chart for your goal",
              },
              {
                href: "/answers/how-much-should-a-nonprofit-raise-in-a-capital-campaign",
                label: "How much should a nonprofit raise in a capital campaign?",
              },
              {
                href: "/services/feasibility-study",
                label: "How a feasibility study works",
              },
              {
                href: "/blog/why-a-feasibility-study-matters-before-a-capital-campaign",
                label: "Why a feasibility study matters before a capital campaign",
              },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[17px] text-[rgb(var(--navy))]/80 underline decoration-[rgb(var(--brass))]/30 decoration-2 underline-offset-4 hover:text-[rgb(var(--navy))] hover:decoration-[rgb(var(--brass))]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
