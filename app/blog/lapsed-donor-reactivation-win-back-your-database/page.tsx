import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "lapsed-donor-reactivation-win-back-your-database";
const TITLE =
  "Only 4% of Your Donor Database Gave This Year. Here’s How to Win the Rest Back.";
const DESCRIPTION =
  "Most nonprofits do not have a donor acquisition problem. Anthony R. Alonso on calculating your active donor rate, segmenting a lapsed donor file, cleaning the data, and running a letter-plus-call reactivation program that reaches people.";
const HERO = "/blog/lapsed-donor-reactivation/hero-donor-calls.jpg";
const HERO_ALT =
  "Experienced development staff speaking with donors on the phone from an office";
const GFX = "/blog/lapsed-donor-reactivation";

export const metadata = {
  title: { absolute: "Lapsed Donor Reactivation: Win Back Your Database | Catapult" },
  description: DESCRIPTION,
  keywords: [
    "lapsed donor reactivation",
    "how to win back lapsed donors",
    "donor retention rate benchmark",
    "active donor rate",
    "donor file segmentation",
    "annual fund calling program",
    "donor data hygiene",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [{ url: `${SITE_URL}${HERO}`, width: 1800, height: 1200, alt: HERO_ALT }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: TITLE,
  datePublished: "2026-09-11",
  dateModified: "2026-09-11",
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
};

const P = "mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70";
const H2 = "mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]";
const H3 = "mt-8 font-display text-2xl text-[rgb(var(--navy))]";
const LI = "text-lg leading-relaxed text-[rgb(var(--ink))]/70";

function Graphic({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mt-8 w-full overflow-hidden rounded-2xl border border-[rgb(var(--line))]">
      <div className="relative aspect-[12/7] w-full">
        <Image src={src} alt={alt} fill className="object-cover" />
      </div>
    </div>
  );
}

export default function LapsedDonorReactivationPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title={TITLE}
        description="Most nonprofits do not have a donor acquisition problem. They have thousands of people who already said yes once, and somewhere along the way, the conversation stopped."
      />

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

        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          We recently reviewed a nonprofit donor file with roughly 14,000 records. Only 569 people
          had made a gift in the previous 12 months. That is about 4%.
        </p>
        <p className={P}>
          My first thought was not, &ldquo;This organization needs more donors.&rdquo; It was,
          &ldquo;What happened to the other 13,000?&rdquo;
        </p>
        <p className={P}>
          Those people were not strangers. They were former donors. They had raised their hands at
          some point and said they believed in the organization&rsquo;s work. Some had given once.
          Some had given for years. Some had made significant gifts.
        </p>
        <p className={P}>Then the relationship went quiet.</p>
        <p className={P}>
          That is a very different problem from donor acquisition. And in many cases, it is a much
          more interesting fundraising opportunity.
        </p>

        <h2 className={H2}>Why donor retention and reactivation matter</h2>
        <p className={P}>The fundraising industry has a donor retention problem.</p>
        <p className={P}>
          The Fundraising Effectiveness Project reported that overall donor retention was 18.1% in
          Q1 2025, down slightly from 18.3% in 2024. The same report found that the total number of
          donors declined 1.3% year over year.
        </p>
        <p className={P}>
          The numbers tell an important story: nonprofits are still raising money, but keeping
          donors engaged remains difficult. That makes the people already sitting in your database
          incredibly valuable.
        </p>
        <p className={P}>
          And there is another important distinction. Donor retention is not the same thing as an
          active donor rate. Retention asks whether donors who gave previously gave again. Your
          active donor rate asks a different question: how much of your database has given within a
          defined period.
        </p>

        <Graphic
          src={`${GFX}/graphic-retention-vs-active-rate.png`}
          alt="Graphic comparing donor retention rate, reported at 18.1 percent for Q1 2025 by the Fundraising Effectiveness Project, with the active donor rate, calculated as twelve-month donors divided by usable records."
        />

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Both numbers matter. If you have a large database but only a small percentage of it is
          currently giving, do not immediately conclude that you need more names. First, find out
          what happened to the people you already have.
        </p>

        <h2 className={H2}>Start by calculating your active donor rate</h2>
        <p className={P}>This takes about ten minutes. You do not need a consultant to do it.</p>
        <p className={P}>
          Pull the number of unique donors who made a gift during the last 12 months. Then divide
          that number by the number of usable, mailable, non-deceased records in your database. That
          gives you your active donor rate.
        </p>

        <p className="mt-6 rounded-2xl border border-[rgb(var(--line))] bg-white px-6 py-5 font-display text-xl text-[rgb(var(--navy))]">
          569 active donors &divide; 14,000 usable records = 4.1% active donor rate
        </p>

        <p className={P}>
          That number should become a management metric. Do not look at the percentage alone. Look
          at the actual number of donors behind it. And do not compare your active donor rate
          directly with an industry retention benchmark. They measure different things.
        </p>
        <p className={P}>Instead, use the number to ask better questions:</p>
        <ul className="mt-4 space-y-3 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className={LI}>How many donors gave last year but not this year?</li>
          <li className={LI}>How many have been inactive for one to two years?</li>
          <li className={LI}>How many are three to five years lapsed?</li>
          <li className={LI}>How many made a major gift at some point?</li>
          <li className={LI}>How many have given ten or more times?</li>
          <li className={LI}>How many have never received a personal conversation?</li>
          <li className={LI}>How many have outdated phone, email or address information?</li>
        </ul>
        <p className={P}>That is where the opportunity starts to appear.</p>

        <h2 className={H2}>Your donor database is not one audience</h2>
        <p className={P}>
          One of the biggest mistakes we see is treating the entire donor file as if everyone needs
          the same message. They do not.
        </p>
        <p className={P}>
          A healthy donor reactivation strategy should separate people according to their
          relationship with your organization.
        </p>

        <Graphic
          src={`${GFX}/graphic-donor-file-segments.png`}
          alt="Graphic showing five groups inside one donor database: current donors, recently lapsed donors, longer lapsed donors, lapsed major donors, and loyal donors with ten or more gifts."
        />

        <h3 className={H3}>Current donors</h3>
        <p className={P}>
          These are the people who have given within your current 12-month window. The goal is
          retention, stewardship and, where appropriate, upgrading.
        </p>

        <h3 className={H3}>Recently lapsed donors</h3>
        <p className={P}>
          These donors gave relatively recently but have not renewed. They should usually be among
          the first people you test with a focused reactivation effort.
        </p>

        <h3 className={H3}>Longer-lapsed donors</h3>
        <p className={P}>
          These people may not have given in several years, but their history can tell you whether
          they are worth another conversation.
        </p>

        <h3 className={H3}>High-value and major-gift lapsed donors</h3>
        <p className={P}>
          This group deserves special attention. A donor who once made a $5,000, $10,000 or $25,000
          gift should not automatically be treated like someone who made a single $25 gift.
        </p>

        <h3 className={H3}>Loyal donors</h3>
        <p className={P}>
          Look at the number of gifts, not just the amount. Someone who has made 12 gifts over 10
          years may be one of your organization&rsquo;s most committed supporters even if none of
          those gifts was particularly large.
        </p>
        <p className={P}>Different donors require different conversations.</p>

        <h2 className={H2}>Before you buy another list, look at the one you already own</h2>
        <p className={P}>
          This is one of the simplest questions a nonprofit can ask: how much fundraising potential
          is already sitting in our database?
        </p>
        <p className={P}>
          In the 14,000-record file we reviewed, the three-to-five-year lapsed group contained
          roughly 900 people. More importantly, that group included 144 historical gifts of $5,000
          or more.
        </p>
        <p className={P}>
          Those were not cold names. They were people who had once trusted the organization enough
          to make a significant gift. That changes the conversation.
        </p>
        <p className={P}>
          Before suppressing a lapsed donor because they have not given recently, look at their
          history. When did they first give? How many times did they give? What was their largest
          gift? What programs did they support? Did they give in response to a particular event or
          campaign? Were they ever a volunteer, board member, parent, client, patient, student or
          family member?
        </p>
        <p className={P}>And perhaps most importantly: has anyone actually talked to them?</p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          A lapsed major donor is not necessarily a lost donor. Sometimes they are simply a donor
          whose last conversation ended and nobody started the next one.
        </blockquote>

        <h2 className={H2}>Data hygiene comes before donor calling</h2>
        <p className={P}>
          This is where many reactivation programs quietly fail. The strategy looks good. The
          segments look good. The messaging looks good. Then someone discovers that half the phone
          numbers are disconnected.
        </p>
        <p className={P}>
          Bad contact data does not necessarily produce a bad fundraising result. It produces no
          result.
        </p>

        <Graphic
          src={`${GFX}/graphic-data-hygiene-before-dialing.png`}
          alt="Graphic listing the data work that comes before dialing: phone and email append, address through NCOA, age and household data, deceased and duplicate suppression, and giving history pulled forward."
        />

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Before launching a calling program, clean and append the data. Look at phone numbers,
          email addresses and mailing addresses. Look at age or date of birth, deceased records,
          duplicate records and household information. Then pull the giving history forward:
          lifetime giving, last gift, largest gift, number of gifts, and previous campaign or
          program participation.
        </p>
        <p className={P}>
          Then look at the match rates. If a segment has terrible phone coverage, do not force it
          into a phone program simply because calling is part of your strategy. Use the channel that
          gives you the best opportunity to reach the donor.
        </p>

        <h2 className={H2}>Why the phone can change a lapsed donor conversation</h2>
        <p className={P}>
          A donor who stopped responding to your mail does not necessarily need another piece of
          mail. Sometimes they need a person.
        </p>
        <p className={P}>
          A sequence we have used successfully begins with a letter from someone the donor
          recognizes, letting them know that a call is coming and explaining why the organization
          wants to reconnect. Then the call happens while that letter is still relatively fresh.
        </p>

        <Graphic
          src={`${GFX}/graphic-letter-plus-call-sequence.png`}
          alt="Graphic showing the letter-plus-call sequence: a letter from a familiar signer, a call while the letter is fresh, an opening built on the donor's history, an ask at the last gift amount, and listening and recording why the donor stopped."
        />

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          And the call should not sound like a script. It should sound like someone knows the
          donor&rsquo;s history. Something as simple as:
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          You gave to us in 2019, and you had actually given three times before that. We noticed you
          have not been with us recently, and I wanted to reach out personally and see how you are
          doing.
        </blockquote>

        <p className={P}>
          That is a different conversation from, &ldquo;Would you like to renew your membership
          today?&rdquo;
        </p>
        <p className={P}>
          The objective of a win-back call is not necessarily to get the largest possible gift. The
          first objective is to restart the relationship. If the donor&rsquo;s last gift was $100,
          start there. If they tell you they would like to do more, that is a different conversation.
          The upgrade conversation can come later.
        </p>

        <h2 className={H2}>The information donors give you may be worth as much as the gift</h2>
        <p className={P}>
          One of the overlooked benefits of donor calling is what you learn. Donors will tell you why
          they stopped giving.
        </p>
        <p className={P}>
          Maybe they did not understand where their money was going. Maybe the organization changed
          leadership. Maybe they had a bad experience. Maybe they moved. Maybe their financial
          situation changed. Maybe they simply never received another meaningful communication.
        </p>
        <p className={P}>
          And sometimes they will tell you something the development office has never heard. That
          information matters.
        </p>
        <p className={P}>
          A good reactivation program does not just generate gifts. It gives you a better
          understanding of why donors stay, why they leave and what might bring them back.
        </p>

        <h2 className={H2}>Do not overlook tribute and memorial donors</h2>
        <p className={P}>
          There is another group hiding inside many donor databases: people who gave in memory or in
          honor of someone else. They are often coded as one-time donors. Then they receive a
          receipt. And that is the end of the relationship.
        </p>
        <p className={P}>
          That can be a mistake. A tribute donor made a gift at a meaningful moment in their life.
          The person they honored mattered to them. The next conversation should recognize that.
        </p>
        <p className={P}>
          Sometimes the right approach is stewardship first and fundraising second. And sometimes
          there should not be an ask at all.
        </p>
        <p className={P}>
          If someone gave in memory of a spouse, child, parent or close friend, train the caller to
          slow down. Ask about the person. Acknowledge the reason for the original gift. Explain what
          that gift helped accomplish. Then listen. The fundraising opportunity may come later.
        </p>

        <h2 className={H2}>Loyalty can be a planned giving signal</h2>
        <p className={P}>
          While you are analyzing the database, sort donors by number of lifetime gifts, not just
          lifetime dollars. The person who has made 15 gifts over 12 years may have enormous loyalty
          even if their average gift is modest.
        </p>
        <p className={P}>
          That matters for planned giving. Blackbaud&rsquo;s FY2024 donorCentrics data found a
          substantial difference in retention between recurring and single-gift donors: recurring
          gift donors had an 81% retention rate compared with 46% for single-gift-only donors, with
          overall donor retention at 53% in that particular benchmarking cohort.
        </p>
        <p className={P}>
          The lesson is not that every loyal donor should immediately receive a planned giving
          solicitation. The lesson is that loyalty is a valuable signal. A donor who has demonstrated
          a long-term commitment deserves a different conversation from someone who made one gift six
          years ago.
        </p>
        <p className={P}>
          For the right donors, that conversation may eventually include a gift through a will, trust
          or estate plan. These are patient conversations. A legacy program is measured in years, not
          in a fiscal quarter. We wrote more about how to open that conversation in{" "}
          <Link
            href="/blog/national-make-a-will-month-planned-giving-conversation"
            className="font-semibold text-[rgb(var(--navy))] underline"
          >
            National Make a Will Month
          </Link>
          .
        </p>

        <h2 className={H2}>Do not confuse a lapsed file with a shallow file</h2>
        <p className={P}>
          Not every weak donor file has a retention problem. Sometimes the opposite is true.
        </p>
        <p className={P}>
          In another assessment, we saw an organization where the number of gifts was increasing but
          total dollars were barely moving. The average gift was around $250. Most of the money came
          from individuals. The organization had loyal donors. What it did not have was an effective
          upgrade path.
        </p>
        <p className={P}>
          That organization did not need a win-back campaign. It needed an upgrade strategy.
        </p>

        <Graphic
          src={`${GFX}/graphic-two-problems-two-plays.png`}
          alt="Graphic contrasting two donor file problems: a lapsed file that needs a segmented win-back, and a shallow file of active donors that needs an upgrade path."
        />

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          This distinction is important. A lapsed donor file and a shallow donor file can look
          similar on a dashboard. They require very different fundraising strategies. Lapsed donors
          need to be brought back. Active but shallow donors need to be moved up. Diagnose the
          problem before you spend money solving it.
        </p>

        <h2 className={H2}>What the latest fundraising data tells us</h2>
        <p className={P}>
          The broader fundraising environment makes this even more important. M+R&rsquo;s 2026
          Benchmarks found that online revenue increased 15% in 2025. One-time online giving
          increased 17%, monthly giving increased 12%, and donor-advised fund revenue increased 44%.
        </p>
        <p className={P}>
          But digital growth does not eliminate the need to manage donor relationships. In fact, it
          makes the quality of your donor database more important. M+R found that email generated 11%
          of online revenue in 2025, while nonprofits raised an average of $54 for every 1,000
          fundraising emails sent.
        </p>
        <p className={P}>
          Those numbers are a useful reminder. You do not need every donor to respond to every
          channel. You need to understand the donor well enough to choose the right channel and the
          right message.
        </p>
        <p className={P}>
          For some donors, that is email. For others, it is direct mail. For others, it may be a
          phone call. And for your most valuable relationships, it may be a personal conversation
          from a staff member, board member or volunteer.
        </p>

        <h2 className={H2}>Where to start on Monday</h2>
        <p className={P}>
          You do not need a six-month consulting engagement to begin. Start here.
        </p>
        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Calculate your active donor rate.</span>{" "}
            Write it down and make it a number your development team watches.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Build your lapsed donor bands.</span>{" "}
            Look at one year, two years, three to five years and longer.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Identify historical value.</span>{" "}
            For each segment, look at lifetime giving, largest gift and number of gifts.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Clean the data.</span> Append
            phone, email and address information. Remove duplicates and deceased records.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Pick one segment.</span> Do not
            try to call everyone at once. Start with a group where the data and donor history suggest
            a reasonable opportunity.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Use a letter-plus-call strategy.</span>{" "}
            Give the donor context before the phone rings.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Measure the right things.</span>{" "}
            Do not just report dollars raised.
          </li>
        </ol>

        <Graphic
          src={`${GFX}/graphic-measure-the-right-things.png`}
          alt="Graphic listing the metrics that matter in a reactivation program: contact and conversation rate, reactivation rate, average recovered gift, cost per donor recovered, reasons donors stopped giving, and subsequent retention."
        />

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Track contact rate, conversation rate, reactivation rate, average recovered gift, revenue
          recovered, cost per donor recovered, the reasons donors stopped giving, and subsequent
          retention. Then scale what works.
        </p>

        <h2 className={H2}>The money may already be in your database</h2>
        <p className={P}>
          None of this is particularly glamorous. It is data cleanup. Segmentation. Research. Phone
          calls. Listening. Following up.
        </p>
        <p className={P}>But that may be exactly why it gets overlooked.</p>
        <p className={P}>
          Your next fundraising opportunity may not be another purchased list or another acquisition
          campaign. It may be the donor who gave you $500 three years ago. The donor who made ten
          gifts and suddenly disappeared. The family member who made a memorial gift. The donor who
          gave $10 every month for five years. The former major donor whose last conversation
          happened before your current development director was hired.
        </p>
        <p className={P}>
          Before you go looking for more donors, look at the people who already believed in you.
          That is where reactivation begins.
        </p>

        <h2 className={H2}>How Catapult Fundraising can help</h2>
        <p className={P}>
          Catapult Fundraising helps nonprofit organizations analyze donor files, identify
          reactivation and upgrade opportunities, develop donor communication strategies and execute
          calling programs designed to strengthen donor relationships and generate revenue.
        </p>
        <p className={P}>
          If you are wondering what is actually sitting inside your donor database,{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            let&rsquo;s take a look together
          </Link>
          .
        </p>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Sources: donor retention and donor count figures are from the Fundraising Effectiveness
          Project 2025 Q1 Quarterly Benchmark Report (AFP). Recurring and single-gift retention
          figures are from Blackbaud&rsquo;s FY2024 donorCentrics Sustainer Summit analysis. Online
          revenue, monthly giving, donor-advised fund and email figures are from M+R Benchmarks 2026.
          Client figures come from Catapult Fundraising donor file reviews and assessments completed
          for client organizations. Clients are described by type only and are not identified.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
