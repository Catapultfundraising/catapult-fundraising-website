import { PageHero } from "@/components/page-hero";
import { GiftChartCalculator } from "@/components/gift-chart-calculator";
import { CtaBand } from "@/components/cta-band";
import Link from "next/link";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: { absolute: "Free Capital Campaign Gift Chart Calculator" },
  description:
    "Enter your campaign goal and get a suggested gift chart and gift pyramid: how many gifts you need at each level, how many prospects to identify, and how much of the goal the top gifts carry.",
  keywords: [
    "gift chart calculator",
    "capital campaign gift chart",
    "gift range chart",
    "gift pyramid",
    "how many gifts capital campaign",
  ],
  alternates: { canonical: "/resources/gift-chart-calculator" },
};

const FAQS = [
  {
    question: "What is a capital campaign gift chart?",
    answer:
      "A gift chart, also called a gift range chart, sets out how many gifts you need at each level to reach your goal. It starts with one lead gift at roughly 15 to 20 percent of the goal and works down through descending levels, and it usually shows how many qualified prospects you need to identify to produce each gift.",
  },
  {
    question: "How is the calculator's chart built?",
    answer:
      "It uses the same structure Catapult builds for clients: round gift levels only, a single lead gift at roughly 20 percent of goal, a top ten gifts that carry 60 percent or more of the goal, a closing line of many smaller gifts that completes the campaign, and roughly three qualified prospects for every gift needed. It is a planning starting point, not a chart built against your donor data.",
  },
  {
    question: "How many prospects do we need for a capital campaign?",
    answer:
      "Plan on roughly three qualified prospects for every gift you need, and more at the top of the chart where the pool is thinnest. A feasibility study is where those prospects get identified, rated, and tested through confidential interviews.",
  },
  {
    question: "Will our real gift chart look like this one?",
    answer:
      "The shape will be similar because campaigns of a given size have to be built a certain way. The specific levels and counts change once your prospect data and interview feedback are in hand, which is the difference between a calculated chart and a campaign plan.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/resources/gift-chart-calculator#app`,
      name: "Capital Campaign Gift Chart Calculator",
      url: `${SITE_URL}/resources/gift-chart-calculator`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "Enter a campaign goal to generate a suggested gift chart and gift pyramid, including gifts needed at each level and prospects to identify.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Gift Chart Calculator",
          item: `${SITE_URL}/resources/gift-chart-calculator`,
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

export default function GiftChartCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Free Tool"
        title="Gift chart calculator"
        description="Enter your campaign goal and see the gift chart and pyramid behind it: how many gifts you need at each level, how many prospects it takes to produce them, and how much of the goal rides on the top of the chart."
      />

      <section className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <GiftChartCalculator />
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16 lg:px-10">
        <h2 className="font-display text-3xl text-[rgb(var(--navy))]">
          How to read a gift chart
        </h2>
        <div className="mt-5 space-y-5 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
          <p>
            Every campaign is built from the top down. One lead gift usually carries 15 to 20 percent
            of the goal, and the top handful of levels carry most of the rest. That is why the first
            conversations in a campaign are with a very small number of people, and why a board that
            starts by counting on broad community support is usually planning backward.
          </p>
          <p>
            The prospects column is the part organizations underestimate. You do not need one prospect
            per gift, you need roughly three, because not every qualified prospect gives at the level
            you hoped or on the timeline you need. Thin prospect pools at the top of the chart are the
            most common reason a campaign stalls in the quiet phase.
          </p>
          <p>
            A chart you calculate is a hypothesis about your donors. A chart built during a{" "}
            <Link
              href="/services/feasibility-study"
              className="underline decoration-[rgb(var(--brass))]/40 decoration-2 underline-offset-4 hover:decoration-[rgb(var(--brass))]"
            >
              feasibility study
            </Link>{" "}
            is a plan, because by then the names behind the top levels have been rated, interviewed,
            and tested against the actual ask.
          </p>
        </div>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))]">
          Common questions
        </h2>
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
                href: "/answers/how-much-should-a-nonprofit-raise-in-a-capital-campaign",
                label: "How much should a nonprofit raise in a capital campaign?",
              },
              {
                href: "/answers/what-percentage-of-a-capital-campaign-should-come-from-major-gifts",
                label: "What percentage of a capital campaign comes from major gifts?",
              },
              {
                href: "/answers/what-is-the-quiet-phase-of-a-capital-campaign",
                label: "What is the quiet phase of a capital campaign?",
              },
              {
                href: "/blog/planning-a-capital-campaign-gift-chart-quiet-phase",
                label: "Planning a capital campaign: the gift chart and the quiet phase",
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
