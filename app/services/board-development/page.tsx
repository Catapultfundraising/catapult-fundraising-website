import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { Landmark } from "lucide-react";
import { testimonialsFor } from "@/lib/testimonials";
import { TestimonialQuote } from "@/components/testimonial-quote";

const SITE_URL = "https://www.catapultfr.com";

const DESCRIPTION =
  "Nonprofit board development consulting: board assessment, research-led recruitment, give/get policy, orientation, and solicitation training that turn your board into a fundraising board.";

export const metadata = {
  title: { absolute: "Nonprofit Board Development Consulting | Catapult" },
  description: DESCRIPTION,
  keywords: [
    "nonprofit board development",
    "board development consultant",
    "nonprofit board recruitment",
    "board give get policy",
    "fundraising board",
    "board member expectations",
    "board orientation program",
    "board solicitation training",
    "board prospect research",
    "advisory board development",
    "foundation board recruitment",
  ],
  alternates: { canonical: "/services/board-development" },
  openGraph: {
    title: "Nonprofit Board Development Consulting | Catapult Fundraising",
    description: DESCRIPTION,
    url: `${SITE_URL}/services/board-development`,
    images: [{ url: "/services/board-development/hero-board-meeting.jpg", width: 2000, height: 1125 }],
  },
};

const SECTIONS = [
  {
    title: "From Governing Board to Fundraising Board",
    description:
      "Most boards are built to oversee. Catapult helps yours raise money too. Every engagement starts with an honest look at your roster, bylaws, board giving, and the skills your board is missing, then a written plan for who you need, how many, and by when.",
    bullets: [
      "Bylaws, terms of service, committee, and conflict of interest review",
      "Board giving analysis and a written give/get policy",
      "Committee structure tied to your fundraising priorities",
      "A three-year recruitment plan with seats, skills, and timeline",
    ],
  },
  {
    title: "The Board Development Journey",
    description:
      "Five connected steps take your board from first assessment to members who give, open doors, and make the ask.",
    bullets: [
      "1. Assess: review bylaws, roster, board giving, terms, and skills gaps",
      "2. Define: write responsibilities, expectations, give/get policy, and committee structure",
      "3. Recruit: identify and profile prospects, invite with a case summary, and interview",
      "4. Orient: welcome new members with an orientation program and board binder",
      "5. Activate: solicitation training, give/get tracking, scorecards, and an annual retreat",
    ],
  },
  {
    title: "Research-Led Recruitment",
    description:
      "We fill the plan deliberately, not to fill seats. Every prospect is profiled for giving capacity, interest, and fit before an invitation goes out, and Catapult leadership meets candidates alongside your CEO or board chair.",
    bullets: [
      "Confidential research profiles drawn from 30+ sources, included at no additional cost",
      "Invitation letter and case summary for each prospect",
      "Interviews with Catapult leadership and your CEO or chair",
      "Committee service first, then a board vote",
    ],
  },
  {
    title: "Clear Expectations and Training That Makes the Ask Easier",
    description:
      "New and current members sign one responsibilities and expectations agreement, so giving, attendance, and committee work are clear from the start. Then we prepare them to cultivate and solicit alongside your staff.",
    bullets: [
      "100% board giving secured before the first outside ask",
      "Annual scorecard review between each member and the chair",
      "Making the Ask training for the full board",
      "A short ask tip at every board meeting to keep skills sharp",
    ],
  },
];

const FAQS = [
  {
    question: "What is nonprofit board development?",
    answer:
      "Board development is the work of building a board that governs well and raises money: assessing the current board, defining roles and a give/get policy, recruiting new members with the right capacity and networks, orienting them, and training them to cultivate and ask for gifts.",
  },
  {
    question: "What is a give/get policy?",
    answer:
      "A give/get policy sets an annual expectation that each board member either makes a personal gift or raises an amount from others. Catapult helps set a level that fits your organization, puts it in writing, and tracks it with an annual scorecard.",
  },
  {
    question: "How does Catapult find new board members?",
    answer:
      "We start with a three-year recruitment plan, then identify prospects from your donors, volunteers, and community networks. Each prospect gets a confidential research profile covering giving capacity, interests, and fit before any invitation, followed by interviews with Catapult leadership and your CEO or chair.",
  },
  {
    question: "Do you work with foundation and advisory boards?",
    answer:
      "Yes. Catapult has built a new foundation board from scratch and rebuilt advisory boards around give/get commitments and working committees. The same process applies to governing, foundation, and advisory boards.",
  },
  {
    question: "How long does a board development engagement take?",
    answer:
      "A typical first engagement runs about 18 months to put the three-year recruitment plan in motion, with bi-weekly team meetings throughout. Board development often runs alongside a campaign or major gifts effort so new members are ready when the asks begin.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Nonprofit Board Development",
      serviceType: "Nonprofit board development consulting",
      url: `${SITE_URL}/services/board-development`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description: DESCRIPTION,
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
        { "@type": "ListItem", position: 2, name: "Board Development", item: `${SITE_URL}/services/board-development` },
      ],
    },
  ],
};

export default function BoardDevelopmentPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrowInHeading
        eyebrow="Nonprofit Board Development"
        title="Turn a board that meets into a board that raises."
        description="Catapult recruits, equips, and holds your board accountable, so every member gives, opens doors, and is ready to make the ask."
        backgroundImage="/services/board-development/hero-board-meeting.jpg"
      />
      <ServiceDetail
        heroImage="/services/board-development/board-presentation.jpg"
        heroImageAlt="A nonprofit leader presenting to board members around a conference table"
        sections={SECTIONS}
        sidebarTitle="Program Benefits"
        sidebarIcon={Landmark}
        sidebarItems={[
          "Bylaws and policy review",
          "Signed responsibilities and a written give/get policy",
          "Prospect research included at no additional cost",
          "Recruitment kit and case summary",
          "Orientation program and board binder",
          "Making the Ask solicitation training",
        ]}
      />
      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            What Clients Say
          </p>
          <div className="mt-8 space-y-12">
            {testimonialsFor("board-development").map((t) => (
              <TestimonialQuote key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Common Questions
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-[rgb(var(--navy))] sm:text-5xl">
            Board development FAQs
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
        heading="Board and fundraising strategy guidance."
        pillars={["Fundraising Strategy", "Capital Campaigns"]}
        answerLimit={4}
      />

      <CtaBand />
    </>
  );
}
