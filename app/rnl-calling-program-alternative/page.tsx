import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClientLogo } from "@/components/client-logo";
import { TestimonialQuote } from "@/components/testimonial-quote";
import { TESTIMONIALS } from "@/lib/testimonials";

const SITE_URL = "https://www.catapultfr.com";
const PATH = "/rnl-calling-program-alternative";
const TITLE = "RNL Calling Program Alternative | Catapult Fundraising";
const DESCRIPTION = "Looking for an alternative to RNL for university fundraising calls? Explore Catapult's experienced callers, higher-ed results and transition planning.";
const BOOKING_URL = "https://go.catapultfr.com/meetings/anthonya";
const CTA = "Discuss Your Calling Program Transition";
const HERO = "/blog/is-the-phonathon-dead/hero-caller.png";
const SACRAMENTO_EXCERPT = "Their callers are exceptionally well-trained, authentic, and a true extension of our advancement team.";
const umgc = TESTIMONIALS.find((t) => t.id === "matthew-talley")!;
const sacramento = TESTIMONIALS.find((t) => t.id === "erica-kobbe")!;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    type: "website", title: TITLE, description: DESCRIPTION,
    url: `${SITE_URL}${PATH}`,
    images: [{ url: `${SITE_URL}${HERO}`, width: 1536, height: 1024, alt: "An experienced fundraising caller reviewing a donor record" }],
  },
};

const FAQS = [
  {
    question: "Can Catapult work alongside our student callers?",
    answer: "Yes. Some institutions keep students focused on young alumni and use Catapult’s Engagement Officers for lapsed donors or upgrade conversations. We can discuss how to divide the work.",
  },
  {
    question: "What happens to existing pledges?",
    answer: "Outstanding pledges and their follow-up responsibilities belong in the transition plan. We’ll discuss what remains with your institution or current provider and what fulfillment support you need from Catapult.",
  },
  {
    question: "How soon could a program begin?",
    answer: "Timing depends on program scope, data readiness, training and available capacity. Bring your preferred calling dates to the first conversation so we can assess a realistic schedule.",
  },
  {
    question: "Is Catapult a replacement for CAMPUSCALL software?",
    answer: "This page describes Catapult’s managed fundraising calling service. If your need is software for a campus-run program, clarify that when we speak so we can assess the fit.",
  },
];
const STEPS = [
  { title: "Review your current program.", body: "Discuss calling dates, results, donor segments and the work currently handled by your provider or campus staff." },
  { title: "Define the data and pledge handoff.", body: "Identify the records available to transfer, required permissions, recent contacts, opt-outs and outstanding pledges. Agree who owns each follow-up." },
  { title: "Set the scope and schedule.", body: "Confirm caller training, reporting expectations and launch timing before committing to a start date." },
];
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": `${SITE_URL}${PATH}#webpage`, url: `${SITE_URL}${PATH}`, name: TITLE, description: DESCRIPTION,
      about: { "@type": "Service", name: "AF Connect university annual fund calling", url: `${SITE_URL}/services/telefundraising`, provider: { "@id": `${SITE_URL}/#organization` } } },
    { "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Calling Program Transition", item: `${SITE_URL}${PATH}` },
    ] },
  ],
};
const BODY = "text-lg leading-relaxed text-[rgb(var(--ink))]/75";
const H2 = "font-display text-3xl leading-tight text-[rgb(var(--navy))] sm:text-4xl";
const BUTTON = "inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-[rgb(var(--brass))] px-6 py-4 text-center text-base font-semibold text-[rgb(var(--navy))] transition hover:bg-[rgb(var(--brass-light))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--brass))]";

export default function CallingProgramTransitionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="overflow-hidden bg-[rgb(var(--navy))] text-[rgb(var(--paper))]">
        <div className="mx-auto grid max-w-7xl gap-9 px-6 py-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-12 lg:px-10 lg:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--brass-light))]">AF Connect · University Calling</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">A new calling partner for your university’s annual fund</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[rgb(var(--paper))]/90">If you’re evaluating an alternative to Ruffalo Noel Levitz (RNL) for your calling program, start with the people who will speak for your institution.</p>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[rgb(var(--paper))]/80">Catapult Fundraising’s AF Connect program pairs experienced Engagement Officers with personal pre-call letters and asks based on each donor’s giving history. We help colleges and universities renew support, reconnect with lapsed donors and bring new donors into the annual fund.</p>
            <a href={BOOKING_URL} className={`mt-7 ${BUTTON}`}>{CTA}</a>
          </div>
          <div className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[var(--radius)] lg:aspect-[3/4]">
            <Image src={HERO} alt="An experienced fundraising caller reviewing a donor record" fill priority sizes="(min-width: 1024px) 38vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section aria-labelledby="higher-education-proof" className="border-b border-[rgb(var(--line))] bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <h2 id="higher-education-proof" className={H2}>Higher-education programs already working with Catapult</h2>
          <div className="mt-9 grid gap-10 lg:grid-cols-2 lg:gap-0">
            <section aria-labelledby="umgc-heading" data-testid="umgc-results" className="lg:pr-10">
              <h3 id="umgc-heading" className="font-display text-2xl text-[rgb(var(--navy))]">University of Maryland Global Campus</h3>
              {umgc.logo && <ClientLogo logo={umgc.logo} maxH={44} maxW={240} className="mt-5" />}
              <p className={`mt-6 ${BODY}`}>University of Maryland Global Campus relaunched its annual giving calling program with Catapult in FY24. In FY26, the program secured $238,754 in pledges and brought in 1,107 first-time donors.</p>
            </section>
            <section aria-labelledby="sacramento-heading" data-testid="sacramento-testimonial" className="border-t border-[rgb(var(--line))] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <h3 id="sacramento-heading" className="mb-6 font-display text-2xl text-[rgb(var(--navy))]">Sacramento State University</h3>
              <TestimonialQuote compact t={{ ...sacramento, quote: [SACRAMENTO_EXCERPT] }} />
            </section>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-16">
        <div>
          <h2 className={H2}>Give your next calling partner the full picture</h2>
          <p className={`mt-5 ${BODY}`}>A change in providers is a good time to review what your program needs. Which donor segments respond? Where are pledges going unfulfilled? What should callers know before they represent your institution?</p>
        </div>
        <div>
          <p className={BODY}>Our approach includes:</p>
          <ul className={`mt-4 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))] ${BODY}`}>
            <li>Experienced Engagement Officers trained on your mission and case for support.</li>
            <li>Segmentation and personalized ask amounts informed by giving history.</li>
            <li>Pre-call letters and coordinated phone, text and email outreach.</li>
            <li>Pledge follow-up and fulfillment services.</li>
          </ul>
          <Link href="/services/telefundraising" className="mt-6 inline-block font-semibold text-[rgb(var(--navy))] underline underline-offset-4">Explore AF Connect and our telefundraising services</Link>
        </div>
      </section>

      <section className="border-y border-[rgb(var(--line))] bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <h2 className={H2}>Plan the handoff before calling begins</h2>
          <p className={`mt-5 max-w-3xl ${BODY}`}>The first conversation should establish what is changing, what needs to continue and when.</p>
          <ol className="mt-9 grid gap-8 lg:grid-cols-3 lg:gap-10">
            {STEPS.map((step, i) => <li key={step.title} className="border-t-2 border-[rgb(var(--brass))] pt-5">
              <span aria-hidden="true" className="font-display text-3xl text-[rgb(var(--brass))]">0{i + 1}</span>
              <h3 className="mt-3 font-display text-2xl text-[rgb(var(--navy))]">{step.title}</h3>
              <p className={`mt-3 ${BODY}`}>{step.body}</p>
            </li>)}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 lg:px-10 lg:py-16">
        <h2 className={H2}>Questions about changing calling providers</h2>
        <dl className="mt-8 divide-y divide-[rgb(var(--line))] border-y border-[rgb(var(--line))]">
          {FAQS.map((faq) => <div key={faq.question} className="py-6">
            <dt className="font-display text-2xl text-[rgb(var(--navy))]">{faq.question}</dt>
            <dd className={`mt-3 ${BODY}`}>{faq.answer}</dd>
          </div>)}
        </dl>
      </section>

      <section className="bg-[rgb(var(--navy))] py-12 text-[rgb(var(--paper))] lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">Let’s discuss your next calling program</h2>
          <p className="mt-5 text-lg leading-relaxed text-[rgb(var(--paper))]/85">Tell us about your current program, the donors you want to reach and your preferred timing. We’ll discuss whether AF Connect is a fit and what a transition would involve.</p>
          <a href={BOOKING_URL} className={`mt-7 ${BUTTON}`}>{CTA}</a>
        </div>
      </section>
      <p className="mx-auto max-w-7xl px-6 py-6 text-sm leading-relaxed text-[rgb(var(--ink))]/65 lg:px-10">Catapult Fundraising is an independent provider and is not affiliated with or endorsed by Ruffalo Noel Levitz.</p>
    </>
  );
}
