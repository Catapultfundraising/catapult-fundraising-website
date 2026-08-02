import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { QaLinksSection } from "@/components/qa-links-section";
import { CtaBand } from "@/components/cta-band";
import { ArrowRight, Building, Users, Award } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "About Catapult Fundraising | 30+ Years, National Full-Service Firm",
  description:
    "Catapult Fundraising is the nation's full-service fundraising consulting firm, built on more than 30 years of capital campaign and donor engagement experience. Learn our story and how we work.",
  keywords: [
    "nonprofit fundraising consultant",
    "capital campaign consulting firm",
    "national fundraising consulting firm",
    "full-service fundraising consultant",
    "30 years fundraising experience",
    "Catapult Fundraising",
  ],
  alternates: { canonical: "/about" },
};

const ABOUT_FAQS = [
  {
    question: "Who is Catapult Fundraising?",
    answer:
      "Catapult Fundraising is the nation's full-service fundraising consulting firm, built on more than 30 years of combined leadership experience in capital campaigns, annual fund calling, mid-level donor engagement, and legacy giving. We were founded to close a gap in the industry: firms that plan campaigns rarely execute the public phase, and calling firms rarely understand campaign strategy. Catapult does both, as one accountable team.",
    link: { href: "/our-team", label: "Meet the leadership team" },
  },
  {
    question: "Is Catapult Fundraising a national or a local firm?",
    answer:
      "Both. Catapult is headquartered in Henderson, Nevada, with additional offices in New Jersey and Texas, and we manage capital campaigns and donor engagement programs for nonprofit clients across the entire United States. Being a national, full-service firm means the same disciplined process and reporting standards travel with every client, wherever they're located.",
    link: { href: "/results", label: "See our client results" },
  },
  {
    question: "What services does Catapult offer?",
    answer:
      "Catapult offers capital and comprehensive campaigns, endowment campaigns, major gift initiatives, major donor research, annual fund calling, mid-level donor engagement, and legacy and planned giving. Each service can stand alone or work together as one coordinated donor lifecycle strategy.",
    link: { href: "/services/capital-campaign", label: "View all services" },
  },
  {
    question: "How does Catapult run a capital campaign?",
    answer:
      "Every Catapult capital campaign moves through five phases: a feasibility or donor assessment study, campaign planning, quiet-phase major gift solicitation, public-phase calling, and stewardship. One team carries the campaign through every phase, so there's no loss of institutional knowledge between hand-offs.",
    link: { href: "/services/capital-campaign", label: "See the capital campaign process" },
  },
  {
    question: "Does Catapult help with annual fund and mid-level donor programs, not just capital campaigns?",
    answer:
      "Yes. Alongside capital campaigns, Catapult runs annual fund calling and an 8-stage mid-level donor engagement program that upgrades donors already giving above entry-level amounts, building a qualified pipeline of future major gift prospects.",
    link: { href: "/services/donor-engagement", label: "Learn about donor engagement" },
  },
  {
    question: "What is Catapult's Legacy Call program?",
    answer:
      "Legacy Call is Catapult's planned giving outreach program, designed to proactively identify bequests, beneficiary designations, and other deferred gifts from an organization's most loyal, longest-tenured donors, a segment most campaigns never fully engage.",
    link: { href: "/services/legacy-giving", label: "Explore legacy giving services" },
  },
  {
    question: "Which industries and nonprofit sectors does Catapult serve?",
    answer:
      "Catapult partners with faith-based organizations, higher education institutions, healthcare and hospital foundations, arts and culture organizations, human services nonprofits, and youth development organizations, among others, nationwide.",
    link: { href: "/insights/case-studies", label: "Read sector case studies" },
  },
  {
    question: "How do I start a conversation with Catapult Fundraising?",
    answer:
      "Reach out through our contact page to schedule a conversation about your organization's goals. Most engagements begin with a feasibility or donor assessment study to validate the campaign goal, timeline, and prospect pool before any solicitation begins.",
    link: { href: "/contact", label: "Schedule a conversation" },
  },
];

const VALUES = [
  {
    icon: Building,
    title: "One firm, every phase",
    description:
      "We are the only national firm that stays with a client from planning through public-phase calling, with no hand-offs between vendors and no lost institutional knowledge.",
  },
  {
    icon: Users,
    title: "Donor-centered, not transactional",
    description:
      "Every prospect is treated like a major donor-in-waiting, whether the ask is $50 or $5 million. That philosophy is why our participation rates run ahead of industry norms.",
  },
  {
    icon: Award,
    title: "Accountability built in",
    description:
      "Trained and monitored Engagement Officers, along with transparent reporting, mean your board sees exactly how the campaign is progressing at every stage.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${SITE_URL}/about#webpage`,
      url: `${SITE_URL}/about`,
      name: "About Catapult Fundraising | 30+ Years, National Full-Service Firm",
      description:
        "Catapult Fundraising is the nation's full-service fundraising consulting firm, built on more than 30 years of capital campaign and donor engagement experience. Learn our story and how we work.",
      isPartOf: { "@id": `${SITE_URL}/#organization` },
      about: { "@id": `${SITE_URL}/#organization` },
      breadcrumb: { "@id": `${SITE_URL}/about#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/about#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE_URL}/about` },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="About Catapult"
        title="30+ years of fundraising experience, built into the nation's full-service capital campaign firm."
        description="Catapult Fundraising was founded to close a gap in the industry: firms that plan campaigns rarely execute the public phase, and calling firms rarely understand campaign strategy. We do both, as one accountable, national team."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6d87d722-c1cc-47ac-82d6-2675e8c2162e.jpeg"
      />

      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-5 lg:items-start">
          <div className="lg:col-span-3">
            <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
              Our Story
            </p>
            <h2 className="mt-4 font-display text-4xl tracking-tight text-[rgb(var(--navy))] sm:text-5xl">
              A firm built by fundraisers, for fundraisers.
            </h2>
            <div className="mt-6 space-y-6 text-lg leading-relaxed text-[rgb(var(--ink))]/75">
          <p>
            Catapult Fundraising&rsquo;s leadership has spent more than 30 years in the
            fundraising profession, dating back to 1991, when our founders ran the
            first-ever service academy phone program in the country. That early work
            evolved into a firm built on a simple conviction: nonprofits deserve one
            accountable partner across the entire life of a campaign, not a hand-off
            between the firm that plans it and the firm that calls for it.
          </p>
          <p>
            Today, Catapult is a national, full-service fundraising consulting firm.
            We are headquartered in Henderson, Nevada, with additional offices in New
            Jersey and Texas, and our clients span the country, from faith-based
            organizations and higher education institutions to healthcare foundations,
            arts and culture nonprofits, human services agencies, and youth development
            programs. Being full-service means we cover the entire donor lifecycle:
            capital and comprehensive campaigns, major donor research, annual fund
            calling, mid-level donor engagement, and legacy and planned giving, all
            under one roof.
          </p>
          <p>
            Our services are delivered by{" "}
            <Link href="/our-team" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-4 hover:text-[rgb(var(--brass))]">
              a leadership and Engagement Officer team
            </Link>{" "}
            with decades of hands-on campaign experience, and the results speak for
            themselves: see how our{" "}
            <Link href="/results" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-4 hover:text-[rgb(var(--brass))]">
              client results
            </Link>{" "}
            and{" "}
            <Link href="/insights/case-studies" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-4 hover:text-[rgb(var(--brass))]">
              sector case studies
            </Link>{" "}
            compare to industry norms, or explore each of our{" "}
            <Link href="/services/capital-campaign" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-4 hover:text-[rgb(var(--brass))]">
              core services
            </Link>{" "}
            in depth below.
          </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link
                href="/our-team"
                className="group inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-7 py-3.5 text-sm font-semibold text-[rgb(var(--paper))] transition-transform hover:scale-[1.02]"
              >
                Meet Our Team
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="text-sm font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-8 hover:text-[rgb(var(--brass))]"
              >
                Schedule a conversation
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl lg:col-span-2">
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8868a9d9-479a-4758-b8bc-144aebe3f2da.png"
              alt="Catapult Fundraising's consulting team collaborating on campaign strategy"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-[rgb(var(--line))] bg-[rgb(var(--paper))] p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
                  <v.icon className="h-5 w-5 text-[rgb(var(--brass))]" />
                </span>
                <h3 className="mt-6 font-display text-[25px] text-[rgb(var(--navy))]">{v.title}</h3>
                <p className="mt-3 text-xl leading-relaxed text-[rgb(var(--ink))]/70">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <QaLinksSection
        idSuffix="about"
        eyebrow="How We Do Things"
        heading="Frequently asked questions about Catapult Fundraising."
        intro="Direct answers to the questions we hear most, each linked to the page that covers it in full depth."
        items={ABOUT_FAQS}
      />

      <CtaBand />
    </>
  );
}
