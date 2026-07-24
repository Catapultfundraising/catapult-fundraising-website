import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "how-to-effectively-use-the-phone-today";

export const metadata = {
  title: "How to Effectively Use the Phone Today | Catapult Fundraising",
  description:
    "Anthony R. Alonso on why telefundraising is far from dead, and the two-step, personalized method that lifts gift sizes 25 to 30 percent.",
  keywords: [
    "telefundraising",
    "phone fundraising best practices",
    "donor calling program",
    "pre-call letter fundraising",
    "telemarketing for nonprofits",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "How to Effectively Use the Phone Today",
    description:
      "Why telefundraising is far from dead, and the two-step, personalized method that lifts gift sizes 25 to 30 percent.",
    url: `${SITE_URL}/blog/${SLUG}`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "How to Effectively Use the Phone Today",
  description:
    "Anthony R. Alonso on why telefundraising is far from dead, and the two-step, personalized method that lifts gift sizes 25 to 30 percent.",
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
  datePublished: "2020-01-01",
  dateModified: "2026-07-24",
};

export default function HowToEffectivelyUseThePhoneTodayPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="How to Effectively Use the Phone Today"
        description="Reports of the death of telemarketing have been greatly exaggerated. Done the right way, telefundraising ranks second only to face-to-face meetings for garnering gifts."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Reports of the death of telemarketing have been greatly exaggerated, says Anthony R.
          Alonso, president, Catapult Fundraising (Henderson, NV). In fact, done the right way,
          telefundraising ranks second only to face-to-face meetings for garnering gifts.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          &ldquo;One of the things we hear all the time is telephone fundraising is dead. The
          truth of the matter is it&rsquo;s not a question of whether we use telemarketing.
          It&rsquo;s a question of how we use it.&rdquo;
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          To get the most out of telephone campaigns, nonprofits should dial back on fancy
          technological techniques like predictive dialing, autodialing and robocalls. Instead,
          emphasize the personal, Alonso advises.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          &ldquo;If we&rsquo;re good fundraisers, what we do is build relationships. The key is
          to personalize the process.&rdquo;
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          To accomplish that goal, he recommends a two-step method:
        </p>

        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            Send a letter or e-mail to prospective donors. Use technology to segment your
            audience by affiliation. A university, for example, could target groups by class year
            or major. Technology can also help determine the right ask amount for each prospect.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            Follow up the written communication with a personal call from a volunteer, an
            employee or an outsourced telemarketing firm. Using the letter or e-mail as an
            icebreaker, the caller can start a conversation by asking if the prospect received
            it. Then the caller can refer to the donation asked for in the correspondence and ask
            the prospect how he or she feels about it.
          </li>
        </ol>

        <blockquote className="mt-8 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          &ldquo;It becomes a very different dynamic than your typical confrontational
          telemarketing call. The caller is the facilitator rather than the solicitor. The
          solicitor is the person who signed that letter or e-mail.&rdquo;
        </blockquote>

        <p className="mt-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Combining a pre-call letter with a nonautomated phone call boosts the &ldquo;reach
          rate,&rdquo; enabling callers to speak with more prospects. In addition, gift sizes with
          this approach typically run 25 to 30 percent higher than without a letter or e-mail
          first, Alonso says. That&rsquo;s mainly because rather than asking for the amount a
          donor gave the previous year, the caller can request the higher amount specified in the
          pre-call communication.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          &ldquo;You&rsquo;re no longer leaving the onus of the ask amount on the person who&rsquo;s
          making the call. It changes that dynamic as well, significantly increasing the gift
          size.&rdquo;
        </blockquote>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Curious what a personalized, letter-first calling program could do for your annual
          fund or legacy giving pipeline?{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            Start a conversation with Catapult Fundraising
          </Link>
          .
        </p>

        <p className="mt-12 border-t border-[rgb(var(--line))] pt-6 text-sm text-[rgb(var(--ink))]/40">
          Source: Anthony R. Alonso, President, Catapult Fundraising, Henderson, NV. Originally
          published in Successful Fundraising © 2020.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
