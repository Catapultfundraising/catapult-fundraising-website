import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "why-people-give-trust-connection-moment-to-act";
const HERO = "/blog/why-people-give/hero-donor-yes.jpg";
const HERO_ALT =
  "A man on a couch celebrating with a raised fist after hearing good news";

export const metadata = {
  title: "Why People Give: Trust, Connection, and the Moment to Act",
  description:
    "Amy C. Wiles on why donors rarely give because an organization has a need, and what actually makes someone ready to act on something they already care about.",
  keywords: [
    "why donors give",
    "major gift strategy",
    "donor motivation",
    "capital campaign case for support",
    "major gift ask",
    "donor trust",
    "prospect qualification capacity affinity",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Why People Give: Trust, Connection, and the Moment to Act",
    description:
      "People rarely give simply because an organization has a need. They give when they understand the need, trust the organization, feel personally connected, and believe their gift can make a difference.",
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
  headline: "Why People Give: Trust, Connection, and the Moment to Act",
  datePublished: "2026-09-05",
  dateModified: "2026-09-05",
  description:
    "Amy C. Wiles on why donors rarely give because an organization has a need, and what actually makes someone ready to act on something they already care about.",
  image: [`${SITE_URL}${HERO}`],
  author: {
    "@type": "Person",
    name: "Amy C. Wiles",
    jobTitle: "Chief Campaign Strategist",
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

export default function WhyPeopleGivePost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Why People Give: Trust, Connection, and the Moment to Act"
        description="Most fundraising conversations begin with the wrong question. The better one is not how do we persuade someone to give, but what helps someone feel ready to act on something they already care about."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title="Why People Give: Trust, Connection, and the Moment to Act" />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Amy C. Wiles, Chief Campaign Strategist, Catapult Fundraising
        </p>

        <div className="mt-6 mb-6 w-full overflow-hidden rounded-2xl">
          <div className="relative aspect-[3/2] w-full">
            <Image src={HERO} alt={HERO_ALT} fill className="object-cover" priority />
          </div>
        </div>

        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Most fundraising conversations begin with the wrong question.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          They begin with, &ldquo;How do we persuade someone to give?&rdquo;
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I think there is a better question: &ldquo;What helps someone feel ready to act on
          something they already care about?&rdquo;
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          After years of working with donors and organizations on campaigns, I have found that
          people rarely give simply because an organization has a need. They give when they
          understand the need, trust the organization, feel personally connected to the work, and
          believe their gift can actually make a difference.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That sounds simple. In practice, it is where a lot of fundraising either works or falls
          apart.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Giving is rarely just about money
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A major gift is not a transaction. It is part of a relationship.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          People give for all kinds of reasons. Sometimes it is something that happened to them
          personally. Sometimes it involves a family member. Sometimes it is a place, a person, or a
          cause that has been part of their life for years.
        </p>
        <ul className="mt-6 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>
            Someone who adopted a senior animal may have a very different connection to an animal
            shelter than someone who has never had that experience.
          </li>
          <li>
            A family that struggled to find mental health care may look at a new crisis facility very
            differently from someone who has never needed those services.
          </li>
          <li>
            An alumnus who had no other path to a college education may understand the importance of
            expanding access in a way that statistics alone never could.
          </li>
        </ul>
        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The gift gives that person a way to do something about what they care about.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That is why I am not a big believer in generic appeals. &ldquo;We need your support&rdquo;
          may be true, but it does not answer the more important question: Why should this particular
          donor care?
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Sometimes the best fundraising message has very little to do with the building, the
          campaign goal, or the organization&rsquo;s budget.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          It has to do with the person whose life changes because of it.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Trust comes before the ask
        </h2>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Before a donor thinks about the amount of the gift, there are usually other questions
          running through their mind. Do I trust this organization? Do I trust the person talking to
          me? Do they understand what matters to me? Will this money be used well? And if I am not
          ready to give, will they respect that?
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Those questions may never be said out loud, but they are part of almost every important
          donor conversation.
        </p>

        <div className="mt-8 w-full overflow-hidden rounded-2xl border border-[rgb(var(--line))]">
          <div className="relative aspect-[12/7] w-full">
            <Image
              src="/blog/why-people-give/graphic-donor-trust-questions.png"
              alt="Graphic: the questions running through a donor's mind before they think about the amount. Do I trust this organization? Do I trust the person talking to me? Do they understand what matters to me? Will this money be used well? And if I am not ready to give, will they respect that?"
              fill
              className="object-cover"
            />
          </div>
        </div>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Trust is built by doing the basics well. Be prepared. Know the donor. Listen. Follow up. Do
          what you say you are going to do. Respect the process.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I have been in plenty of donor meetings where the conversation went somewhere we did not
          expect. We went in thinking we knew what interested the donor, only to discover that their
          real connection to the organization was something completely different.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          That is why I believe the best fundraisers listen more than they talk.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          One of the things we emphasize in campaign training is that the visit should begin with
          building rapport, showing the need and the solution, and asking good questions. The actual
          &ldquo;ask&rdquo; should only take a few minutes. The rest of the meeting is about
          understanding the person sitting across the table.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A donor may say they are interested in workforce development, but the real story may be a
          parent who struggled to find work.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A museum donor may talk about preserving history, but what really matters is a family
          tradition that goes back generations.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Those are the moments you want to find. Often, that means putting the folder down and
          listening.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Personalization is not a trick
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Personalization is often treated as a marketing tactic. Use the donor&rsquo;s name. Mention
          their last gift. Reference something from their email.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">That is the easy part.</p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Real personalization means understanding why someone is connected to your organization and
          then approaching them accordingly.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Is this person a volunteer? An alumnus? A longtime member? Someone who has attended your
          events for years? A business leader? A family member of someone you served? Or someone who
          has only recently become interested in the organization?
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Those distinctions matter. Capacity matters, too, but capacity by itself does not make
          someone a good prospect.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          When I look at a major gift prospect, I am usually thinking about three things.
        </p>

        <div className="mt-8 w-full overflow-hidden rounded-2xl border border-[rgb(var(--line))]">
          <div className="relative aspect-[12/7] w-full">
            <Image
              src="/blog/why-people-give/graphic-capacity-affinity-connection.png"
              alt="Graphic: three things to look at when qualifying a major gift prospect. Capacity, can they make a meaningful gift. Affinity, do they care about what we are trying to accomplish. Connection, do we have a relationship that gives us a legitimate reason to have the conversation."
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A wealthy person with no interest in your mission may not be a good prospect. Someone with
          tremendous passion but limited financial capacity may be one of your best ambassadors. And
          a donor who has both capacity and affinity may still need more time or a different
          relationship before they are ready for a major ask.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Personalization also continues after the meeting. A thoughtful follow-up that refers to
          something the donor actually said tells them that the conversation mattered.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          It says, &ldquo;We heard you.&rdquo; That goes a long way.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Urgency only works when it is real
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          I believe in urgency. I do not believe in manufactured urgency. There is a big difference.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Real urgency might be a family in crisis that has nowhere nearby to turn. It might be a
          historic building that needs to be saved. It might be students traveling long distances
          because the education they need is not available closer to home.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          It might also be a matching gift that gives donors an opportunity to double the impact of
          their contribution.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Whatever the situation, the donor should understand why now matters. Compare:
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/45">
              The organization&rsquo;s problem
            </p>
            <p className="mt-3 font-display text-xl leading-snug text-[rgb(var(--navy))]">
              &ldquo;We need to close our funding gap by December 31.&rdquo;
            </p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--brass))] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              The difference the donor can make
            </p>
            <p className="mt-3 font-display text-xl leading-snug text-[rgb(var(--navy))]">
              &ldquo;This project will give families in crisis a place to go close to home.&rdquo;
            </p>
          </div>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That distinction matters.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Good fundraising does not have to make people feel guilty or pressured. It needs to help
          them understand what is at stake and why their participation matters now.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Give the donor a place in the story
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          One of the biggest mistakes I see in cases for support is that the organization spends so
          much time talking about itself that the donor disappears from the story.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A good case should answer some basic questions.
        </p>

        <div className="mt-8 w-full overflow-hidden rounded-2xl border border-[rgb(var(--line))]">
          <div className="relative aspect-[12/7] w-full">
            <Image
              src="/blog/why-people-give/graphic-case-for-support-questions.png"
              alt="Graphic: six questions a case for support has to answer. What problem are we trying to solve? Who is affected? What changes if we succeed? Why is our organization capable of doing this? Why is now the right time? What can the donor make possible?"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The numbers matter. They establish credibility. But numbers alone rarely move someone to
          make a transformational gift. The story matters, too.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          In a recent feasibility study interview, one of the people we spoke with described the
          one-page case we had developed as particularly effective because it combined evidence with
          a compelling human story and made the organization&rsquo;s future easier to understand.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That is what you want a case to do. Tell me why this is important. Show me that you know
          what you are doing. Then help me understand where I fit.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The ask is an invitation
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A lot of fundraisers are uncomfortable asking for money. I understand that. Nobody wants to
          feel like they are putting someone on the spot.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          But a good ask is not about putting pressure on someone, the proverbial &ldquo;arm
          twisting.&rdquo; It is about giving a donor the opportunity to participate in something
          they care about.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The ask should be made by someone who has a credible relationship with the donor. It should
          be based on what we have learned about that donor. It should be specific about the amount
          and what the gift will accomplish.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          And then you have to be willing to stop talking.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          Silence is hard. After you ask for a major gift, there is a natural temptation to fill the
          space. Don&rsquo;t. Give the donor a chance to think.
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          They may be thinking about their finances. They may be talking it over with their spouse.
          They may be considering another commitment. Or they may simply need a minute to absorb what
          you have asked them to do.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Let them have that minute.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The goal is not to talk someone into giving. The goal is to give them enough information,
          trust, and space to make a decision they feel good about.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Legacy is about meaning
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Not every donor cares about having their name on a wall. Many donors care much more about
          what their gift represents.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A donor who lost a loved one may want to support a program that helps other families facing
          the same experience. A family that built a business in a community may want future
          generations to see what that community meant to them. A longtime supporter may want to make
          sure that something important to their own life is still here for the next generation.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Naming opportunities and recognition can be meaningful, but the name is not really the
          point. The meaning behind it is.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The better question is not, &ldquo;What recognition can we give this donor?&rdquo; It is,
          &ldquo;What can this donor make possible that will still matter years from now?&rdquo;
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The bottom line
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          People give for different reasons, but three things show up again and again in successful
          fundraising conversations.
        </p>
        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            They feel connected to the people and purpose behind the work.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            They feel confident that the organization and its leadership can deliver.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            And they see a real opportunity to make a difference.
          </li>
        </ol>
        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Our job as fundraisers is not to manufacture those feelings. It is to understand them.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Ask good questions. Listen carefully. Know the donor. Be honest about the need. Explain
          what the gift will accomplish. Give people room to make their own decisions.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          And remember that a donor who says, &ldquo;not now&rdquo; has not necessarily said
          &ldquo;never.&rdquo; Some of the best donor relationships I have seen have developed over
          time because a fundraiser respected the person enough not to force the moment.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The best gift conversations leave the donor feeling respected, whether they give today,
          later, or in another way.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          That is not just good fundraising. It is how good relationships are built.
        </p>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Catapult Fundraising helps nonprofits build campaigns, cases for support, and donor
          conversations around what actually moves people to give. If you would like to talk about
          your next campaign or major gift program,{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            we&rsquo;d love to start the conversation
          </Link>
          .
        </p>

        <p className="mt-10 text-sm italic leading-relaxed text-[rgb(var(--ink))]/50">
          This article reflects Amy C. Wiles&rsquo; experience leading campaigns and donor
          conversations at Catapult Fundraising. Examples are drawn from that work and are described
          without identifying clients or donors.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
