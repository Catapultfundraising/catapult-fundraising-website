import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "choosing-a-nonprofit-fundraising-call-center";
const TITLE = "Choosing a Nonprofit Fundraising Call Center: Telefundraising vs. Telemarketing";
const DESCRIPTION = "Anthony R. Alonso on the difference between telemarketing and telefundraising, and the questions to ask before you hand your donors to a call center.";
const HERO = "/blog/choosing-a-nonprofit-fundraising-call-center/hero-callers.jpg";
const HERO_ALT = "An experienced fundraising caller smiling on a call with a donor";

export const metadata = {
  title: { absolute: "Choosing a Fundraising Call Center | Catapult Fundraising" },
  description: DESCRIPTION,
  keywords: ["fundraising call center", "telefundraising", "telemarketing fundraising companies", "telephone fundraising", "nonprofit call center"],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [{ url: `${SITE_URL}${HERO}`, width: 1536, height: 1024, alt: HERO_ALT }],
  },
};

const FAQS = [
  {
    "q": "What is the difference between telefundraising and telemarketing?",
    "a": "Telemarketing is built for call volume and scripted sales. Telefundraising treats each call as a donor conversation: callers review the donor's history, speak naturally and focus on the long-term relationship as well as the gift."
  },
  {
    "q": "How do I choose a fundraising call center?",
    "a": "Ask who the callers are, how long they stay, how they dial, what gets sent before the call, how pledges are collected and what reports you'll receive. Listen to real calls before you sign."
  },
  {
    "q": "Do phone fundraising programs still work?",
    "a": "Yes, when they are personal. Fewer people answer than in the 1990s, but experienced callers, a peer letter before the call and disciplined follow-up still produce strong results."
  },
  {
    "q": "What pledge fulfillment rate should I expect?",
    "a": "It varies by organization and donor type. Ask any firm how they collect pledges; a text right after the call and reminders at 14, 28 and 42 days help close the gap between pledges and dollars."
  }
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      headline: TITLE,
      datePublished: "2026-10-19",
      dateModified: "2026-10-19",
      description: DESCRIPTION,
      image: [`${SITE_URL}${HERO}`],
      author: {
        "@type": "Person",
        name: "Anthony R. Alonso",
        jobTitle: "President and Chief Executive Officer",
        url: `${SITE_URL}/our-team`,
        worksFor: { "@id": `${SITE_URL}/#organization` },
      },
      publisher: {
        "@type": "Organization",
        name: "Catapult Fundraising",
        logo: {
          "@type": "ImageObject",
          url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3b507e74-308f-4ba5-aaac-554b31247f7e.png",
        },
      },
      mainEntityOfPage: `${SITE_URL}/blog/${SLUG}`,
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const P = "mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70";
const H2 = "mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]";
const H3 = "mt-8 font-display text-2xl text-[rgb(var(--navy))]";
const LI = "text-lg leading-relaxed text-[rgb(var(--ink))]/70";

export default function ChoosingANonprofitFundraisingCallCenterPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={TITLE} description="Your donors will judge your organization by the voice on the other end of the phone. Choose it carefully." />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={TITLE} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Anthony R. Alonso, President and CEO, Catapult Fundraising
        </p>
        <div className="mt-6 mb-6 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image src={HERO} alt={HERO_ALT} fill className="object-cover" priority />
          </div>
        </div>
        <p className={P}>When a development director tells me they&rsquo;re looking for a call center, the first thing I ask is what they want the call to do. If the answer is &ldquo;raise money this year,&rdquo; plenty of firms can help. If the answer is &ldquo;raise money this year and leave every donor feeling good about us,&rdquo; the list gets a lot shorter.</p>
        <p className={P}>That&rsquo;s the difference between telemarketing and telefundraising, and it&rsquo;s the most important thing to understand before you sign anything.</p>
        <h2 className={H2}>Telemarketing and telefundraising are not the same thing</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/choosing-a-nonprofit-fundraising-call-center/cc-difference.png" alt="Telemarketing reads a script, dials for volume, new caller every call. Telefundraising holds a real conversation, reads the donor record, same caller all year" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Telemarketing is built for volume. Callers read a script, a predictive dialer connects them to whoever picks up, and the goal is the next call. It works for selling magazine subscriptions. It&rsquo;s hard on donor relationships.</p>
        <p className={P}>Telefundraising treats the call as a donor conversation. The caller reads the record before dialing, knows the donor&rsquo;s history, and has a real conversation instead of reciting a script. People give to people, not to fancy letters or technology.</p>
        <p className={P}>At Catapult, we don&rsquo;t hire people with telemarketing experience. Our engagement officers are mature professionals, with an average age in the late 50s, and some have been with us for more than 20 years.</p>
        <h2 className={H2}>Questions to ask any call center</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/choosing-a-nonprofit-fundraising-call-center/cc-checklist.png" alt="Questions to ask any call center: who are the callers, how long do they stay, how do they dial, what gets sent before the call, how are pledges collected, what reports will you see" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))]">
          <li className={LI}><strong>Who are the callers?</strong> Students, temp staff or experienced professionals? Ask to listen to real calls.</li>
          <li className={LI}><strong>How long do they stay?</strong> Turnover is the hidden cost of any calling program. Our caller retention runs about 70%.</li>
          <li className={LI}><strong>How do they dial?</strong> A predictive dialer has its place in a large non-donor file. Current and lapsed donors deserve a person who reviewed their record first.</li>
          <li className={LI}><strong>What gets sent before the call?</strong> We use a letter from a peer donor or alumnus so the caller is following up on something, not cold-calling.</li>
          <li className={LI}><strong>How are pledges collected?</strong> Ask about texts, reminders and fulfillment rates, not just pledge totals.</li>
          <li className={LI}><strong>What reports will you see?</strong> You should see results by segment, not one number at the end of the campaign.</li>
        </ul>
        <h2 className={H2}>Reaching donors takes work</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/choosing-a-nonprofit-fundraising-call-center/cc-reach.png" alt="About 9 in 10 people answered the phone in 1996; today about half do" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>In 1996 about nine in ten people answered the phone. Today it&rsquo;s about half. Any firm that promises you the contact rates of twenty years ago isn&rsquo;t being straight with you.</p>
        <p className={P}>What works now is persistence with care: local caller IDs, clean number management, and enough attempts spread over months. We make up to 15 attempts for current donors and 5 to 10 for lapsed and non-donors, so nobody gets called five times in a week.</p>
        <h2 className={H2}>A pledge isn&rsquo;t revenue until it&rsquo;s paid</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/choosing-a-nonprofit-fundraising-call-center/cc-fulfillment.png" alt="Pledge follow-up: a text right after the call, then reminders at day 14, 28 and 42" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Pledge totals look great in a final report. Collected dollars pay the bills. Ask every firm what their fulfillment process is.</p>
        <p className={P}>We send a payment text right after the call and reminders at 14, 28 and 42 days instead of the old 30, 60 and 90. At University of Maryland Global Campus, fulfillment climbed from about 42% to about 48% in a year, and we&rsquo;re aiming higher.</p>
        <h2 className={H2}>What a good partnership looks like</h2>
        <p className={P}>UMGC relaunched its calling program with us in FY24. In FY26 it raised $238,754 in pledges, and 1,107 people who had never given before made their first gift. Non-donors pledged at 18%, up from 8% the year before. That&rsquo;s what happens when the right donor gets the right conversation.</p>
        <blockquote className="mt-8 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">The phone isn&rsquo;t dead. Treating donors like call volume is.</blockquote>
        <h2 className={H2}>Where to start</h2>
        <p className={P}>Before you choose a partner, decide which donors you&rsquo;re handing over and what you want them to feel after the call. Then ask the questions above. Learn how our <Link href="/services/telefundraising" className="font-semibold text-[rgb(var(--navy))] underline">telefundraising program</Link> works, read <Link href="/blog/is-the-phonathon-dead" className="font-semibold text-[rgb(var(--navy))] underline">is the phonathon dead?</Link>, or <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">talk with us</Link> about your file.</p>

        <h2 className={H2}>Questions we hear</h2>
        <dl className="mt-6 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
              <dt className="font-display text-xl text-[rgb(var(--navy))]">{f.q}</dt>
              <dd className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{f.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">Figures reflect Catapult Fundraising calling programs, including University of Maryland Global Campus FY24 to FY26 results. Individual results vary.</p>
      </article>

      <CtaBand />
    </>
  );
}
