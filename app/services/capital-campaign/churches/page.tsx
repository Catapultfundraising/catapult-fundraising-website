import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { Users } from "lucide-react";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  "title": "Capital Campaigns for Churches and Faith Communities",
  "description": "How church donors behave in a capital campaign: the highest interview response rates of any sector, identity-driven giving, and why the goal usually needs money from outside the pews.",
  "keywords": [
    "church capital campaign",
    "church capital campaign consultant",
    "church feasibility study",
    "church capital campaign feasibility study",
    "parish capital campaign",
    "faith based capital campaign consultant",
    "diocesan capital campaign consultant",
    "congregation building campaign",
    "church building fund campaign",
    "ministry capital campaign",
    "synagogue capital campaign",
    "church fundraising consultant",
    "religious organization capital campaign",
    "church stewardship campaign"
  ],
  "alternates": {
    "canonical": "/services/capital-campaign/churches"
  }
};

const SECTIONS = [
  {
    "title": "Churches Often Get Remarkably Strong Interview Participation",
    "description": "In a recent Catapult feasibility study for a church planning a community facility, 288 people were invited to interview and 79 completed one against a target of 60. Only 18 declined. For comparison, a healthcare study Catapult ran in the same period invited 284 people and completed 65, with the same number of declines and far more difficulty reaching people at all. Congregational relationships are already warm, the database is usually accurate because people show up every week, and being asked for an opinion by the church reads as inclusion rather than intrusion.",
    "bullets": [
      "Expect to exceed your interview target rather than scramble to hit it",
      "Church databases tend to be unusually clean, because attendance keeps records current",
      "Wide participation in the study is itself campaign cultivation: everyone invited feels consulted",
      "Invite more people than you plan to interview, because the willingness is there"
    ]
  },
  {
    "title": "Strong Support for the Mission Does Not Always Mean the Goal Is Realistic",
    "description": "In that same study, 100 percent of interviewees were positive about the project and 92 percent said they would consider giving. Those numbers look extraordinary until you read the next finding: most of the same interviewees called the $12 million goal aggressive. Faith communities say yes to the mission almost automatically. The study's real job is to separate agreement from ability, which is why the interview has to ask about the dollar figure directly and not settle for support in principle.",
    "bullets": [
      "Near-total support for the project is normal in a church study and should not be read as goal validation",
      "Ask the goal question explicitly and record the hedges, not just the yes",
      "Model two or three goal scenarios so leadership can choose with the data in front of them",
      "A congregation that loves the project can still be unable to fund it alone"
    ]
  },
  {
    "title": "A Larger Goal Usually Requires Support Beyond the Congregation",
    "description": "Congregational giving is broad and shallow: many people, mostly modest gifts, high loyalty, high fulfillment. A capital goal of any real size needs a top tier that the membership roll cannot supply. In the study above, the naming lead gift for the facility was estimated at $3 to $5 million against a $12 million goal, and the top ten gifts were projected to carry roughly 71 percent of the total. Interviewees repeatedly named the same challenge: building relationships with wealthy donors who are not members.",
    "bullets": [
      "Plan for a lead gift in the range of 20 to 40 percent of goal, sourced from outside the congregation as often as inside it",
      "Community-serving facilities open the door to civic, foundation, and government money that a sanctuary project does not",
      "In one study, interviewees pushed hard for at least $1 million in state and county support",
      "Relationship building with non-member donors is the long pole in the schedule, so start it during the study"
    ]
  },
  {
    "title": "Churches Often Have More Willing Volunteers Than They Need",
    "description": "In the church study, 37 interviewees said yes to serving on the campaign committee and 17 more said maybe, against a target of 10 to 12 members. In a healthcare study run in the same window, only 25 percent said yes. Faith communities have a built-in culture of service, and campaign volunteering fits inside it naturally. Faith communities routinely produce more willing committee volunteers than there are seats to fill, which shifts the real work from recruiting to selecting well.",
    "bullets": [
      "You will likely have more volunteers than seats, so choose for capacity and network rather than availability",
      "Co-chair criteria that hold up: community name recognition, ability to make a top-ten gift, and their own donor network",
      "A large willing pool is also a solicitor pool for the community phase"
    ]
  },
  {
    "title": "Leadership Can Make or Break a Faith-Based Campaign",
    "description": "In every faith-based study Catapult has run, donor confidence tracks the senior clergy leader more tightly than it tracks the project. That cuts both ways. A trusted pastor can carry an aggressive goal. A pending transition, or unresolved history with a previous leader, will surface in confidential interviews and has to be addressed in the case for support rather than hoped past.",
    "bullets": [
      "Confirm leadership stability before locking a multi-year campaign timetable",
      "Interviewees will raise leadership concerns with a third party that they would never raise in the building",
      "If the pastor is central to the case, say so openly rather than pretending the campaign is leader-neutral"
    ]
  },
  {
    "title": "Church Donors May Redirect Their Giving When the Community Has a Crisis",
    "description": "One Catapult church campaign was paused outright when a hurricane hit the community. That responsiveness is a feature of the sector, not a flaw, but it is a planning reality: the same donors who fund your building will drop everything for a disaster, a family in need, or a mission emergency, and the campaign calendar has to have slack in it. Related, faith-affiliated organizations are frequently assumed by outside funders to be more religiously restricted than they are, which quietly costs them grants.",
    "bullets": [
      "Build schedule slack into a faith-based campaign timetable rather than a tight linear plan",
      "Keep pledge periods flexible, since congregational givers respond to circumstance",
      "State plainly which services are open to everyone, because outside funders will assume otherwise",
      "Do not open a broad appeal for an urgent need in the middle of quiet-phase major gift work: it burns the same donors twice"
    ]
  },
  {
    "title": "Loyalty Is Strong, but Upgrading Donors Takes Work",
    "description": "Faith giving is habitual and identity-driven. People give because of who they are and where they belong, not because a case statement persuaded them. That makes retention excellent and pledge fulfillment strong, and it makes upgrades genuinely difficult, because the giving level is tied to a self-image rather than to a budget. Moving a faithful weekly giver to a five-figure campaign commitment is a different conversation than moving a lapsed alumnus, and it takes a personal ask from a peer.",
    "bullets": [
      "Expect high pledge fulfillment: faith donors keep commitments at rates other sectors envy",
      "Three-year pledge periods are the workable standard for congregational givers",
      "Upgrades require peer solicitation, not mail",
      "Do not assume weekly giving predicts campaign capacity in either direction"
    ]
  }
];

const FAQS = [
  {
    "question": "How do church donors behave differently in a capital campaign?",
    "answer": "Church donors give out of identity, obligation, and belonging rather than in response to a case for support, which makes them extraordinarily loyal and reliable but difficult to upgrade. They also participate in feasibility studies at higher rates than any other sector, volunteer for campaign committees more readily, and redirect their giving quickly when a crisis hits the community."
  },
  {
    "question": "Can a congregation fund a capital campaign on its own?",
    "answer": "Sometimes, but usually not at the goal level leadership has in mind. Congregational giving is broad and shallow, and a capital goal of real size needs a small number of very large gifts. In one recent Catapult study, the top ten gifts were projected to carry roughly 71 percent of a $12 million goal, with the naming lead gift estimated at $3 to $5 million. Much of that money comes from outside the membership roll."
  },
  {
    "question": "Do churches get better feasibility study interview response rates?",
    "answer": "Yes, consistently. In a recent Catapult church study, 288 people were invited and 79 interviews were completed against a target of 60. Congregational databases are usually current because members attend regularly, relationships are already warm, and being asked for an opinion reads as inclusion rather than solicitation."
  },
  {
    "question": "Can a church campaign raise government or foundation money?",
    "answer": "Often yes, when the project serves the wider community rather than the congregation alone. Community centers, food programs, counseling space, and shelter facilities can qualify for civic and government support. In one Catapult study, interviewees pressed for at least $1 million in state and county funding. Faith-affiliated organizations should also state plainly which of their services are open to everyone, because outside funders routinely assume more religious restriction than actually exists."
  },
  {
    "question": "How much does a church feasibility study cost?",
    "answer": "Cost depends mainly on three things: how many people need to be interviewed, how much travel that requires, and how many regions the study has to cover. A well-run feasibility study typically falls between $50,000 and $75,000, and pricing improves when it is bundled with campaign planning and the quiet phase rather than purchased on its own."
  }
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Capital Campaign Donor Behavior: Churches and Faith Communities",
      serviceType: "Nonprofit capital campaign counsel",
      url: `${SITE_URL}/services/capital-campaign/churches`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description: "How church donors behave in a capital campaign: the highest interview response rates of any sector, identity-driven giving, and why the goal usually needs money from outside the pews.",
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
          name: "Churches & Faith Communities",
          item: `${SITE_URL}/services/capital-campaign/churches`,
        },
      ],
    },
  ],
};

export default function ChurchDonorBehaviorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Capital Campaigns by Sector"
        title="Churches and faith communities."
        description="Church donors tend to be unusually willing to participate in a feasibility study. That matters because the more people you hear from, the better picture you get of what the congregation really thinks about the project and the goal."
      />
      <ServiceDetail
        heroImage="/blog/why-a-feasibility-study-matters/donor-conversation.jpg"
        heroImageAlt="Church leadership meeting to plan a capital campaign"
        sections={SECTIONS}
        sidebarTitle="What Changes in This Sector"
        sidebarIcon={Users}
        sidebarItems={[
  "Churches Often Get Remarkably Strong Interview Participation",
  "Strong Support for the Mission Does Not Always Mean the Goal Is Realistic",
  "A Larger Goal Usually Requires Support Beyond the Congregation",
  "Churches Often Have More Willing Volunteers Than They Need",
  "Leadership Can Make or Break a Faith-Based Campaign",
  "Church Donors May Redirect Their Giving When the Community Has a Crisis",
  "Loyalty Is Strong, but Upgrading Donors Takes Work"
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
            Faith communities are one of four sectors where Catapult runs campaigns with materially different playbooks.{" "}
            See also{" "}<Link href="/services/capital-campaign/education" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Schools and Universities</Link>,{" "}<Link href="/services/capital-campaign/social-service" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Social Service Organizations</Link>, and{" "}<Link href="/services/capital-campaign/healthcare" className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] decoration-2 underline-offset-4">Healthcare Organizations</Link>.
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
