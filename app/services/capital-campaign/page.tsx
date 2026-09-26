import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { GiftChartCalloutCard, ReadinessCalloutCard } from "@/components/tool-callout";
import { RelatedReading } from "@/components/related-reading";
import { ClipboardList } from "lucide-react";
import { testimonialsFor } from "@/lib/testimonials";
import { TestimonialQuote } from "@/components/testimonial-quote";
import { CAMPAIGN_SECTOR_LINKS } from "@/lib/constants";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Capital Campaign Consulting & Counsel",
  description:
    "Capital campaign consulting from feasibility study to final pledge: planning, quiet-phase major gift strategy, and public-phase calling from one national firm.",
  keywords: [
    "capital campaign consultant",
    "capital campaign consultants",
    "capital campaign consulting",
    "capital campaign consulting services",
    "capital campaign counsel",
    "feasibility study nonprofit",
    "campaign planning phase",
    "quiet phase fundraising",
    "public phase calling",
    "capital campaign consulting firm",
    "nonprofit capital campaign consultant",
    "capital campaign feasibility study",
    "capital campaign planning services",
    "capital campaign case for support",
    "capital campaign strategy consultant",
    "nonprofit fundraising consultant near me",
    "faith-based capital campaign consultant",
    "diocesan capital campaign consultant",
    "higher education capital campaign consultant",
    "hospital foundation fundraising consultant",
    "healthcare capital campaign consultant",
    "arts and culture fundraising consultant",
    "youth development fundraising consultant",
    "human services capital campaign",
    "Henderson NV nonprofit consultant",
    "Nevada capital campaign consultant",
    "New Jersey capital campaign consultant",
    "Texas nonprofit fundraising consultant",
    "case for support",
    "silent phase capital campaign",
    "campaign readiness assessment",
    "campaign steering committee",
    "national capital campaign consultant",
    "capital campaign consultant cost",
    "capital campaign consultant fees",
    "hire a fundraising consultant",
    "capital campaign consultant RFP",
    "best capital campaign consultants",
    "synagogue capital campaign",
    "Jewish federation campaign",
    "YMCA capital campaign",
    "library foundation capital campaign",
    "Scouting capital campaign",
    "performing arts center capital campaign",
  ],
  alternates: { canonical: "/services/capital-campaign" },
  openGraph: {
    title: "Capital Campaign Consulting & Counsel | Catapult Fundraising",
    description:
      "Capital campaign consulting from feasibility study to final pledge: planning, quiet-phase major gift strategy, and public-phase calling from one national firm.",
    url: "/services/capital-campaign",
    type: "website",
  },
};

const SECTIONS = [
  {
    title: "Planning: Feasibility Study & Case Development",
    description:
      "Every strong campaign starts with an honest read of the field. We interview board members, staff, and top prospects to pressure-test the goal, then help you write the case statement, build the campaign budget, and assemble the gift table.",
    bullets: [
      "Feasibility or planning study to confirm the campaign dollar goal",
      "Case statement, budget, and project prioritization",
      "Recruitment of a Campaign Chair and Steering Committee",
      "Development assessment of current staffing and systems",
    ],
  },
  {
    title: "Campaign Planning",
    description:
      "With the feasibility findings confirmed, we turn strategy into an execution-ready blueprint. Over a focused 3-6 month runway, we prioritize prospect data, finalize campaign materials, and build the committee structure the quiet phase will run on.",
    bullets: [
      "Prospect data review and prioritization",
      "Drafting and finalizing campaign materials and collateral",
      "Recruiting and training the Campaign Committee",
      "Building the detailed campaign timeline, budget, and gift table",
    ],
  },
  {
    title: "Quiet Phase: Major Gift Solicitation",
    description:
      "Over a typical 24-36 month runway, we work alongside your Campaign Chair and Steering Committee to identify and solicit major gifts from individuals, foundations, and corporations, securing the majority of the campaign goal before the public announcement.",
  },
  {
    title: "Campaign Connect: Public or Community Phase",
    description:
      "Catapult is the industry leader in this phase: the only firm that treats public-phase calling as a campaign discipline, not an afterthought. We reach your core constituencies (alumni, parents, grateful patients, members, subscribers) to raise 10-20% of the goal while dramatically expanding your donor base.",
    bullets: [
      "Experienced, client-trained Engagement Officers who bond prospects to the mission",
      "Database managers using prospect research to set personalized ask amounts",
      "Staff writers preparing solicitation emails, letters, and calling scripts",
    ],
  },
];

const FAQS = [
  {
    question: "What does a capital campaign consultant do?",
    answer:
      "A capital campaign consultant tests whether the goal is realistic, builds the plan and gift chart to reach it, recruits and trains campaign leadership, and coaches staff and volunteers through major gift solicitations. Catapult also staffs the public phase with trained Engagement Officers, so one firm is accountable from the feasibility study to the final pledge.",
  },
  {
    question: "When should a nonprofit hire a capital campaign consultant?",
    answer:
      "Ideally before a goal is announced or a building budget is locked. Bringing in counsel at the feasibility stage lets you test the goal with your top prospects while there is still time to adjust it. Catapult also joins campaigns already underway, including stalled ones, where the work starts with an honest look at the gift chart and the remaining prospect pool.",
  },
  {
    question: "How are capital campaign consultants paid?",
    answer:
      "Reputable firms, including Catapult, work on a fixed monthly retainer for a defined term or a project fee for a defined deliverable such as a study. Avoid any consultant paid a percentage of dollars raised; the Association of Fundraising Professionals Code of Ethical Standards prohibits percentage-based compensation.",
  },
  {
    question: "Does Catapult work with organizations outside Nevada?",
    answer:
      "Yes. Catapult is a national capital campaign consulting firm headquartered in Henderson, Nevada, with offices in New Jersey and Texas. We run campaigns for schools, universities, churches, hospitals, and human services organizations across the country.",
  },
  {
    question: "What is a nonprofit capital campaign?",
    answer:
      "A capital campaign is a structured, time-bound fundraising effort to raise a specific dollar goal, typically for a building project, endowment, or major program. Catapult runs campaigns through five phases: Feasibility Study, Campaign Planning, Quiet Phase, Campaign Connect (public phase), and stewardship.",
  },
  {
    question: "How long does a capital campaign quiet phase take?",
    answer:
      "The quiet phase, when major gifts are solicited from individuals, foundations, and corporations, typically runs 24-36 months before public-phase calling begins.",
  },
  {
    question: "What happens during the Campaign Planning phase?",
    answer:
      "Campaign Planning is the second phase of a Catapult capital campaign, typically lasting 3-6 months. It includes prospect data prioritization, drafting and finalizing campaign materials and collateral, and recruiting and training the Campaign Committee, among other preparation tasks, before the quiet phase begins.",
  },
  {
    question: "What is the difference between a capital campaign and an annual fund?",
    answer:
      "A capital campaign is a time-bound effort to raise a specific dollar goal for a building project, endowment, or major program, typically running several years through feasibility, quiet, and public phases. An annual fund is an ongoing yearly appeal to unrestricted operating support. Many organizations run both simultaneously, and Catapult coordinates the two so they reinforce rather than compete with each other.",
  },
  {
    question: "How much does it cost to hire a capital campaign consultant?",
    answer:
      "Capital campaign consulting fees vary based on campaign goal, timeline, and scope of services, from feasibility study alone through full quiet-phase and public-phase management. A well-run feasibility study runs $50,000-$75,000, cost varies. Catapult provides a customized proposal after an initial conversation about your organization's goals and readiness.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Capital Campaign Consulting",
      alternateName: "Capital Campaign Counsel",
      serviceType: "Nonprofit capital campaign consulting",
      url: `${SITE_URL}/services/capital-campaign`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description:
        "Capital campaign consulting from feasibility study to final pledge: planning, quiet-phase major gift strategy, and public-phase calling from one national firm.",
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Capital Campaign Consulting", item: `${SITE_URL}/services/capital-campaign` },
      ],
    },
  ],
};

export default function CapitalCampaignPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrowInHeading
        eyebrow="Capital Campaign Consulting Services"
        title="The full-service firm that carries your campaign from first feasibility call to final pledge."
        description="Catapult is the only national firm that plans your capital campaign from the earliest quiet-phase strategy through a professionally staffed public-phase calling program, wrapping every campaign in one accountable partner instead of three vendors."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/62ebe036-cc54-4a61-8952-61060ecd662c.jpeg"
      />
      <ServiceDetail
        heroImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/33f18c92-43f1-43f8-b1a2-1a94aeb188e6.png"
        heroImageAlt="Illustration of the five stages of a capital campaign, from feasibility study through public phase calling"
        sections={SECTIONS}
        sidebarTitle="What You Get"
        sidebarIcon={ClipboardList}
        sidebarItems={[
          "A single point of accountability across every campaign phase",
          "Board-ready feasibility findings and campaign plan",
          "Trained, monitored Engagement Officers for the public phase",
          "Weekly progress reporting against the gift table",
        ]}
      />

      <section className="bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Why Hire Campaign Counsel
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-[rgb(var(--navy))] sm:text-5xl">
            What a capital campaign consultant actually does for you.
          </h2>
          <p className="mt-5 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
            Most organizations run a capital campaign only once every several years. Your staff are
            experts in your mission, not in sequencing dozens of major gift asks against a gift chart
            while construction costs move underneath them. A capital campaign consultant brings
            the pattern recognition that only comes from running campaigns every year: which
            goals a donor base can carry, which prospects are ready to be asked, and what to do
            when a lead gift falls through.
          </p>
          <p className="mt-5 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
            Catapult&rsquo;s capital campaign consulting covers the work that decides whether a
            campaign succeeds. We test the goal through confidential feasibility interviews,
            write the case for support, build the gift chart from your real prospect data,
            recruit and train your Campaign Chair and Steering Committee, and coach every
            solicitation before a volunteer sits down with a donor. Then, unlike firms that stop
            at the quiet phase, we staff the public phase ourselves with trained Engagement
            Officers, so the campaign finishes with the same team that planned it.
          </p>
        </div>
      </section>

      <section className="border-y border-[rgb(var(--line))] bg-[rgb(var(--surface))] py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Typical Campaign Timeline
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-[rgb(var(--navy))] sm:text-5xl">
            How long a capital campaign takes, phase by phase.
          </h2>
          <div className="mt-8">
            <table className="block w-full border-collapse text-left text-lg sm:table">
              <thead className="hidden sm:table-header-group">
                <tr className="border-b-2 border-[rgb(var(--brass))]">
                  <th className="py-3 pr-6 font-display text-xl text-[rgb(var(--navy))]">Phase</th>
                  <th className="py-3 pr-6 font-display text-xl text-[rgb(var(--navy))]">Typical length</th>
                  <th className="py-3 font-display text-xl text-[rgb(var(--navy))]">What happens</th>
                </tr>
              </thead>
              <tbody className="block text-[rgb(var(--ink))]/75 sm:table-row-group">
                <tr className="block border-b border-[rgb(var(--line))] py-4 sm:table-row sm:py-0">
                  <td className="block pr-6 align-top font-semibold sm:table-cell sm:py-4 text-[rgb(var(--navy))]">Feasibility study</td>
                  <td className="block pr-6 align-top text-[rgb(var(--brass))] sm:table-cell sm:py-4 sm:text-inherit">About 3 months of interviews, report within 4 weeks</td>
                  <td className="block align-top sm:table-cell sm:py-4">Confidential interviews test the goal, the case, and leadership support.</td>
                </tr>
                <tr className="block border-b border-[rgb(var(--line))] py-4 sm:table-row sm:py-0">
                  <td className="block pr-6 align-top font-semibold sm:table-cell sm:py-4 text-[rgb(var(--navy))]">Campaign planning</td>
                  <td className="block pr-6 align-top text-[rgb(var(--brass))] sm:table-cell sm:py-4 sm:text-inherit">3-6 months</td>
                  <td className="block align-top sm:table-cell sm:py-4">Prospect prioritization, campaign materials, committee recruitment and training.</td>
                </tr>
                <tr className="block border-b border-[rgb(var(--line))] py-4 sm:table-row sm:py-0">
                  <td className="block pr-6 align-top font-semibold sm:table-cell sm:py-4 text-[rgb(var(--navy))]">Quiet phase</td>
                  <td className="block pr-6 align-top text-[rgb(var(--brass))] sm:table-cell sm:py-4 sm:text-inherit">24-36 months</td>
                  <td className="block align-top sm:table-cell sm:py-4">Leadership and major gifts from individuals, foundations, and corporations.</td>
                </tr>
                <tr className="block border-b border-[rgb(var(--line))] py-4 sm:table-row sm:py-0">
                  <td className="block pr-6 align-top font-semibold sm:table-cell sm:py-4 text-[rgb(var(--navy))]">Public phase (Campaign Connect)</td>
                  <td className="block pr-6 align-top text-[rgb(var(--brass))] sm:table-cell sm:py-4 sm:text-inherit">Sized to your constituency</td>
                  <td className="block align-top sm:table-cell sm:py-4">Professionally staffed calling to alumni, members, patients, and community donors, raising 10-20% of the goal.</td>
                </tr>
                <tr className="block py-4 sm:table-row sm:py-0">
                  <td className="block pr-6 align-top font-semibold sm:table-cell sm:py-4 text-[rgb(var(--navy))]">Stewardship</td>
                  <td className="block pr-6 align-top text-[rgb(var(--brass))] sm:table-cell sm:py-4 sm:text-inherit">Ongoing</td>
                  <td className="block align-top sm:table-cell sm:py-4">Pledge fulfillment, donor recognition, and moving campaign donors into annual and legacy giving.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Campaign Results
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-[rgb(var(--navy))] sm:text-5xl">
            Capital campaigns Catapult has helped finish.
          </h2>
          <ul className="mt-8 space-y-8">
            <li>
              <Link href="/insights/case-studies/capital-campaign-rmhc-south-texas" className="font-display text-2xl text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4 sm:text-[28px]">
                Ronald McDonald House Charities South Texas: $5 million to more than $25 million
              </Link>
              <p className="mt-3 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
                Catapult joined with just over $5 million committed and added major gift capacity,
                committee accountability, and solicitation coaching. The campaign passed its
                $25 million public goal, funding a new House that grows from 25 to 45 rooms.
              </p>
            </li>
            <li>
              <Link href="/insights/case-studies/salvation-army-southern-nevada-capital-campaign" className="font-display text-2xl text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4 sm:text-[28px]">
                The Salvation Army of Southern Nevada: a stalled campaign finished at $10 million
              </Link>
              <p className="mt-3 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
                Catapult ran the study that had never been done, rebuilt the gift chart as costs
                pushed the goal from $6 million to $10 million, and helped the campaign finish
                fully funded, including a $1.25 million endowment.
              </p>
            </li>
          </ul>
          <p className="mt-8 text-xl text-[rgb(var(--ink))]/70">
            <Link href="/insights/case-studies" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">
              Browse all case studies
            </Link>
          </p>
        </div>
      </section>

      <section className="border-y border-[rgb(var(--line))] bg-[rgb(var(--surface))] py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Choosing a Firm
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-[rgb(var(--navy))] sm:text-5xl">
            How to choose a capital campaign consulting firm.
          </h2>
          <p className="mt-5 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
            Proposals from campaign counsel can look alike on paper. These questions separate
            them quickly:
          </p>
          <ul className="mt-6 list-disc space-y-4 pl-6 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
            <li><strong className="text-[rgb(var(--navy))]">Who will actually attend our committee meetings?</strong> Ask for the named senior counsel, not the pitch team.</li>
            <li><strong className="text-[rgb(var(--navy))]">How many feasibility interviews are included, and who conducts them?</strong> A thin study produces a goal built on optimism.</li>
            <li><strong className="text-[rgb(var(--navy))]">How is the fee structured?</strong> Look for a retainer or project fee. Walk away from percentage or commission pricing.</li>
            <li><strong className="text-[rgb(var(--navy))]">Who runs the public phase?</strong> If the answer is &ldquo;a separate vendor,&rdquo; you are hiring two or three firms, not one.</li>
            <li><strong className="text-[rgb(var(--navy))]">How will we see progress?</strong> Expect regular written reporting against the gift chart that your board can read.</li>
            <li><strong className="text-[rgb(var(--navy))]">Can we speak with a client whose campaign you finished?</strong> References from completed campaigns tell you more than any proposal.</li>
          </ul>
          <p className="mt-5 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
            For more on fees and what they should buy, read{" "}
            <Link href="/answers/how-much-does-a-capital-campaign-consultant-cost" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">
              how much a capital campaign consultant costs
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-[rgb(var(--paper))] py-10">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="text-xl leading-relaxed text-[rgb(var(--ink))]/70">
            Starting at the beginning? The study is phase one, and it has a page of its own:{" "}
            <Link
              href="/services/feasibility-study"
              className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4"
            >
              how our feasibility study works, what it delivers, and what it costs
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            What Clients Say
          </p>
          <div className="mt-8 space-y-12">
            {testimonialsFor("capital-campaign").map((t) => (
              <TestimonialQuote key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[rgb(var(--line))] bg-[rgb(var(--surface))] py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Donor Behavior by Sector
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-[rgb(var(--navy))] sm:text-5xl">
            The phases are the same. The donors are not.
          </h2>
          <p className="mt-5 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
            Alumni, congregants, patients, and community donors behave differently in a
            capital campaign, and the differences are large enough to change the goal, the
            gift chart, and the timetable. These pages set out what Catapult has seen in
            each sector, drawn from our own feasibility studies and calling programs.
          </p>
          <ul className="mt-8 space-y-5">
            {CAMPAIGN_SECTOR_LINKS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="font-display text-2xl text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4 sm:text-[28px]"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Common Questions
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-[rgb(var(--navy))] sm:text-5xl">
            Capital campaign consulting FAQs
          </h2>
          <dl className="mt-8 space-y-8">
            {FAQS.map((f) => (
              <div key={f.question}>
                <dt className="font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
                  {f.question}
                </dt>
                <dd className="mt-3 text-xl leading-relaxed text-[rgb(var(--ink))]/70">
                  {f.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <RelatedReading
        heading="Capital campaign reading before you commit to a goal."
        service="capital-campaign"
        pillars={["Capital Campaigns", "Feasibility Studies"]}
      />

      <section className="bg-[rgb(var(--surface))] pb-6">
        <div className="mx-auto max-w-3xl px-6">
          <GiftChartCalloutCard />
          <ReadinessCalloutCard note="Before you set a goal, grade yourself. Our readiness report card scores seven areas against the campaign you are considering and names the single biggest risk to it." />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
