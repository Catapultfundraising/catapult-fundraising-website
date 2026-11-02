import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PartnerSignup } from "@/components/partner-signup";
import { BOOKING_URL, getPartner } from "@/lib/partners";
import { CGA_WEBINAR as W } from "@/lib/webinars";
import { POSTS } from "@/lib/posts";

const SLUG = "endowment-partners";
const EP_URL = "https://www.endowmentpartners.com/";

export const metadata = {
  title: { absolute: `${W.title} | Catapult + Endowment Partners` },
  description: "Joint webinar resources from Anthony Alonso and Diane Tuntland: presentation slides, free fundraising tools, planned giving articles, and support for your CGA program.",
  alternates: { canonical: `/partners/${SLUG}` },
  robots: { index: false, follow: false },
};

const TOOLS = [
  { href: "/resources/donor-loyalty-assessment", title: "Donor Loyalty and Legacy Report Card", description: "Assess donor loyalty and legacy-giving readiness, then identify where to focus next." },
  { href: "/resources/campaign-readiness-assessment", title: "Campaign Readiness Report Card", description: "Review your fundraising readiness and the foundations your organization needs." },
  { href: "/resources/gift-chart-calculator", title: "Gift Chart Calculator", description: "Build a suggested gift chart and prospect pyramid for your fundraising goal." },
];

const ARTICLE_SLUGS = [
  "how-to-start-a-planned-giving-program",
  "growing-your-legacy-society-why-arent-we-asking",
  "national-make-a-will-month-planned-giving-conversation",
  "planned-giving-loyalty-jeff-grandy-first-day-podcast",
  "capital-campaign-donor-engagement-legacy-giving-best-practices",
];

const OUTCOMES = [
  ["Explain a CGA in plain English", "Understand how a charitable gift annuity differs from a bequest and why donors and nonprofits choose one."],
  ["Find the right donors", "Use age, giving tenure, consistency, mission affinity and asset signals, not wealth alone, to prioritize prospects."],
  ["Start a relationship-first conversation", "Open the conversation by phone and recognize when to hand off for a customized gift proposal."],
  ["Build the program before the gift", "Set minimum age, minimum gift, rate policy, investment approach and donor recognition."],
  ["Plan for the long term", "Understand longevity, investment and liquidity risk alongside lifetime payments, compliance and reporting."],
  ["Check organizational readiness", "Use the five-question readiness checklist in the presentation to identify your next step."],
];

export default function EndowmentPartnersResourcesPage() {
  const partner = getPartner(SLUG);
  if (!partner) notFound();
  const articles = ARTICLE_SLUGS.flatMap((slug) => {
    const post = POSTS.find((item) => item.slug === slug);
    return post ? [{ slug: post.slug, title: post.title, description: post.description, image: post.image, alt: post.alt, readTime: post.readTime }] : [];
  });
  return (
    <>
      <section className="border-b border-[rgb(var(--line))] bg-[rgb(var(--paper))]">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.45fr_1fr]">
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--brass))]">Joint webinar resources · November 4, 2026</p>
              <h1 className="mt-4 font-display text-4xl leading-[1.08] tracking-tight text-[rgb(var(--navy))] sm:text-5xl lg:text-6xl">{W.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[rgb(var(--ink))]/80">{W.subtitle}.</p>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[rgb(var(--ink))]/75">{partner.intro}</p>
              <a href="#webinar-resources" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-7 py-3.5 font-semibold text-white hover:opacity-90">Get the slides and resources <ArrowRight className="h-4 w-4" /></a>
            </div>
            <Image src={W.image} alt="Joint CGA webinar with Diane Tuntland and Anthony Alonso" width={1000} height={1000} sizes="(min-width:1024px) 420px, 100vw" className="mx-auto hidden h-auto w-full max-w-md sm:block" />
          </div>
          <div className="mt-10 grid gap-6 border-t border-[rgb(var(--line))] pt-6 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Anthony Alonso</h2>
              <p className="mt-1 text-sm font-semibold text-[rgb(var(--brass))]">President &amp; CEO · Catapult Fundraising</p>
              <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/75">Donor identification, Legacy Call, relationship-first outreach and planned giving conversations.</p>
            </div>
            <div>
              <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Diane Tuntland, CIMA</h2>
              <p className="mt-1 text-sm font-semibold text-[rgb(var(--brass))]">CEO &amp; Chief Investment Officer · Endowment Partners</p>
              <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/75">CGA program setup, investment management, governance and long-term administration.</p>
            </div>
          </div>
        </div>
      </section>
      <section id="webinar-resources" className="scroll-mt-28 bg-[rgb(var(--paper))] px-6 py-14 lg:py-20">
        <PartnerSignup partnerSlug={SLUG} partnerName={partner.name} bookingUrl={BOOKING_URL} articles={articles} tools={TOOLS} serviceChoices={partner.serviceChoices} serviceChoiceGroups={partner.serviceChoiceGroups} deck={partner.deck} followUpChoices={partner.followUpChoices?.map((choice) => choice.label)} privacyNotice={partner.privacyNotice} compact readingList="Practical articles on planned giving, Legacy Call, loyal donors and starting the legacy conversation." />
      </section>
      <section className="border-t border-[rgb(var(--line))] bg-white px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl text-[rgb(var(--navy))]">Two partners. One connected CGA program.</h2>
          <p className="mt-3 max-w-3xl text-[rgb(var(--ink))]/75">From finding loyal donors to managing lifetime obligations, each firm brings a different part of the program.</p>
          <div className="mt-8 grid gap-10 sm:grid-cols-2">
            <div className="border-t-2 border-[rgb(var(--brass))] pt-5">
              <h3 className="font-display text-2xl text-[rgb(var(--navy))]">Catapult Fundraising</h3>
              <p className="mt-3 leading-relaxed text-[rgb(var(--ink))]/75">Identify and prioritize prospects, coordinate donor outreach, and move from qualification calls to gift planning conversations. Explore Legacy Call, mid-level donor engagement, annual fund calling, capital campaigns, feasibility studies and board development.</p>
              <Link href="/services/planned-giving" className="mt-4 inline-flex items-center gap-2 font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] underline-offset-4">Explore Legacy Call and planned giving <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="border-t-2 border-[rgb(var(--brass))] pt-5">
              <h3 className="font-display text-2xl text-[rgb(var(--navy))]">Endowment Partners</h3>
              <p className="mt-3 leading-relaxed text-[rgb(var(--ink))]/75">Investment management, investment consulting, governance and donor stewardship for nonprofits, foundations and endowments. For CGA programs, the webinar covers gift illustrations, implementation, investment, payments, administration and reporting.</p>
              <a href={`${EP_URL}services`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] underline-offset-4">Explore Endowment Partners services <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-[rgb(var(--line))] bg-[rgb(var(--paper))] px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl text-[rgb(var(--navy))]">Put the webinar into practice</h2>
          <ol className="mt-8 grid gap-x-12 gap-y-7 sm:grid-cols-2">
            {OUTCOMES.map(([title, description], index) => (
              <li key={title} className="flex gap-4">
                <span className="font-display text-3xl text-[rgb(var(--brass))]">{index + 1}.</span>
                <div><h3 className="font-display text-xl text-[rgb(var(--navy))]">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/75">{description}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-10 border-t border-[rgb(var(--line))] pt-5 text-xs leading-relaxed text-[rgb(var(--ink))]/60">Educational information only, not individualized legal, tax or investment advice. Work with qualified advisers and confirm the requirements that apply to your organization.</p>
        </div>
      </section>
    </>
  );
}
