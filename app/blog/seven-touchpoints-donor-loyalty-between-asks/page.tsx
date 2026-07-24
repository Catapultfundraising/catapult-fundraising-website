import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "seven-touchpoints-donor-loyalty-between-asks";

export const metadata = {
  title: "Seven Touchpoints: Building Donor Loyalty Between Asks | Catapult Fundraising",
  description:
    "Anthony Alonso on the low-cost touchpoints, from the 'five by ten' calling habit to digital voicemail drops, that build donor loyalty and quietly upgrade mid-level gifts.",
  keywords: [
    "donor touchpoints",
    "donor loyalty best practices",
    "telefundraising myths",
    "mid-level donor cultivation",
    "donor stewardship calls",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Seven Touchpoints: Building Donor Loyalty Between Asks",
    description:
      "The low-cost touchpoints, from the 'five by ten' calling habit to digital voicemail drops, that build donor loyalty and quietly upgrade mid-level gifts.",
    url: `${SITE_URL}/blog/${SLUG}`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Seven Touchpoints: Building Donor Loyalty Between Asks",
  description:
    "The low-cost touchpoints, from the 'five by ten' calling habit to digital voicemail drops, that build donor loyalty and quietly upgrade mid-level gifts.",
  author: { "@type": "Person", name: "Anthony R. Alonso", affiliation: "Catapult Fundraising" },
  publisher: {
    "@type": "Organization",
    name: "Catapult Fundraising",
    logo: {
      "@type": "ImageObject",
      url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3b507e74-308f-4ba5-aaac-554b31247f7e.png",
    },
  },
  mainEntityOfPage: `${SITE_URL}/blog/${SLUG}`,
};

export default function SevenTouchpointsPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Seven touchpoints: building donor loyalty between asks."
        description="Donor loyalty isn't about donors being loyal to us, says Anthony Alonso, president of Catapult Fundraising. It's about us being loyal to the donor."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Aim for at least seven touchpoints with a donor over the course of a year, and make sure
          most of them have nothing to do with asking for money. Every one of these is a genuine
          two-way exchange: an opportunity to learn what a donor thinks, what motivates their
          giving, and what would make them feel more connected to the mission, information that
          makes every future ask sharper.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          Every single person you speak with should walk away feeling good about the institution.
          If we do that effectively, the money follows.
        </blockquote>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          &ldquo;Five by ten&rdquo;: a habit, not a program
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Call five donors every morning before 10am, donors who would not normally be assigned as
          major gift prospects: someone who has given $25 a year for two decades, a mid-level
          donor overdue for attention. No ask, just a genuine check-in. Organizations that adopted
          this habit have repeatedly seen those overlooked mid-level donors jump from four-figure
          annual gifts to $10,000 or $20,000 gifts, simply because someone finally called. Twenty-
          five calls a week, reaching maybe ten conversations, is enough to keep a real pipeline of
          engaged mid-level donors moving toward major gift status.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Low-cost touches that outperform another appeal letter
        </h2>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">A thank-you call after every event</span>{" "}
            to open a dialogue about what worked, not to solicit. Donors are consistently glad to
            be asked their opinion, and some send unsolicited gifts afterward simply because they
            appreciated the call.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Electronic anniversary and birthday cards</span>,{" "}
            sent with zero ask attached, just gratitude and a reminder of impact.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Digital voicemail drops</span>{" "}
            from the CEO or a student/beneficiary, a message that lands directly in voicemail
            without ringing the phone, at a cost of roughly 5 to 10 cents per message. It should
            sound personal, not scripted, as if that person genuinely picked up the phone.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Small virtual town halls or donor advisory panels</span>,{" "}
            run quarterly on Zoom, even with as few as ten attendees. Donors interact with each
            other about why they give, generating more insight than any wealth-screening tool, and
            unsolicited gifts often follow.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Impact tours and beneficiary stories</span>,{" "}
            inviting mid-level donors behind the scenes and letting the people directly impacted
            tell their own story in their own words.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Retiring the myths about the phone
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Telephone fundraising still gets dismissed as a dead or irritating channel, but the data
          doesn&rsquo;t support that. Roughly 60 percent of people still answer their phone when
          it isn&rsquo;t flagged as &ldquo;scam likely,&rdquo; a reach rate that beats most other
          channels for genuine two-way conversation. Nonprofits are also exempt from the national
          do-not-call list when contacting people with an existing relationship to the
          organization. What actually killed the reputation of phone fundraising was the
          technology: predictive dialers, robocalls, and scripts read at strangers. The fix isn&rsquo;t
          abandoning the phone, it&rsquo;s using it the way a good major-gift officer would: with
          research, a real conversation, and a caller who isn&rsquo;t afraid to make the ask.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Don&rsquo;t call everyone, call the right 5,000
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A common mistake is trying to call an entire database at once. Segment first, and start
          with the group you can actually call well. One long-running client program ended up with
          over 200 unique data segments, each with its own message, because a message that lands
          with a recent graduate rarely lands the same way with a donor from forty years earlier.
          Pre-call letters, ideally two to three pages, longer letters consistently outperform
          short ones in testing, should tell the story from a donor&rsquo;s perspective and set up
          the caller as a facilitator continuing that story, not a stranger asking cold.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Want help designing a touchpoint calendar or a segmented calling program for your donor
          base?{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            Start a conversation with Catapult Fundraising
          </Link>
          .
        </p>
      </article>

      <CtaBand />
    </>
  );
}
