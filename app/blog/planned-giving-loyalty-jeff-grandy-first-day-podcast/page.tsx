import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { RelatedReading } from "@/components/related-reading";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "planned-giving-loyalty-jeff-grandy-first-day-podcast";
const HERO = `/blog/${SLUG}/first-day-podcast-jeff-grandy.jpg`;
const HERO_ALT =
  "First Day Podcast episode card: Why Every Nonprofit Needs a Planned Giving Strategy, with Jeff Grandy of Catapult Fundraising, hosted by Bill Stanczykiewicz, Ed.D., of The Fund Raising School";
const VIDEO_ID = "4QjCKATeUeI";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

export const metadata = {
  title: { absolute: "Loyalty Is the Legacy Signal: Jeff Grandy on Planned Giving" },
  description:
    "Jeff Grandy joins The Fund Raising School's First Day podcast to explain why loyalty, not wealth, identifies your next legacy donor, and how to start that first conversation.",
  keywords: [
    "planned giving strategy",
    "legacy giving program",
    "legacy call program",
    "donor loyalty",
    "bequest conversation",
    "First Day podcast",
    "The Fund Raising School",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Loyalty, Not Wealth: Jeff Grandy on Finding Your Next Legacy Donor",
    description:
      "Catapult's Jeff Grandy joined The Fund Raising School's First Day podcast to talk about who the typical planned gift donor really is, and how to start the conversation.",
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [{ url: HERO, width: 1800, height: 1200, alt: HERO_ALT }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Loyalty, Not Wealth: Jeff Grandy on Finding Your Next Legacy Donor",
  datePublished: "2026-09-22",
  dateModified: "2026-09-22",
  description:
    "Catapult Fundraising Vice President Jeff Grandy joined The Fund Raising School's First Day podcast to explain why loyalty, not wealth, identifies planned giving prospects, and how to open the first legacy conversation.",
  image: `${SITE_URL}${HERO}`,
  author: {
    "@type": "Person",
    name: "Jeff Grandy",
    jobTitle: "Vice President of Client Development",
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
  video: {
    "@type": "VideoObject",
    name: "Why Every Nonprofit Needs a Planned Giving Strategy | Jeff Grandy | First Day Podcast",
    description:
      "Jeff Grandy of Catapult Fundraising joins host Bill Stanczykiewicz, Ed.D., on the First Day podcast from The Fund Raising School at the Indiana University Lilly Family School of Philanthropy.",
    uploadDate: "2026-09-21",
    thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    url: VIDEO_URL,
  },
  mainEntityOfPage: `${SITE_URL}/blog/${SLUG}`,
};

export default function JeffGrandyFirstDayPodcastPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Loyalty, not wealth, tells you who your next legacy donor is."
        description="Catapult Vice President Jeff Grandy joined The Fund Raising School's First Day podcast to talk about who the typical planned gift donor really is, and how to start the conversation with them."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons
          url={`/blog/${SLUG}`}
          title="Loyalty, Not Wealth: Jeff Grandy on Finding Your Next Legacy Donor"
        />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Featuring Jeff Grandy, Vice President of Client Development, Catapult Fundraising
        </p>

        <div className="mt-6 mb-6 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image src={HERO} alt={HERO_ALT} fill className="object-cover" priority />
          </div>
        </div>

        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Every fundraiser has heard the story. A donor nobody had ever met leaves the
          organization a seven figure gift out of the blue, the news covers it, and the
          development office spends the next year hoping lightning strikes twice.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Host Bill Stanczykiewicz, Ed.D., opened this episode of the First Day podcast with
          exactly that kind of story: a library foundation that raised its campaign goal by a
          million dollars after an estate attorney called about a frugal, unmarried donor who had
          borrowed books her whole life and left her estate to the library. Nobody at the
          foundation had ever heard her name.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Then he made the point that sets up the whole conversation. Those gifts make the news
          because they are unusual. They are not typical. So who is the typical planned gift
          donor, and how do you find them before an attorney calls?
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That is where our own Jeff Grandy, Vice President of Client Development at Catapult
          Fundraising, spends his days. Here is what he shared on the podcast, which is produced by
          The Fund Raising School at the Indiana University Lilly Family School of Philanthropy.
        </p>

        <YouTubeEmbed
          id={VIDEO_ID}
          title="Why Every Nonprofit Needs a Planned Giving Strategy | Jeff Grandy | First Day Podcast"
          caption="Jeff Grandy on the First Day podcast with host Bill Stanczykiewicz, Ed.D., The Fund Raising School, Indiana University Lilly Family School of Philanthropy. Runtime about 27 minutes."
        />

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Legacy giving is not about death. It is about a life well lived.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Jeff came to legacy giving through public media, hired as a major gift officer in a small
          shop with a growing portfolio and a budget that kept going up. What changed his career was
          not a technique. It was a realization about what the conversation actually is.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          &ldquo;Sometimes there is a preconceived notion that legacy giving is all about death and
          dying, and it is the complete opposite,&rdquo; he said. &ldquo;It is all about how the
          donor has a life well lived. What are the values the donor espouses, and what are those
          values they want to see continue in your organization?&rdquo;
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          He told the story of an early donor visit, a woman named Bev, sitting with her stoic
          husband while Jeff walked them through how she could give now and give later. When he saw
          her eyes well up, the lesson landed.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          Legacy giving is important because it changes the donor&rsquo;s life.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Bill added the research context fundraisers rarely hear: work from Russell James III has
          found that annual giving can increase by as much as 75% after a legacy gift is
          documented, because donors want to experience the joy of that decision while they are
          still here. The legacy conversation is not a threat to the annual fund. It often feeds it.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          One word replaces the whole demographic checklist: loyalty
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Ask the research who leaves a bequest and you get a list of characteristics long enough to
          paper a wall. Jeff described teaching that list at AFP ICON, then advancing to a slide with
          a single word on it.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          &ldquo;When you see loyal giving patterns, it does not matter what zip code they live in,
          what car they drive, who they are, how they spell their last name,&rdquo; he said.
          &ldquo;When they demonstrate loyalty, that is someone you want to have a conversation
          with.&rdquo;
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          In Catapult&rsquo;s own client work, two thresholds have become the practical definition of
          loyalty for a legacy pull:
        </p>
        <ul className="mt-4 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">
              11 or more years of consecutive giving
            </span>
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">
              14 or more years of non-consecutive giving
            </span>
          </li>
        </ul>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Jeff was careful to frame those as sweet spots drawn from Catapult&rsquo;s partnerships
          rather than published research. His advice was to run both pulls through your own CRM and
          see who appears.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Do not skip the non-consecutive donors
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          This was the most practical five minutes of the episode. Most organizations run loyalty
          reports on consecutive gifts inside their own fiscal year, and that quietly deletes some of
          their best prospects.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          &ldquo;Donors do not think in your fiscal year,&rdquo; Jeff said. A donor who gives every
          December but misses one odd-month fiscal cutoff looks lapsed in your report and loyal in
          real life.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Bill layered on the tax-behavior reasons the gap years keep growing. With a higher standard
          deduction, some donors bunch, saving their charitable dollars for two or three years so one
          year&rsquo;s giving clears the deduction. Others route gifts through a donor advised fund
          and let it grow before granting. Some simply rotate their nonprofits. None of that is
          disloyalty. It is calendar mechanics.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The $25 donor belongs on your legacy list
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Jeff&rsquo;s example was a donor giving $25 a year for the last 11 years. Bill stopped to
          make sure listeners caught it: we are talking about all giving levels, not the top of the
          gift range chart.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          &ldquo;Legacy gifts are not defined by the dollar amount,&rdquo; Jeff said. &ldquo;It does
          not matter if it is a future gift of $1,000 or a future gift of $10 million. There is
          something innate in that person that they desire to see their passion and their values live
          on. It is loyalty patterns.&rdquo;
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          These donors, he noted, are usually not the ultra high net worth prospects who ask to
          review your 990 and meet your board chair. They are people who see your organization as a
          conduit for their generosity.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Loyalty shows up in more places than the gift table
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Asked what else to watch for beyond giving history, Jeff turned the question around: how
          else do people experience your mission?
        </p>
        <ul className="mt-4 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>Volunteers who have given years of their time</li>
          <li>Alumni of a school, college, or independent school</li>
          <li>Grateful patients at a hospital or health system</li>
          <li>
            Audiences, members, and subscribers who engage constantly and have never given a dollar
          </li>
        </ul>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          In public media, he pointed out, there were loyal people he would never have called because
          they had never made a gift, yet they tuned in every single day. That is loyalty too, and it
          argues for introductory legacy messaging aimed at everyone who engages with your mission.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          His language rule for that messaging is worth writing on a sticky note: skip the $10 words
          you would get from an estate planning attorney. Use warm, welcoming language about a will,
          and come at it from the perspective of helping people plan.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          How to open the first conversation
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Bill asked the question every gift officer wants answered. You have the list. Now what do
          you actually say? Jeff&rsquo;s answer had four parts.
        </p>
        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Pick up the phone.</span> Tell
            them you are calling with a letter or an email first, then call. Leave a good voicemail
            if they do not answer, and call back on different days of the week.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Lead with celebration, then
            curiosity.</span> You have been giving for 25 years. Why? What have you most enjoyed
            about our work? The data told you they are loyal. The call tells you why.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Listen for values, then share a
            story.</span> When their values come up, share how another donor gave, with that
            donor&rsquo;s permission. &ldquo;Get rid of the statistics,&rdquo; Jeff said. Whether you
            sent home 500 backpacks on a Friday does not land. Who is the one girl you fed all
            weekend?
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Give yourself homework.</span>
            {" "}
            End every conversation with a next step and a next date. Watch for the signals in
            between: leaning in, a lower and quieter voice, and the leave-behind material that comes
            back with them on the second or third visit.
          </li>
        </ol>
        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Two timing notes from Catapult&rsquo;s programs came up here. About a quarter of the donors
          we reach ask a version of the same question: why did it take you this long to find me? Many
          have already named the organization, and in those cases you want to verify that the
          intention is not restricted in a way that will encumber the organization later. For everyone
          else, expect roughly six touches over six to eighteen months before you know what is
          possible. Conversations can take years, and that is normal.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          What to say when leadership says &ldquo;but we still need the annual fund&rdquo;
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Every gift officer meets this objection, usually from a CFO or a board that wants dollars in
          the door this quarter. Jeff&rsquo;s response has two halves.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The first is the cost of waiting. &ldquo;If we choose not to invest today, that donor is
          going to give somewhere else,&rdquo; he said, because other organizations have a more
          advanced legacy program than yours. Choosing short term revenue over long term
          sustainability keeps a shop chasing its tail.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The second is more disarming: a healthy annual fund is the argument for starting legacy work,
          not against it. If your renewals and upgrades are humming and your annual giving already
          feeds a mid-level and major gift pipeline, you have the systems to handle legacy
          documentation and stewardship. And if your organization has even one person on finance,
          find out their favorite dessert or soft drink and invite them into the conversation early,
          because recording and honoring a planned gift correctly is part of the system.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Bill closed with the piece of school research that makes the risk concrete: very few people
          give to only one nonprofit. Your loyal donor is probably supporting three, five, or seven
          organizations, and most charitable giving happens because someone asked. If you are not
          asking about a planned gift, somebody else is.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Five things to do this month
        </h2>
        <ul className="mt-4 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>
            Pull two reports: 11 or more consecutive years of giving, and 14 or more non-consecutive
            years. Ignore gift size.
          </li>
          <li>
            Add your long-tenured volunteers, alumni, grateful patients, and members to the list, even
            the ones who have never given.
          </li>
          <li>
            Rewrite one paragraph of legacy copy in plain, warm language about making a will, with no
            attorney vocabulary.
          </li>
          <li>
            Call ten of those donors this month with one goal: thank them and ask why they have stayed
            so loyal.
          </li>
          <li>
            Bring your finance colleague into the conversation before the first commitment arrives, not
            after.
          </li>
        </ul>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          If ten calls a month is not going to get you through a file of a thousand loyal donors,
          that is the gap our{" "}
          <Link href="/services/legacy-giving" className="font-semibold text-[rgb(var(--navy))] underline">
            Legacy Call program
          </Link>{" "}
          was built to close: a two-tier calling model that qualifies loyal donors and hands genuine
          legacy conversations to gift planning specialists. You can also{" "}
          <Link
            href="/resources/donor-loyalty-assessment"
            className="font-semibold text-[rgb(var(--navy))] underline"
          >
            grade your own loyalty pool in a few minutes
          </Link>
          , or{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            start a conversation with our team
          </Link>
          .
        </p>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Sources: quotations and paraphrases are drawn from{" "}
          <a href={VIDEO_URL} className="underline" rel="noopener noreferrer" target="_blank">
            &ldquo;Why Every Nonprofit Needs a Planned Giving Strategy&rdquo;
          </a>
          , First Day podcast, The Fund Raising School, Indiana University Lilly Family School of
          Philanthropy, published September 21, 2026, hosted by Bill Stanczykiewicz, Ed.D. Research on
          annual giving after a documented legacy gift is attributed in the episode to Russell James
          III. Loyalty thresholds, the share of donors who have already named an organization, and
          visit-count ranges reflect Catapult Fundraising&rsquo;s own client experience as described
          in the episode and are not published industry statistics.
        </p>
      </article>

      <RelatedReading
        heading="More on legacy and planned giving."
        service="legacy-giving"
        pillars={["Planned Giving"]}
      />

      <CtaBand />
    </>
  );
}
