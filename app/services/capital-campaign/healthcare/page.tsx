import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { Users } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  "title": "Capital Campaigns for Healthcare Organizations",
  "description": "How healthcare donors behave in a capital campaign: agreement on need does not mean confidence in the goal, awareness gaps among high-capacity donors, and where hospital money actually comes from.",
  "keywords": [
    "healthcare capital campaign consultant",
    "hospital capital campaign",
    "hospital foundation fundraising consultant",
    "healthcare foundation capital campaign",
    "community health center capital campaign",
    "clinic capital campaign",
    "hospital feasibility study",
    "healthcare feasibility study",
    "grateful patient program",
    "medical center capital campaign",
    "rural hospital fundraising",
    "health system philanthropy consultant",
    "hospital campaign feasibility study",
    "FQHC fundraising"
  ],
  "alternates": {
    "canonical": "/services/capital-campaign/healthcare"
  }
};

const SECTIONS = [
  {
    "title": "Donors Can Agree on the Need and Still Question the Goal",
    "description": "In a recent Catapult feasibility study for a rural community health organization, 95 percent of interviewees agreed the clinic needed to be replaced. Only 47 percent said the $10 million could be raised, with another 27 percent saying maybe and 30 percent saying they did not know. Nobody disputed the need. Many doubted the capacity. If a campaign is built on the 95 percent number and ignores the 47 percent number, it announces a goal it cannot hold, which is precisely the failure a study exists to prevent.",
    "bullets": [
      "Ask about the need and the dollar figure as two separate questions, and report both",
      "A large gap between the two is a signal to phase the goal, not to abandon it",
      "Model the campaign at multiple goal levels so the board can choose with real data",
      "Where donors doubt the number, they are usually doubting the donor pool, not the project"
    ]
  },
  {
    "title": "Your Patients May Not Be Your Major-Donor Base",
    "description": "Grateful patient fundraising is the engine of hospital philanthropy, but it only works where the patients have capacity. In safety-net, rural, and community health settings the picture inverts. In the study above, interviewees pointed out directly that the patients served would not be capable of major gifts, which means the money has to come from wealthy people who will never personally use the service. Several interviewees said the messaging to those donors has to focus on the workers being served: the people staffing the resorts, restaurants, and local businesses that those donors themselves rely on.",
    "bullets": [
      "Identify early whether your patient population is a donor population or not, because the answer changes everything downstream",
      "Where it is not, the case has to connect the served population to the donor's own community and economy",
      "Plan a community phase for smaller gifts from the served population, sized honestly",
      "Grateful patient programs still belong in the plan, but as a pipeline for later campaigns"
    ]
  },
  {
    "title": "A Strong Reputation Does Not Always Mean Strong Donor Awareness",
    "description": "Healthcare organizations frequently have an excellent reputation with the people who use them and almost no profile with the people who could fund them. In the same study, 89 percent of respondents rated the organization's reputation positively, and actual patients were the most enthusiastic group of all. At the same time, 18 people declined to interview, an unusually high number, and the reason was consistently unfamiliarity: they were part-time residents or lived outside the service area and simply did not know the organization.",
    "bullets": [
      "High decline rates in a healthcare study usually mean an awareness problem, not a hostility problem",
      "Fix awareness with marketing before the quiet phase, not during it",
      "Early lead donors with recognizable names give other wealthy donors permission to follow",
      "Part-time and seasonal residents are a real prospect pool in resort and rural markets, and they need a separate approach"
    ]
  },
  {
    "title": "Leadership History Matters",
    "description": "Healthcare organizations turn over executives more often than most nonprofits, and donors remember. In the study above, a former chief executive with a poor community reputation came up repeatedly as a potential obstacle to the campaign, alongside strong praise for the current interim leadership as a stabilizing influence. Both findings mattered. The reassuring one was that prospective major donors unfamiliar with the organization were unlikely to have heard the old story at all.",
    "bullets": [
      "Surface leadership history in confidential interviews rather than waiting for it to surface in a solicitation",
      "Current clinical leadership is often the strongest credibility asset available, so put those names in the case summary",
      "Distinguish between donors who carry the history and donors who have never heard it, and message differently"
    ]
  },
  {
    "title": "Your Campaign Does Not Operate in a Vacuum",
    "description": "Healthcare campaigns rarely run in an empty market. In the same study, interviewees flagged a nearby hospital preparing a campaign estimated at $200 million, alongside recently completed campaigns at two local schools and an active campaign at a local parish. Most interviewees concluded the hospital campaign would not directly compete, because much of that money would come from government grants rather than philanthropy, but that judgment is exactly the kind of thing you want in a report rather than in a rumor.",
    "bullets": [
      "Map competing campaigns in your market during the study and ask interviewees about them by name",
      "Government-funded projects compete for attention but not for the same dollars",
      "In healthcare the mix of grant funding and philanthropy changes how donors judge whether your goal is reasonable",
      "Say plainly which portion of the project is expected from public sources"
    ]
  },
  {
    "title": "Corporate Healthcare Giving Is Increasingly About Partnership",
    "description": "Corporate funders in healthcare have shifted away from siloed sponsorship toward strategic community partnerships tied to measurable outcomes, often framed around social determinants of health: food security, housing, and behavioral health. The useful shorthand from that work is that health does not start in the hospital. Organizations that can show outcome data against those categories are raising corporate money that organizations pitching a building are not.",
    "bullets": [
      "Frame the ask around measurable community health outcomes, not facility square footage",
      "Corporate partners want co-branding, visible impact, and a reporting cadence",
      "Foundations frequently require a percentage of goal committed before considering a request, so sequence accordingly",
      "Naming and legacy opportunities remain the primary upgrade path for individual healthcare donors"
    ]
  },
  {
    "title": "Healthcare Donors May Be More Willing to Give Than Volunteer",
    "description": "Healthcare studies show a consistent split. In the study above, 72 percent said they would consider giving and another 17 percent said they might, for a combined 89 percent positive, which is a genuinely strong result. Only 25 percent said they would like to serve on the campaign committee, with 28 percent saying it would depend on timing and workload. Those who declined mostly cited being too busy or disliking fundraising. Compared with faith-based campaigns, where volunteers outnumber seats, healthcare campaigns have to recruit leadership deliberately and make the time commitment explicit.",
    "bullets": [
      "Expect to work harder for campaign committee members than for gifts",
      "Define the volunteer role in hours and duration up front, because vagueness is what people decline",
      "A combined yes and maybe above 50 percent on committee service is a healthy indicator, not a weak one",
      "Nobody announces a major gift during a feasibility study interview, and that is normal rather than discouraging"
    ]
  }
];

const FAQS = [
  {
    "question": "How do healthcare donors behave differently in a capital campaign?",
    "answer": "Healthcare donors separate the question of need from the question of capacity more sharply than donors in other sectors. In a recent Catapult study, 95 percent agreed the facility needed replacing while only 47 percent believed the goal could be raised. They also tend to be generous with gifts and reluctant about volunteer leadership, which is the reverse of what faith-based campaigns experience."
  },
  {
    "question": "Can a community health center or safety-net provider run a capital campaign?",
    "answer": "Yes, but not on grateful patient giving alone. Where the patient population lacks major gift capacity, the campaign has to be funded by wealthy people who will never use the service, and the case for support has to connect the served population to those donors' own community and economy. That work takes longer than a traditional hospital campaign and should be started during the feasibility study."
  },
  {
    "question": "Why did so many people decline our feasibility study interviews?",
    "answer": "In healthcare, high decline rates almost always signal unfamiliarity rather than hostility. In one Catapult study, 18 of 284 invitees declined, and the consistent reason was that they were part-time residents or lived outside the service area and did not know the organization. That is an awareness problem to solve with marketing before the quiet phase, not a verdict on the campaign."
  },
  {
    "question": "How do we raise money from donors who will never be our patients?",
    "answer": "Connect the population you serve to the donor's own interests and community. In one study, interviewees advised framing the case around the workers being served, the people staffing local businesses, restaurants, and resorts that those donors depend on. On the corporate side, funders have moved toward strategic partnerships tied to measurable community health outcomes such as food security, housing, and behavioral health."
  },
  {
    "question": "How much does a hospital or healthcare feasibility study cost?",
    "answer": "Expect the price to move with the number of interviews, travel requirements, and how many regions or facilities are in scope. A well-run study typically runs $50,000 to $75,000, and bundling it with campaign planning and the quiet phase brings the per-phase cost down."
  }
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Capital Campaign Donor Behavior: Healthcare Organizations",
      serviceType: "Nonprofit capital campaign counsel",
      url: `${SITE_URL}/services/capital-campaign/healthcare`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description: "How healthcare donors behave in a capital campaign: agreement on need does not mean confidence in the goal, awareness gaps among high-capacity donors, and where hospital money actually comes from.",
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
        {
          "@type": "ListItem",
          position: 2,
          name: "Capital Campaign Counsel",
          item: `${SITE_URL}/services/capital-campaign`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Healthcare Organizations",
          item: `${SITE_URL}/services/capital-campaign/healthcare`,
        },
      ],
    },
  ],
};

export default function HealthcareDonorBehaviorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Capital Campaigns by Sector"
        title="Healthcare organizations."
        description="Healthcare donors can agree completely that a project is needed and still question whether the campaign can raise the proposed amount. That distinction is important. In a feasibility study, we want to know both what donors think about the need and what they honestly believe can be raised."
      />
      <ServiceDetail
        heroImage="/blog/why-a-feasibility-study-matters/hero-board-meeting.jpg"
        heroImageAlt="Healthcare foundation board reviewing capital campaign feasibility findings"
        sections={SECTIONS}
        sidebarTitle="What Changes in This Sector"
        sidebarIcon={Users}
        sidebarItems={[
  "Donors Can Agree on the Need and Still Question the Goal",
  "Your Patients May Not Be Your Major-Donor Base",
  "A Strong Reputation Does Not Always Mean Strong Donor Awareness",
  "Leadership History Matters",
  "Your Campaign Does Not Operate in a Vacuum",
  "Corporate Healthcare Giving Is Increasingly About Partnership",
  "Healthcare Donors May Be More Willing to Give Than Volunteer"
]}
      />

      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            Common Questions
          </p>
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
          <p className="mt-10 text-xl text-[rgb(var(--ink))]/70">
            Healthcare is one of four sectors where Catapult runs campaigns with materially different playbooks.{" "}
            See also{" "}<Link href="/services/capital-campaign/education" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Schools and Universities</Link>,{" "}<Link href="/services/capital-campaign/churches" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Churches & Faith Communities</Link>, and{" "}<Link href="/services/capital-campaign/social-service" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Social Service Organizations</Link>.
            {" "}The phases themselves are the same everywhere: see{" "}
            <Link
              href="/services/capital-campaign"
              className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4"
            >
              Capital Campaign Counsel
            </Link>{" "}
            and{" "}
            <Link
              href="/services/feasibility-study"
              className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4"
            >
              Feasibility Studies
            </Link>
            .
          </p>
          <p className="mt-6 text-lg text-[rgb(var(--ink))]/60">
            Figures on this page come from Catapult feasibility studies and calling programs.
            Client organizations are described by type rather than by name to protect
            confidentiality.
          </p>
        </div>
      </section>

      <RelatedReading
        heading="Related reading."
        postSlugs={[
          "why-a-feasibility-study-matters-before-a-capital-campaign",
          "planning-a-capital-campaign-gift-chart-quiet-phase",
          "how-much-does-a-capital-campaign-cost",
        ]}
        pillars={["Capital Campaigns", "Feasibility Studies"]}
      />

      <CtaBand />
    </>
  );
}
