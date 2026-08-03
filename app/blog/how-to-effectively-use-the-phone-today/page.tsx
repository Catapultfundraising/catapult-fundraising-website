import Link from "next/link";
import Image from "next/image";
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
    images: [{ url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/bf533301-7515-409e-ac31-57d9e2df3c30.png", width: 1536, height: 1024, alt: "A fundraising engagement officer smiling while making a personalized phone call" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "How to Effectively Use the Phone Today",
  description:
    "Anthony R. Alonso on why telefundraising is far from dead, and the two-step, personalized method that lifts gift sizes 25 to 30 percent.",
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
      <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/bf533301-7515-409e-ac31-57d9e2df3c30.png"
            alt="A fundraising engagement officer smiling while making a personalized phone call"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
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


        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8a6397c5-1d34-4edc-bfe5-8182ab871c38.png"
              alt="Infographic: the two-step method, letter or email then a personal call, delivering 25 to 30 percent higher gift sizes"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <blockquote className="mt-8 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          &ldquo;It becomes a very different dynamic than your typical confrontational
          telemarketing call. The caller is the facilitator rather than the solicitor. The
          solicitor is the person who signed that letter or e-mail.&rdquo;
        </blockquote>

      <div className="clear-both" />

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
      <div className="clear-both" />
      </article>

      <CtaBand />
    </>
  );
}
