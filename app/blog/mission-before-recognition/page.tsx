import Image from "next/image";
import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "mission-before-recognition";
const IMG = `/blog/${SLUG}`;
const HEADLINE = "Mission Before Recognition";
const DESCRIPTION = "What donors need to hear before you talk about naming";
const DATE = "2026-11-18";

export const metadata = {
  title: { absolute: "Mission Before Recognition | Catapult Fundraising" },
  description: "Jeff Grandy on making the mission clear before discussing naming, listening to donor preferences, and keeping the promise after a major gift.",
  keywords: ["major gift fundraising", "donor recognition", "capital campaign case for support", "donor stewardship"],
  alternates: { canonical: `/blog/${SLUG}` },
  authors: [{ name: "Jeff Grandy" }],
  openGraph: {
    type: "article",
    title: HEADLINE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    publishedTime: DATE,
    modifiedTime: DATE,
    authors: ["Jeff Grandy"],
    images: [{ url: `${SITE_URL}${IMG}/social-card-v2.png`, width: 1200, height: 630, alt: "Mission Before Recognition. By Jeff Grandy, Catapult Fundraising." }],
  },
  twitter: {
    card: "summary_large_image",
    title: HEADLINE,
    description: DESCRIPTION,
    images: [`${SITE_URL}${IMG}/social-card-v2.png`],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: HEADLINE,
  description: DESCRIPTION,
  datePublished: DATE,
  dateModified: DATE,
  image: `${SITE_URL}${IMG}/social-card-v2.png`,
  author: { "@type": "Person", name: "Jeff Grandy", jobTitle: "Vice President for Client Development", url: `${SITE_URL}/our-team`, worksFor: { "@id": `${SITE_URL}/#organization` } },
  publisher: { "@id": `${SITE_URL}/#organization` },
  mainEntityOfPage: `${SITE_URL}/blog/${SLUG}`,
};

function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{children}</p>;
}
function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">{children}</h2>;
}
function Figure({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <figure className="mb-5 mt-5 w-full shrink-0 sm:float-right sm:ml-8 sm:w-72 md:w-80">
      <Image src={`${IMG}/${src}`} alt={alt} width={1200} height={800} priority={priority} className="h-auto w-full rounded-xl" sizes="(min-width: 768px) 320px, (min-width: 640px) 288px, 100vw" />
    </figure>
  );
}

export default function MissionBeforeRecognitionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={HEADLINE} description={DESCRIPTION} />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={HEADLINE} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">BY JEFF GRANDY, CATAPULT FUNDRAISING</p>
        <p className="mt-1 text-sm text-[rgb(var(--ink))]/70">Vice President for Client Development</p>
        <p className="mt-2 text-sm text-[rgb(var(--ink))]/60"><time dateTime={DATE}>November 18, 2026</time> · 4 min read</p>
        <figure className="mb-8 mt-6 overflow-hidden rounded-2xl">
          <Image src={`${IMG}/hero-donor-conversation-v2.jpg`} alt="A nonprofit professional listening to an older couple during a conversation about their support" width={1536} height={1024} priority className="h-auto w-full" sizes="(min-width: 1024px) 816px, 100vw" />
        </figure>
        <Figure src="mission-first.svg" alt="Mission before recognition: who will benefit, what will the gift do, and why this decision?" priority />
        <P>{"I have sat in a lot of board rooms where the naming conversation starts before anyone has said what the building is for. Whose name goes on the lobby. How big the sign should be. I understand why. Recognition is easy to picture. The mission takes more work to explain."}</P>
        <P>{"Donors who give because of the mission rarely ask about recognition first. They ask what will change because they gave. The donors who lead with wanting their name in flashing lights tend to be the ones who are gone after the ribbon cutting."}</P>
        <div className="clear-both" />
        <H2>{"The easy site and the right site"}</H2>
        <P>{"One client I worked with had to choose between two pieces of land. The first was the site they had planned on all along. The second was donated. It was bigger, the build would be simpler, and the move would be easier on staff and the people they serve. On paper the donated land won."}</P>
        <P>{"Then the board asked who the facility was for and how those people would actually get there and use it. The donated land fell short on that question. The board chose the site that served the mission."}</P>
        <P>{"That decision cost them an easier build. It also gave them a story every donor could understand. When you can explain why you made a hard choice for the people you serve, you have a case. A naming menu cannot do that for you."}</P>
        <div className="clear-both" />
        <H2>{"A taller cross is always possible"}</H2>
        <P>{"A faith-based client once built its plans around having the tallest cross. The thinking was that the height would draw investors and donors. I understand the appeal. But someone can always build a taller one."}</P>
        <P>{"If a gift depends on being the biggest or the most visible, it can be outbid. What lasts is the ministry the structure makes possible and the people it reaches. That is where the case needs to live."}</P>
        <P>{"If you chase the money, you stand for nothing."}</P>
        <div className="clear-both" />
        <H2>{"Relationships carry the weight when the need is urgent"}</H2>
        <Figure src="listen-before-asking.svg" alt="Before the ask: find the connection, ask what matters, listen." />
        <P>{"An animal welfare organization I worked with faced a dire need. They did not have to start cold. For years they had invested in the relationships around them. When it came time to ask, those people already knew the work and trusted the leadership. The funding came through."}</P>
        <P>{"You cannot build that in the month you need it. The ask is the last step. The relationship is the first one."}</P>
        <P>{"So do the homework before the meeting. Find out what first connected the donor to your organization. Ask what part of the work matters most to them. Then listen. What you hear should shape what you bring to the next conversation and, eventually, what you ask them to consider."}</P>
        <div className="clear-both" />
        <H2>{"Recognition is the donor's call"}</H2>
        <P>{"I have led campaign training for a university foundation board and for the dean and department chairs at another institution. Both involved in capital campaigns. In both rooms we spent real time on this question, because every board member and academic leader will run into donors on both sides of it."}</P>
        <P>{"Some donors want their name on a wall. Many want to honor a parent, a spouse or someone who changed their life, and a name lets that legacy live on. Others would rather no one ever knew. Both are fine."}</P>
        <P>{"Ask. Do not assume. Recognition should follow what the donor wants. It should never be the reason you pursue the gift."}</P>
        <div className="clear-both" />
        <H2>{"Keep the promise after the gift"}</H2>
        <Figure src="keep-the-promise.svg" alt="After the gift: show how it was used, share the setbacks, call when plans change." />
        <P>{"A donor making a six-, seven-, eight-figure gift is placing a big bet on an organization they will not control. They want to know the need is real and that the people running it can be trusted. Planned and legacy gifts raise the stakes even more. That person is trusting you with what they leave behind."}</P>
        <P>{"After the gift, tell them how it is going. Show them how the money was used. Share the setbacks along with the good news. If the plan changes, call them before they hear it somewhere else."}</P>
        <P>AFP&apos;s <a className="underline underline-offset-4" href="https://afpglobal.org/donor-bill-rights">Donor Bill of Rights</a> and <a className="underline underline-offset-4" href="https://afpglobal.org/ethicsmain/code-ethical-standards">Code of Ethical Standards</a> spell this out. Donors have a right to know the mission, how their gifts will be used, and to receive appropriate acknowledgment and accurate reporting. Mission comes first in that list. Recognition comes after.</P>
        <P>{"Before your next major gift meeting, look at the case you plan to make. Can you say who will benefit? Can you show what the gift will do? Can you explain why you made the decisions you made? Start there. Naming can follow."}</P>
        <P>{"Years after the dedication, a donor should still feel good about the gift and what it made possible."}</P>
        <div className="clear-both" />
        <aside aria-label="Further reading" className="mt-12 border-t border-[rgb(var(--line))] pt-8">
          <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Further reading</h2>
          <ul className="mt-4 space-y-3 text-[rgb(var(--ink))]/70">
            <li>AFP et al., The Donor Bill of Rights: <a className="underline underline-offset-4" href="https://afpglobal.org/donor-bill-rights">afpglobal.org/donor-bill-rights</a></li>
            <li>AFP, Code of Ethical Standards: <a className="underline underline-offset-4" href="https://afpglobal.org/ethicsmain/code-ethical-standards">afpglobal.org/ethicsmain/code-ethical-standards</a></li>
          </ul>
        </aside>
        <aside aria-label="Work with Catapult" className="mt-10 border-t border-[rgb(var(--line))] pt-8">
          <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Book a 30-minute call with Jeff</h2>
          <p className="mt-3 text-lg text-[rgb(var(--ink))]/70">Talk with Jeff Grandy, Vice President for Client Development, about your case for support and next major gift conversation.</p>
          <a className="mt-5 inline-flex rounded-full bg-[rgb(var(--brass))] px-6 py-3 font-semibold text-[rgb(var(--navy))]" href="https://go.catapultfr.com/meetings/jeff-grandy">Book a 30-minute call with Jeff</a>
          <p className="mt-3 text-sm text-[rgb(var(--ink))]/60">Select “30 mins” on Jeff’s calendar.</p>
        </aside>
      </article>
      <CtaBand />
    </>
  );
}
