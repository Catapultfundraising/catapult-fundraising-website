// Shared testimonial data, used by:
// - components/testimonial-strip.tsx (the "What Clients Say" grid, homepage) -- keeps its own
//   original curated set independently, unaffected by this file.
// - components/scrolling-quote-banner.tsx (the scrolling banner under "What Clients Say")
// - the relevant app/services/*/page.tsx "What Clients Say" sections, so each client's own
//   words appear on the service page that quote is actually about.
//
// `excerpt` is a genuine verbatim (or lightly ellipsis-joined verbatim) pull from the full
// quote, used only where space is tight (the scrolling banner). It is never paraphrased or
// invented -- every word in it appears in `quote` below.

export interface Testimonial {
  id: string;
  quote: string[]; // paragraphs, in order
  excerpt: string;
  name: string;
  org: string;
  /** Which services/pages this testimonial is most relevant to. */
  services: ("capital-campaign" | "legacy-giving" | "donor-engagement" | "annual-fund")[];
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "bill-labore",
    quote: [
      "Loma Linda University Health has partnered with Catapult Fundraising for several years, and the results have consistently exceeded our expectations. Catapult has generated qualified leads that have developed into meaningful planned gifts, delivering a strong return on our investment. Maria Healy has been exceptional to work with, responsive, attentive, and highly professional. She communicates with our team regularly and ensures that every detail is carefully managed and implemented.",
      "Our partnership has now expanded to include the scheduling of Zoom and face-to-face donor appointments, helping us deepen relationships with prospective donors and advance more meaningful conversations. I highly recommend Catapult Fundraising for its professionalism, service, and proven results.",
    ],
    excerpt:
      "Catapult has generated qualified leads that have developed into meaningful planned gifts, delivering a strong return on our investment.",
    name: "Bill LaBore",
    org: "Director of Planned Giving, Loma Linda University Health | Philanthropy",
    services: ["legacy-giving"],
  },
  {
    id: "matthew-talley",
    quote: [
      "Catapult Fundraising has been a fantastic partner in relaunching and growing UMGC's Annual Giving telemarketing program. Since restarting the program in FY24, their team's personalized approach has helped us steadily strengthen our annual fund by increasing both our average gift and pledge rate year over year.",
      "Beyond the numbers, Catapult's team consistently delivers thoughtful, donor-centered conversations that reflect well on our institution, and the team is responsive, collaborative, and genuinely invested in our success. We're grateful for the partnership and look forward to continuing to grow this program together.",
    ],
    excerpt:
      "Their team's personalized approach has helped us steadily strengthen our annual fund by increasing both our average gift and pledge rate year over year.",
    name: "Matthew Talley",
    org: "Assistant Director of Annual Giving, University of Maryland Global Campus",
    services: ["annual-fund"],
  },
  {
    id: "capital-campaign-client",
    quote: [
      "They were the only firm willing to stay with us from the feasibility study all the way through the public phase calling. One team, one accountable partner from start to finish.",
    ],
    excerpt:
      "They were the only firm willing to stay with us from the feasibility study all the way through the public phase calling.",
    name: "Executive Director",
    org: "Capital Campaign Client",
    services: ["capital-campaign"],
  },
  {
    id: "colleen-schulman",
    quote: [
      "Legacy Call was a gamechanger for us. As a small shop, it helped us reach a much wider audience of planned giving donors, and the response was incredible: several new gifts and a full pool of new prospects.",
    ],
    excerpt:
      "Legacy Call was a gamechanger for us. As a small shop, it helped us reach a much wider audience of planned giving donors.",
    name: "Colleen Schulman, CFRE, CSPG",
    org: "Chief Philanthropy Officer, PBS KVIE",
    services: ["legacy-giving"],
  },
  {
    id: "christine-ann-stevens",
    quote: [
      "Catapult's fractional officers seamlessly amplified our staff capacity. We grew our total donor households, increased funds raised from our mid-level base, and strengthened our major gifts pipeline. True partners, not just a vendor.",
    ],
    excerpt:
      "We grew our total donor households, increased funds raised from our mid-level base, and strengthened our major gifts pipeline.",
    name: "Christine Ann Stevens",
    org: "Former Sr. Director of Development, Houston Symphony",
    services: ["donor-engagement"],
  },
  {
    id: "erica-kobbe",
    quote: [
      "Catapult's multi-channel outreach, phone, text, and email woven into one plan, increased both donor participation and dollars raised. Their callers are exceptionally well-trained, authentic, and a true extension of our advancement team.",
    ],
    excerpt:
      "Catapult's multi-channel outreach, phone, text, and email woven into one plan, increased both donor participation and dollars raised.",
    name: "Erica Kobbe",
    org: "Sr. Annual Giving Officer, Sacramento State University",
    services: ["annual-fund"],
  },
  // --- New quotes (added from "Quotes for Website.docx") ---
  {
    id: "sara-villanueva",
    quote: [
      "Catapult Fundraising was an invaluable partner to Benevilla throughout our Assisted Living and Memory Care Community feasibility study and campaign readiness process. From the very beginning, their team brought expertise, enthusiasm, and genuine care for our mission. They took the time to truly understand Benevilla and our vision for this next chapter of our organization, while providing thoughtful guidance and practical support at every step.",
    ],
    excerpt:
      "Their team brought expertise, enthusiasm, and genuine care for our mission, providing thoughtful guidance and practical support at every step.",
    name: "Sara Villanueva, CFRE",
    org: "Vice President of Donor Relations, Benevilla",
    services: ["capital-campaign"],
  },
  {
    id: "michelle-horine",
    quote: [
      "Ronald McDonald House Charities of South Texas has had the pleasure of working with Catapult Fundraising on our $20 million dollar capital campaign, and the results have been truly transformative for our organization and the families we serve.",
      "When we began working with Catapult, our fundraising goal was $15 million. The Catapult team brought unparalleled energy, insight, and strategy to our campaign. They took the time to understand our mission, tailored their approach to our unique challenges, and engaged our donor base with genuine care. Their hands-on guidance helped us connect deeply with our supporters and coached our Capital Campaign committee members to make the ask.",
    ],
    excerpt:
      "The Catapult team brought unparalleled energy, insight, and strategy to our $20 million capital campaign, and coached our committee members to make the ask.",
    name: "Michelle Horine",
    org: "CEO, Ronald McDonald House Charities South Texas",
    services: ["capital-campaign"],
  },
  {
    id: "emily-manck-white",
    quote: [
      "I have had the privilege of working with Catapult for the past four years, during which I consistently experienced exceptional customer service and strong annual fund fundraising results. Their outreach system, donor research, and thoughtful recommendations have been invaluable to our Development efforts at Theatre Under The Stars.",
      "From securing a $10,000 bequest to cultivating recurring $50 gifts, and everything in between, the results have been measurable and meaningful.",
      "Beyond immediate fundraising success, Catapult's work has also strengthened donor education and retention. Donors who engaged through their outreach have deepened their connection to our mission.",
    ],
    excerpt:
      "From securing a $10,000 bequest to cultivating recurring $50 gifts, and everything in between, the results have been measurable and meaningful.",
    name: "Emily Manck White",
    org: "Associate Director of Development, Theatre Under The Stars",
    services: ["annual-fund"],
  },
];

export function testimonialsFor(service: Testimonial["services"][number]): Testimonial[] {
  return TESTIMONIALS.filter((t) => t.services.includes(service));
}
