const FAQS = [
  {
    question: "What does a capital campaign consultant do?",
    answer:
      "A capital campaign consultant guides a nonprofit through every stage of a major fundraising effort: running a feasibility study to test the goal, developing the case for support, planning the campaign timeline and gift table, leading quiet-phase major gift solicitation, and managing public-phase calling to engage the broader donor base. Catapult Fundraising is a capital campaign consulting firm that stays with a client through all five phases, rather than handing off between separate vendors.",
  },
  {
    question: "What is a capital campaign feasibility study?",
    answer:
      "A feasibility study interviews an organization's leadership and top prospects to stress-test a proposed campaign goal before a single dollar is asked. It results in a realistic case statement, budget, and gift table, giving a board confidence in the goal before launching quiet-phase solicitation.",
  },
  {
    question: "What is annual fund calling, and how does it work?",
    answer:
      "Annual fund calling is a structured, multi-channel outreach program, phone, text, and email, that treats every prospect like a major donor-in-waiting. Catapult's Engagement Officers deliver segmented outreach and personalized asks, typically raising 10 to 20 percent of a capital campaign goal during the public phase while also expanding an organization's overall donor base.",
  },
  {
    question: "What is mid-level donor engagement?",
    answer:
      "Mid-level donor engagement is an 8-stage, relationship-first program that sits between annual fund and major gifts. It focuses on donors already giving above entry-level amounts, upgrading their giving over time and building a qualified pipeline of future major gift prospects, supported by digital stewardship touchpoints.",
  },
  {
    question: "What is planned giving, and what is a Legacy Call program?",
    answer:
      "Planned giving (also called legacy giving) identifies bequests, beneficiary designations, and other deferred gifts from an organization's most loyal, longest-tenured donors, a segment most capital campaigns never fully engage. Catapult's Legacy Call program proactively reaches out to this donor segment to surface planned gifts that would otherwise go unrequested.",
  },
  {
    question: "Which nonprofit sectors does Catapult Fundraising serve?",
    answer:
      "Catapult works with faith-based organizations (including diocesan and parish campaigns), higher education institutions, healthcare and hospital foundations, arts and culture organizations, human services nonprofits, and youth development organizations such as Scouting and mentorship programs.",
  },
  {
    question: "Where is Catapult Fundraising located, and what areas do you serve?",
    answer:
      "Catapult Fundraising is headquartered in Henderson, Nevada, with additional offices in New Jersey and Texas. The firm serves nonprofit clients nationwide across capital campaigns, annual fund calling, donor engagement, and legacy giving programs.",
  },
  {
    question: "How is Catapult different from other fundraising consulting firms?",
    answer:
      "Most firms either plan campaigns or execute calling programs, rarely both. Catapult is a full-service partner that stays with a client from the feasibility study through public-phase calling and ongoing donor engagement, so there is one accountable team instead of coordinating three separate vendors.",
  },
  {
    question: "How long does a typical capital campaign take?",
    answer:
      "After an initial feasibility study and a focused 3 to 6 month campaign planning period, the quiet phase of major gift solicitation typically runs 24 to 36 months, followed by public-phase calling and ongoing stewardship to retain new donors for future asks.",
  },
  {
    question: "Does Catapult offer board fundraising training?",
    answer:
      "Yes. As part of campaign planning, Catapult recruits and trains the Campaign Committee and works directly with boards on philanthropy and the ask, helping board members become confident, effective solicitors during the quiet phase of a capital campaign.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export function FaqSection() {
  return (
    <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
          Common Questions
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-5xl tracking-tight text-[rgb(var(--navy))] sm:text-6xl">
          Fundraising consulting, explained.
        </h2>

        <div className="mt-12 space-y-8">
          {FAQS.map((faq) => (
            <div key={faq.question} className="border-b border-[rgb(var(--line))] pb-8 last:border-b-0">
              <h3 className="font-display text-2xl text-[rgb(var(--navy))]">{faq.question}</h3>
              <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
