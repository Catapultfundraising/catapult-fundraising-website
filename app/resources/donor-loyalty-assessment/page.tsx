import { PageHero } from "@/components/page-hero";
import { DonorLoyaltyAssessment } from "@/components/donor-loyalty-assessment";
import { CtaBand } from "@/components/cta-band";
import Link from "next/link";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: { absolute: "Free Legacy and Mid-Level Donor Assessment" },
  description:
    "Grade your readiness for a legacy giving program and a mid-level donor engagement program, see which one to start with, and get a branded PDF report card. Free assessment, estimates welcome.",
  keywords: [
    "legacy giving readiness assessment",
    "planned giving assessment nonprofit",
    "mid-level donor program assessment",
    "donor loyalty assessment",
    "how to start a planned giving program",
  ],
  alternates: { canonical: "/resources/donor-loyalty-assessment" },
};

const FAQS = [
  {
    question: "How do I know whether we need a legacy program or a mid-level donor program?",
    answer:
      "Look at two lists. First, the donors who have given for ten or more consecutive years, at any amount. Loyalty predicts a gift in a will far better than wealth does, and that list points to a legacy program. Second, the donors giving between $250 and $4,999 who are not assigned to anyone. That list points to a mid-level engagement program. Most organizations have both, and the larger and more neglected list is where to start.",
  },
  {
    question: "What can a legacy program realistically produce?",
    answer:
      "On average, a legacy calling program yields about 30 documented commitments per 1,000 loyal prospects. Across Catapult programs, results have ranged from over $850,000 per 1,000 prospects to well over $12 million, so the average is a planning figure and not a promise. Much of that value is previously undisclosed: the donor had already decided, and nobody had ever asked.",
  },
  {
    question: "Why does this tool not project mid-level dollars?",
    answer:
      "Because an honest mid-level projection depends on the file. Two organizations with the same donor count can be a factor of four apart depending on which giving band the donors sit in, how much of the list is lapsed, and how reachable those donors are by phone and email. We build mid-level projections off a client's actual data, not off a questionnaire, so this report card reports pool size and coverage gaps instead.",
  },
  {
    question: "What if we do not know our numbers?",
    answer:
      "Estimate. Every count in this tool accepts a best guess, and nothing is graded down for not having run the report yet. Most organizations have never counted their consecutive-year donors, which is itself part of the finding. The goal is a useful conversation, not a test.",
  },
  {
    question: "Do these donors overlap with our major gift prospects?",
    answer:
      "Usually not, and that is the point. These are donors nobody is calling, whose gift sizes have kept them out of every report leadership reviews. Bringing them into a real relationship also lifts annual giving, because donors who document a planned gift tend to give more each year and keep giving longer. The future gift is the second return, not the only one.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/resources/donor-loyalty-assessment#app`,
      name: "Donor Loyalty and Legacy Report Card",
      url: `${SITE_URL}/resources/donor-loyalty-assessment`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "Answer sixteen questions to grade legacy giving readiness and mid-level donor engagement readiness, see which program to start with, and get a branded PDF report card.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Donor Loyalty and Legacy Assessment",
          item: `${SITE_URL}/resources/donor-loyalty-assessment`,
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

export default function DonorLoyaltyAssessmentPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Free Tool"
        title="Donor loyalty and legacy report card"
        description="Sixteen questions, about three minutes. Grades for two tracks, legacy giving and mid-level engagement, a recommendation on which to start with, and three next steps. Estimates are welcome."
      />

      <section className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <DonorLoyaltyAssessment />
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-16 lg:px-10">
        <h2 className="font-display text-3xl text-[rgb(var(--navy))]">
          The two groups nobody is talking to
        </h2>
        <div className="mt-5 space-y-5 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
          <p>
            Almost every donor file has two overlooked groups. The first is the donor who has given
            $75 every year for fourteen years. She never appears in a major gift report, no one has
            ever visited her, and she is one of the strongest planned giving prospects in the
            organization, because loyalty predicts a gift in a will far better than wealth does.
          </p>
          <p>
            The second is the donor giving $1,000 a year with no one assigned to him. He is too large
            for direct mail treatment and too small for the major gifts portfolio, so he gets a
            newsletter and an annual appeal, and he gives the same amount for six years until he
            stops. A mid-level program exists to put a person in front of that donor.
          </p>
          <p>
            The two need different work, which is why this report card grades them separately. On the
            legacy side, we can show you what the pool is likely worth, because those outcomes are
            consistent enough to average. On the mid-level side, we deliberately do not put a dollar
            figure on a questionnaire answer. That number comes out of your actual file, and anyone
            who quotes it before seeing your data is guessing.
          </p>
          <p>
            Either way, the work pays twice. Documenting a planned gift raises the donor&apos;s annual
            giving, and calling a mid-level donor to listen usually produces a larger gift in the same
            year. Read more about how a{" "}
            <Link
              href="/services/legacy-giving"
              className="underline decoration-[rgb(var(--brass))]/40 decoration-2 underline-offset-4 hover:decoration-[rgb(var(--brass))]"
            >
              legacy program
            </Link>{" "}
            and{" "}
            <Link
              href="/services/donor-engagement"
              className="underline decoration-[rgb(var(--brass))]/40 decoration-2 underline-offset-4 hover:decoration-[rgb(var(--brass))]"
            >
              donor engagement
            </Link>{" "}
            actually run.
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
              { href: "/services/legacy-giving", label: "How a legacy giving program works" },
              { href: "/services/donor-engagement", label: "How donor engagement works" },
              {
                href: "/resources/campaign-readiness-assessment",
                label: "Grade your capital campaign readiness",
              },
              {
                href: "/resources/gift-chart-calculator",
                label: "Build the gift chart for your goal",
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
