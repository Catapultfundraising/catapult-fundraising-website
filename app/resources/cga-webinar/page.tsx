import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Video } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { CGA_WEBINAR as W } from "@/lib/webinars";

const SITE_URL = "https://www.catapultfr.com";

const PAGE_DESCRIPTION =
  "Free webinar from Catapult Fundraising and Endowment Partners, Wednesday, November 4, 2026: how to find charitable gift annuity prospects in your donor file, start the conversation, and build a sustainable CGA program.";

export const metadata = {
  title: { absolute: "Free CGA Webinar for Nonprofits | Catapult" },
  description: PAGE_DESCRIPTION,
  keywords: [
    "charitable gift annuity webinar",
    "CGA program nonprofit",
    "planned giving webinar",
    "charitable gift annuity prospects",
  ],
  alternates: { canonical: W.href },
  openGraph: {
    title: W.title,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}${W.href}`,
    images: [{ url: `${SITE_URL}${W.image}`, width: 1000, height: 1000, alt: W.title }],
  },
};

const OUTCOMES = [
  "Explain how a charitable gift annuity works, how it differs from a bequest, and why donors and nonprofits choose one, in language that works for your board and your donors.",
  "Spot strong CGA prospects in your own database using age, giving tenure, consistency, mission affinity and asset signals, not wealth alone, and sort them into priority tiers.",
  "Open a donor conversation that puts the relationship first, and know when to hand off to a custom gift proposal.",
  "Set the core program policies before your first donor is ready: minimum age, minimum gift, rate policy, investment approach and donor recognition.",
  "Understand the long-term side of a CGA program: longevity, investment and liquidity risk, plus lifetime payments, compliance and reporting.",
  "Use a five-question checklist to judge whether your organization is ready to offer CGAs.",
];

const PRESENTERS = [
  {
    name: "Anthony Alonso",
    role: "CEO, Catapult Fundraising",
    bio: "Anthony has 35 years in fundraising. Catapult runs legacy giving, capital campaign, and donor calling programs for nonprofits across the country.",
  },
  {
    name: "Diane Tuntland, CIMA",
    role: "Founder, CEO & CIO, Endowment Partners",
    bio: "Diane is the founder, CEO and chief investment officer of Endowment Partners, and covers the investment, risk and compliance side of running a CGA program.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: W.title,
  description: PAGE_DESCRIPTION,
  startDate: W.startIso,
  endDate: W.endIso,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  location: { "@type": "VirtualLocation", url: W.registerUrl },
  image: [`${SITE_URL}${W.image}`],
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: W.registerUrl,
  },
  organizer: [
    { "@type": "Organization", name: "Catapult Fundraising", url: SITE_URL },
    { "@type": "Organization", name: "Endowment Partners", url: "https://endowmentpartners.com" },
  ],
  performer: [
    { "@type": "Person", name: "Anthony Alonso" },
    { "@type": "Person", name: "Diane Tuntland" },
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Free Tools", item: `${SITE_URL}/resources` },
    { "@type": "ListItem", position: 3, name: "CGA Webinar", item: `${SITE_URL}${W.href}` },
  ],
};

function RegisterButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={W.registerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2 rounded-full bg-[rgb(var(--brass))] px-7 py-3.5 text-sm font-semibold text-[rgb(var(--navy-deep))] transition-transform hover:scale-[1.02] ${className}`}
    >
      Save My Free Seat
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </a>
  );
}

export default function CgaWebinarPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PageHero
        eyebrow="Free Live Webinar"
        title={W.title}
        description={W.subtitle}
      />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white shadow-sm">
            <Image
              src={W.image}
              alt={`${W.title}: live webinar with Diane Tuntland of Endowment Partners and Anthony Alonso of Catapult Fundraising, ${W.dateLabel}`}
              width={1000}
              height={1000}
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="h-auto w-full"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              Presented by Catapult Fundraising and {W.partner}
            </p>
            <ul className="mt-5 space-y-4 text-[rgb(var(--navy))]">
              <li className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-[rgb(var(--brass))]" />
                <span className="font-display text-xl">{W.dateLabel}</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-[rgb(var(--brass))]" />
                <span className="font-display text-xl">{W.timeLabel}</span>
              </li>
              <li className="flex items-center gap-3">
                <Video className="h-5 w-5 text-[rgb(var(--brass))]" />
                <span className="text-base text-[rgb(var(--ink))]/75">Live on Zoom. {W.format}</span>
              </li>
            </ul>
            <RegisterButton className="mt-8" />
            <p className="mt-3 text-sm text-[rgb(var(--ink))]/60">
              Free. Registration takes under a minute, and Zoom sends your join link and reminders.
            </p>

            <div className="mt-10 space-y-5 text-base leading-relaxed text-[rgb(var(--ink))]/75">
              <p>
                A charitable gift annuity (CGA) is a planned gift that pays the donor income for life.
                Unlike a bequest, it is funded today. Only about 4,000 of the more than 1.5 million
                U.S. nonprofits offer CGAs, so most loyal donors are never asked.
              </p>
              <p>
                In this free webinar, Anthony Alonso of Catapult Fundraising and Diane Tuntland of
                Endowment Partners walk through the full CGA pipeline, from finding the right donors
                to managing the gift for the rest of the donor&rsquo;s life. You will learn how a CGA
                works in plain English, which donors make strong candidates, how to start the
                conversation by phone without opening with tax math, and what needs to be in place
                before a donor says yes and long after.
              </p>
              <p>
                This session is for CEOs and chief development officers at mid-sized nonprofits,
                whether you are considering a CGA program or want more from the one you have.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
            What you will learn
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tight text-[rgb(var(--navy))] sm:text-5xl">
            By the end of this session, you will be able to:
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2">
            {OUTCOMES.map((item, i) => (
              <li key={i} className="flex gap-4 rounded-2xl border border-[rgb(var(--line))] bg-[rgb(var(--paper))] p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--navy))] font-display text-base text-[rgb(var(--brass-light))]">
                  {i + 1}
                </span>
                <span className="text-base leading-relaxed text-[rgb(var(--ink))]/80">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-[rgb(var(--line))] py-14 lg:py-16">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          <p className="font-display text-base sm:text-lg uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
            Your presenters
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {PRESENTERS.map((p) => (
              <div key={p.name} className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
                <h3 className="font-display text-2xl text-[rgb(var(--navy))]">{p.name}</h3>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">{p.role}</p>
                <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/70">{p.bio}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-[rgb(var(--navy))] p-8 text-[rgb(var(--paper))] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-2xl">{W.dateLabel}</p>
              <p className="mt-1 text-[rgb(var(--paper))]/70">{W.timeLabel} · Free · Live on Zoom</p>
            </div>
            <RegisterButton />
          </div>
          <p className="mt-8 text-sm text-[rgb(var(--ink))]/60">
            Want to see where legacy and planned gifts already sit in your donor file? Try the free{" "}
            <Link
              href="/resources/donor-loyalty-assessment"
              className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] underline-offset-4"
            >
              Donor Loyalty and Legacy Report Card
            </Link>{" "}
            or read about our{" "}
            <Link
              href="/services/legacy-giving"
              className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] underline-offset-4"
            >
              legacy giving work
            </Link>
            .
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
