import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "growing-your-legacy-society-why-arent-we-asking";

export const metadata = {
  title: "Growing Your Legacy Society: Why Aren't We Asking? | Catapult Fundraising",
  description:
    "Anthony Alonso on who your best legacy giving prospects really are, the two-step call process that closes bequests, and why loyalty beats wealth every time.",
  keywords: [
    "legacy society growth",
    "planned giving prospects",
    "legacy call program",
    "bequest fundraising",
    "planned giving by phone",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Growing Your Legacy Society: Why Aren't We Asking?",
    description:
      "Who your best legacy giving prospects really are, the two-step call process that closes bequests, and why loyalty beats wealth every time.",
    url: `${SITE_URL}/blog/${SLUG}`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Growing Your Legacy Society: Why Aren't We Asking?",
  description:
    "Who your best legacy giving prospects really are, the two-step call process that closes bequests, and why loyalty beats wealth every time.",
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

export default function GrowingYourLegacySocietyPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Growing your legacy society: why aren't we asking?"
        description="Only one in five donors say they've ever been asked for a legacy gift. Almost everyone has the ability to leave a bequest, even a modest one, all we have to do is ask."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Bequests are widely considered the major gift of the average American, gifts far larger
          than a donor could ever make in a single year, and yet most organizations spend
          almost no budget or time pursuing them. Roughly a third of Americans say they&rsquo;d
          consider a charitable bequest, and once a nonprofit is named in a will, it tends to stay
          there about 75 percent of the time. Donors who make one planned gift are also twice as
          likely to make a second, if they&rsquo;re asked.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          Almost everyone has the ability to make a bequest, even if it&rsquo;s a portion of their
          estate. The people most likely to leave one aren&rsquo;t your biggest annual donors,
          they&rsquo;re the people who&rsquo;ve given loyally for fifteen, twenty, even forty
          consecutive years.
        </blockquote>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Identify prospects by loyalty, not wealth
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Build your legacy prospect list from consecutive years of giving first: donors with
          twenty-plus consecutive years, then fifteen-plus, then ten-plus, layered with those who
          attend events or volunteer. Add donors with twenty or more total gifts even if not
          fully consecutive. For most organizations, this exercise surfaces roughly 10 percent of
          the database as strong legacy prospects, closer to 25 percent for faith-based or
          children&rsquo;s organizations. Wealth screening still has a role, mainly to prioritize
          who to call first when budgets are limited, but household income is a weak predictor on
          its own: most people who make a planned gift have household incomes under $200,000.
          Loyalty and belief in the mission, not capacity, is what actually predicts a bequest.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          A two-step call process that doesn&rsquo;t require a planned giving expert on staff
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Eighty percent of all planned gifts are simple bequests, you don&rsquo;t need deep
          technical expertise to start these conversations, only a process. Here&rsquo;s the
          structure:
        </p>

        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Send a pre-call letter</span>{" "}
            signed by a peer volunteer, someone whose own story of giving matches the prospect&rsquo;s
            profile, that thanks the donor for their giving history and tells the case for support
            from a donor&rsquo;s perspective. Longer letters, two to three pages, consistently
            outperform shorter ones. A digital voicemail drop from the CEO ahead of the letter adds
            credibility.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Make a qualification call</span>{" "}
            that simply thanks the donor, references the letter, and asks whether they&rsquo;d be
            open to a further conversation about a legacy gift. This caller doesn&rsquo;t need
            planned giving expertise, their job is gratitude and interest, not a technical
            conversation.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Hand interested donors to a gift-planning specialist</span>{" "}
            for a second conversation. Expect roughly 20 percent of qualification calls to advance
            to this stage, and expect those conversations to take three to six touches to close,
            similar to a major gift solicitation. Some donors will already have the organization in
            their will and simply never told anyone, an important signal to start stewarding that
            relationship differently.
          </li>
        </ol>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The return on investment is real
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          In one recent program for a public broadcasting client, outreach to 2,279 long-time
          donors produced 852 real conversations, 21 percent of which expressed interest in a
          legacy gift, and ultimately closed 63 planned gifts totaling $4.6 million, against a
          program cost in the range of $160,000 to $170,000. Even setting aside the dollars
          closed, every one of those calls accomplished the baseline goal: thanking a loyal donor
          for years of support they&rsquo;d never been properly acknowledged for.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          Thousands of loyal donors are waiting to be asked. If we do nothing else through this
          process but thank a donor for twenty consecutive years of giving, it&rsquo;s already a
          success.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          If a full two-step program isn&rsquo;t realistic yet, start smaller: call five of your
          most loyal long-tenured donors every morning, just to thank them and ask how they&rsquo;re
          doing. Something is always better than nothing, and legacy donors who feel genuinely
          stewarded tend to increase their annual giving six to seven times over as a direct
          result.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Ready to find out how many legacy prospects are already sitting in your database?{" "}
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
