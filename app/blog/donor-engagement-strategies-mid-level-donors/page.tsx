import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "donor-engagement-strategies-mid-level-donors";
const TITLE = "Donor Engagement Strategies That Actually Move Mid-Level Donors";
const DESCRIPTION = "Anthony R. Alonso on how to define your mid-level donors, the touches that build loyalty before the ask, and how to upgrade donors without burning them out.";
const HERO = "/blog/donor-engagement-strategies-mid-level-donors/hero-handwritten-note.png";
const HERO_ALT = "A fundraiser handwriting a thank-you card at his desk, with envelopes and a phone nearby";

export const metadata = {
  title: { absolute: "Donor Engagement Strategies for Mid-Level Donors | Catapult" },
  description: DESCRIPTION,
  keywords: ["donor engagement", "donor engagement strategies", "mid-level donors", "mid level donor program", "mid-level giving", "donor upgrade", "donor stewardship", "thank you calls to donors"],
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
    "q": "What is donor engagement?",
    "a": "Donor engagement is everything you do to build a relationship with a donor between gifts: thanking them, keeping them informed, inviting them in and listening. Good engagement makes the next ask feel like a natural next step."
  },
  {
    "q": "How do you define a mid-level donor?",
    "a": "Anyone who gives more than your average annual fund gift but isn't assigned to a major gift officer. The dollar range depends on your organization."
  },
  {
    "q": "How many touches should a mid-level donor get?",
    "a": "At least five to seven a year before an upgrade ask: a thank-you call, birthday call, gift-anniversary call, handwritten note, event invitation and impact update. Catapult's programs use seven to eight."
  },
  {
    "q": "How much can a mid-level program increase giving?",
    "a": "Across Catapult's client programs, mid-level donors increase giving by an average of 39% in the first year, and some clients have seen giving more than double."
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

export default function DonorEngagementStrategiesMidLevelDonorsPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={TITLE} description="Ask yourself one question: what would a major gift officer do with these donors?" />
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
        <p className={P}>Most organizations have a plan for major donors and a plan for the annual fund. The people in between get a little of each, which usually means form letters and a renewal appeal.</p>
        <p className={P}>Those are your mid-level donors. They&rsquo;re loyal, they have capacity, and most of them have never had a real conversation with anyone at your organization.</p>
        <h2 className={H2}>Who your mid-level donors are</h2>
        <p className={P}>Don&rsquo;t start with a dollar band you read somewhere. For one organization, mid-level is the $1,000 donor. For another, it&rsquo;s $5,000. Here&rsquo;s the definition I use: anyone who gives more than the average gift to your annual fund but isn&rsquo;t assigned to a major gift officer.</p>
        <p className={P}>Then look inside that group. Some are ready for an upgrade. Some are your loyal core who&rsquo;ve given for years. Some are at risk and quietly slipping away. Each needs a slightly different plan.</p>
        <h2 className={H2}>Treat them like major gift prospects</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/donor-engagement-strategies-mid-level-donors/major-gift-mindset.png" alt="One officer per donor, thank before you ask, same voice all year" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Here&rsquo;s the question I ask every development team: what would you do if a major gift officer were working your mid-level donors? You&rsquo;d assign one person to each donor. You&rsquo;d thank them before you asked again. You&rsquo;d learn what they care about. And you&rsquo;d make an ask that fit.</p>
        <p className={P}>That&rsquo;s the whole idea. In our programs, the same engagement officer stays with each donor for the entire year. There&rsquo;s no handoff to a different caller. The donor hears the same voice, and that officer becomes the major gift officer for the mid-level journey, carrying a portfolio of roughly 300 to 500 donors.</p>
        <h2 className={H2}>The touches that matter</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/donor-engagement-strategies-mid-level-donors/touches.png" alt="Six touches with no ask" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Before anyone asks for an upgrade, give each donor at least five to seven touches during the year. Our programs use seven to eight. None of these include an ask.</p>
        <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))]">
          <li className={LI}>A thank-you call. No ask, no strings attached. Just thank you.</li>
          <li className={LI}>A birthday call. Call them on their birthday and wish them a happy birthday. That&rsquo;s it.</li>
          <li className={LI}>A gift-anniversary call on the date of their first gift.</li>
          <li className={LI}>A handwritten note. A real one, not a printed font that looks like handwriting.</li>
          <li className={LI}>An invitation to an event, and a follow-up call afterward.</li>
          <li className={LI}>An impact update: &ldquo;We wanted to call and let you know what your giving is doing.&rdquo;</li>
        </ul>
        <p className={P}>If you don&rsquo;t have the staff for all of that, start with what I call Five by Ten. Call five mid-level donors by ten o&rsquo;clock every morning, just to thank them. Over a year, that&rsquo;s more than a thousand thank-you calls.</p>
        <h2 className={H2}>Then make the upgrade ask</h2>
        <p className={P}>After a year of real attention, the ask doesn&rsquo;t feel like a cold solicitation. It feels like the next step in a relationship.</p>
        <p className={P}>Make the ask specific to the donor, and make it easy to say yes to a bigger number. Someone who gave $1,000 might be asked to consider $4,000, paid in quarterly installments over the year. If they come back at half of that, you&rsquo;ve still doubled their giving.</p>
        <p className="mt-6 rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5 font-display text-xl text-[rgb(var(--navy))]">$1,000 donor → $4,000 ask in quarterly installments → $2,000 gift = 100% upgrade</p>
        <h2 className={H2}>Listen for the signals</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/donor-engagement-strategies-mid-level-donors/signals.png" alt="Four signals a mid-level donor is ready for a bigger conversation" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Good engagement isn&rsquo;t only about giving more. It&rsquo;s about learning who&rsquo;s ready for a bigger conversation. Pay attention when a donor:</p>
        <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))]">
          <li className={LI}>Pays a pledge early or in full</li>
          <li className={LI}>Gives through a donor-advised fund, an IRA, stock or a family foundation</li>
          <li className={LI}>Mentions a life event, such as retiring, selling a business or downsizing</li>
          <li className={LI}>Asks about endowment, naming or planned giving</li>
        </ul>
        <p className={P}>Even a $100 gift from a donor-advised fund tells you that donor has assets to give from. That donor has raised their hand. When those signals show up, make a warm handoff to your major gift officer. Never a cold transfer. One mid-level handoff in our programs turned into a $2.15 million gift.</p>
        <h2 className={H2}>What the results look like</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/donor-engagement-strategies-mid-level-donors/lift.png" alt="39% average first-year lift vs 1% to 10% in general calling" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Across our client programs, mid-level donors increase their giving by an average of 39% in the first year, and some clients have seen giving more than double. Compare that with the 1% to 10% lift we typically see when mid-level donors are simply lumped into a general annual fund calling program.</p>
        <blockquote className="mt-8 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">Donor loyalty isn&rsquo;t about the donor being loyal to us. It&rsquo;s about us being loyal to the donor.</blockquote>
        <h2 className={H2}>Where to start</h2>
        <p className={P}>Run a simple report: every donor above your average annual fund gift who isn&rsquo;t in a major gift portfolio. Count them. Then ask how many got a call this year that didn&rsquo;t include an ask.</p>
        <p className={P}>That number tells you how much opportunity is sitting in the middle of your file. If you want help building the journey, here&rsquo;s how our <Link href="/services/mid-level-donor-program" className="font-semibold text-[rgb(var(--navy))] underline">mid-level donor program</Link> works, or <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">start a conversation</Link>.</p>

        <h2 className={H2}>Questions we hear</h2>
        <dl className="mt-6 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
              <dt className="font-display text-xl text-[rgb(var(--navy))]">{f.q}</dt>
              <dd className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{f.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">Average first-year increase and handoff examples come from Catapult Fundraising mid-level program results across client files. Client figures come from Catapult Fundraising program reports. Clients are named only where they have been publicly identified by Catapult; others are described by type.</p>
      </article>

      <CtaBand />
    </>
  );
}
