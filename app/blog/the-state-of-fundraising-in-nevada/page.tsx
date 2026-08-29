import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";
import { Download } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "the-state-of-fundraising-in-nevada";
const PDF_URL = "/downloads/the-state-of-fundraising-in-nevada.pdf";

export const metadata = {
  title: "The State of Fundraising in Nevada",
  description:
    "Nevada ranks 49th out of 50 states in WalletHub's 2025 Most Charitable States study. Here's what the data actually means for capital campaign strategy.",
  keywords: [
    "Nevada nonprofit fundraising",
    "Nevada capital campaign consultant",
    "most charitable states",
    "Nevada philanthropy",
    "Las Vegas fundraising consultant",
    "capital campaign feasibility study",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "The State of Fundraising in Nevada",
    description:
      "Nevada ranks 49th out of 50 states in WalletHub's 2025 Most Charitable States study. Here's what the data actually means for capital campaign strategy.",
    url: `${SITE_URL}/blog/${SLUG}`,
    images: [{ url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/5c32ad35-1e99-4b00-9b7f-38f3069c476e.png", width: 1536, height: 1024, alt: "A desert landscape transitioning into a modern city skyline at golden hour, evoking Nevada's growth" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "The State of Fundraising in Nevada",
  description:
    "Nevada ranks 49th out of 50 states in WalletHub's 2025 Most Charitable States study. Here's what the data actually means for capital campaign strategy.",
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
  datePublished: "2026-08-07",
  dateModified: "2026-08-07",
};

const RANK_ROWS = [
  ["1", "Wyoming", "69.49", "2", "6"],
  ["2", "Utah", "68.59", "1", "19"],
  ["3", "Maryland", "65.16", "20", "3"],
  ["37", "California", "53.09", "45", "5"],
  ["43", "Arizona", "48.19", "31", "49"],
  ["49", "Nevada", "43.90", "48", "44"],
  ["50", "New Mexico", "38.83", "50", "50"],
];

export default function StateOfFundraisingInNevadaPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow="Insights · Sector Briefing"
        title="The State of Fundraising in Nevada"
        description="Rankings, giving behavior, and what it means for capital campaign strategy."
      />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/the-state-of-fundraising-in-nevada`} title="The State of Fundraising in Nevada" />
      <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/5c32ad35-1e99-4b00-9b7f-38f3069c476e.png"
            alt="A desert landscape transitioning into a modern city skyline at golden hour, evoking Nevada's growth"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
        <div className="rounded-2xl bg-[rgb(var(--navy))] p-8 text-white sm:flex sm:items-center sm:gap-8">
          <div className="font-display text-6xl text-[rgb(var(--brass))]">
            49<span className="text-3xl align-top">th</span>
          </div>
          <div className="mt-4 sm:mt-0">
            <p className="leading-relaxed">
              Nevada&rsquo;s overall rank out of 50 states in WalletHub&rsquo;s 2025 Most Charitable States
              study &mdash; ahead of only New Mexico.
            </p>
            <p className="mt-2 text-sm text-white/60">
              Source: WalletHub, &ldquo;Most Charitable States,&rdquo; data collected Oct. 2025, published Nov. 2025
            </p>
          </div>
        </div>

        <p className="mt-8 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Nevada is one of the fastest-growing philanthropic markets in the country, and one of its
          most misunderstood. New data from WalletHub&rsquo;s 2025 Most Charitable States study ranks
          Nevada 49th out of 50 states overall, ahead of only New Mexico. For nonprofit boards and
          development offices reading that headline in isolation, it is tempting to conclude that
          Nevadans simply do not give. The data says something more specific, and more useful, than
          that.
        </p>

        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Four figures anchor the ranking. Nevada&rsquo;s total charitable behavior score sits at
          43.90 out of 100. Only 18.6% of Nevadans formally volunteer, among the lowest rates in the
          U.S. The state has just 5.83 public charities per capita, the fewest of any state in the
          nation. And its informal helping rate &mdash; the share of residents who help neighbors
          directly rather than through an organization &mdash; is 45.7%, also the lowest in the
          nation.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["43.90", "Total charitable behavior score (of 100)"],
            ["18.6%", "Formal volunteering — among the lowest in the U.S."],
            ["5.83", "Public charities per capita — fewest of any state"],
            ["45.7%", "Informal helping rate — lowest in the nation"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-xl border-t-4 border-[rgb(var(--brass))] bg-[rgb(var(--paper))] p-4">
              <div className="font-display text-2xl text-[rgb(var(--navy))]">{n}</div>
              <div className="mt-1 text-xs leading-snug text-[rgb(var(--ink))]/60">{l}</div>
            </div>
          ))}
        </div>
      <div className="clear-both" />


        <h2 className="mt-12 font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
          Where Nevada stands
        </h2>

        <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl" style={{ WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}>
            <Image
              src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/144f9145-430a-4f62-897d-890f7aa8b24d.png"
              alt="A minimalist map illustration of the state of Nevada"
              fill
              className="object-cover"
            />
          </div>
        </div>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          WalletHub&rsquo;s methodology ranks all 50 states across volunteering &amp; service and
          charitable giving, then combines the two into a total score. The states at the top of the
          list &mdash; Wyoming, Utah, and Maryland &mdash; share a common thread: long-tenured
          populations, dense civic and religious institutions, and agrarian or multi-generational
          community roots. Nevada, along with fellow Sun Belt transient-population states like
          Arizona and California, clusters much further down the list.
        </p>

      <div className="clear-both" />

        <div className="mt-6 overflow-x-auto rounded-xl border border-[rgb(var(--line))]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="bg-[rgb(var(--navy))] text-white">
                {["Rank", "State", "Total Score", "Volunteering & Service Rank", "Charitable Giving Rank"].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {RANK_ROWS.map((row) => (
                <tr
                  key={row[0] + row[1]}
                  className={
                    row[1] === "Nevada"
                      ? "bg-[rgb(var(--brass))]/15 font-semibold text-[rgb(var(--navy))]"
                      : "odd:bg-[rgb(var(--paper))]"
                  }
                >
                  {row.map((cell, i) => (
                    <td key={i} className="px-4 py-3 text-[rgb(var(--ink))]/80">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
          Why Nevada ranks low
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The honest reading of this data is structural, not attitudinal. Nevada carries a high share
          of transient, non-native residents, which means fewer households have the multi-generational
          giving roots that anchor philanthropy in states like Wyoming and Utah. The state also has
          the fewest public charities per capita of any state in the country, a thinner nonprofit
          infrastructure that makes it harder to convert donor intent into an actual gift. And
          Nevada&rsquo;s tourism- and service-driven economy shapes household income and available
          time differently than the agrarian and civic-culture economies of the states that rank
          highest.
        </p>

        <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
          &ldquo;This reflects infrastructure gaps more than donor unwillingness.&rdquo;
          <span className="mt-2 block font-sans text-sm not-italic text-[rgb(var(--ink))]/50">
            &mdash; Dr. Jessica K.A. Word, UNLV, WalletHub panelist
          </span>
        </blockquote>

        <h2 className="mt-12 font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
          What this means for capital campaign strategy
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          For organizations running capital campaigns in Nevada, this data is less a warning than a
          map. Four implications stand out:
        </p>
        <ol className="mt-6 space-y-5 pl-5 list-decimal marker:font-display marker:font-semibold marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">
              Relationship-driven, major-gift asks outperform grassroots or volunteer-pipeline models
            </span>{" "}
            in this market. With formal volunteering and informal helping both trailing the nation,
            campaigns built around broad-based volunteer recruitment will underperform models built
            around direct, personal cultivation of major donors.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">
              Low charity density means less donor &ldquo;shopping&rdquo; competition per cause
            </span>
            , an opening for well-positioned campaigns. Fewer public charities per capita means fewer
            causes competing for the same wallet, a real advantage for an organization that shows up
            with a clear, well-cased ask.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">
              Feasibility studies should benchmark against peer Sun Belt, transient-population markets
            </span>
            , not national averages. Comparing a Nevada campaign&rsquo;s projected results to a
            national median built on states like Wyoming and Utah sets an unrealistic and
            discouraging bar. Arizona, California, and other transient-population Sun Belt states are
            the more honest comparison set.
          </li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
            <span className="font-semibold text-[rgb(var(--navy))]">Board training should reframe the narrative</span>:
            &ldquo;Nevadans don&rsquo;t give&rdquo; should become &ldquo;Nevada requires a direct
            ask.&rdquo; The data shows a market that responds to relationship and specificity, not one
            that lacks generosity. That reframe changes how a board approaches every prospect
            conversation.
          </li>
        </ol>

        <p className="mt-8 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Nevada&rsquo;s philanthropic ranking is a fact about its infrastructure and history, not a
          verdict on its donors. For campaigns willing to invest in feasibility work,
          relationship-first solicitation, and realistic benchmarking, the same conditions that
          produce a low state ranking can produce an outsized opportunity for the organizations that
          understand them.
        </p>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-[rgb(var(--line))] bg-[rgb(var(--paper))] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg text-[rgb(var(--navy))]">Want the full sector briefing?</p>
            <p className="mt-1 text-sm text-[rgb(var(--ink))]/60">
              Download the print-ready PDF version of this briefing to share with your board.
            </p>
          </div>
          <a
            href={PDF_URL}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--brass))]"
          >
            <Download className="h-4 w-4" />
            Download the PDF
          </a>
        </div>

        <p className="mt-8 text-sm text-[rgb(var(--ink))]/50">
          Sources: WalletHub, &ldquo;Most Charitable States&rdquo; (2025) &middot; U.S. Census Bureau /
          AmeriCorps &middot; The Nevada Independent &middot; Giving USA
        </p>

        <p className="mt-8 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Running a campaign in Nevada, or another transient-population market?{" "}
          <Link href="/contact" className="font-semibold text-[rgb(var(--navy))] underline">
            Start a conversation with Catapult Fundraising
          </Link>{" "}
          and we&rsquo;ll help you benchmark your feasibility study against the right peer set.
        </p>
      </article>

      <CtaBand />
    </>
  );
}
