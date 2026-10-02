import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays } from "lucide-react";
import { CGA_WEBINAR } from "@/lib/webinars";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";

const PAGE_TITLE = "Free Fundraising Tools";
const PAGE_DESCRIPTION =
  "Three free tools from Catapult Fundraising: build a suggested gift chart and gift pyramid from your campaign goal, grade your capital campaign readiness in seven areas, and score your legacy and mid-level donor programs. Each one returns a branded PDF.";

export const metadata = {
  title: { absolute: `${PAGE_TITLE} for Nonprofits | Catapult` },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/resources" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/resources`,
  },
};

const TOOLS = [
  {
    href: "/resources/gift-chart-calculator",
    eyebrow: "About 30 seconds",
    name: "Gift Chart Calculator",
    headline: "What your campaign goal actually requires at the top.",
    description:
      "Enter a goal and get a suggested gift chart and a gift pyramid: how many gifts you need at each level, how many qualified prospects that takes, and how much of the goal your top ten gifts have to carry.",
    who: "Best for boards and staff sizing a capital campaign goal before anyone commits to it.",
  },
  {
    href: "/resources/campaign-readiness-assessment",
    eyebrow: "About 3 minutes",
    name: "Campaign Readiness Report Card",
    headline: "Whether you are ready to test a goal, and what is in the way.",
    description:
      "Sixteen questions produce a letter grade in seven areas, from board commitment to prospect depth at the top, then name the single biggest risk to the goal you entered and whether to move to a feasibility study now or build the base first.",
    who: "Best for executive directors and development directors weighing a campaign in the next 12 to 24 months.",
  },
  {
    href: "/resources/donor-loyalty-assessment",
    eyebrow: "About 3 minutes",
    name: "Donor Loyalty and Legacy Report Card",
    headline: "The donors nobody in your shop is talking to.",
    description:
      "Grades two tracks at once, legacy giving readiness and mid-level donor engagement, shows what a loyal donor pool your size tends to be worth, and tells you which of the two to start with.",
    who: "Best for shops with a solid annual fund and no formal legacy or mid-level program yet.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  url: `${SITE_URL}/resources`,
  isPartOf: { "@id": `${SITE_URL}/#organization` },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: TOOLS.map((tool, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: tool.name,
      url: `${SITE_URL}${tool.href}`,
    })),
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Free Tools", item: `${SITE_URL}/resources` },
  ],
};

export default function ResourcesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PageHero
        eyebrowInHeading
        eyebrow="Free Fundraising Tools"
        title="Answer the three questions every campaign conversation starts with."
        description="Can we raise it, are we ready, and who have we been ignoring. These are the same models our consultants use with clients, put in your hands for free. Each one ends with a branded PDF you can hand to your board."
      />

      <section className="mx-auto max-w-7xl px-6 pt-14 lg:px-10 lg:pt-16">
        <Link
          href={CGA_WEBINAR.href}
          className="group grid items-center gap-8 overflow-hidden rounded-2xl border border-[rgb(var(--brass))]/60 bg-[rgb(var(--navy))] text-[rgb(var(--paper))] sm:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr_auto] lg:pr-10"
        >
          <Image
            src={CGA_WEBINAR.image}
            alt={CGA_WEBINAR.title}
            width={520}
            height={520}
            sizes="260px"
            className="h-full w-full object-cover"
          />
          <div className="px-8 pb-8 sm:px-0 sm:py-8 sm:pr-8 lg:pr-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass-light))]">
              Free live webinar · with {CGA_WEBINAR.partner}
            </p>
            <h2 className="mt-3 font-display text-3xl text-balance">{CGA_WEBINAR.title}</h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-[rgb(var(--paper))]/75">
              <CalendarDays className="h-4 w-4 text-[rgb(var(--brass-light))]" />
              {CGA_WEBINAR.dateLabel} · {CGA_WEBINAR.timeLabel}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[rgb(var(--paper))]/70">
              Find the CGA prospects already in your donor file, start the conversation without
              opening with tax math, and set up a program that lasts.
            </p>
          </div>
          <span className="mx-8 mb-8 inline-flex w-fit items-center gap-2 rounded-full bg-[rgb(var(--brass))] px-6 py-3 text-sm font-semibold text-[rgb(var(--navy-deep))] sm:col-start-2 sm:mx-0 lg:col-start-3 lg:mb-0">
            Save my seat
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex flex-col justify-between rounded-2xl border border-[rgb(var(--line))] bg-white p-8 transition-colors hover:border-[rgb(var(--brass))]"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                  {tool.eyebrow}
                </p>
                <h2 className="mt-3 font-display text-2xl text-[rgb(var(--navy))]">{tool.name}</h2>
                <p className="mt-3 font-display text-lg text-[rgb(var(--navy))]/80">{tool.headline}</p>
                <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/70">{tool.description}</p>
                <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/60">{tool.who}</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
                Open the tool
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-3xl px-6 lg:px-10">
          <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
            How to use them together
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tight text-[rgb(var(--navy))] sm:text-5xl">
            Start with the number, then test whether you can reach it.
          </h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-[rgb(var(--ink))]/75">
            <p>
              Most organizations set a campaign goal from the project budget and work backward from
              there. The gift chart calculator shows what that goal demands of the top of your donor
              file, and it is usually a sobering picture: the top ten gifts have to carry sixty
              percent or more of the total, and every gift at the top needs roughly three qualified
              prospects behind it.
            </p>
            <p>
              Once you have seen the chart, the readiness report card grades whether your
              organization can go get those gifts. It looks past the goal at the seven things that
              actually decide a campaign, including board commitment, a case donors respond to, real
              major gift experience, and clean data. It ends by naming the one area most likely to
              stall you.
            </p>
            <p>
              The donor loyalty report card looks in the other direction, at the long-time donors
              who give faithfully at modest levels. That group holds most legacy commitments and
              most future mid-level upgrades, and in most shops nobody owns it.
            </p>
            <p>
              None of the three replaces a feasibility study. What they do is tell you whether a
              study is the right next step, and give you something concrete to put in front of your
              board while you decide. If you want a consultant to read your results with you,{" "}
              <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] underline-offset-4">
                get in touch
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
