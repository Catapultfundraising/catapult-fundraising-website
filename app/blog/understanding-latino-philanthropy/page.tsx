import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "understanding-latino-philanthropy";

export const metadata = {
  title: "Understanding Latino Philanthropy: Lessons for Nonprofit Fundraisers | Catapult Fundraising",
  description:
    "Anthony Alonso on why 'Latinos don't give' is a myth, what the data actually says about Hispanic and Latino giving, and how to frame a case for support that resonates with family, community, and tradition.",
  keywords: [
    "Latino philanthropy",
    "Hispanic donor engagement",
    "Latino giving statistics",
    "multicultural fundraising",
    "peer to peer solicitation Latino",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Understanding Latino Philanthropy: Lessons for Nonprofit Fundraisers",
    description:
      "Why 'Latinos don't give' is a myth, what the data actually says about Hispanic and Latino giving, and how to frame a case for support that resonates.",
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [{ url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0aacf9dc-33f6-420d-a5a3-b1b98483dd83.png", width: 1536, height: 1024, alt: "A warm multigenerational Latino family gathered together, symbolizing family, community, and generosity" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Understanding Latino Philanthropy: Lessons for Nonprofit Fundraisers",
  description:
    "Why 'Latinos don't give' is a myth, what the data actually says about Hispanic and Latino giving, and how to frame a case for support that resonates.",
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

export default function UnderstandingLatinoPhilanthropyPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Understanding Latino philanthropy: lessons for nonprofit fundraisers."
        description="Anthony Alonso's mother asked him the same question for thirty-five years: do people really give? The truth is she gave every week, she just never called it philanthropy."
      />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
      <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0aacf9dc-33f6-420d-a5a3-b1b98483dd83.png"
            alt="A warm multigenerational Latino family gathered together, symbolizing family, community, and generosity"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Eighty percent of Hispanics and Latinos gave to their church last year. Most never think
          of that as philanthropy, and most nonprofits never think of them as prospects. On
          average, that giving totals $1,728 a year, given weekly. If a donor in your own database
          gave $1,728 a year without being asked, you&rsquo;d call them a mid-level donor with
          major-gift potential. The Latino market gives at that level constantly, and the
          fundraising field has simply not done the work to earn a share of it.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          My mother asked me, for thirty-five years into my career, &ldquo;do people really
          give?&rdquo; And yet she gave every single week. We simply haven&rsquo;t educated this
          market on the difference their gifts already make.
        </blockquote>
      <div className="clear-both" />

        <div className="relative mt-6 aspect-[3/2] w-full max-w-2xl overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8a460c84-f2bc-47ef-b1f2-f2f0337717b9.png"
            alt="Infographic: 80 percent of Hispanics and Latinos gave to their church last year, averaging $1,728 a year given weekly"
            fill
            className="object-cover"
          />
        </div>


        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Four myths worth retiring
        </h2>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">&ldquo;Latinos aren&rsquo;t philanthropic.&rdquo;</span>{" "}
            The U.S. Latino GDP is nearly $3 trillion, which would rank as the world&rsquo;s fifth
            largest economy on its own. Nearly 80 percent of net new U.S. workers between 2020 and
            2030 are projected to be Latino. This is a market building wealth, not one on the
            sidelines of it.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">&ldquo;They&rsquo;re concentrated in a few states.&rdquo;</span>{" "}
            The traditional map, South Florida, Texas, California, New York, is outdated. Some of
            the fastest Latino population growth in the country is now in states like Kentucky,
            North Dakota, and South Dakota, following opportunity and jobs, not old assumptions.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">&ldquo;They want to be solicited in Spanish.&rdquo;</span>{" "}
            78 percent of Hispanics say they prefer English when interacting with digital devices,
            and that preference is even stronger among English-first and bilingual Hispanics.
            Defaulting to a direct Spanish translation of your materials can land as tone-deaf
            rather than welcoming.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">&ldquo;Latinos are a single, uniform audience.&rdquo;</span>{" "}
            Political views, country of origin, generation, and language preference all vary
            widely. Treating this market as one-size-fits-all is the same mistake as treating any
            other donor segment that way, just at a much larger scale of missed opportunity.
          </li>
        </ul>


        <div className="relative mt-6 aspect-[3/2] w-full max-w-2xl overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/79a8caf4-14a7-432c-b020-6d623ab306a9.png"
            alt="Infographic: Four myths worth retiring about Latino philanthropy"
            fill
            className="object-cover"
          />
        </div>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Retire the term &ldquo;Latinx&rdquo; in donor communications
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Only 2 to 3 percent of Hispanics and Latinos use the term &ldquo;Latinx&rdquo; to
          describe themselves, and roughly three-quarters have never heard it. In one 2023 survey
          of registered voters of Latin American descent, 68 percent preferred &ldquo;Hispanic,&rdquo;
          21 percent preferred &ldquo;Latino,&rdquo; and 40 percent said they found
          &ldquo;Latinx&rdquo; offensive. The term was created with inclusive intent, but it
          replaces a Spanish word with an invented English one, and using it in solicitations
          risks alienating the very audience it was meant to include. Use &ldquo;Hispanic&rdquo;
          or &ldquo;Latino&rdquo; instead, reserving &ldquo;Latinx&rdquo; only for younger, Gen Z
          audiences who may identify with more inclusive language.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          How to actually reach this market
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The channel data runs counter to a lot of assumptions. Hispanics are 50 percent more
          likely to answer their phone than the general population, and 47 percent live in
          cell-phone-only households. Nearly half of Hispanic adults surveyed use TikTok, well
          above other demographic groups, and Hispanics are 29 percent more likely to own an
          internet-enabled device than the population overall. The takeaway isn&rsquo;t
          &ldquo;pick one channel,&rdquo; it&rsquo;s to use all of them: phone, text, email, and
          social media all outperform expectations with this audience, provided the message is
          personal rather than mass-produced.
        </p>


        <div className="relative mt-6 aspect-[3/2] w-full max-w-2xl overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0d76b7fa-2260-46da-af65-3cb524fbbef4.png"
            alt="Infographic: channel data showing phone, text, and social media reach among Hispanic and Latino donors"
            fill
            className="object-cover"
          />
        </div>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Lead with family, community, and tradition
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Giving decisions in Latino households are frequently made as a family unit, not by one
          individual acting alone, so appeals that speak to the whole family tend to land better
          than ones addressed to a single donor in isolation. Peer-to-peer solicitation is
          especially powerful: a letter drafted from an interview with a Latino donor or board
          member, signed over their name, telling their own story of why they give, consistently
          outperforms an institutional appeal. And because many Latino donors are accustomed to
          giving weekly at church, a monthly sustainer ask is often an easier, more natural fit
          than a single annual gift.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          Donor loyalty isn&rsquo;t about the donor being loyal to us. It&rsquo;s about us being
          loyal to the donor, reaching out the way they want to be reached, not the way that&rsquo;s
          easiest for us.
        </blockquote>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Practical tactics worth testing
        </h2>
        <ul className="mt-6 space-y-4 pl-5 list-disc marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Crowdfunding.</span>{" "}
            Latino donors are roughly twice as likely to give through crowdfunding and peer
            solicitations at church or community events, a habit many already practice when
            supporting family or disaster relief back home.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Church partnerships.</span>{" "}
            Asking a local, predominantly Latino congregation for a few minutes to speak about your
            mission after service works more often than most fundraisers expect, and it&rsquo;s a
            channel many organizations never think to try.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Latino giving circles and donor advisory panels.</span>{" "}
            A Zoom-based advisory panel of Latino donors, thanked and asked what motivates their
            giving, builds a networking opportunity for them and a pipeline of insight and future
            board candidates for you.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Recipient testimonials on video.</span>{" "}
            A short phone-recorded testimonial from someone whose life was changed by the
            organization, shared on social media, mirrors the public thank-you moments common in
            many Latino churches and resonates the same way in a donor appeal.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Seven words to frame any case for support
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Familia (family), comunidad (community), solidaridad (solidarity), oportunidad
          (opportunity), resiliencia (resilience), impacto (impact), and gratitud (gratitude).
          Nearly any nonprofit&rsquo;s mission, whether it&rsquo;s a university opening doors for
          first-generation students, a hospital treating patients, or a human-services agency
          feeding families, can be framed through these seven ideas. The most effective appeals
          Catapult has seen with this audience don&rsquo;t rely on Spanish-language translation to
          connect, they rely on speaking to what already matters most: family, community, and the
          chance for the next generation to go further than the last.
        </p>


        <div className="relative mt-6 aspect-[3/2] w-full max-w-2xl overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/38fc26f7-1dd7-4f66-b411-2ea420fc5618.png"
            alt="Infographic: seven Spanish words, familia, comunidad, solidaridad, oportunidad, resiliencia, impacto, and gratitud, to frame any case for support"
            fill
            className="object-cover"
          />
        </div>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Want help building a case for support and outreach strategy that genuinely resonates
          with Latino and Hispanic donors?{" "}
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
