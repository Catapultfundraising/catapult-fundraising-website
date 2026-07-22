import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "capital-campaign-donor-engagement-legacy-giving-best-practices";

export const metadata = {
  title: "Capital Campaign, Mid-Level Donor Engagement & Legacy Giving Best Practices",
  description:
    "A practical playbook for nonprofit capital campaigns, mid-level donor engagement, and legacy giving calls, feasibility studies, gift charts, donor upgrade paths, and planned giving conversations that work.",
  keywords: [
    "capital campaign best practices",
    "feasibility study best practices",
    "mid-level donor engagement best practices",
    "legacy giving best practices",
    "legacy call script",
    "planned giving best practices",
    "gift chart capital campaign",
    "donor upgrade path",
    "capital campaign and donor engagement consultants",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Capital Campaigns, Mid-Level Donor Engagement, and Legacy Giving: A Best Practices Guide",
    description:
      "Feasibility studies, gift charts, donor upgrade paths, and legacy call scripts, the practical playbook nonprofits use to raise more at every donor level.",
    url: `${SITE_URL}/blog/${SLUG}`,
  },
};

const faqs = [
  {
    question: "What is the first step in planning a nonprofit capital campaign?",
    answer:
      "A feasibility study. Before a case for support or a gift chart is finalized, a feasibility study interviews board members, major donors, and community stakeholders to test the campaign's goal, timeline, and case against real donor sentiment, so the public goal is set with evidence, not optimism.",
  },
  {
    question: "How do you build a capital campaign gift chart?",
    answer:
      "Most successful campaigns follow a pyramid pattern: roughly the top 10 gifts account for 40 to 60 percent of the goal, the next tier of donors fills the middle, and a broad base of annual and mid-level donors completes the total through the public phase. The chart should be built from real prospect research, not a generic template.",
  },
  {
    question: "What is mid-level donor engagement in fundraising?",
    answer:
      "Mid-level donor engagement is a structured program that identifies donors giving above the average annual gift but below major gift thresholds, then moves them through stages of increasing personal contact, stewardship, and ask sophistication, so more of them graduate into the major gift pipeline over time.",
  },
  {
    question: "What makes a legacy giving or planned giving call effective?",
    answer:
      "Effective legacy calls lead with gratitude and relationship, not a hard ask. The best programs identify donors with long, loyal giving histories, thank them specifically for that history, and open a low-pressure conversation about how they might already be considering the organization in their estate plans.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Capital Campaigns, Mid-Level Donor Engagement, and Legacy Giving: A Best Practices Guide",
  description:
    "A practical playbook for nonprofit capital campaigns, mid-level donor engagement, and legacy giving calls.",
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
  datePublished: "2026-07-22",
  dateModified: "2026-07-22",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function BestPracticesPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Capital campaigns, mid-level donor engagement, and legacy giving: a best practices guide."
        description="Three fundraising programs, one integrated donor journey. Here's the practical playbook nonprofits use to raise more at every level, from first-time annual donors to seven-figure legacy gifts."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Nonprofits rarely raise significant money through one program alone. The organizations that consistently
          grow their donor base treat capital campaigns, mid-level donor engagement, and legacy giving as three
          connected stages of the same relationship, not three separate initiatives run by three separate teams.
          Below is the best-practice playbook Catapult Fundraising uses across{" "}
          <Link href="/services/capital-campaign" className="font-semibold text-[rgb(var(--navy))] underline">
            capital campaigns
          </Link>
          ,{" "}
          <Link href="/services/donor-engagement" className="font-semibold text-[rgb(var(--navy))] underline">
            mid-level donor engagement
          </Link>
          , and{" "}
          <Link href="/services/legacy-giving" className="font-semibold text-[rgb(var(--navy))] underline">
            legacy giving
          </Link>{" "}
          programs nationwide.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Capital campaign best practices
        </h2>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">1. Start with a real feasibility study</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A feasibility study interviews board members, top prospects, and community stakeholders before a dollar
          goal is announced publicly. It tests the case for support, surfaces objections early, and identifies which
          prospects are ready for a leadership gift conversation. Campaigns that skip this step, or treat it as a
          formality, are far more likely to fall short of goal or stall in the quiet phase.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">2. Write a case for support donors can repeat back to you</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The strongest case statements are specific: a named need, a clear dollar impact, and a timeline. Vague
          language about "building for the future" rarely moves a five or six-figure gift. Donors should be able to
          explain, in one sentence, exactly what their gift accomplishes.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">3. Build a gift chart based on real prospects, not a template</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Most successful campaigns follow a pyramid: a small number of lead gifts account for 40 to 60 percent of
          the total goal, a middle tier of major and mid-level donors fills the next third, and a broad base of
          annual donors completes the goal through the public phase. That chart only works if it is built from actual
          prospect research and capacity ratings, not a generic percentage template.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">4. Run the quiet phase before you run the public phase</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Securing 50 to 70 percent of the goal quietly, from board members and top prospects, before any public
          announcement builds momentum and de-risks the public ask. A public phase that launches with strong quiet-phase
          numbers already banked converts far more community and mid-level gifts than one launched from zero.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">5. Treat public-phase calling as part of the strategy, not an afterthought</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The public phase is where annual donors, lapsed donors, and community members are invited to participate.
          Trained callers who understand the campaign's case for support, not just a script, consistently produce
          higher participation rates and larger average gifts than untrained or outsourced calling programs with no
          context for the mission.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Mid-level donor engagement best practices
        </h2>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">1. Define your mid-level band with data, not instinct</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Mid-level donors typically give above the average annual gift but below major gift thresholds, often
          somewhere between a few hundred and a few thousand dollars depending on the organization's size. Pull the
          actual giving history to set that band, rather than guessing.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">2. Build a staged upgrade path, not a single appeal</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The strongest mid-level programs move a donor through stages of increasing personal contact, a welcome
          call, a stewardship touch reporting back on impact, a personalized ask, rather than sending the same annual
          appeal letter every donor receives. Catapult's mid-level program uses an 8-stage path built specifically to
          identify and cultivate donors ready to move toward a major gift conversation.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">3. Make every call about the donor, not the ask</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Mid-level donors respond to genuine recognition of their giving history and impact far more than to a
          transactional pitch. A call that opens with specific gratitude, and closes with a clear, reasonable next
          step, consistently outperforms a cold ask.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">4. Track upgrades, not just renewals</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A mid-level program's real measure of success is how many donors move up a giving tier year over year, not
          simply how many renew at the same level. Report on upgrade rate as its own metric.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Legacy giving and legacy call best practices
        </h2>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">1. Identify prospects from loyalty, not just capacity</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          The strongest legacy giving prospects are often not an organization's largest annual donors. They are the
          donors who have given consistently, sometimes modestly, for a decade or more. Long tenure is frequently a
          better predictor of a future bequest than gift size alone.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">2. Lead with gratitude, not a request</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          An effective legacy call opens by thanking the donor for their specific giving history, not by asking for
          anything. The goal of the first conversation is almost always to open a relationship, not close a
          commitment.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">3. Make the ask easy to say yes to</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Many donors have already considered including a cause in their estate plans but have never been asked. A
          simple, low-pressure question, "Have you ever thought about including us in your will or estate plans?",
          often surfaces intentions the organization did not know existed.
        </p>

        <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">4. Steward every legacy commitment publicly and personally</h3>
        <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Donors who confirm a planned gift should be recognized (with their permission) and stewarded like any other
          major donor. Legacy giving societies, personal thank-you notes, and continued relationship-building all
          increase the likelihood that a stated intention becomes a realized gift.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          How these three programs work together
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          A capital campaign builds the case and the momentum. Mid-level donor engagement identifies which annual
          donors are ready to give more, and more personally. Legacy giving captures the loyalty a strong mid-level
          and campaign program builds over years, converting it into deferred gifts that sustain the organization
          long after the campaign closes. Treated as one connected system, rather than three isolated initiatives,
          these programs compound: a well-run campaign creates better mid-level prospects, and a well-run mid-level
          program creates better legacy prospects.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Frequently asked questions
        </h2>
        <div className="mt-6 space-y-8">
          {faqs.map((faq) => (
            <div key={faq.question} className="border-t border-[rgb(var(--line))] pt-6">
              <h3 className="font-display text-xl text-[rgb(var(--navy))]">{faq.question}</h3>
              <p className="mt-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{faq.answer}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Ready to put these practices to work for your organization?{" "}
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
