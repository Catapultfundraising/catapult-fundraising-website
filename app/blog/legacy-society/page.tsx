import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "legacy-society";
const TITLE = "How to Build a Legacy Society Your Donors Want to Join";
const DESCRIPTION = "Anthony R. Alonso on finding the bequests you don't know about, who to ask first, and how to steward legacy society members.";
const HERO = "/blog/legacy-society/hero-legacy-call.jpg";
const HERO_ALT = "A long-time donor smiling during a thank-you phone call";

export const metadata = {
  title: { absolute: "How to Build a Legacy Society | Catapult Fundraising" },
  description: DESCRIPTION,
  keywords: ["legacy society", "legacy giving", "planned giving society", "bequest society", "legacy giving program"],
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
    "q": "What is a legacy society?",
    "a": "A legacy society is a recognition group for donors who have included a nonprofit in their will, trust, retirement account or life insurance. It gives the organization a way to thank, steward and stay close to those donors for years."
  },
  {
    "q": "How do you find donors for a legacy society?",
    "a": "Start with your most loyal donors: people with 10 or more gifts or many consecutive years of giving, regardless of gift size. Send a letter from a peer, then call to thank them and ask if they'd like to talk about leaving a legacy."
  },
  {
    "q": "Do donors have to tell you the gift amount to join?",
    "a": "No. About half of the donors we speak with will share a will confirmation form or the amount. The rest confirm the gift but keep the amount private, and they should still be welcomed into the society."
  },
  {
    "q": "How long does it take to close a planned gift?",
    "a": "Some donors confirm a bequest on the first call. Others want to talk with an attorney or financial advisor, and follow-up can take up to two years."
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

export default function LegacySocietyPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={TITLE} description="Your legacy society is probably bigger than you think. Most of it just hasn't told you yet." />
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
        <p className={P}>Every nonprofit I work with has a legacy society on paper. A name, a page on the website, maybe a lapel pin. What most of them don&rsquo;t have is a real way to grow it. They wait for a bequest to show up in the mail, add the name to the list, and hope for the best.</p>
        <p className={P}>That&rsquo;s backwards. Planned giving, leaving a gift in your will, is the major gift of the middle class. The people most likely to do it are already on your donor file, and a lot of them have already done it.</p>
        <h2 className={H2}>Start with the gifts you don&rsquo;t know about</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/legacy-society/ls-hidden-bequests.png" alt="About 1 in 4 donors we call already had the nonprofit in their will" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>When we call loyal donors about legacy giving, about 20 to 25% of them tell us they already have the organization in their will. The nonprofit just didn&rsquo;t know about it.</p>
        <p className={P}>Think about what that means. Those donors are members of your legacy society in every way except one: nobody has thanked them. Nobody has invited them to the luncheon. Nobody knows to steward them. Finding these people is the fastest way to grow your society, and it costs you nothing but a conversation.</p>
        <p className={P}>When someone tells us they&rsquo;ve included you, we ask for a will confirmation form or a copy of the page. About half the time we get it. The other half will confirm the gift but keep the amount private, and that&rsquo;s fine. You still know, and you can still say thank you.</p>
        <h2 className={H2}>Who to ask first</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/legacy-society/ls-who-to-ask.png" alt="Who to ask first: donors with 10+ gifts, many consecutive years, loyal mid-level donors, board and volunteers" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Don&rsquo;t start with your wealthiest donors. Start with your most loyal ones. Our best prospects are donors with 10 or more gifts, or 10 to 20 consecutive years of giving, regardless of gift size. A $50 donor who has given every year since 2005 is telling you something.</p>
        <p className={P}>Loyal mid-level donors, board members and long-time volunteers belong on the list too. And keep in mind that only about 22% of people say they&rsquo;ve ever been asked about a planned gift. Most of your best prospects are simply waiting for someone to bring it up.</p>
        <h2 className={H2}>How a legacy society grows</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/legacy-society/ls-steps.png" alt="How a legacy society grows: letter, thank-you call, specialist follow-up, welcome and steward" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Our approach is simple, and it&rsquo;s built on thanks, not a technical solicitation.</p>
        <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))]">
          <li className={LI}><strong>A letter first.</strong> A letter from a peer or volunteer who has made their own legacy gift, telling their story. Not a brochure about charitable remainder trusts.</li>
          <li className={LI}><strong>A thank-you call.</strong> The caller&rsquo;s job is simply to thank the donor and identify interest. That&rsquo;s it. The question is whether they&rsquo;d like to have further conversations about leaving a lasting legacy.</li>
          <li className={LI}><strong>Specialist follow-up.</strong> Donors who say yes go to planned giving professionals with 20+ years of experience, who act as an extension of your development team. Some gifts close in weeks. Some take two years and a few conversations with an attorney or financial advisor.</li>
          <li className={LI}><strong>Welcome them in.</strong> Once a donor tells you about a gift, they&rsquo;re a member. Welcome them, recognize them and hand them to your stewardship team.</li>
        </ul>
        <p className={P}>You&rsquo;ll hear three answers more than any others: &ldquo;I&rsquo;ve got you in the will, but I&rsquo;m not telling you how much.&rdquo; &ldquo;I already have you in the will, and it&rsquo;s for X.&rdquo; And &ldquo;Let me talk to my attorney.&rdquo; All three are good news.</p>
        <h2 className={H2}>Be loyal to the donor</h2>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/legacy-society/ls-stewardship.png" alt="Legacy stewardship touches: thank-you call, handwritten note, impact update, event invitation, birthday call, recognition" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Donor loyalty isn&rsquo;t about the donor being loyal to us. It&rsquo;s about us being loyal to the donor. A legacy society member may not give you their biggest gift for twenty years. Your job is to make sure they still feel the same about you when that day comes.</p>
        <p className={P}>We recommend five to seven touches a year, and at Catapult we use seven: a thank-you call, a handwritten note, impact updates, event invitations, a birthday call, a first-gift anniversary and real recognition. Whether that&rsquo;s the luncheon or the pin, it should feel personal.</p>
        <p className={P}>There&rsquo;s a bonus. Donors who tell you about a planned gift often increase their annual giving afterward, because they&rsquo;ve just told you how much they care.</p>
        <blockquote className="mt-8 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">Your legacy society isn&rsquo;t a list. It&rsquo;s a group of people who decided you matter enough to be part of their family&rsquo;s story.</blockquote>
        <h2 className={H2}>Where to start</h2>
        <p className={P}>Pull every donor with 10 or more gifts. Write a letter in a real donor&rsquo;s voice. Then call them to say thank you and ask one question. If you&rsquo;d like help, our <Link href="/services/planned-giving" className="font-semibold text-[rgb(var(--navy))] underline">planned giving program</Link> does exactly this, and you can read more in <Link href="/blog/how-to-start-a-planned-giving-program" className="font-semibold text-[rgb(var(--navy))] underline">how to start a planned giving program</Link>. Or <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">talk with us</Link> about your file.</p>

        <h2 className={H2}>Questions we hear</h2>
        <dl className="mt-6 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
              <dt className="font-display text-xl text-[rgb(var(--navy))]">{f.q}</dt>
              <dd className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{f.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">Figures reflect Catapult Fundraising&rsquo;s legacy calling programs and the experience of our planned giving specialists. Individual results vary by organization and donor file.</p>
      </article>

      <CtaBand />
    </>
  );
}
