import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "how-to-start-a-planned-giving-program";
const TITLE = "How to Start a Planned Giving Program (Without Waiting for a Planned Giving Director)";
const DESCRIPTION = "Anthony R. Alonso on how to start a planned giving or legacy giving program: who to ask first, how to keep the first conversation simple, and how to close and steward bequests.";
const HERO = "/blog/how-to-start-a-planned-giving-program/hero-planned-giving-call.png";
const HERO_ALT = "A gray-haired planned giving professional on a phone call at a wooden desk with a notepad";

export const metadata = {
  title: { absolute: "How to Start a Planned Giving Program | Catapult Fundraising" },
  description: DESCRIPTION,
  keywords: ["how to start a planned giving program", "planned giving program", "legacy giving program", "planned giving consultant", "bequest marketing", "legacy giving", "planned giving prospects"],
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
    "q": "How do you start a planned giving program?",
    "a": "Identify donors with ten or more gifts, clean their contact data, send a peer story letter, then call to thank them and ask if they'd like to learn about leaving a legacy. Hand interested donors to an experienced planned giving specialist, document confirmed gifts, and steward them in a legacy society."
  },
  {
    "q": "Who are the best planned giving prospects?",
    "a": "Loyal donors, not necessarily wealthy ones. Anyone with ten or more gifts, and especially donors with ten to twenty years of steady giving."
  },
  {
    "q": "Do we need a planned giving director to start?",
    "a": "No. Many organizations start with an outsourced legacy calling program and hire a director later. A full-time director typically costs $100,000 or more a year and works 100 to 200 prospects; a calling program can reach 1,000 prospects in about six months."
  },
  {
    "q": "How long does it take to close a planned gift?",
    "a": "Some donors confirm right away. Others need to talk with an attorney or financial advisor, and follow-up can take up to two years."
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

export default function HowToStartAPlannedGivingProgramPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={TITLE} description="Planned giving, leaving a gift in your will, is the major gift of the middle class. Most of your donors have never been asked." />
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
        <p className={P}>Many nonprofits put off planned giving because they think they need a planned giving director, a stack of brochures and a working knowledge of charitable remainder trusts before they can start.</p>
        <p className={P}>You don&rsquo;t. You need a list of loyal donors and the willingness to ask them a simple question.</p>
        <p className={P}>Planned giving, leaving a gift in your will, is the major gift of the middle class. And only about one in five people say they&rsquo;ve ever been asked about one.</p>
        <h2 className={H2}>Step 1: Start with loyalty, not wealth</h2>
        <p className={P}>Your best planned giving prospects probably aren&rsquo;t your wealthiest donors. They&rsquo;re your most loyal ones. Anybody who has given to you ten or more times, consecutive or not, is a good planned giving prospect. Donors with ten to twenty years of steady giving are even better, even if their gifts have been modest.</p>
        <p className={P}>Pull that list first. Most organizations are surprised by how long it is.</p>
        <h2 className={H2}>Step 2: Clean the data before you reach out</h2>
        <p className={P}>Run an address update (NCOA), then a phone and email append, then an age append. Planned giving prospects tend to be older and have often moved or changed numbers. There&rsquo;s no point building a program around people you can&rsquo;t reach.</p>
        <h2 className={H2}>Step 3: Send a story before you call</h2>
        <p className={P}>Have a donor or volunteer who has already included you in their plans write a short letter about why they did it. A real story from a real person does more than any brochure about gift vehicles.</p>
        <h2 className={H2}>Step 4: Keep the first conversation simple</h2>
        <p className={P}>The first call has one job: thank the donor and find out if they&rsquo;re interested in learning more. That&rsquo;s it.</p>
        <p className={P}>The caller thanks them for their years of support, confirms they got the letter and asks whether they&rsquo;d like to have a further conversation about leaving a lasting legacy. The caller shouldn&rsquo;t be explaining the difference between a bequest and a charitable gift annuity. That conversation comes later, with the right person.</p>
        <p className={P}>You&rsquo;ll hear some version of three answers:</p>
        <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))]">
          <li className={LI}>&ldquo;I&rsquo;ve already got you in my will, and it&rsquo;s for this amount.&rdquo;</li>
          <li className={LI}>&ldquo;I&rsquo;ve got you in my will, but I&rsquo;d rather not say how much.&rdquo;</li>
          <li className={LI}>&ldquo;Let me talk to my attorney or my financial advisor.&rdquo;</li>
        </ul>
        <p className={P}>Here&rsquo;s what surprises most people. About 20 to 25 percent of the donors we call already have the organization in their will. The organization just didn&rsquo;t know.</p>
        <h2 className={H2}>Step 5: Hand interested donors to an experienced specialist</h2>
        <p className={P}>Donors who say yes need a different kind of conversation, about wills, beneficiary designations, IRAs, life insurance or a percentage of the estate. That belongs with someone who has done it for years.</p>
        <p className={P}>In our Legacy Call program, that&rsquo;s a team of retired planned giving professionals with 20 or more years of experience. They work as an extension of your development office and stay with each donor through several conversations. Be patient. A planned gift can take up to two years to confirm.</p>
        <h2 className={H2}>Step 6: Document, then steward</h2>
        <p className={P}>When a donor confirms a gift, ask for a simple will confirmation form or a copy of the page that names you. About half the time you&rsquo;ll get it. Either way, welcome them into your legacy society and start stewardship right away.</p>
        <p className={P}>Donors who tell you about a planned gift often increase their annual giving several times over. They feel like part of the family, because now they are. For what stewardship looks like in practice, see <Link href="/blog/growing-your-legacy-society-why-arent-we-asking" className="font-semibold text-[rgb(var(--navy))] underline">growing your legacy society</Link>.</p>
        <h2 className={H2}>Do you need to hire a planned giving director?</h2>
        <p className={P}>Eventually, maybe. But a full-time planned giving officer typically costs $100,000 or more a year and can work maybe 100 to 200 prospects. A structured calling program can reach 1,000 prospects in about six months for less than that.</p>
        <p className={P}>It isn&rsquo;t either-or. Outsourcing the outreach doesn&rsquo;t stop you from hiring a director later. It just means that instead of one person working your list, you have five.</p>
        <h2 className={H2}>What it can produce</h2>
        <p className={P}>Across our Legacy Call programs, organizations typically close $1.2 million to $1.7 million in planned gifts for every 1,000 prospects. For one public broadcasting client, PBS KVIE, the program closed 63 planned gifts totaling $4.62 million. For a Northeast university, outreach to 500 donors produced 50 confirmed gifts totaling $4,894,000.</p>
        <blockquote className="mt-8 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">Thousands of loyal donors are waiting to be asked. If all we do is thank a donor for twenty years of giving, that alone is a success.</blockquote>
        <h2 className={H2}>Where to start</h2>
        <p className={P}>This week, run one report: every donor with ten or more gifts. Look at the names. Then ask how many of them have ever been asked about a legacy gift.</p>
        <p className={P}>If you&rsquo;d like help, here&rsquo;s how our <Link href="/services/planned-giving" className="font-semibold text-[rgb(var(--navy))] underline">planned giving consulting and Legacy Call program</Link> works, or <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">let&rsquo;s talk about your file</Link>.</p>

        <h2 className={H2}>Questions we hear</h2>
        <dl className="mt-6 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5">
              <dt className="font-display text-xl text-[rgb(var(--navy))]">{f.q}</dt>
              <dd className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{f.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">The share of people asked about a planned gift reflects figures Catapult Fundraising cites in its planned giving presentations. Program results come from Catapult Fundraising Legacy Call reports. Client figures come from Catapult Fundraising program reports. Clients are named only where they have been publicly identified by Catapult; others are described by type.</p>
      </article>

      <CtaBand />
    </>
  );
}
