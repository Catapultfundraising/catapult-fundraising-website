import { PageHero } from "@/components/page-hero";
import { ServiceDetail } from "@/components/service-detail";
import { CtaBand } from "@/components/cta-band";
import { RelatedReading } from "@/components/related-reading";
import { PhoneCall } from "lucide-react";
import { testimonialsFor } from "@/lib/testimonials";
import { TestimonialQuote } from "@/components/testimonial-quote";
import { ServiceProof, ServiceFaq } from "@/components/service-proof";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Telefundraising & Phone Fundraising for Nonprofits",
  description:
    "Telefundraising done the right way: experienced callers, personalized asks and pre-call letters that renew, upgrade and win back annual fund donors.",
  keywords: [
    "telefundraising",
    "phone fundraising",
    "telefundraising company",
    "phone fundraising company for nonprofits",
    "nonprofit fundraising call center",
    "outsourced phonathon",
    "annual fund calling services",
    "AF Connect",
    "donor calling program",
    "nonprofit phonathon",
    "annual fund consultant",
    "nonprofit phonathon services",
    "telephone fundraising services",
    "public phase calling campaign",
    "nonprofit calling campaign services",
    "alumni annual giving program",
    "national annual fund calling program",
    "nationwide donor calling services",
  ],
  alternates: { canonical: "/services/telefundraising" },
};

const SECTIONS = [
  {
    title: "Telefundraising Is Not Telemarketing",
    description:
      "The phone got a bad name because a lot of programs used it badly: big lists, a script read at the donor, and a hard close. That's telemarketing. Telefundraising is a two-way conversation with someone who already cares about your mission. It thanks them, listens, and asks for a specific gift that makes sense for them. After a face-to-face visit, it's still the most effective way we know to renew, upgrade and win back donors.",
    bullets: [
      "A pre-call letter from a volunteer or leader sets up every call, so the donor hears your story first",
      "Ask amounts are set donor by donor from five years of giving history",
      "Experienced, mature callers, not students reading a script",
      "Every pledge is thanked in writing within 24 to 48 hours",
    ],
  },
  {
    title: "AF Connect: Our Annual Fund Calling Program",
    description:
      "Catapult is the only firm that takes a step back and asks: what would we do if this were a face-to-face solicitation? We apply that standard to every call, treating each prospective donor as if they were a major gift prospect, because someday, many of them will be.",
    bullets: [
      "Engagement Officers trained on-site to understand your mission and case",
      "State-of-the-art conferencing and call monitoring",
      "On-site visits to our calling center for your team's training",
    ],
  },
  {
    title: "Keys to Achieving Success",
    description:
      "Results come from preparation, not volume. Our process combines database precision with a donor-centered script and follow-through.",
    bullets: [
      "Research, cleanup, and management of donor databases",
      "Segmentation by giving history and interest group",
      "Personalized pre- and post-call letters and emails",
      "Individualized ask amounts based on five-year giving history",
      "3–15+ differentiated calling attempts to saturate the base",
      "Thank-you letters sent within 24–48 hours of contact",
      "Fulfillment services to maximize collection of pledged dollars",
    ],
  },
  {
    title: "Digital Enhancements — Included",
    description:
      "Every AF Connect program includes digital stewardship at no additional fee, layering modern touchpoints on top of the phone conversation.",
    bullets: [
      "Text message solicitation, stewardship, and thank-yous",
      "Ringless voicemail for reminders and special announcements",
      "Email solicitations and thank-you sequences",
      "Social media strategy and retargeting",
      "Crowdfunding support",
    ],
  },
];

const FAQS = [
  {
    question: "What is telefundraising?",
    answer:
      "Telefundraising is fundraising by phone with people who already have a relationship with your organization: current donors, lapsed donors, alumni, members and patients. Done well, it pairs a pre-call letter with a personal conversation and a tailored ask. It's how Catapult runs every annual fund calling program.",
  },
  {
    question: "What's the difference between telefundraising and telemarketing?",
    answer:
      "Telemarketing is about volume: a script, a long list and a quick close. Telefundraising is about the relationship. Our callers thank the donor, talk about what the gift does, answer questions, update contact information and ask for an amount based on that donor's history. The donor should hang up feeling good about your organization, whether or not they gave on that call.",
  },
  {
    question: "Do people still answer the phone?",
    answer:
      "Fewer people pick up the first time, which is why we plan multiple, differentiated attempts per donor (typically 3 to 15+) at different times of day, with text, email and voicemail around the calls. The pre-call letter matters too. A donor who knows the call is coming is far more likely to answer and give.",
  },
  {
    question: "Is it better to outsource our phonathon than to use student callers?",
    answer:
      "Student callers can be great for some institutions, but turnover is constant and every year starts over. In one example, a private college in New York was raising about $80,000 a year with an on-campus student program. In its first fall with Catapult, the program raised $277,554, and the partnership passed $523,000 over three calling programs at about 25 cents per dollar raised. We're also happy to work alongside a student program and take the segments that need a more experienced voice, such as lapsed donors, upgrades and leadership-level annual donors.",
  },
  {
    question: "What does a telefundraising program cost?",
    answer:
      "It depends on the number of donors, segments and attempts. We price programs by calling hours, and we track cost per dollar raised so you can compare the phone with every other channel you use. Programs in our case studies have run between about 15 and 26 cents per dollar raised.",
  },
  {
    question: "What is AF Connect?",
    answer:
      "AF Connect is Catapult's annual fund calling program. It combines mission-trained callers, donor segmentation, personalized ask amounts, pre- and post-call letters, and digital follow-up (text, email, ringless voicemail and social) at no additional fee.",
  },
  {
    question: "How quickly are donors thanked?",
    answer:
      "Pledge confirmations and thank-you letters go out within 24 to 48 hours of the call, and our fulfillment follow-up helps make sure pledged dollars come in.",
  },
  {
    question: "Who makes the calls?",
    answer:
      "Our own trained fundraising callers, working from our calling center in Henderson, Nevada, under full-time supervisors who monitor calls and coach in real time. We pick callers for your program who can relate to your donors, and we train them on your mission and case before the first dial.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Telefundraising & Annual Fund Calling (AF Connect)",
      serviceType: "Nonprofit telefundraising and phone fundraising program",
      url: `${SITE_URL}/services/telefundraising`,
      provider: { "@type": "ProfessionalService", name: "Catapult Fundraising", url: SITE_URL },
      areaServed: { "@type": "Country", name: "United States" },
      description:
        "High-end annual fund calling that treats every donor like a major gift prospect, with segmented outreach, personalized ask amounts, and digital stewardship included.",
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
        { "@type": "ListItem", position: 2, name: "Telefundraising", item: `${SITE_URL}/services/telefundraising` },
      ],
    },
  ],
};

export default function AnnualFundPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrowInHeading
        eyebrow="Telefundraising & Phone Fundraising"
        title="The phone still works when you use it the right way."
        description="AF Connect is our annual fund calling program. It pairs experienced callers with personal pre-call letters and asks built from each donor's own giving history, to renew, upgrade and win back the donors who matter most."
        backgroundImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/513c85b8-7588-44b1-9dcb-41e3cf4f486e.jpeg"
      />
      <ServiceDetail
        heroImage="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0144f19e-bed4-4f42-a09b-211276c3f4a1.png"
        heroImageAlt="A Catapult Engagement Officer smiling while on an annual fund calling program"
        sections={SECTIONS}
        sidebarTitle="Program Includes"
        sidebarIcon={PhoneCall}
        sidebarItems={[
          "Mission-trained, monitored Engagement Officers",
          "Database segmentation & prospect research",
          "Personalized ask amounts per donor",
          "Text, voicemail, email & social stewardship",
        ]}
      />
      <ServiceProof
        heading="What a well-run calling program raises."
        stats={[
          { value: "$2.78M", label: "Pledged in one calling program for a prestigious Northeast university, at $0.15 per dollar raised" },
          { value: "85%", label: "Pledge rate from lapsed donors (1 to 5 years) for Special Olympics Indiana" },
          { value: "+63%", label: "Increase in average gift for a long-time treatment center client ($133 to $216)" },
          { value: "247%", label: "More raised than a private college's previous student phonathon in our first fall" },
        ]}
        stories={[
          {
            title: "Special Olympics Indiana: bringing lapsed donors back",
            body: "Many of these donors hadn't been called in three to five years. With a volunteer pre-call letter and personalized asks, current donors pledged at 79%, lapsed donors at 85%, and the average gift rose 39%, from $104 to $145.",
            href: "/insights/case-studies/af-connect-special-olympics-indiana",
          },
          {
            title: "A private college in New York: from students to specialists",
            body: "The college had been raising about $80,000 a year with student callers. Our first fall program pledged $277,554 from 650 donors at a 61% pledge rate. Across three programs, the partnership raised more than $523,000 at about 25 cents per dollar.",
          },
          {
            title: "A treatment center partner of more than 20 years",
            body: "Lapsed donors renewed at 67% and non-donors gave at 47%. Donors who chose a multi-installment pledge averaged $377, almost three times the $130 one-time average. That's why we ask for installments, which also builds a habit of giving.",
          },
          {
            title: "A prestigious Northeast university, $2.78 million in one program",
            body: "We called 33,419 alumni, parents and class-project prospects and secured 4,475 pledges totaling $2,776,638. The average pledge was $620, and the cost was 15 cents per dollar raised.",
          },
        ]}
      />
      <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
            What Clients Say
          </p>
          <div className="mt-8 space-y-12">
            {testimonialsFor("annual-fund").map((t) => (
              <TestimonialQuote key={t.id} t={t} />
            ))}
          </div>
        </div>
      </section>

      <ServiceFaq heading="Telefundraising questions we hear most." faqs={FAQS} />

      <RelatedReading
        heading="Telefundraising and annual fund guidance."
        service="annual-fund"
        pillars={["Annual Fund", "Fundraising Strategy"]}
      />

      <CtaBand />
    </>
  );
}
