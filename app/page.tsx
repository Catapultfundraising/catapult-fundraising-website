import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/hero";
import { ServicesOverview } from "@/components/services-overview";
import { ProcessTimeline } from "@/components/process-timeline";
import { SectorsServed } from "@/components/sectors-served";
import { ScrollingQuoteBanner } from "@/components/scrolling-quote-banner";
import { QaLinksSection } from "@/components/qa-links-section";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Catapult Fundraising | Nation's Full-Service Capital Campaign Consultants",
  description:
    "Catapult Fundraising is a national, full-service firm with 30+ years in capital campaigns, annual fund calling, donor engagement, and legacy giving.",
  keywords: [
    "national capital campaign consulting firm",
    "full-service fundraising consultant",
    "30 years fundraising experience",
    "capital campaign consultant",
    "nonprofit fundraising consulting firm",
    "annual fund calling services",
    "mid-level donor engagement program",
    "legacy and planned giving consultant",
  ],
  alternates: { canonical: "/" },
};

const HOME_FAQS = [
  {
    question: "How long has Catapult Fundraising been in business?",
    answer:
      "Catapult Fundraising's leadership brings more than 30 years of combined fundraising and donor engagement experience to every client relationship, dating back to the first-ever service academy phone program in 1991. That decades-long track record informs the strategy behind every capital campaign, annual fund program, and legacy giving effort we run today.",
    link: { href: "/about", label: "Read our full story" },
  },
  {
    question: "Is Catapult Fundraising a national firm?",
    answer:
      "Yes. Catapult is a national, full-service fundraising consulting firm headquartered in Henderson, Nevada, with additional offices in New Jersey and Texas. We manage capital campaigns and donor engagement programs for nonprofit clients across the country, not just in our home market.",
    link: { href: "/our-team", label: "Meet the national team" },
  },
  {
    question: "What services does Catapult Fundraising provide?",
    answer:
      "Catapult is a true full-service partner covering the entire donor lifecycle: capital and comprehensive campaigns, annual fund calling, mid-level donor engagement, and legacy and planned giving, plus major donor research and board fundraising training. Most firms specialize in only one of these; we deliver all of them as one accountable team.",
    link: { href: "/services/capital-campaign", label: "Explore our services" },
  },
  {
    question: "What makes Catapult different from other fundraising consultants?",
    answer:
      "Most firms either plan campaigns or execute calling programs, rarely both. Catapult stays with a client from the feasibility study through public-phase calling and ongoing donor engagement, so there is one accountable team instead of coordinating three separate vendors.",
    link: { href: "/results", label: "See client results" },
  },
  {
    question: "Which nonprofit sectors does Catapult Fundraising serve?",
    answer:
      "Catapult works with faith-based organizations, higher education institutions, healthcare and hospital foundations, arts and culture organizations, human services nonprofits, and youth development organizations nationwide.",
    link: { href: "/insights/case-studies", label: "Browse case studies" },
  },
  {
    question: "How do I get started with Catapult Fundraising?",
    answer:
      "Most engagements begin with a conversation about your organization's goals and readiness, often followed by a feasibility or donor assessment study to validate the campaign goal and timeline before any solicitation begins.",
    link: { href: "/contact", label: "Schedule a conversation" },
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Catapult Fundraising",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: "Catapult Fundraising | Nation's Full-Service Capital Campaign Consultants",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />

      <section className="border-t border-[rgb(var(--line))] bg-[rgb(var(--paper))] py-14 lg:py-16">
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            30+ Years of Fundraising Experience
          </p>
          <h2 className="mt-4 font-display text-4xl tracking-tight text-[rgb(var(--navy))] sm:text-5xl">
            The nation&rsquo;s full-service fundraising consulting firm, built by fundraisers who&rsquo;ve done the work.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            For more than 30 years, Catapult Fundraising&rsquo;s leadership has partnered with
            nonprofits nationwide, running capital campaigns, annual fund calling, mid-level
            donor engagement, and legacy giving programs that have generated hundreds of
            millions of dollars for our clients. Headquartered in Henderson, Nevada, with
            offices in New Jersey and Texas, Catapult is a national, full-service firm: the
            only team that plans a campaign and then staffs, calls, and manages every phase
            of it, rather than handing clients off between separate vendors.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-7 py-3.5 text-sm font-semibold text-[rgb(var(--paper))] transition-transform hover:scale-[1.02]"
            >
              Our Story
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/our-team"
              className="text-sm font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-8 hover:text-[rgb(var(--brass))]"
            >
              Meet our leadership team
            </Link>
          </div>
        </div>
      </section>

      <ServicesOverview />
      <ProcessTimeline />
      <SectorsServed />
      <ScrollingQuoteBanner />

      <QaLinksSection
        idSuffix="home"
        heading="Frequently asked questions about working with Catapult."
        intro="Straightforward answers about who we are and how we work, with links to the pages that go deeper on each topic."
        items={HOME_FAQS}
      />

      <CtaBand />
    </>
  );
}
