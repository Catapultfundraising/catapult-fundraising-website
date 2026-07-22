import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { CheckCircle, XCircle } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "catapult-vs-fundraising-consultants";

export const metadata = {
  title: "Catapult Fundraising vs. Other Fundraising Consultants | What Sets Us Apart",
  description:
    "Most fundraising consultants either plan a campaign or make the calls, rarely both. See how Catapult Fundraising's one-firm, every-phase model compares to campaign-only counsel, calling-only vendors, and major gift specialists.",
  keywords: [
    "fundraising consultant comparison",
    "capital campaign consultant vs calling firm",
    "CCS Fundraising alternative",
    "Grenzebach Glier alternative",
    "Graham-Pelton alternative",
    "RNL alternative",
    "Ruffalo Noel Levitz alternative",
    "best nonprofit fundraising consultant",
    "capital campaign and donor engagement consultants",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: "Catapult Fundraising vs. Other Fundraising Consultants: What Sets Us Apart",
    description:
      "See how Catapult's one-firm, every-phase model compares to campaign-only counsel, calling-only vendors, and major gift specialists.",
    url: `${SITE_URL}/blog/${SLUG}`,
  },
};

const CAMPAIGN_ONLY_FIRMS = [
  "CCS Fundraising",
  "Graham-Pelton",
  "Grenzebach Glier",
  "Marts & Lundy",
  "M. Gale & Associates",
  "Convergent Nonprofit Solutions",
];

const CALLING_ONLY_FIRMS = [
  "RNL (Ruffalo Noel Levitz)",
  "The Phonathon",
  "Team Allegiance",
  "DCM",
  "Mission Wired",
];

const MAJOR_GIFT_SPECIALISTS = [
  "Veritus Group",
  "NextAfter",
  "EAB",
];

const faqs = [
  {
    question: "What makes Catapult Fundraising different from a traditional capital campaign consulting firm?",
    answer:
      "Traditional campaign counsel firms typically hand a nonprofit a feasibility study, a case for support, and a gift chart, then step back once the quiet phase is underway. Catapult stays engaged through public-phase calling, mid-level donor engagement, and legacy giving outreach, so the strategy we build is the strategy our own Engagement Officers execute.",
  },
  {
    question: "Is Catapult Fundraising a calling center or a strategy firm?",
    answer:
      "Both, by design. Catapult was founded to close the gap between firms that plan campaigns and firms that just make calls. Our strategists write the case for support and campaign plan, and our trained, in-house Engagement Officers deliver the donor conversations, so there is no hand-off, no lost institutional knowledge, and no vendor pointing fingers at another vendor.",
  },
  {
    question: "Does Catapult Fundraising work with small and mid-sized nonprofits, not just large institutions?",
    answer:
      "Yes. While many campaign-only consultancies focus on eight and nine-figure institutional campaigns, Catapult also partners with community nonprofits, faith-based organizations, and regional charities running six and seven-figure campaigns, annual fund programs, and legacy giving initiatives.",
  },
  {
    question: "How does Catapult Fundraising compare to major gift and mid-level donor specialists?",
    answer:
      "Firms like Veritus Group and NextAfter offer excellent thinking on donor psychology and mid-level strategy, but most do not staff and run the actual donor conversations. Catapult built an 8-stage mid-level donor engagement program and staffs it with trained Engagement Officers, so the strategy is executed, not just recommended.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Catapult Fundraising vs. Other Fundraising Consultants: What Sets Us Apart",
  description:
    "Most fundraising consultants either plan a campaign or make the calls, rarely both. See how Catapult Fundraising's one-firm, every-phase model compares to campaign-only counsel, calling-only vendors, and major gift specialists.",
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

export default function CatapultVsCompetitorsPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <PageHero
        eyebrow="Insights"
        title="Catapult Fundraising vs. other fundraising consultants: what sets us apart."
        description="The nonprofit fundraising industry is fragmented on purpose. Firms that write campaign strategy rarely make the calls, and firms that make calls rarely understand campaign strategy. Here's how Catapult closes that gap, and how we stack up against the firms nonprofits usually consider alongside us."
      />

      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <p className="text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          When a nonprofit board starts evaluating fundraising consultants, it usually finds two very different kinds
          of firms. The first plans campaigns: feasibility studies, case statements, gift charts, sometimes a
          capital campaign plan that sits in a binder. The second executes campaigns: telemarketing centers,
          phonathons, and calling vendors who dial from a list they did not build and cannot fully explain. Nonprofits
          are left stitching the two together themselves, often losing momentum, institutional knowledge, and money in
          the hand-off.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Catapult Fundraising was founded to close that exact gap. We are a{" "}
          <Link href="/about" className="font-semibold text-[rgb(var(--navy))] underline">
            full-service fundraising consulting firm
          </Link>{" "}
          that stays with a client from planning through public-phase calling, with the same team accountable for both
          the strategy and the results. Below is an honest look at how that model compares to the other types of firms
          nonprofits typically evaluate.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          The problem with most fundraising consultants
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Ask most campaign counsel firms what happens after the case for support is written and the gift chart is
          approved, and the honest answer is: the client takes it from here. Ask most calling firms how their script
          connects to the donor's actual giving history and campaign priorities, and the honest answer is often:
          it does not, closely. Neither gap is anyone's fault; it is simply how the industry organized itself.
          Capital campaign consultants built expertise in strategy and major gift solicitation. Calling firms built
          expertise in dial volume, scripting, and phone technology. Very few firms built both, under one roof, with
          one team accountable for the whole donor journey.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          How Catapult Fundraising is different
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Catapult is the rare firm built to do both. Our strategists conduct the feasibility study, write the case
          for support, and build the campaign plan and gift chart. Our own trained, monitored Engagement Officers
          then execute the{" "}
          <Link href="/services/capital-campaign" className="font-semibold text-[rgb(var(--navy))] underline">
            public-phase calling
          </Link>
          ,{" "}
          <Link href="/services/donor-engagement" className="font-semibold text-[rgb(var(--navy))] underline">
            mid-level donor engagement
          </Link>
          , and{" "}
          <Link href="/services/legacy-giving" className="font-semibold text-[rgb(var(--navy))] underline">
            legacy giving
          </Link>{" "}
          outreach that plan calls for. There is no hand-off between vendors, no lost institutional knowledge, and no
          finger-pointing when results fall short. One firm is accountable for the entire donor journey, from
          feasibility through the final thank-you call.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
            <h3 className="flex items-center gap-2 font-display text-xl text-[rgb(var(--navy))]">
              <XCircle className="h-5 w-5 text-[rgb(var(--ink))]/40" />
              The typical approach
            </h3>
            <ul className="mt-4 space-y-3 text-[rgb(var(--ink))]/70">
              <li>Strategy firm hands off a binder, then exits</li>
              <li>Calling vendor works from a list they didn't build</li>
              <li>No single team accountable for results</li>
              <li>Campaign, mid-level, and legacy programs run by different vendors</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--brass))]/40 bg-[#b28c46]/10 p-8">
            <h3 className="flex items-center gap-2 font-display text-xl text-[rgb(var(--navy))]">
              <CheckCircle className="h-5 w-5 text-[rgb(var(--brass))]" />
              The Catapult approach
            </h3>
            <ul className="mt-4 space-y-3 text-[rgb(var(--ink))]/70">
              <li>One firm, from feasibility study through public phase</li>
              <li>In-house, trained Engagement Officers make every call</li>
              <li>One accountable team for strategy and results</li>
              <li>Capital campaign, mid-level, and legacy programs work as one system</li>
            </ul>
          </div>
        </div>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Catapult vs. campaign-only consulting firms
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Firms like {CAMPAIGN_ONLY_FIRMS.slice(0, -1).join(", ")}, and {CAMPAIGN_ONLY_FIRMS[CAMPAIGN_ONLY_FIRMS.length - 1]} are
          respected names in capital campaign strategy. They excel at feasibility studies, case statement writing, and
          major gift coaching for boards and volunteers. What most of these firms do not do is staff and run the
          public-phase calling that turns a campaign plan into completed pledges from hundreds or thousands of
          annual, mid-level, and lapsed donors. Nonprofits that hire a campaign-only firm usually need a second
          vendor, or their own staff, to execute that phase. Catapult removes that second hand-off entirely.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Catapult vs. calling-only firms
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          On the other side of the industry are calling and telemarketing firms such as {CALLING_ONLY_FIRMS.slice(0, -1).join(", ")},
          and {CALLING_ONLY_FIRMS[CALLING_ONLY_FIRMS.length - 1]}. These firms are built for volume, dialing large
          segmented lists with scripted asks. They are rarely involved in writing the campaign strategy, the case for
          support, or the gift chart those calls are meant to support, and the people on the phone often have no
          context for the mission beyond a script. Because Catapult's Engagement Officers are trained on the same
          case for support our strategists wrote, every call reflects real campaign context, not just a script read
          off a screen.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          Catapult vs. major gift and mid-level donor specialists
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          Firms like {MAJOR_GIFT_SPECIALISTS.join(", ")} publish excellent thinking on donor psychology, mid-level
          donor strategy, and digital fundraising optimization. Their strength is often in coaching, training, and
          strategic recommendations, valuable input for any development team. Catapult's mid-level donor engagement
          program takes the next step: an 8-stage, relationship-first system staffed by our own Engagement Officers,
          who personally work the donor upgrade path from first call to major gift qualification, rather than handing
          a strategy document back to an already-stretched development office to implement alone.
        </p>

        <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">
          What nonprofits should look for in a fundraising partner
        </h2>
        <ul className="mt-4 space-y-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">One team, every phase.</span> Ask whether the same
            firm that plans your campaign will also be in the room, or on the phone, when it is time to ask.
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">In-house callers, not subcontractors.</span> Ask who
            is actually dialing your donors, and whether that person understands your case for support.
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">Transparent reporting.</span> Ask how often you
            will see real numbers on participation, pledges, and average gift, not just activity counts.
          </li>
          <li>
            <span className="font-semibold text-[rgb(var(--navy))]">A donor-centered philosophy.</span> Ask whether
            every prospect, from a $50 annual donor to a seven-figure legacy gift, is treated like a relationship worth
            building, not a transaction to close.
          </li>
        </ul>

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
          Want to see how a one-firm, every-phase approach would work for your campaign, mid-level donor program, or
          legacy giving initiative?{" "}
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
