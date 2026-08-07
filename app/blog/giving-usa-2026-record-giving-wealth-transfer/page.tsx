import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "giving-usa-2026-record-giving-wealth-transfer";

const FEATHER = {
  WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as const;

export const metadata = {
  title: "Giving USA 2026: Record Giving, the Great Wealth Transfer, and the Ask We Keep Avoiding",
  description:
    "Anthony R. Alonso on what Giving USA 2026's record $617.2 billion, a 19.7% jump in bequest giving, and the aging of the Baby Boomer generation mean for nonprofit fundraisers who've stopped asking.",
  keywords: [
    "Giving USA 2026",
    "charitable giving statistics",
    "great wealth transfer philanthropy",
    "bequest giving trends",
    "Baby Boomer wealth transfer",
    "major gift fundraising",
    "legacy giving strategy",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Giving USA 2026: Record Giving, the Great Wealth Transfer, and the Ask We Keep Avoiding",
    description:
      "What Giving USA 2026's record $617.2 billion and a 19.7% jump in bequest giving mean for nonprofits, as the Baby Boomer generation ages into the largest wealth transfer in history.",
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [
      {
        url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/37c1fee2-8ec9-4776-997f-51cd02b24659.png",
        width: 1536,
        height: 1024,
        alt: "A multigenerational family looking through a photo album together, symbolizing the great wealth transfer in philanthropy",
      },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Giving USA 2026: Record Giving, the Great Wealth Transfer, and the Ask We Keep Avoiding",
  description:
    "What Giving USA 2026's record $617.2 billion and a 19.7% jump in bequest giving mean for nonprofits, as the Baby Boomer generation ages into the largest wealth transfer in history.",
  author: {
    "@type": "Person",
    name: "Anthony R. Alonso",
    jobTitle: "President & CEO",
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
};

export default function GivingUsa2026Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="The numbers are good. So why aren't we celebrating?"
        description="A different take on Giving USA 2026, the invitation it's really sending us, and why the fastest-growing generation of donors is one most nonprofits still haven't met."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Anthony R. Alonso, President &amp; CEO, Catapult Fundraising
        </p>

        <div className="mt-6 mb-6 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/37c1fee2-8ec9-4776-997f-51cd02b24659.png"
              alt="A multigenerational family looking through a photo album together, symbolizing the great wealth transfer in philanthropy"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <span className="font-display text-2xl font-bold text-[rgb(var(--navy))]">$617.2 billion.</span>{" "}
          That&rsquo;s how much Americans gave to charity in 2025, a new record, according to Giving
          USA. The Giving USA 2026 report, released this June, confirms what many of us hoped: total
          giving grew 5.7% in current dollars, 3.0% adjusted for inflation, surpassing $600 billion
          for the first time in the report&rsquo;s history.
        </p>

        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:mt-2 sm:w-72 md:w-80" style={FEATHER}>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl">
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/7145f640-69cc-45a5-89fa-8e5a0925c337.png"
              alt="Infographic: $617.2 billion in total U.S. charitable giving in 2025, an all-time record, broken down by individuals at 64% ($394.2B), foundations at $117.15B, and corporations at $43.67B"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Per Giving USA, education, public-society benefit, and environment and animal
          organizations each grew more than 11% in current dollars, outpacing the overall rate.
          Individual donors, the heartbeat of American philanthropy, remained the largest source of
          giving at $394.2 billion, 64% of the total. Foundations gave $117.15 billion, and
          corporations gave $43.67 billion, up 3.1%, the slowest-growing source this year.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          By every measure, this should feel like a victory lap.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          So why does it feel like we&rsquo;re reading a spreadsheet?
        </p>

        <div className="clear-both" />

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The data tells one story. The field tells another.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Here&rsquo;s what the numbers don&rsquo;t capture: the fundraiser who&rsquo;s afraid to
          pick up the phone. The board member who treats their seat like a lunch reservation. The
          nonprofit that spent three years perfecting its digital strategy and forgot to ask anyone
          for money.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I&rsquo;ve been in this field for 40 years, from outbound calls for universities and
          hospitals as a teenager, to working on the first $100 million campaign in North America,
          to managing $400 million capital campaigns today. The fundamentals haven&rsquo;t changed:
          the right person, making the right ask, to the right person, at the right time, for the
          right amount.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          What has changed is how much joy we&rsquo;ve let drain out of the work. The field has
          become obsessed with technology, automation, and digital-first strategies, and in doing so
          has lost the relational warmth that makes philanthropy&hellip;philanthropy. Endless board
          meetings. AI-first approaches. Endless data pulls. Somewhere in all of it, we stopped
          talking to donors like human beings who care about something.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The wealth transfer is here. Are we ready?
        </h2>

        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:mt-2 sm:w-72 md:w-80" style={FEATHER}>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl">
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6380aa10-9043-4b6a-9285-6faf66030db6.png"
              alt="Infographic: By 2030, all Baby Boomers will be older than 65, about 20% of the U.S. population per the U.S. Census Bureau; bequest giving jumped 19.7% to $62.19 billion in 2025, the fastest-growing source of giving per Giving USA 2026"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The U.S. population is aging at a historic pace. By 2030, all Baby Boomers will be older
          than 65, making up about 20% of the country. The national median age has already reached
          39.1 years, driven by low birth rates, longer life spans, and the aging of the post-WWII
          generation, according to the U.S. Census Bureau.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That demographic shift is exactly why Giving USA 2026 confirms a signal that deserves far
          more attention than it&rsquo;s getting: bequest giving jumped 19.7% to $62.19 billion in
          2025, the fastest growth of any giving source. The great wealth transfer that&rsquo;s been
          predicted for decades isn&rsquo;t a future event anymore. It&rsquo;s the generation
          already turning 65, and it&rsquo;s materializing right now.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          And yet the sector hasn&rsquo;t built relationships with the heirs. Donor kids have been
          largely ignored. There&rsquo;s been no systematic effort to bring the next generation into
          the conversation.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          This is the gap between what the numbers celebrate and what the field is actually doing.
          We&rsquo;re benefiting from a wealth transfer we didn&rsquo;t cultivate. Imagine what
          happens when we do.
        </p>

        <div className="clear-both" />

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The real problem: we&rsquo;ve stopped asking
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          In a recent conversation with a client, I posed a simple question: What does your
          organization do between now and when your major gift officer is hired?
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The answer, too often, is nothing.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Organizations that stopped asking during COVID lost donors to other nonprofits.
          Lower-end donors are pulling back, but mid-level and major gift donors are holding
          steady. The donors are there. The capacity is there. The willingness is there.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          What&rsquo;s missing is the ask.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I&rsquo;ve said it from stages and in boardrooms: the number one reason donors
          don&rsquo;t give is that nobody asked them. Once a donor takes the meeting, they&rsquo;re
          interested. It&rsquo;s the fundraiser&rsquo;s to lose. Talk less. Listen more. Identify
          the &ldquo;yes&rdquo; you need, and stop.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          What happens when we find the love again
        </h2>

        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:mt-2 sm:w-72 md:w-80" style={FEATHER}>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl">
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/b328b263-ac67-4d40-9029-ab5536b52ced.png"
              alt="Infographic: Phone outreach is the second most effective fundraising channel after face-to-face, outperforming email, direct mail, and digital for donor upgrades"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I grew up poor in Newark, raised by a single mother working three jobs. She gave to the
          church and to neighbors regardless of what she had. I didn&rsquo;t recognize it as
          philanthropy until years into my career. But that&rsquo;s exactly what it was: love in
          action.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          That&rsquo;s what fundraising is supposed to feel like. If both sides believe in the
          cause, the ask should feel good. Not transactional. Not algorithmic. Good.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The real reward isn&rsquo;t the pledge card. It&rsquo;s seeing a student get their first
          college opportunity. It&rsquo;s watching someone regain stability because a nonprofit
          showed up. The impact stories are the point, and they&rsquo;re also the most powerful
          fundraising tool we have.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Phone outreach remains the second most effective fundraising channel after face to face.
          Email, direct mail, and digital cannot replicate the upgrade rates that come from a real
          human conversation. The donors reached in our programs were warm and positive, with
          strong personal connections to the mission and genuine interest in giving and
          volunteering. They just needed someone to call.
        </p>

        <div className="clear-both" />

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Three things to do with this moment
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Giving USA 2026 isn&rsquo;t just a report. It&rsquo;s an invitation. Here&rsquo;s how to
          answer it.
        </p>
        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-bold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">
              Stop hiding behind data and start having conversations.
            </span>{" "}
            Wealth screening and AI tools are useful, but they&rsquo;re preparation, not the work.
            The work is the relationship. Use the data to get in the room. Then put it down.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">
              Invest in the next generation of donors, now.
            </span>{" "}
            The wealth transfer is underway, and bequest giving&rsquo;s 19.7% jump proves it. With
            all Baby Boomers projected to be over 65 by 2030, the heirs of your major donors are out
            there today, not someday. If you haven&rsquo;t introduced yourself, someone else will.
            Legacy giving programs, next-gen engagement events, and simple conversations with donor
            families are not optional anymore.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">
              Reconnect with why you do this.
            </span>{" "}
            A professional fundraiser&rsquo;s job is to take a donor&rsquo;s belief in a cause and
            connect it to a compelling human need. That&rsquo;s not a technical skill. It&rsquo;s an
            act of love, translated into a strategy.
          </li>
        </ol>

        <p className="mt-8 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The numbers in Giving USA 2026 are good, great even. But they&rsquo;re not the story. The
          story is what we do next: whether we treat this record year as validation to keep
          coasting, or as a wake-up call to get back on the phone, back in the room, and back to
          why we started.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The donors are ready. The wealth transfer is happening whether we participate or not.
          The only open question is whether our profession shows up for it.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Want help building a legacy giving and next-generation donor strategy before the wealth
          transfer passes your organization by?{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            Start a conversation with Catapult Fundraising
          </Link>
          .
        </p>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Sources: Giving USA 2026, The Annual Report on Philanthropy for the Year 2025, published
          by Giving USA Foundation and researched by the Indiana University Lilly Family School of
          Philanthropy. Population and median age data from the U.S. Census Bureau.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
