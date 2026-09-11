import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "lapsed-donor-reactivation-win-back-your-database";
const TITLE =
  "Only 4 Percent of Your Database Gave This Year. Here Is How to Win the Rest Back.";
const DESCRIPTION =
  "Most nonprofits have far more former donors than current ones. Anthony R. Alonso on how to calculate your active donor rate, read the lapsed bands in your own file, and run a win-back effort that actually reaches people.";
const HERO = "/blog/lapsed-donor-reactivation/hero-donor-calls.jpg";
const HERO_ALT =
  "Two development staff members working at their desks with phone headsets on";

export const metadata = {
  title: TITLE,
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
    images: [
      {
        url: `${SITE_URL}${HERO}`,
        width: 1800,
        height: 1200,
        alt: HERO_ALT,
      },
    ],
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

export default function LapsedDonorReactivationPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title={TITLE}
        description="Most organizations do not have a donor acquisition problem. They have thousands of people who already said yes once and were never asked again in a way that reached them."
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
          We reviewed a client&rsquo;s donor file recently and found something that is more common
          than most boards realize. The database held roughly 14,000 records. The number of people
          who had given in the last twelve months was 569.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That is about four percent. The organization was not failing at fundraising. It had raised
          money from thousands of people over the years. What it had was a file full of former donors
          and a plan built entirely around finding new ones.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Acquisition is the most expensive thing in fundraising. Reactivation is one of the
          cheapest. If four percent of your file is active, the fastest money in your shop is not
          out there somewhere. It is already in your database, and it has your name in it.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Start by calculating your active donor rate
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          This takes about ten minutes and you do not need a consultant to do it.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Pull the number of unique donors who gave a gift in the last twelve months. Divide it by
          the number of mailable, non-deceased records in your database. That is your active donor
          rate.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          In the files we review, a healthy organization usually lands somewhere in the fifteen to
          twenty percent range. When that number drops toward single digits, it almost always means
          the same thing. The house list has been growing for years and the ask has been narrowing.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          One caution. If your rate looks great because your database is tiny, that is not health,
          that is a small pond. Look at the count and the rate together.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Read your own file before you buy a list
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A donor file is not one audience. It is four, and they need four different conversations.
        </p>

        <div className="mt-8 w-full overflow-hidden rounded-2xl border border-[rgb(var(--line))]">
          <div className="relative aspect-[12/7] w-full">
            <Image
              src="/blog/lapsed-donor-reactivation/graphic-donor-file-segments.png"
              alt="Graphic: four groups hiding inside one donor database. Current donors who gave in the last 12 months, donors lapsed 1 to 2 years, donors lapsed 3 to 5 years, and deep lapsed or tribute donors."
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The band most organizations write off is the three to five year group. In the same file I
          mentioned above, that group held about 900 people. It also held 144 gifts of five thousand
          dollars or more somewhere in its history.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Those are not cold names. Those are people who once wrote your organization a serious
          check. Before anyone suppresses that segment to save postage, screen it.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          A lapsed major donor is not a lost donor. Usually they are a donor whose last conversation
          ended and nobody started the next one.
        </blockquote>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Data hygiene first, dialing second
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          This is where most win-back efforts quietly fail. The strategy is fine, the segments are
          fine, and then it turns out half the records have a disconnected phone number from a
          decade ago.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Bad contact data does not produce a bad result. It produces no result, and then everyone
          concludes that lapsed donors do not come back.
        </p>

        <div className="mt-8 w-full overflow-hidden rounded-2xl border border-[rgb(var(--line))]">
          <div className="relative aspect-[12/7] w-full">
            <Image
              src="/blog/lapsed-donor-reactivation/graphic-data-hygiene-before-dialing.png"
              alt="Graphic: five data appends to run before dialing. Address through NCOA, phone append, email append, age append, and deceased plus duplicate suppression."
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Run the appends, look at the match rates, and then size the effort. If a segment comes back
          with a low phone match, do not force it into a calling program. Mail it, email it, and
          spend the calling hours where there is a real chance of a conversation.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Lapsed donors come back on the phone
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A lapsed donor stopped responding to your mail. Sending more of the same mail is an odd way
          to fix that.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The sequence that works for us is simple. A letter goes first, signed by someone the donor
          would recognize, telling them a call is coming and why. Then the call happens, within a
          couple of weeks, while the letter is still on the counter. The call is not a script recital.
          It opens with their history: you gave in 2019, you gave three times before that, we noticed,
          and we want to know whether we did something to lose you.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Then the ask is specific and modest. In most cases, ask for the last gift amount. The
          objective of a win-back is a renewed relationship, not a record gift. The upgrade
          conversation belongs to next year, when this person is a current donor again.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          You will also learn things on those calls that no report will tell you. Donors will explain
          exactly why they left. Some of it will be uncomfortable. All of it is useful.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The segment nobody calls: tribute and memorial donors
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Somewhere in your file are people who gave once, in memory of a friend or in honor of a
          family member. They are often coded as one-time donors, and they are almost never contacted
          again beyond a receipt.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Handled with care, this is one of the most responsive segments in a database. The person
          already made a gift at a meaningful moment in their life. What they need is not another
          appeal letter. They need someone to acknowledge who they gave for and to explain what that
          gift has done since.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Train callers to slow down here. If the honoree is a spouse or a child, the call is a
          stewardship call first and an ask second, and sometimes it is not an ask at all.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Loyalty is a planned giving signal
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          While you are in the file, sort by number of lifetime gifts rather than by amount. The
          people with ten or more gifts are your most loyal supporters, and their gift size often has
          nothing to do with their real capacity to help.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That group is where planned giving lives. The approach we use is a letter from the
          organization introducing the idea of a gift through a will or estate plan, followed by a
          small number of conversations with a specialist rather than a general caller. These are
          patient conversations. A legacy program is measured in years, not in a fiscal quarter.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          If you want the longer version of that argument, we wrote about the bequest conversation in{" "}
          <Link
            href="/blog/national-make-a-will-month-planned-giving-conversation"
            className="font-semibold text-[rgb(var(--navy))] underline"
          >
            National Make a Will Month
          </Link>
          .
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Broad and shallow is a different problem
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Not every weak file is a lapsed file. In another assessment this month, the pattern was the
          mirror image. Almost all of the money came from individuals, the average gift was around
          two hundred and fifty dollars, and the number of gifts was rising while total dollars stayed
          flat.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That organization did not need a win-back campaign. It needed an upgrade ladder. Its donors
          were loyal and nobody had ever asked them to do more than they did the first time.
        </p>

        <div className="mt-8 w-full overflow-hidden rounded-2xl border border-[rgb(var(--line))]">
          <div className="relative aspect-[12/7] w-full">
            <Image
              src="/blog/lapsed-donor-reactivation/graphic-two-problems-two-plays.png"
              alt="Graphic: a lapsed file and a shallow file need opposite plays. Lapsed files need a segmented win-back with data appends, a letter and a call. Shallow files need an upgrade ladder, a monthly option and personal visits."
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Diagnose which one you have before you spend a dollar. The two problems look similar on a
          dashboard and they respond to opposite treatments.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Where to start on Monday
        </h2>
        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            Calculate your active donor rate and write it down. It becomes the number you manage.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            Count your file by lapsed band, and pull the largest past gift inside each band.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            Append address, phone, email and age, and suppress the deceased and the duplicates.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            Pick one band, usually one to two years lapsed, and run a letter followed by calls.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            Report reactivation rate and cost per donor recovered, then scale what worked.
          </li>
        </ol>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          None of this is glamorous work. It is your own data, cleaned up, sorted properly, and then
          followed by a human conversation. That is usually where the next year of revenue is
          sitting.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Catapult Fundraising reviews donor files, builds reactivation and upgrade plans, and runs
          the calling programs that carry them out. If you want to know what is actually in your
          database,{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            let&rsquo;s take a look together
          </Link>
          .
        </p>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Figures in this article come from Catapult Fundraising donor file reviews and assessments
          completed for client organizations. Clients are described by type only and are not
          identified.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
