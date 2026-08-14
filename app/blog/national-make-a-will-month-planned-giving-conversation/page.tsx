import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "national-make-a-will-month-planned-giving-conversation";

const FEATHER = {
  WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as const;

export const metadata = {
  title: "National Make a Will Month: The Ask You Keep Avoiding",
  description:
    "Anthony R. Alonso on why National Make a Will Month is the perfect low-pressure moment to start the planned giving conversation, and the two-tier calling model that turns loyal donors into legacy donors.",
  keywords: [
    "National Make a Will Month",
    "planned giving strategy",
    "legacy giving program",
    "bequest giving trends",
    "charitable gift annuities",
    "estate planning nonprofit",
    "legacy society fundraising",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "National Make a Will Month: The Planned Giving Conversation You Keep Avoiding",
    description:
      "August is National Make a Will Month, and it just handed fundraisers a low-pressure reason to finally start the bequest conversation. Here's why the donors you're most nervous to ask are often the ones most ready to say yes.",
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [
      {
        url: "https://galaxy-prod.tlcdn.com/gen/195e3163b35e43c2813bec32cf08e4f6.jpeg",
        width: 1536,
        height: 1024,
        alt: "A shaggy, wide-eyed puppy resting its chin on the table next to Monopoly money, looking up at the camera",
      },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "National Make a Will Month: The Planned Giving Conversation You Keep Avoiding",
  description:
    "August is National Make a Will Month, and it just handed fundraisers a low-pressure reason to finally start the bequest conversation. Here's why the donors you're most nervous to ask are often the ones most ready to say yes.",
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

export default function NationalMakeAWillMonthPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="You know their dog's name. Now ask about their will."
        description="National Make a Will Month just handed fundraisers a low-pressure reason to finally start the planned giving conversation, and the donors you're most nervous to ask are often the ones most ready to say yes."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons
          url={`/blog/${SLUG}`}
          title="National Make a Will Month: The Planned Giving Conversation You Keep Avoiding"
        />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Anthony R. Alonso, President &amp; CEO, Catapult Fundraising
        </p>

        <div className="mt-6 mb-6 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/195e3163b35e43c2813bec32cf08e4f6.jpeg"
              alt="A shaggy, wide-eyed puppy resting its chin on the table next to Monopoly money, looking up at the camera"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Let&rsquo;s be honest. For a lot of fundraisers, &ldquo;planned giving&rdquo; sits
          somewhere between awkward and please-don&rsquo;t-make-me. You&rsquo;ve built a real
          relationship with this donor. You know their dog&rsquo;s name. You&rsquo;ve sat through
          the vacation photos. And now you&rsquo;re supposed to bring up what happens after
          they die?
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Yes. You are. And here&rsquo;s the good part: August is National Make a Will Month, so
          the calendar just handed you a low-pressure reason to finally start that conversation.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Let&rsquo;s talk about why planned giving matters, why fundraisers keep dodging it, and
          why the donors you&rsquo;re most nervous to ask are often the ones most ready to say
          yes.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Let&rsquo;s Look at the Numbers
        </h2>

        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:mt-2 sm:w-72 md:w-80" style={FEATHER}>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl">
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/2072f4578d4e451d9096dde75649d2a1.png"
              alt="Infographic: $617 billion in total U.S. charitable giving in 2025, an all-time record; bequests reached $62 billion, up 20%; bequests now represent 1 in 10 dollars given; individuals and bequests together made up 74% of total giving"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          According to Giving USA 2026, Americans gave a record $617 billion to charity in 2025,
          the first time total giving has ever crossed $600 billion. That works out to roughly
          $1.7 billion a day. Individuals and bequests together made up 74% of every charitable
          dollar given last year.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Here&rsquo;s the number that should stop you in your tracks: bequest giving hit an
          estimated $62 billion in 2025, up 20% from the year before. Bequests now account for 1
          out of every 10 dollars given to charity. And this isn&rsquo;t a one-year fluke.
          Bequests have grown 20% or more, in current dollars, in three of the last four years.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Now pair that with this: more than 68% of Americans don&rsquo;t have a valid will.
          That&rsquo;s not just a problem for estate attorneys. That&rsquo;s a fundraising
          opportunity sitting out in the open.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          And here&rsquo;s one from our own work that should make every development director sit
          up straight: in Catapult&rsquo;s experience, when we call through a nonprofit&rsquo;s
          donor file, we typically find that 20% to 25% of prospects have already named the
          organization in their estate plan, and nobody at the organization knew. They made the
          gift. They just never told anyone.
        </p>

        <div className="clear-both" />

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Why Fundraisers Keep Avoiding This
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Talking about death is uncomfortable. Talking about money is uncomfortable. Put them
          together and it&rsquo;s the kind of topic that clears a dinner party.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          But the real reason most fundraisers avoid the planned giving conversation isn&rsquo;t
          squeamishness. It&rsquo;s a quiet belief that asking a loyal donor about their estate
          plan is presumptuous, or that it&rsquo;ll make them feel like you&rsquo;re waiting for
          them to die.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I think we&rsquo;re looking at the conversation the wrong way. We&rsquo;re not asking a
          donor to talk about dying. We&rsquo;re asking someone who has supported the
          organization for 10, 20, or 30 years whether they&rsquo;ve thought about what they want
          that support to accomplish after they&rsquo;re gone. That&rsquo;s a very different
          conversation.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          After 40 years in this business, the core truth hasn&rsquo;t changed: the job is
          connecting a donor&rsquo;s belief in a cause to a compelling, human reason to give.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Legacy gifts, scholarships, endowments, named spaces, the impact stories are the point.
          The bequest conversation is just the vehicle that gets you there.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          What a Good Planned Giving Program Actually Looks Like
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          You don&rsquo;t need a full-time gift planning officer, a law degree, or a budget line
          that makes your CFO wince. You need a thoughtful approach, decent data, and the
          willingness to pick up the phone.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Here&rsquo;s how we structure it for clients at Catapult:
        </p>

        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Tier 1: Warm outreach.</span>{" "}
            Experienced engagement professionals call to thank donors and open a conversation. No
            pressure, no legal jargon. The only goal is finding out whether a donor has already
            included the organization in their estate plan, and whether they&rsquo;d like to
            learn more.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">
              Tier 2: Gift planning specialists.
            </span>{" "}
            Donors who show interest get connected with seasoned planned giving professionals,
            usually retired gift officers with 20-plus years of experience. These aren&rsquo;t
            call center staff. They&rsquo;re fundraisers who&rsquo;ve closed thousands of planned
            gifts and can walk someone through everything from a simple bequest to a charitable
            remainder trust.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Pre-call letters.</span> Every
            outreach starts with a personal letter from a trusted community figure, ideally a
            donor who has already made a planned gift and can speak to it honestly.
          </li>
        </ol>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The results back it up. In our experience, a well-run program reaching 1,000 prospects
          can generate $1.2 million to $1.7 million in closed planned giving commitments. One
          national TV ministry we worked with topped $12 million. And the cost is less than
          hiring a single planned giving officer for a year.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Who Should You Actually Be Talking To?
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Not every donor is a planned giving prospect, but the signals are clearer than most
          fundraisers assume.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Look at donors who&rsquo;ve given consecutively for 10-plus years. Look at people who
          give modestly each year but whose wealth screening suggests a lot more capacity. Look at
          long-time subscribers, members, and volunteers who have never once been asked about
          their estate plans.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Here&rsquo;s something we&rsquo;ve learned working with hundreds of organizations: a
          surprising number of your most loyal donors have already written you into their wills.
          They just assumed you knew. The discovery call isn&rsquo;t an ask. It&rsquo;s a
          thank-you with a question attached.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          What Donors Can Actually Give
        </h2>

        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:mt-2 sm:w-72 md:w-80" style={FEATHER}>
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl">
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/47ee785723ac4711b4c9fc5657c8db2b.png"
              alt="Infographic: 68% of Americans don't have a valid will, yet in Catapult's experience 20% to 25% of donor files already include the organization in their estate plan, and nobody knew"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Planned gifts come in more forms than most people realize, and you don&rsquo;t need to
          be an expert in all of them. The most common, accessible options:
        </p>
        <ul className="mt-4 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Bequests,</span> a percentage
            or dollar amount left in a will or trust
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Beneficiary designations</span>{" "}
            on retirement accounts, life insurance, or bank accounts
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Charitable gift annuities,</span>{" "}
            which pay the donor income for life
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Charitable remainder trusts,</span>{" "}
            which benefit both the donor and the organization
          </li>
        </ul>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The message to give donors: they don&rsquo;t have to be wealthy to do this. They just
          have to care. And if they&rsquo;ve been giving to your organization for years, they
          already do.
        </p>

        <div className="clear-both" />

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          And Don&rsquo;t Forget the Endowment
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Planned gifts are also the foundation of endowment growth, and endowments are how
          nonprofits stop living campaign to campaign. A bequest directed to an endowment can
          support that program for generations instead of funding it just once.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That&rsquo;s a conversation worth having with your board and your longest-standing
          supporters, not as a pitch, but as a vision. What would it mean for your mission to have
          a permanent financial foundation? What could you do that you can&rsquo;t do today?
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Make August Count
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          National Make a Will Month isn&rsquo;t just a calendar entry. It&rsquo;s permission.
          Permission to send the email you&rsquo;ve been drafting in your head for six months.
          Permission to call the donor who&rsquo;s been giving since before your current ED was
          hired. Permission to say, &ldquo;We&rsquo;d love to talk to you about your
          legacy.&rdquo;
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          You don&rsquo;t need a script full of legal terms. You need warmth, honesty, and a
          genuine belief that the work your organization does deserves to be carried forward.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Bequest totals move around year to year depending on estate settlement timing, but the
          long-term pattern is clear: planned gifts are one of the most reliable sources of
          support a nonprofit can build.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The donors who love you most are usually just waiting to be asked.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Catapult Fundraising helps nonprofits launch and scale planned giving programs through a
          proven two-tier calling model. If you&rsquo;d like to talk about what a legacy giving
          program could look like for your organization,{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            we&rsquo;d love to start the conversation
          </Link>
          .
        </p>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Sources: Total giving, bequest giving, and giving-by-source figures are drawn from
          Giving USA 2026 (reporting on 2025 data), Indiana University Lilly Family School of
          Philanthropy, with analysis support from Stelter. Prospect-identification and
          program-performance figures reflect Catapult Fundraising&rsquo;s own client experience
          and are not industry-wide statistics.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
