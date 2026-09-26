import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "new-charitable-deduction-2026-donor-conversation";
const IMG = `/blog/${SLUG}`;
const HEADLINE = "A New Tax Incentive, and How to Use It in a Donor Conversation";
const DESCRIPTION =
  "Zina Birmingham on the 2026 charitable deduction for donors who don't itemize: what it is, what not to say, which lapsed donors to call first, and where the tax change belongs in the conversation.";

export const metadata = {
  title: { absolute: "2026 Charitable Deduction for Non-Itemizers | Catapult" },
  description:
    "The 2026 non-itemizer charitable deduction, explained for fundraisers: who qualifies, what to say, and how to use it to reconnect with lapsed donors.",
  keywords: [
    "2026 charitable deduction",
    "non-itemizer charitable deduction",
    "charitable deduction standard deduction 2026",
    "universal charitable deduction",
    "lapsed donor reactivation",
    "year-end fundraising 2026",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: HEADLINE,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [
      {
        url: `${SITE_URL}${IMG}/og-donor-phone-call.jpg`,
        width: 1536,
        height: 1024,
        alt: "A smiling older woman talking on her phone at home",
      },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: HEADLINE,
  datePublished: "2026-09-25",
  dateModified: "2026-09-25",
  description: DESCRIPTION,
  image: `${SITE_URL}${IMG}/og-donor-phone-call.jpg`,
  author: {
    "@type": "Person",
    name: "Zina Birmingham",
    jobTitle: "Chief Operating Officer",
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

function Script({ children }: { children: ReactNode }) {
  return (
    <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
      {children}
    </blockquote>
  );
}

const Clear = () => <div className="clear-both" />;

export default function CharitableDeduction2026Post() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="A new tax incentive, and how to use it in a donor conversation."
        description="Starting with the 2026 tax year, donors who take the standard deduction can deduct some of their giving again. Zina Birmingham on why that's a reason to reconnect, not the reason to give."
      />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={HEADLINE} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Zina Birmingham, Chief Operating Officer, Catapult Fundraising
        </p>

        <Figure
          src={`${IMG}/hero-donor-phone-call.jpg`}
          alt="A smiling older woman with glasses talking on her phone at home"
          aspect="aspect-[4/3]"
          priority
        />
        <P>
          Over the past 25 years at Catapult, I&rsquo;ve spent countless hours analyzing hundreds of
          nonprofit databases, looking for patterns in how and why people give. I&rsquo;ve sat with
          development teams, gone through giving histories, and helped organizations understand why
          loyal donors stopped giving.
        </P>
        <P>
          When I learned about the new charitable deduction available to people who take the
          standard deduction beginning in the 2026 tax year, I immediately thought about the donors
          already sitting in nonprofit databases. Could this give us another reason to reconnect
          with them?
        </P>
        <P>
          That is what I want to walk through here: what the deduction is, what it is not, which
          donors may be most responsive, and how to include it in outreach without making the
          conversation about taxes.
        </P>

        <Clear />

        <H2>What changed, in plain language</H2>
        <Figure
          src={`${IMG}/graphic-what-changed.jpg`}
          alt="Infographic: beginning in the 2026 tax year, donors who don't itemize may deduct up to $1,000 in qualifying cash gifts, or $2,000 for married couples filing jointly"
        />
        <P>
          The Tax Cuts and Jobs Act of 2017 substantially increased the standard deduction. Fewer
          taxpayers itemized, and many charitable donors no longer received a separate federal tax
          benefit for their gifts. They could still give, of course, but for a donor taking the
          standard deduction, a $1,000 gift generally did not change their federal tax bill.
        </P>
        <P>
          Beginning with the 2026 tax year, eligible taxpayers who take the standard deduction may
          deduct up to $1,000 in qualifying cash contributions. Married couples filing jointly may
          deduct up to $2,000.
        </P>
        <P>
          There are real restrictions. Certain gifts, including contributions to donor-advised funds
          and some private foundations and supporting organizations, do not qualify. And this is a
          deduction, not a credit. A donor who gives $1,000 does not get $1,000 back. The deduction
          reduces the income subject to federal tax, and the actual benefit depends on that
          donor&rsquo;s own situation.
        </P>
        <P>
          Research from the University of Notre Dame found that taxpayers who switched to the
          standard deduction after the 2017 law reduced their charitable giving by roughly $880 per
          household in 2018. The same study estimated that about 23 million households made that
          switch. Tax policy was never the only reason people gave less, but incentives do matter.
          For the first time in several years, a donor who does not itemize has a federal reason to
          pay attention again.
        </P>

        <Clear />

        <h3 className="mt-10 font-display text-2xl text-[rgb(var(--navy))]">Three details worth knowing</h3>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">It isn&rsquo;t a one-year window.</span>{" "}
            The deduction was written into the tax code as a permanent provision, not a temporary
            one. That makes it part of how you steward donors every year, not a single year-end
            gimmick.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Cash gifts count, and so do monthly gifts.</span>{" "}
            Checks, card gifts, online gifts, and recurring gifts made directly to a qualifying
            charity all count toward the limit. Gifts of stock or other property do not. A monthly
            gift of about $84 adds up to roughly $1,000 over a year, which makes this a natural
            moment to invite a lapsed donor into a monthly giving program.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Your itemizers face a different change.</span>{" "}
            Starting in 2026, donors who itemize can deduct only the part of their giving above 0.5
            percent of their adjusted gross income, and the tax benefit for donors in the top bracket
            is capped. The two sentences below are written for donors who take the standard
            deduction. Your major donors need a conversation with their own advisers, not this
            script.
          </li>
        </ul>

        <H2>What you need to know, and what you should not say</H2>
        <P>You do not need to become a tax adviser. You do need to be accurate.</P>
        <P>
          Use language like <em>may be eligible</em>. Say the rules apply to <em>qualifying</em>{" "}
          gifts. Encourage donors to talk with their own tax adviser about how it applies to them.
          Never quote someone a dollar figure of tax savings, and never let a caller improvise on the
          rules.
        </P>
        <P>
          What I do not want is for a team to skip the opportunity because taxes feel uncomfortable
          to discuss. Handled correctly, this is two sentences of useful information for a donor who
          may not have heard it yet.
        </P>
        <P>
          One practical step that is easy to miss: make sure your gift acknowledgments are ready for
          donors who now have a reason to keep them. Any single gift of $250 or more needs a written
          acknowledgment from your organization for the donor to deduct it, so check that your
          receipts and year-end giving summaries are accurate and go out on time.
        </P>

        <H2>Where the deduction belongs in the conversation</H2>
        <Figure
          src={`${IMG}/graphic-conversation-order.jpg`}
          alt="Infographic: the order of the conversation is the donor's history first, your mission second, and the tax change last"
        />
        <P>
          Here is the part that matters most to me. The tax change is a reason to reconnect. It is
          not the reason to give.
        </P>
        <P>
          I do not believe most people give because of a deduction. They give because they care
          about something, because they have a personal connection, or because they want to help
          solve a problem. A tax benefit can make it easier for someone to act. It does not replace
          why they care, and it certainly does not replace the relationship.
        </P>
        <P>So the order of the conversation is: history first, mission second, tax change last.</P>

        <Clear />

        <H2>How that sounds with a real donor</H2>
        <P>
          Imagine a donor named Mrs. Bennett. She gave $150 every year for eleven years to a food
          bank, then stopped. There is no complaint in the file. No indication she was unhappy. She
          simply disappeared from the active program because her gift was never large enough to land
          on anyone&rsquo;s portfolio.
        </P>
        <P>
          If I were training someone to call her, I would not open with a request for money. I would
          open with her history.
        </P>
        <Script>
          &ldquo;Mrs. Bennett, this is Ray calling on behalf of the Food Bank. I was looking at your
          giving history, and you supported us for eleven years in a row. That&rsquo;s quite a
          commitment. I wanted to thank you for that and ask what first got you involved with
          us.&rdquo;
        </Script>
        <P>
          Then I would let her talk. Maybe she tells us about a neighbor who relied on the food
          pantry. Maybe she shares something about her family. That is information we would never get
          from the database.
        </P>
        <P>Next comes a simple, honest question about the gap:</P>
        <Script>
          &ldquo;I noticed we haven&rsquo;t heard from you in the last few years. Was that just a
          matter of timing, or did something change for you?&rdquo;
        </Script>
        <P>
          In our calling programs, that question surfaces financial pressures, changes in
          circumstances, outdated contact information, and gifts donors fully intended to make and
          never got around to sending. In one university program we ran, 21 of 111 donors who
          initially said no had actually intended to give on their own and simply had not followed
          through. A no to an appeal is not a no to the organization.
        </P>
        <P>
          Only after all of that do we get to the ask, and the ask leads with impact. Say the food
          bank needs $2,300 to run a mobile pantry route for a Saturday and is trying to fund 40
          additional routes. That is something a donor can picture.
        </P>
        <P>Then, and only then, the tax change:</P>
        <Script>
          &ldquo;There&rsquo;s also a change this year that you may want to know about. If you take
          the standard deduction, certain cash gifts may now qualify for a federal charitable
          deduction. You may want to talk with your tax adviser about how that applies to you.&rdquo;
        </Script>
        <P>
          That is the whole tax portion of the call. Two sentences, offered as useful information,
          not as leverage. And if the donor tells you the deduction does not interest her, drop it and
          do not bring it up again in the next letter.
        </P>

        <H2>Who to call first</H2>
        <Figure
          src={`${IMG}/graphic-who-to-call-first.jpg`}
          alt="Infographic: who to call first, including donors who gave for five to ten years and stopped, emergency appeal donors, former monthly donors, and steady $100 to $150 donors"
        />
        <P>
          A deduction is only worth anything if you are talking to the right people. If I were
          sitting down with a development director today, I would not start with how many people we
          can reach by email. I would start with what we already know about the file.
        </P>
        <P>
          Who gave every year for five or ten years and then stopped? Who gave during an emergency
          appeal and never heard from us again? Who used to give monthly? Who has been giving the
          same $100 or $150 every year for a decade without anyone taking the time to learn more
          about them?
        </P>
        <P>
          Those donors may not think of themselves as major donors. But they already decided your
          mission was worth supporting, and that history is worth more than a cold name. A donor who
          gave $100 a year for ten years has shown a very different level of commitment from someone
          who gave once, and the two of them often end up getting the exact same generic email.
        </P>
        <P>
          On recency, we generally see the most potential in donors who lapsed more recently. In one
          recent client file we had 1,378 lapsed records: 477 were one or two years out from their
          last gift, and 901 were three to five years out. That does not make the six-year donor
          unimportant. It means the approach has to be different.
        </P>

        <Clear />

        <H2>Make sure you can actually reach them</H2>
        <Figure
          src={`${IMG}/graphic-clean-the-file.jpg`}
          alt="Infographic: before outreach, run an NCOA match, append phones and verified emails, remove deceased donors and duplicates, and flag bad data rather than overwriting history"
        />
        <P>
          This is the least glamorous part of the work and one of the most important. You can have a
          perfect message and a well-trained team, and if the data is wrong you will spend the money
          reaching no one.
        </P>
        <P>
          On one recent calling program, we could not find a valid phone number for 182 of 1,379
          prospects, and we identified 15 deceased donors still active in the database. Those are not
          unusual numbers. I have seen files with outdated addresses, disconnected numbers, duplicate
          records, and parents&rsquo; addresses still on file years after a student graduated. And be
          realistic about append services. Match rates are often well below what organizations
          expect.
        </P>
        <P>
          Before a major outreach effort, I want the team to review giving history and identify who
          is most worth contacting, run an NCOA match and update addresses, append phone numbers and
          verified emails where appropriate, remove deceased donors and duplicates, flag bad
          information rather than overwriting valuable history, and confirm the giving history is
          complete.
        </P>

        <Clear />

        <H2>Give it enough time, and more than one channel</H2>
        <P>
          One mistake I see every year is the December rush. An organization realizes it has a
          lapsed-donor problem, writes a script, and tries to reach thousands of people in the final
          ten days of the year. That is a deadline, not a strategy. Our lapsed-donor models typically
          use five to ten attempts spread over a longer period, because a donor needs time to answer
          the phone and think.
        </P>
        <P>
          Donors also respond differently. Some prefer mail, some email, some will engage with a call
          that feels personal. A coordinated approach works well when it is genuinely coordinated: a
          letter or email that explains the need and mentions the tax change, a follow-up call to
          selected donors, then a reminder before the deadline. If the letter talks about one program
          and the caller knows nothing about it, the donor notices.
        </P>
        <P>
          The timing works in your favor this year. The deduction applies to gifts made during the
          2026 calendar year, so a donor you reach in the fall still has months to act, and a gift
          made before December 31 counts on the return they file next spring.
        </P>

        <H2>How to know whether it worked</H2>
        <P>
          Measure more than dollars raised. Look at reactivation rates, average gift, response rates,
          what donors actually told you, and whether those donors give again next year. A donor who
          comes back for one year is valuable. A donor who comes back and stays is how you build a
          sustainable program.
        </P>

        <H2>A reason to reconnect</H2>
        <P>
          This tax change will not fix a neglected database, replace a compelling case for support,
          or make someone care about a mission they do not believe in. What it does give you is a
          legitimate, timely reason to restart a conversation that went quiet.
        </P>
        <P>
          So use it that way. Lead with the donor&rsquo;s history, make the case for what a gift will
          accomplish, and let the deduction be the practical detail that makes saying yes a little
          easier.
        </P>

        <H2>Let&rsquo;s look at your file together</H2>
        <P>
          After 25-plus years at Catapult, I&rsquo;ve learned that every donor database has a story
          in it. Sometimes it&rsquo;s a story about growth. Sometimes it&rsquo;s about people who
          slipped through the cracks. Usually it&rsquo;s a little of both.
        </P>
        <P>
          If you&rsquo;d like to take a closer look at your lapsed donors before year-end,{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            I&rsquo;d be happy to talk through what you&rsquo;re seeing
          </Link>
          . We can review your giving history, identify where there may be an opportunity, and
          discuss whether a coordinated outreach effort makes sense. And if the right answer is to
          handle it in-house, that&rsquo;s a perfectly reasonable option.
        </P>
        <P>After all, the next donor you bring back may already be in your database.</P>

        <Clear />

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          Sources: Deduction limits and qualifying-gift rules reflect the charitable provisions of
          Public Law 119-21 (2025), which added the non-itemizer deduction at Internal Revenue Code
          section 170(p) and the 0.5 percent floor for itemizers beginning in 2026. Giving-decline
          and household figures are from Han, Hungerman, and Ottoni-Wilhelm, &ldquo;Tax
          Incentives for Charitable Giving: New Findings from the TCJA&rdquo; (NBER Working Paper
          32737, 2024), University of Notre Dame and the Indiana University Lilly Family School of
          Philanthropy. Calling-program and donor-file figures reflect Catapult Fundraising&rsquo;s
          own client experience and are not industry-wide statistics.
        </p>
        <p className="mt-4 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          This article is for general information only and is not tax or legal advice. Donors should
          consult their own tax adviser about how these rules apply to them.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
