import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "annual-fund-donor-relationships-lasting-philanthropy";
const IMG = `/blog/${SLUG}`;
const HEADLINE = "The Annual Fund: Where Donor Relationships Become Lasting Philanthropy";
const DESCRIPTION =
  "Gwen Paxon on building an annual fund around relationships: clean data, real segmentation, lapsed donors, recurring gifts, pledge follow-through, stewardship, and a path to major and planned gifts.";

export const metadata = {
  title: { absolute: "The Annual Fund and Donor Relationships | Catapult" },
  description:
    "How to run an annual fund that builds relationships: donor data, segmentation, lapsed donors, recurring gifts, pledge follow-up, stewardship, and upgrade signals.",
  keywords: [
    "annual fund",
    "annual giving program",
    "annual fund strategy",
    "donor stewardship",
    "lapsed donor reactivation",
    "recurring giving",
    "pledge fulfillment",
    "donor segmentation",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: HEADLINE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [
      {
        url: `${SITE_URL}${IMG}/og-donor-thank-you-call.jpg`,
        width: 1536,
        height: 1024,
        alt: "An older man smiling as he talks on the phone at home",
      },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: HEADLINE,
  datePublished: "2026-10-02",
  dateModified: "2026-10-02",
  description: DESCRIPTION,
  image: `${SITE_URL}${IMG}/og-donor-thank-you-call.jpg`,
  author: {
    "@type": "Person",
    name: "Gwen Paxon, CFRE",
    jobTitle: "Vice President of Client Services",
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

// Same soft-edged, right-floated figure treatment as the Understanding Latino
// Philanthropy article.
const FEATHER = {
  WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as const;

function Figure({
  src,
  alt,
  aspect = "aspect-[3/2]",
  priority = false,
}: {
  src: string;
  alt: string;
  aspect?: string;
  priority?: boolean;
}) {
  return (
    <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
      <div className={`relative ${aspect} w-full overflow-hidden rounded-2xl`} style={FEATHER}>
        <Image src={src} alt={alt} fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" priority={priority} />
      </div>
    </div>
  );
}

function P({ children, className = "mt-4" }: { children: ReactNode; className?: string }) {
  return <p className={`${className} text-lg leading-relaxed text-[rgb(var(--ink))]/70`}>{children}</p>;
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">{children}</h2>;
}

function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
      {children}
    </blockquote>
  );
}

const Clear = () => <div className="clear-both" />;

export default function AnnualFundRelationshipsPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="The annual fund: where donor relationships become lasting philanthropy."
        description="The annual fund is often called the foundation of a fundraising program. Gwen Paxon on why its real value is the chance to get to know your donors, and what to do with what you learn."
      />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={HEADLINE} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Gwen Paxon, CFRE, Vice President of Client Services, Catapult Fundraising
        </p>

        <Figure
          src={`${IMG}/hero-donor-thank-you-call.jpg`}
          alt="An older man smiling as he talks on the phone at home"
          aspect="aspect-[4/3]"
          priority
        />
        <P>
          The annual fund is often called the foundation of a fundraising program. And for good reason. It
          provides a reliable source of revenue, but its value goes well beyond the dollars raised.
        </P>
        <P>
          A strong annual fund gives an organization something just as important: the opportunity to get
          to know its donors.
        </P>
        <P>
          Who are they? What matters to them? Why did they make their gift? What causes or programs
          interest them? Are they willing to talk with someone from the organization? And, perhaps most
          importantly, what can the organization do to keep that relationship moving forward?
        </P>
        <P>
          Those questions are easy to overlook when annual giving becomes a cycle of appeals, deadlines
          and year-end goals.
        </P>
        <P>
          But donors don&rsquo;t experience their relationship with an organization as a series of
          campaigns. They remember whether someone thanked them. They remember whether anyone told them
          what their gift accomplished. They notice when the organization only seems to call when it wants
          another gift.
        </P>
        <P>
          The strongest annual fund programs understand that the relationship continues after the check
          arrives.
        </P>

        <Clear />

        <H2>The annual fund is more than a revenue program</H2>
        <Figure src={`${IMG}/graphic-donor-pathway-v2.jpg`} alt="Graphic: an annual gift is where the relationship starts, moving from first-time donor to recurring donor, upgrade prospect, and major or planned gift" />
        <P>
          An annual gift can be the beginning of a much larger relationship.
        </P>
        <P>
          A first-time donor may become a recurring donor. A longtime annual donor may eventually become a
          major-gift prospect, volunteer, event attendee, advocate or planned-gift donor.
        </P>
        <P>
          That progression doesn&rsquo;t happen automatically.
        </P>
        <P>
          It starts with understanding the donor and giving that person reasons to stay connected.
        </P>
        <P>
          Annual giving also provides a tremendous amount of information. Every gift, pledge, declined
          ask, conversation, updated phone number and expressed preference tells you something about the
          people in your database.
        </P>
        <P>
          The challenge is making sure that information gets captured and used.
        </P>
        <P>
          We&rsquo;ve seen annual fund programs where the difference between a good result and a
          disappointing one wasn&rsquo;t the appeal itself. It was the quality of the information behind
          the appeal and what the fundraising team did with what it learned.
        </P>
        <P>
          The numbers can tell an important story.
        </P>
        <P>
          In one private university&rsquo;s annual fund review, current donors accounted for 80% of the
          dollars raised. Among those current donors, the program achieved a 45% decision rate and a 76%
          pledge rate. Across the program, the average donor gift increased 17%, from $254 coming into the
          program to $299 pledged.
        </P>
        <P>
          At a small university, an annual fund program renewed about 1,000 current donors and reacquired
          half of the lapsed donors who were reached and spoken with. The outreach also identified donors
          with greater giving potential. Twenty-five percent gave $250 or more, while another 10% gave
          $500 or more, accounting for nearly half of the total dollars raised.
        </P>
        <P>
          Those are opportunities primed for the next conversation.
        </P>

        <Clear />

        <H2>Start with good data</H2>
        <Figure src={`${IMG}/graphic-good-data-v2.jpg`} alt="Graphic: can you reach your donors? In one program, 74 percent of undecided prospects could not be reached by phone" />
        <P>
          Before worrying about the perfect appeal, make sure you can reach your donors.
        </P>
        <P>
          It sounds basic, but we&rsquo;ve seen how quickly a fundraising program can run into trouble
          when phone numbers are outdated, email addresses are missing, mailing addresses are wrong or
          giving histories aren&rsquo;t complete.
        </P>
        <P>
          Data quality isn&rsquo;t just an administrative issue. It affects the donor experience.
        </P>
        <P>
          In one program, 74% of undecided prospects could not be reached by phone. The program
          recommended several straightforward steps:
        </P>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">Correct mailing addresses.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">Add phone and cell-phone numbers.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">Append email addresses and age information.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">Segment prospects by ZIP code and age.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">Conduct wealth screening on the focused audience.</li>
        </ul>
        <P>
          How you add new information matters, too. When an append returns a new phone number, add it in a
          separate field and flag the old one rather than overwriting it. Callers can confirm which number
          is right, and nothing in the donor&rsquo;s history is lost.
        </P>
        <P>
          Another program encountered a different problem when a bulk data update incorrectly identified
          some records as deceased or &ldquo;do not mail.&rdquo; The team had to go back through
          individual records and carefully merge duplicates to preserve giving histories.
        </P>
        <P>
          Sometimes the problem isn&rsquo;t the contact information at all. At one public university,
          donors already assigned to gift officers were accidentally included in the annual fund calling
          list. The program paused for five weeks while the list was reviewed. By the time calls resumed,
          the pre-call letters had gone stale, and the program raised less than it had the year before. A
          simple exclusion check before each calling round would have prevented it.
        </P>
        <P>
          A mistake in a database can have consequences beyond the immediate campaign. It can result in a
          missed conversation with a loyal donor or an inappropriate communication to someone who has
          already told the organization what they want.
        </P>
        <P>
          A regular data-maintenance schedule can prevent many of these problems. Returned mail,
          disconnected phone numbers, deceased records, duplicate records, communication preferences and
          gift-file imports should be reviewed throughout the year, not just before the next campaign.
        </P>
        <P>
          Good data gives fundraisers a better chance to have good conversations.
        </P>

        <Clear />

        <H2>Don&rsquo;t treat every donor the same</H2>
        <Figure src={`${IMG}/graphic-segmentation-v2.jpg`} alt="Graphic: segmentation changes the ask, the message, the messenger, the channel, the timing, and the next step" />
        <P>
          One of the biggest mistakes an annual fund can make is treating the entire database as one
          audience.
        </P>
        <P>
          Your donors have different histories with the organization, different interests and different
          capacity to give. Their responses to previous solicitations also tell you something.
        </P>
        <P>
          Annual fund reviews have shown meaningful differences in giving behavior based on donor status,
          age, graduation decade, geography, school affiliation, ministries supported, wealth capacity and
          past giving.
        </P>
        <P>
          For example, one program found that alumni who graduated in the 1970s generated higher average
          pledges than other groups, while alumni from the 1980s had the highest pledge rate.
        </P>
        <P>
          Another program found that alumni in their 50s and 60s generated the strongest dollars per
          decision, while alumni from the 1990s had the highest pledge rate.
        </P>
        <P>
          The point isn&rsquo;t to assume that everyone in a particular age group or graduation decade
          will behave the same way. The point is to look at your own results and use what you learn.
        </P>
        <P>
          Segmentation should affect more than the ask amount. It can influence:
        </P>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">The ask.</span>{" "}
            Look at previous giving, capacity indicators and response history when determining an
            appropriate ask.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">The message.</span>{" "}
            Connect the appeal to something the donor has demonstrated an interest in, whether that&rsquo;s
            a particular program, school, ministry, geographic area or aspect of the mission.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">The messenger.</span>{" "}
            A pre-call letter signed by a fellow donor or alum changes the tone of the outreach. It becomes
            a conversation between people who care about the same cause, not a telemarketing call.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">The channel.</span>{" "}
            Use phone, email, mail, text and digital communications based on the information you actually
            have and the donor&rsquo;s preferences.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">The timing.</span>{" "}
            Give donors reasonable time to respond, fulfill a pledge or reconnect before contacting them
            again.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">The next step.</span>{" "}
            Identify donors who may be ready for a deeper conversation and make sure someone follows up.
          </li>
        </ul>
        <P>
          One program review, for example, recommended lowering ask amounts for certain current donor
          groups while increasing asks for another segment that consistently gave well above the expected
          share of the ask.
        </P>
        <P>
          The lesson isn&rsquo;t simply to ask for more.
        </P>
        <P>
          It&rsquo;s to pay attention to what your donors are telling you.
        </P>

        <Clear />

        <H2>Don&rsquo;t write off lapsed donors</H2>
        <Figure src={`${IMG}/graphic-lapsed-donors-v2.jpg`} alt="Graphic: at one large university, lapsed and never-given alumni drove 52 percent of annual fund revenue and 73 percent of new dollars raised" />
        <P>
          A lapsed donor isn&rsquo;t necessarily a lost donor.
        </P>
        <P>
          Many people who stopped giving in the last one to five years didn&rsquo;t lose interest in the
          organization. They missed a letter, moved, changed phone numbers or simply were never asked
          again. That group is often one of the biggest opportunities in the database.
        </P>
        <P>
          At a large university, lapsed donors and alumni who had never given accounted for 52% of annual
          fund revenue and 73% of the new dollars raised. The program brought back 2,890 donors who had
          lapsed for one year and 1,530 who had been away longer.
        </P>
        <P>
          The conversation matters as much as the ask. Find out why the donor gave in the first place, why
          they stopped and what would bring them back. If there&rsquo;s a known reason for the lapse,
          acknowledge it rather than avoid it.
        </P>
        <P>
          Not every lapsed donor belongs in the same outreach, though. That same program recommended
          moving donors who had lapsed six years or more out of phone outreach and into other channels.
        </P>

        <Clear />

        <H2>Make recurring giving part of the conversation</H2>
        <P>
          Monthly and other recurring gifts can be valuable for both donors and organizations.
        </P>
        <P>
          For the donor, recurring giving can make supporting an organization easier to manage. For the
          organization, it can provide more predictable revenue and create a giving habit that can
          continue for years.
        </P>
        <P>
          It can also provide an entry point for donors who aren&rsquo;t ready to make a larger one-time
          gift.
        </P>
        <P>
          In one program, multi-installment gifts averaged between 24% and 171% higher than one-time gifts
          across different donor groups.
        </P>
        <P>
          At one university, current donors making multi-installment gifts averaged $490, compared with
          $81 for one-time gifts. Among lapsed donors, the averages were $273 for multi-installment gifts
          and $76 for one-time gifts.
        </P>
        <P>
          Those numbers don&rsquo;t mean every donor should be pushed toward monthly giving. They do
          suggest that organizations should make recurring giving an easy and visible option.
        </P>
        <P>
          Talk about what a recurring gift can accomplish. Make the process simple. And consider whether
          the message makes sense for younger alumni and newer donors who may prefer a smaller ongoing
          commitment to a larger annual gift.
        </P>
        <P>
          For mid-level donors, an annual gift paid in four quarterly installments can work well. Each
          payment feels manageable, and the total can be meaningfully larger than the donor&rsquo;s
          previous single gift.
        </P>
        <P>
          Sometimes the best way to build a long-term donor is to make it easy for someone to start.
        </P>

        <Clear />

        <H2>Follow through on the pledge</H2>
        <Figure src={`${IMG}/graphic-pledge-follow-through-v2.jpg`} alt="Graphic: pledge reminders at 14, 28, and 42 days plus a text with a giving link, with pledge fulfillment rising from about 62 percent to about 68 percent" />
        <P>
          A pledge isn&rsquo;t a gift until it&rsquo;s paid.
        </P>
        <P>
          One university moved its pledge reminders from 30, 60 and 90 days to 14, 28 and 42 days, and
          sent a text with a giving link right after each call. Over the same year, pledge fulfillment
          improved from about 62% to about 68%.
        </P>
        <P>
          The same program started its second ask earlier in the year. The spring pledge rate rose to 64%,
          up from 58% the year before.
        </P>
        <P>
          Quick, friendly follow-up respects the donor&rsquo;s decision and makes it easy to act on it
          while the conversation is still fresh.
        </P>

        <Clear />

        <H2>Thank donors before asking them again</H2>
        <Figure src={`${IMG}/photo-handwritten-thank-you.jpg`} alt="Hands holding a handwritten thank-you card and envelope at a wooden desk" />
        <P>
          This may be one of the simplest ideas in fundraising, and one of the easiest to overlook.
        </P>
        <P>
          Donors should hear from an organization for reasons other than another solicitation.
        </P>
        <P>
          Our mid-level donor engagement programs schedule thank-you calls before solicitation calls. They
          also use pre-call emails to introduce the donor engagement officer. Outreach can include
          thank-you calls, solicitation, follow-up on soft declines, pledge reminders and goodwill
          communications.
        </P>
        <P>
          The same donor engagement officer stays with a donor portfolio for the entire year. The donor
          hears from someone who remembers the last conversation, not a new voice every time.
        </P>
        <P>
          We&rsquo;ve also run programs that incorporate birthday calls, thank-you calls, Veterans Day
          messages and New Year&rsquo;s goodwill calls.
        </P>
        <P>
          None of these interactions has to be complicated.
        </P>
        <P>
          One principle guides our engagement officers: money follows relationship, even if it isn&rsquo;t
          on this call. The first job on every call is to leave the donor feeling good about the
          organization.
        </P>
        <Quote>Money follows relationship, even if it isn&rsquo;t on this call.</Quote>
        <P>
          A sincere thank-you can be more memorable than another perfectly written appeal.
        </P>
        <P>
          And a donor who doesn&rsquo;t want another solicitation may still want to hear about the
          organization. They may want to know how their gift helped. They may appreciate an invitation to
          an event. They may simply appreciate knowing someone noticed their support.
        </P>
        <P>
          Stewardship can take many forms:
        </P>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A thank-you call with no ask.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A handwritten note after a meaningful gift.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A birthday or milestone message.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">An update about the impact of the donor&rsquo;s support.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A personal note for leadership-level annual gifts.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">An invitation to an event, volunteer opportunity or program.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A chance to see the work in person, such as a program visit, tour or small gathering.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A conversation with a staff member, volunteer or beneficiary.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A peer-to-peer connection with someone who can speak personally about the organization&rsquo;s work.</li>
        </ul>
        <P>
          Good stewardship doesn&rsquo;t have to be elaborate.
        </P>
        <P>
          It has to be genuine.
        </P>

        <Clear />

        <H2>A &ldquo;no&rdquo; is still information</H2>
        <Figure src={`${IMG}/graphic-no-is-information-v2.jpg`} alt="Graphic: in one program only 10 percent of decisions were hard declines, while 35 percent cited short-term finances and could be asked again next year" />
        <P>
          A declined ask doesn&rsquo;t necessarily mean a donor is finished with the organization.
        </P>
        <P>
          Sometimes the timing is wrong. Sometimes money is tight. Sometimes the donor doesn&rsquo;t want
          to support that particular project. And sometimes the answer really is no.
        </P>
        <P>
          The important thing is knowing the difference.
        </P>
        <P>
          In one annual fund program, only 10% of decisions were hard declines. Thirty-five percent cited
          short-term financial reasons and were considered appropriate for re-solicitation the following
          year.
        </P>
        <P>
          That distinction matters.
        </P>
        <P>
          A donor who says, &ldquo;I can&rsquo;t do it this year&rdquo; is giving you different
          information from someone who says, &ldquo;Please don&rsquo;t call me again.&rdquo;
        </P>
        <P>
          Those responses should not be treated the same way in the database.
        </P>
        <P>
          Another program separated donors experiencing short-term financial hardship from other
          soft-decline segments and excluded those donors from subsequent soft-no outreach. It also
          considered seasonal messaging for donors who had other priorities, planned to give independently
          or weren&rsquo;t interested in the original appeal.
        </P>
        <P>
          For donors who aren&rsquo;t interested in the original appeal, a different case can reopen the
          conversation. For donors facing a tight year, a lower alternate ask can keep them connected
          without pressure.
        </P>
        <P>
          The goal isn&rsquo;t to keep calling everyone who says no.
        </P>
        <P>
          It&rsquo;s to listen carefully enough to understand what the donor is actually saying.
        </P>
        <P>
          Respect &ldquo;do not call&rdquo; and &ldquo;do not solicit&rdquo; requests. Distinguish
          permanent opt-outs from temporary circumstances. Record the information accurately so the next
          person who contacts the donor understands the history.
        </P>
        <P>
          A good annual fund program doesn&rsquo;t just collect gifts.
        </P>
        <P>
          It collects information that helps the organization build better relationships.
        </P>

        <Clear />

        <H2>Create a path to the next relationship</H2>
        <Figure src={`${IMG}/graphic-signals-v2.jpg`} alt="Graphic: four signals worth watching, giving at or above the ask, paying a full pledge up front, mentioning a DAF or IRA gift, and giving for ten years or more" />
        <P>
          Annual fund success shouldn&rsquo;t be measured only by dollars raised, pledge rates or the
          number of donors renewed.
        </P>
        <P>
          One of the most valuable outcomes can be identifying donors who are ready for something more.
        </P>
        <P>
          At one private university, 170 donors giving $500 or more produced 43% of annual fund revenue.
          Those donors weren&rsquo;t just annual fund results. They were signals.
        </P>
        <P>
          A few other signals are worth watching closely:
        </P>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A donor gives at or above the amount requested.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A donor pays a full annual pledge up front or turns installments into a single payment.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A donor mentions a donor-advised fund or makes a gift from an IRA.</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">A donor has given consistently for ten years or more, regardless of gift size.</li>
        </ul>
        <P>
          That last one is easy to miss. Long-term loyalty can matter more than gift size. A donor who has
          given $50 a year for fifteen years may be one of the best planned-giving prospects in the file.
        </P>
        <P>
          At one college conducting a legacy giving outreach program, 35 prospects indicated that they
          were interested in annual gifts only. Another 56 said they were &ldquo;not now but open in the
          future.&rdquo; That information gave the organization a reason to keep those donors in the right
          follow-up stream rather than treating the conversation as finished.
        </P>
        <P>
          At another university, a mid-level program included seven touchpoints over the course of a year.
          Those included calls, event invitations, handwritten notes, DAF or IRA conversations and
          solicitation. Warm prospects were then transitioned to gift officers for personal cultivation.
        </P>
        <P>
          That&rsquo;s where the annual fund can become an important part of the larger fundraising
          operation.
        </P>
        <P>
          The annual fund team may be the first group to discover that a donor has a new interest,
          increased capacity or a willingness to have a deeper conversation.
        </P>
        <P>
          That information shouldn&rsquo;t stay buried in a call note.
        </P>
        <P>
          It should move with the donor.
        </P>
        <P>
          A coordinated donor pathway might look like this:
        </P>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Annual donor:</span>{" "}
            Receives prompt thanks, impact information and a renewal strategy based on giving history.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Recurring donor:</span>{" "}
            Receives recognition for sustained support and opportunities for deeper involvement.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Upgrade prospect:</span>{" "}
            Receives more personal attention and, when appropriate, a relationship-focused conversation.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Annual-gift-only donor:</span>{" "}
            Receives follow-up based on the interest and preferences they&rsquo;ve expressed.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Future-interest or high-capacity prospect:</span>{" "}
            Receives thoughtful cultivation rather than an immediate increase in solicitation.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Major- or planned-gift prospect:</span>{" "}
            Moves into a coordinated handoff with the donor&rsquo;s history and preferences clearly
            documented.
          </li>
        </ul>
        <P>
          The goal is simple: don&rsquo;t let a good donor conversation disappear because the information
          stayed in the wrong place.
        </P>

        <Clear />

        <H2>The annual fund is a relationship, not a campaign</H2>
        <P>
          The annual fund will always have financial goals. Organizations need revenue, and fundraising
          professionals are responsible for delivering it.
        </P>
        <P>
          But the best annual fund programs do more than hit a number.
        </P>
        <P>
          They learn.
        </P>
        <P>
          They listen.
        </P>
        <P>
          They identify donors who want to stay involved and donors who may be ready for a deeper
          relationship. They recognize when a donor needs space. They notice when a longtime donor&rsquo;s
          giving changes. And they make sure the next person who talks with that donor knows what happened
          in the last conversation.
        </P>
        <P>
          That requires good data, thoughtful segmentation, appropriate asks, timely follow-up and
          stewardship throughout the year.
        </P>
        <P>
          Most of all, it requires treating donors like people rather than records in a database.
        </P>
        <P>
          The question isn&rsquo;t simply whether a donor gave this year.
        </P>
        <P>
          It&rsquo;s what happened after they gave.
        </P>
        <P>
          Did someone thank them? Did the organization learn something about them? Did they see the impact
          of their support? Did anyone give them a reason to stay connected?
        </P>
        <P>
          When those pieces come together, the annual fund becomes much more than a source of annual
          revenue.
        </P>
        <P>
          It becomes one of the best places an organization can build the relationships that lead to
          long-term philanthropy.
        </P>

        <Clear />

        <P className="mt-12">
          Want a second set of eyes on your annual fund, from the data behind it to the donors who
          may be ready for a deeper conversation?{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            Start a conversation with Catapult Fundraising
          </Link>
          .
        </P>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Program figures reflect Catapult Fundraising&rsquo;s own client experience and are not
          industry-wide statistics. Client details are anonymized.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
