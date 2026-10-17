import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "is-the-phonathon-dead";
const TITLE = "Is the Phonathon Dead? What Works Now for Calling Programs";
const DESCRIPTION = "Anthony R. Alonso on why the traditional phonathon is struggling, what still works in telefundraising, and how to run a calling program donors actually answer.";
const HERO = "/blog/is-the-phonathon-dead/hero-caller.png";
const HERO_ALT = "An experienced fundraising caller wearing a headset, smiling while reading a donor record on her monitor";

export const metadata = {
  title: { absolute: "Is the Phonathon Dead? What Works for Calling Programs | Catapult" },
  description: DESCRIPTION,
  keywords: ["phonathon", "is the phonathon dead", "university phonathon", "outsourced phonathon", "telefundraising", "phone fundraising", "fundraising call center", "annual fund calling program"],
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
    "q": "Is the phonathon dead?",
    "a": "No, but the old model is struggling. Fewer people answer unknown numbers, and student programs restart every year. Calling programs that use pre-call letters, experienced callers, manual dialing, enough attempts and personalized asks still raise significant money."
  },
  {
    "q": "What's the difference between a phonathon and telefundraising?",
    "a": "Phonathon usually means a high-volume calling night or season, often staffed by students. Telefundraising is the broader practice of fundraising by phone. Done well, it's relationship-based: the caller knows the donor's history, thanks them and makes a tailored ask."
  },
  {
    "q": "Should we outsource our phonathon?",
    "a": "Outsourcing makes sense when turnover, training and supervision are eating your results, or when you want experienced callers for lapsed, upgrade and leadership-level donors. Many schools keep students for young alumni and outsource the rest."
  },
  {
    "q": "How many times should we try to reach each donor?",
    "a": "We plan up to 15 attempts for current donors and 5 to 10 for lapsed donors and non-donors, spread over weeks or months at different times of day."
  }
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      headline: TITLE,
      datePublished: "2026-10-17",
      dateModified: "2026-10-17",
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

export default function IsThePhonathonDeadPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={TITLE} description="The phone didn't stop working. The old way of using it did." />
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
        <p className={P}>Every few months someone asks me whether the phonathon is dead. Usually it&rsquo;s a development director who just watched a student calling program raise less than it did the year before, with fewer callers, more turnover and a pile of unfulfilled pledges.</p>
        <p className={P}>My answer is always the same. The phone isn&rsquo;t dead. The phonathon, the way most of us learned to run it, is struggling. Those are two very different problems.</p>
        <h2 className={H2}>What changed</h2>
        <p className={P}>In the 1990s, roughly nine out of ten people a phonathon called would pick up. Today it&rsquo;s closer to half. Spam filters, caller ID and a general distrust of unknown numbers changed the math.</p>
        <p className={P}>The classic phonathon was built for the old math. Hire a room of callers, hand them a long list and a script, and push volume. When nearly everyone answered, volume worked. When half the people don&rsquo;t answer and the other half are wary of anyone asking for money, volume just burns through your list.</p>
        <p className={P}>There&rsquo;s a second problem that gets less attention. In a traditional student phonathon, every fall starts over. The best callers graduate. New callers learn on your donors. And a donor who gave for fifteen years gets the same script as someone who gave once in 2011.</p>
        <h2 className={H2}>Telefundraising is not telemarketing</h2>
        <p className={P}>People give to people, not to fancy letters or technology. A good calling program is an extension of face-to-face fundraising: the right person, the right ask, at the right time. It is not a call center reading a script.</p>
        <p className={P}>Our goal on every call is simple. Leave every person feeling good about the organization, whether they give on that call or not. Loyalty follows when we&rsquo;re loyal to the donor first.</p>
        <h2 className={H2}>What still works</h2>
        <h3 className={H3}>1. A letter before the call</h3>
        <p className={P}>A peer donor, volunteer or alumnus sends a personal letter or email before anyone dials. The caller then follows up on that letter instead of cold-calling. A donor who knows the call is coming is far more likely to answer, and far more likely to say yes. Timing matters too. When a pre-call letter sits too long before the calls start, results drop.</p>
        <h3 className={H3}>2. Experienced callers, not new ones every fall</h3>
        <p className={P}>Our engagement officers are mature professionals. Many have been with us for years, and we don&rsquo;t hire people with telemarketing backgrounds. They read the donor&rsquo;s record before they dial and talk to that donor like a person, because they know who they&rsquo;re talking to.</p>
        <h3 className={H3}>3. Manual dialing for donors</h3>
        <p className={P}>We don&rsquo;t use predictive dialers for current and lapsed donors. The caller dials by hand after reviewing the record, so there&rsquo;s no awkward pause when the donor picks up and the caller is ready to have a real conversation. For a very large non-donor file, a dialer can make sense. For people who already gave, it doesn&rsquo;t.</p>
        <h3 className={H3}>4. Enough attempts, spread out</h3>
        <p className={P}>One or two tries in a single week isn&rsquo;t a program. We plan up to 15 attempts for current donors and 5 to 10 for lapsed donors and non-donors, spread over weeks or months, at different times of day, with local caller ID.</p>
        <h3 className={H3}>5. An ask built from the donor&rsquo;s history</h3>
        <p className={P}>Current donors, lapsed donors, non-donors and mid-level donors each get a different conversation and a different ask. We base the amount on what that donor has given, how often and how recently. Multi-installment pledges help a donor say yes to a bigger number, and they build a habit of giving.</p>
        <h3 className={H3}>6. Follow-through on every pledge</h3>
        <p className={P}>A pledge isn&rsquo;t revenue until it&rsquo;s paid. We send a payment text right after the call and reminders at 14, 28 and 42 days, instead of the old 30, 60 and 90. In one program, installment pledges were 90% on track while envelope returns sat at 28%. Fulfillment is part of the program, not an afterthought.</p>
        <h2 className={H2}>What it looks like when it works</h2>
        <p className={P}>University of Maryland Global Campus relaunched its annual giving calling program with us in FY24. In FY26 it raised $238,754 in pledges, and 1,107 people who had never given before made their first gift. Non-donors pledged at 18%, up from 8% the year before.</p>
        <p className={P}>For a private college in New York that had been raising about $80,000 a year with student callers, our first fall program pledged $277,554 from 650 donors.</p>
        <p className={P}>For a prestigious Northeast university, one calling program reached 33,419 alumni, parents and class-project prospects and secured 4,475 pledges totaling $2,776,638, at 15 cents per dollar raised.</p>
        <blockquote className="mt-8 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">The phone isn&rsquo;t dead. Treating donors like call volume is.</blockquote>
        <h2 className={H2}>Should you keep your student phonathon?</h2>
        <p className={P}>Maybe. Student callers can be great at connecting with young alumni, and some schools run excellent programs. But be honest about the cost of turnover, training and supervision, and about which donors you&rsquo;re handing to a first-year caller.</p>
        <p className={P}>A lot of our university partners split the file. Students keep the young-alumni segments. Our engagement officers take lapsed donors, leadership-level annual donors and anyone who&rsquo;s ready for an upgrade conversation.</p>
        <h2 className={H2}>Where to start</h2>
        <p className={P}>Pull last year&rsquo;s numbers: contact rate, pledge rate, average gift, fulfillment rate and cost per dollar raised. If you can&rsquo;t get those five numbers easily, that&rsquo;s your first finding.</p>
        <p className={P}>Then look at who you&rsquo;re calling and who&rsquo;s calling them. That&rsquo;s usually where the answer is. If you&rsquo;d like a second set of eyes, here&rsquo;s how our <Link href="/services/telefundraising" className="font-semibold text-[rgb(var(--navy))] underline">telefundraising and phonathon program</Link> works, or <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">let&rsquo;s talk</Link>.</p>

        <h2 className={H2}>Questions we hear</h2>
        <dl className="mt-6 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
              <dt className="font-display text-xl text-[rgb(var(--navy))]">{f.q}</dt>
              <dd className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{f.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">The contact-rate comparison reflects Catapult Fundraising&rsquo;s experience running calling programs since the 1990s. Client figures come from Catapult Fundraising program reports. Clients are named only where they have been publicly identified by Catapult; others are described by type.</p>
      </article>

      <CtaBand />
    </>
  );
}
