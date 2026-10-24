import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "five-donors-by-10am-mid-level-giving";
const TITLE = "Five Donors by 10 AM: What a Mid-Level Giving Webinar Reminded Me About the Basics";
const DESCRIPTION = "Maria Healy on Anthony Alonso's AFP New Jersey webinar: give every mid-level donor an owner, keep a year-round cadence, and call five donors by 10 a.m.";
const HERO = "/blog/five-donors-by-10am-mid-level-giving/hero-five-by-ten.jpg";
const HERO_ALT = "An experienced fundraiser smiling on a desk phone in the morning, a handwritten list of five donor names beside her";

export const metadata = {
  title: { absolute: "Five Donors by 10 AM: Mid-Level Giving Basics | Catapult" },
  description: DESCRIPTION,
  keywords: ["mid-level donors", "mid-level donor program", "donor engagement", "donor stewardship", "AFP New Jersey"],
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
    "q": "What is Five by Ten?",
    "a": "Five mid-level donors, called by 10 a.m., every day, just to say thank you. No ask. Board members and volunteers can make the calls."
  },
  {
    "q": "How many donors should one engagement officer manage?",
    "a": "Anthony recommends a portfolio of 300 to 500 donors per engagement officer, compared with about 150 for a major gift officer. If you can't do 300, start with 100."
  },
  {
    "q": "What is a warm handoff?",
    "a": "When a donor shows major gift potential, the engagement officer introduces them to the major gift officer personally, so the donor never gets a cold call."
  }
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      headline: TITLE,
      datePublished: "2026-10-24",
      dateModified: "2026-10-24",
      description: DESCRIPTION,
      image: [`${SITE_URL}${HERO}`],
      author: {
        "@type": "Person",
        name: "Maria Healy",
        jobTitle: "Senior Vice President",
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

export default function FiveDonorsBy10amMidLevelGivingPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={TITLE} description="Maria Healy on what Anthony Alonso's “Unlocking the Middle” webinar for AFP New Jersey got right about mid-level donors, and the simple daily habit any shop can start this week." />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={TITLE} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Maria Healy, Senior Vice President, Catapult Fundraising
        </p>
        <div className="mt-6 mb-6 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image src={HERO} alt={HERO_ALT} fill className="object-cover" priority />
          </div>
        </div>
        <p className={P}>I&rsquo;ve worked with Anthony Alonso for 30 years, long enough to remember index cards and rotary phones. So when I invited him to present a pre-conference webinar for the AFP New Jersey chapter, where I serve on the board, I figured I knew what he would say. I was right. What surprised me was how many of us still aren&rsquo;t doing it.</p>
        <p className={P}>His session, &ldquo;Unlocking the Middle,&rdquo; started with a number that should bother every development director. Giving USA reports that Americans gave $617 billion this year, the first time past $600 billion, and 64 percent came from individuals. But the number of donors keeps shrinking. We are getting more dollars from fewer people, and that is a risk no matter how good the year looks.</p>
        <p className={P}>Mid-level donors get lost in that gap. They have no assigned owner, so they get the same annual fund treatment as everyone else. Stewardship happens when someone has time. And the signals that a donor is ready for more, like a gift from a donor-advised fund, a stock transfer, or a family foundation check, often go unnoticed.</p>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/five-donors-by-10am-mid-level-giving/graphic-portfolio.jpg" alt="Graphic: give every donor an owner, 300 to 500 donors per engagement officer compared with about 150 per major gift officer" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>Anthony&rsquo;s fix is simple. Give each donor an owner. He recommends one engagement officer for a portfolio of 300 to 500 donors, compared with about 150 for a major gift officer. That officer thanks them, learns why they give, calls on a planned schedule, and writes a note by hand after every conversation. If you can&rsquo;t do 300, start with 100. A small portfolio beats no portfolio.</p>
        <p className={P}>He also described a year-round cadence of at least five to seven touches: impact calls, event follow-ups, birthday cards, and a call on the anniversary of the first gift. Then comes the part many shops skip, the warm handoff. When a donor shows major gift potential, the engagement officer introduces them to the major gift officer personally. No cold calls.</p>
        <p className={P}>The results he shared were hard to ignore. Across Catapult client files, average gift size is up 39 percent on phone-closed gifts. One faith-based client saw a 200 percent increase in mid-level giving after the first round of engagement. Another closed a $2.15 million gift that began as a mid-level handoff.</p>
        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80"><div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl"><Image src="/blog/five-donors-by-10am-mid-level-giving/graphic-five-by-ten.jpg" alt="Graphic: Five by Ten, five donors called by 10 a.m. just to say thank you" fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" /></div></div>
        <p className={P}>The idea that stuck with me most was his answer for organizations with no extra staff. He calls it &ldquo;Five by Ten.&rdquo; Five mid-level donors, called by 10 a.m., every day, just to say thank you. No ask. Board members and volunteers can make the calls. Some clients have received unsolicited gifts of $10,000 to $15,000 from that habit alone.</p>
        <p className={P}>Someone asked about AI engagement agents. Anthony&rsquo;s answer was that AI can help deliver information, but &ldquo;people give to people.&rdquo; I agree.</p>
        <p className={P}>Most of us have the database. What we often lack is a name next to each donor and a phone call this week. Pick five donors. Call them by ten.</p>
        <p className={P}>Want help giving your mid-level donors an owner? See our <Link href="/services/mid-level-donor-program" className="font-semibold text-[rgb(var(--navy))] underline">mid-level donor program</Link> or <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">talk with us</Link>.</p>

        <h2 className={H2}>Questions we hear</h2>
        <dl className="mt-6 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
              <dt className="font-display text-xl text-[rgb(var(--navy))]">{f.q}</dt>
              <dd className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{f.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">Sources: Giving USA 2026; Anthony R. Alonso, &ldquo;Unlocking the Middle,&rdquo; AFP New Jersey pre-conference webinar, October 2026; Catapult Fundraising client results.</p>
      </article>

      <CtaBand />
    </>
  );
}
