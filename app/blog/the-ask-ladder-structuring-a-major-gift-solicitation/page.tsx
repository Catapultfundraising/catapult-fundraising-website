import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "the-ask-ladder-structuring-a-major-gift-solicitation";

export const metadata = {
  title: "The Ask Ladder: How to Structure a Major Gift Solicitation | Catapult Fundraising",
  description:
    "How to build an ask ladder, plan a three-visit solicitation, and frame naming opportunities so major donors say yes, Catapult Fundraising's field-tested approach to the ask.",
  keywords: [
    "ask ladder fundraising",
    "major gift solicitation visits",
    "how to ask for a major gift",
    "naming opportunity ask script",
    "major donor objection handling",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "The Ask Ladder: How to Structure a Major Gift Solicitation",
    description:
      "How to build an ask ladder, plan a three-visit solicitation, and frame naming opportunities so major donors say yes.",
    url: `${SITE_URL}/blog/${SLUG}`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "The Ask Ladder: How to Structure a Major Gift Solicitation",
  description:
    "How to build an ask ladder, plan a three-visit solicitation, and frame naming opportunities so major donors say yes.",
  author: { "@type": "Organization", name: "Catapult Fundraising", url: SITE_URL },
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

export default function AskLadderPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="The ask ladder: how to structure a major gift solicitation."
        description="Wealthy people consistently say the reason they don't give more is because they were never asked. Here's how to build the ask so that stops happening."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Every major gift solicitation should start with an ask ladder: three prepared ask
          amounts for a single prospect, built before you ever walk into the room. Prepare a
          primary amount, a second amount at roughly three-quarters of the first, and a third at
          half of the first. If your top ask is $100,000, your ladder is $100,000, then $75,000,
          then $50,000. Build a separate ladder for every prospect, based on their wealth capacity,
          giving history, and areas of interest, so you're never caught guessing mid-conversation.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          If the ask seems too high, you don't panic, you go to three-quarters, then half. The
          ladder means you're never caught off guard by a prospect who feels you haven't found
          the right number yet.
        </blockquote>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Do your homework before you ask
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Before any major gift ask, conduct due diligence on the actual cost of the project or
          program, current construction and operating costs have moved fast in recent years, and
          outdated numbers undermine your credibility with a sophisticated donor. Turn that
          research into a written case for support, then distill it into four or five key talking
          points for every prospect, plus two additional points held in reserve for the largest
          asks. Prepare both print and digital versions of your materials: older prospects in
          particular still want something physical they can hold onto and revisit.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Frame every ask with donor recognition
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Donor recognition should never be an afterthought, it should be built into the ask
          itself. Rather than asking a prospect for a flat dollar figure, frame the request around
          the recognition or naming opportunity that comes with it: &ldquo;We&rsquo;d like you to
          consider a leadership gift of $1,000,000 to name the new conference room in your
          honor.&rdquo; Framing the ask this way does two things: it signals the gift is
          significant, and it heads off the awkward &ldquo;how did you arrive at that
          number&rdquo; conversation, because the number is tied to a specific, tangible benefit
          rather than a formula.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Plan for three visits, not one
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          On average, it takes three visits to close a major gift, and treating each visit with a
          distinct purpose dramatically improves the odds of getting to yes.
        </p>

        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Visit one is education and information.</span>{" "}
            You likely won&rsquo;t make the ask here, but come with your ask ladder ready anyway,
            some prospects will ask &ldquo;how much do you need&rdquo; before you&rsquo;ve
            finished your talking points. Before you leave, secure a specific date and time for
            visit two.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Visit two is where the ask should happen.</span>{" "}
            Bring answers to any questions from visit one, confirm there are no new questions, and
            then make the ask. If unfamiliar new people show up to this visit, a spouse, a
            financial advisor, treat it as a reset and plan for a visit three.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Visit three must include the ask</span>,{" "}
            even if it feels premature. A fourth visit is rare, so an early ask beats no ask at
            all.
          </li>
        </ol>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Set the meeting like a professional
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          When you call to set the appointment, state the purpose, the format, and the amount of
          time you need: &ldquo;I&rsquo;d like forty-five minutes to bring you up to date on an
          exciting project at [organization].&rdquo; Forty-five minutes reads as a reasonable,
          specific ask, easier to get on the calendar than a full hour, and long enough to allow
          for the personal conversation that should open an in-person visit. Virtual meetings can
          run shorter, thirty minutes is usually enough, since there&rsquo;s naturally less
          opening small talk over Zoom than in person.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          When you have to go through a gatekeeper, offer a specific date and time rather than
          asking an open-ended yes-or-no question: &ldquo;Would he be available for forty-five
          minutes next Wednesday at 4pm?&rdquo; That framing puts the gatekeeper to work finding a
          yes rather than deciding whether to say no.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Handling pushback on the ask amount
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          When a prospect says an ask is too high, listen for the difference between &ldquo;this
          is more than I was expecting&rdquo; and &ldquo;I wish I could make this gift.&rdquo; The
          second is not an objection to the amount, it&rsquo;s a scheduling and structure problem.
          In that case, don&rsquo;t drop to the next rung of your ladder. Instead, offer to
          restructure the same gift: a multi-year pledge, a graduated or &ldquo;balloon&rdquo;
          payment plan with smaller amounts in year one and larger amounts in later years, or a
          combination of a current gift and a planned or estate gift. Only step down your ask
          ladder when the prospect has clearly indicated the original number itself, not the
          timing, is the issue. And only ask &ldquo;is there an amount you have in mind&rdquo; as
          an absolute last resort, it cedes control of the number back to the prospect.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          If three out of ten prospects give, you have to go get seven nos to find them. You
          might as well go get the nos, and go get them quickly.
        </blockquote>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          If the answer is no, keep the door open
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A declined ask is not a closed file. Ask permission to reconnect in three, six, or twelve
          months depending on what the prospect has told you, then follow through with genuine
          stewardship in between: a birthday note, an update on the project, a call with no ask
          attached. Prospects who say &ldquo;I wish I could&rdquo; are telling you they want to
          give, your job is to keep the relationship warm until their circumstances change.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Want help building an ask ladder and a solicitation strategy for your top prospects?{" "}
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
