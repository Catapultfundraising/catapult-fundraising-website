import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { LoyaltyCalloutCard } from "@/components/tool-callout";
import { Users2 } from "lucide-react";
import { testimonialsFor } from "@/lib/testimonials";
import { TestimonialQuote } from "@/components/testimonial-quote";
import { ServiceProof, ServiceFaq } from "@/components/service-proof";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Mid-Level Donor Program & Donor Engagement",
  description:
    "A mid-level donor program that thanks, qualifies and upgrades the donors between your annual fund and major gifts, and builds your next major gift pipeline.",
  keywords: [
    "mid-level donor program",
    "donor engagement",
    "donor engagement strategies",
    "mid level donor programs",
    "mid-level giving",
    "mid-level donors",
    "mid-level giving society",
    "mid-level donor engagement",
    "donor engagement officer program",
    "major gift pipeline",
    "donor upgrade program",
    "nonprofit donor retention",
    "mid-level donor engagement program",
    "donor upgrade strategy",
    "major gift pipeline development",
    "donor cultivation consultant",
    "donor stewardship program",
    "capacity building fundraising",
    "board fundraising training",
    "major gift officer training",
    "donor segmentation strategy",
    "donor participation rate consultant",
    "moves management",
    "wealth screening",
    "donor pyramid",
    "national donor engagement consultant",
  ],
  alternates: { canonical: "/services/mid-level-donor-program" },
};

const SECTIONS = [
  {
    title: "Who Your Mid-Level Donors Are",
    description:
      "Most organizations define mid-level donors as those giving roughly $1,000 to $10,000 a year, though the right range depends on your file. They give more than the average annual fund donor, often for years, but they aren't in anyone's portfolio. They get the same appeal as a $50 donor and rarely get a personal thank-you. That's the gap. These donors already show loyalty and affinity for your mission, and many of your future major and planned gifts are sitting in this group.",
  },
  {
    title: "Built for the Donors Between Annual Fund and Major Gifts",
    description:
      "Your mid-level donors are your most under-cultivated asset, too valuable for a form letter and not yet assigned to a major gift officer. Catapult's Donor Engagement program closes that gap with an 8-stage, multi-channel methodology that simulates a face-to-face relationship at scale.",
    bullets: [
      "Donor identification using wealth screening and giving-pattern analysis",
      "Donor list review and portfolio deconfliction with your team",
      "Personalized letter of introduction from your leadership",
      "An Engagement Officer assigned like a major-gift portfolio manager",
    ],
  },
  {
    title: "The 8-Stage Engagement Journey",
    description:
      "Every donor moves through a structured, relationship-first sequence designed to increase affinity before ever asking for the next gift.",
    bullets: [
      "1. Donor identification & prioritization",
      "2. Donor list review & approval",
      "3. Letter of introduction from leadership",
      "4. Area-of-impact conversation & qualification call",
      "5. Pre-call introductory letter previewing the ask",
      "6. Gift phase: the Engagement Officer cultivates and solicits",
      "7. Fulfillment, recognition & daily reporting",
      "8. Ongoing stewardship touchpoints (thank-you calls, special-occasion calls, digital voicemail, handwritten notes)",
    ],
  },
  {
    title: "Digital Layer Included",
    description:
      "Every engagement program is reinforced with modern touchpoints that keep pace with the donor's moment, not just the calendar.",
    bullets: [
      "Instant post-call emails tailored to pledge vs. non-pledge outcomes",
      "Personalized text messaging for solicitation and stewardship",
      "Monthly pledge-fulfillment statements with direct payment links",
      "Digital voicemail outreach before and after the ask",
      "Up to 15 differentiated engagement attempts per donor, matched to local caller ID",
    ],
  },
];

const FAQS = [
  {
    question: "What is a mid-level donor program?",
    answer:
      "A mid-level donor program is a dedicated plan for donors between your annual fund and major gift levels. Instead of mass appeals, these donors get personal attention: a letter from leadership, a real conversation about what they care about, a tailored ask, and stewardship that makes them feel like insiders. Catapult runs this through an assigned Engagement Officer who manages the group like a major gift portfolio.",
  },
  {
    question: "What does good donor engagement look like for mid-level donors?",
    answer:
      "Treat them the way a major gift officer would. One engagement officer owns the relationship all year, so the donor hears the same voice every time. Before anyone asks for an upgrade, the donor gets five to seven touches: a thank-you call with no ask, a birthday call, a gift-anniversary call, a handwritten note, event invitations and an impact update. Then the ask comes, built on that donor's history.",
  },
  {
    question: "What gift range counts as mid-level?",
    answer:
      "There's no single standard. Many organizations use something like $1,000 to $10,000 a year, and smaller shops may start at $250 or $500. We set the range from your own file by looking at where giving clusters, who is already in a major gift portfolio, and who has capacity to give more than they do today.",
  },
  {
    question: "Why focus on mid-level donors?",
    answer:
      "They're often the most overlooked people in the database. They're loyal and engaged, and many of them have more capacity than their gifts suggest. Wealth ratings alone miss a lot of them. When you thank them personally and ask them to take the next step, they renew and upgrade. They also become the pipeline your major gift officers need.",
  },
  {
    question: "How does Catapult's mid-level program work?",
    answer:
      "It moves donors through 8 stages: identification and prioritization, list review with your team, a leadership introduction letter, a qualification conversation, a pre-call letter previewing the ask, the gift conversation, fulfillment and daily reporting, and ongoing stewardship touchpoints such as thank-you calls, handwritten notes and special-occasion calls.",
  },
  {
    question: "Should we start a mid-level giving society?",
    answer:
      "Often, yes. A named giving society gives mid-level donors something to join and gives you a reason to recognize them. In one faith-based program, we invited donors to join, renew or upgrade within a recognition society. Lapsed donors responded at a 32% higher rate than the organization's historical benchmark.",
  },
  {
    question: "How is this different from assigning a major gift officer?",
    answer:
      "Major gift officers manage a small portfolio of donors who are already qualified. Our program works one tier below that. It reaches hundreds of mid-level donors personally, finds out who is ready for more, and passes warm, qualified prospects to your major gift team.",
  },
  {
    question: "What does a mid-level donor program cost?",
    answer:
      "It depends on how many donors are engaged, the number of touchpoints and how long the program runs. We build a custom proposal after reviewing your donor file and goals.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Mid-Level Donor Program",
      serviceType: "Nonprofit mid-level donor program and engagement",
      url: `${SITE_URL}/services/mid-level-donor-program`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description:
        "A multi-channel Donor Engagement program that upgrades mid-level donors, deepens retention, and builds a qualified major-gift pipeline.",
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
        { "@type": "ListItem", position: 2, name: "Mid-Level Donor Program", item: `${SITE_URL}/services/mid-level-donor-program` },
      ],
    },
  ],
};

export default function DonorEngagementPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrowInHeading
        eyebrow="Mid-Level Donor Program & Donor Engagement"
        title="Your mid-level donors are your next major donors. Most of them are still getting form letters."
        description="A dedicated Engagement Officer treats every qualifying donor like a portfolio assignment, building the relationship before the ask and reporting results daily."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/f814dca4-4b83-4023-925a-9a7274bbf2d2.jpeg"
      />
      <ServiceDetail
        heroImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e7459f00-18d5-4f0b-b9ee-658a617fb8e3.png"
        heroImageAlt="Illustration of a donor upgrade funnel moving mid-level donors toward major gift status"
        sections={SECTIONS}
        sidebarTitle="Program Benefits"
        sidebarIcon={Users2}
        sidebarItems={[
          "Increased donor engagement and retention",
          "A qualified, growing major-gift pipeline",
          "Cost-effective, scalable relationship building",
          "Daily reporting through an online portal",
          "Flexible, phased engagement design",
        ]}
      />
      <ServiceProof
        heading="What happens when mid-level donors get real attention."
        stats={[
          { value: "32%", label: "Higher response rate from lapsed mid-level donors vs. the organization's benchmark" },
          { value: "57%", label: "Of donors reached qualified for additional stewardship" },
          { value: "9%", label: "Qualified for a major gift appointment" },
          { value: "3", label: "Segments: reactivate, renew and upgrade" },
        ]}
        stories={[
          {
            title: "A faith-based organization builds a major gift pipeline",
            body: "We split the file into three groups. Lapsed $500 donors were invited back, $1,000 donors were invited to renew, and donors under $2,500 with more capacity were invited to upgrade. Each donor got a letter or email, then a thank-you call and a personal invitation into a recognition society. Lapsed donors responded 32% above benchmark, and 9% of those reached were ready for a major gift conversation.",
            href: "/insights/case-studies/mid-level-donor-engagement-faith-based-organization",
          },
          {
            title: "Why it works",
            body: "Mid-level donors have already shown loyalty and affinity. What most of them haven't had is a personal conversation. A letter from leadership, a call that starts with thank you, and an ask matched to their history usually tell you more about a donor in ten minutes than a wealth screen will.",
          },
        ]}
      />
      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            What Clients Say
          </p>
          <div className="mt-8 space-y-12">
            {testimonialsFor("donor-engagement").map((t) => (
              <TestimonialQuote key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 lg:px-10">
        <LoyaltyCalloutCard note="Not sure whether to start with mid-level engagement or a legacy program? Our free report card grades both tracks from sixteen questions and tells you which one your file is pointing at." />
      </section>

      <ServiceFaq heading="Mid-level donor program questions." faqs={FAQS} />

      <RelatedReading
        heading="Mid-level donor program guidance."
        service="donor-engagement"
        pillars={["Donor Acquisition & Retention", "Major Gifts"]}
        answerSlugs={[
          "what-is-a-mid-level-donor-program",
          "major-gift-officer-vs-donor-engagement-program",
          "how-can-nonprofits-increase-average-gift-size",
          "how-do-you-increase-donor-retention",
          "how-do-you-find-major-donors",
          "how-do-you-build-a-major-gifts-program",
        ]}
      />

      <CtaBand />
    </>
  );
}
