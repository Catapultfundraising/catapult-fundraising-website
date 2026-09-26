// Shared testimonial data, used by:
// - components/testimonial-strip.tsx (the full "What Clients Say" grid on /results,
//   showing every quote in this list)
// - components/scrolling-quote-banner.tsx (the scrolling banner under "What Clients Say"
//   on the homepage, also showing every quote in this list)
// - the relevant app/services/*/page.tsx "What Clients Say" sections, so each client's own
//   words appear on the service page that quote is actually about (via testimonialsFor).
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
  /** Client's official full-color logo (public/clients), shown top-right of the quote. */
  logo?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    /** Optional size boost for tall/stacked marks that read small next to wide wordmarks. */
    scale?: number;
  };
  /** Which services/pages this testimonial is most relevant to. */
  services: (
    | "capital-campaign"
    | "feasibility-study"
    | "legacy-giving"
    | "donor-engagement"
    | "annual-fund"
  )[];
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
    logo: { src: "/clients/loma-linda-university-health.png", alt: "Loma Linda University Health", width: 740, height: 209 },
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
    logo: { src: "/clients/umgc.svg", alt: "University of Maryland Global Campus", width: 3636, height: 684 },
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
    logo: { src: "/clients/pbs-kvie.svg", alt: "PBS KVIE", width: 93619, height: 21600 },
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
    logo: { src: "/clients/houston-symphony.png", alt: "Houston Symphony", width: 508, height: 54 },
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
    logo: { src: "/clients/sacramento-state.png", alt: "Sacramento State", width: 670, height: 129 },
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
    logo: { src: "/clients/benevilla.png", alt: "Benevilla", width: 1465, height: 471 },
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
    logo: { src: "/clients/rmhc-south-texas.png", alt: "Ronald McDonald House Charities South Texas", width: 69, height: 148, scale: 1.75 },
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
    logo: { src: "/clients/theatre-under-the-stars.png", alt: "Theatre Under The Stars", width: 450, height: 25 },
  },
  {
    id: "debra-kathman",
    quote: [
      "Catapult has been a tremendous partner in helping us qualify gift planning leads generated through our marketing efforts. By identifying prospects who are genuinely interested in our mission and considering a legacy gift, they have lightened the load for our gift planning officers and enabled them to focus their time on the donors with the greatest potential. It's made our fundraising efforts more focused, efficient, and productive.",
    ],
    excerpt:
      "By identifying prospects who are genuinely interested in our mission and considering a legacy gift, they have lightened the load for our gift planning officers.",
    name: "Debra G. Kathman, JD",
    org: "Senior Director of Gift Planning | Development, World Wildlife Fund",
    services: ["legacy-giving"],
    logo: { src: "/clients/wwf.svg", alt: "World Wildlife Fund", width: 8163, height: 12237 },
  },
  {
    id: "kyle-smith",
    quote: [
      "Anthony Alonso and the Catapult Fundraising team were brought in at a critical time to help us address a capital campaign that was not meeting its potential. Through their professionalism, strategic insight, tireless work ethic, and exceptional fundraising expertise, they helped turn the campaign around and position it for success. Their partnership has made a meaningful difference in our ability to advance the mission of The Salvation Army. I am deeply grateful for their commitment, leadership, and the outstanding results they delivered.",
    ],
    excerpt:
      "Through their professionalism, strategic insight, tireless work ethic, and exceptional fundraising expertise, they helped turn the campaign around and position it for success.",
    name: "Major Kyle Smith",
    org: "Salvation Army",
    services: ["capital-campaign"],
    logo: { src: "/clients/salvation-army.svg", alt: "The Salvation Army", width: 39, height: 46 },
  },
  {
    id: "natalie-krauser",
    quote: [
      "Our ongoing chapter partnership with Catapult has yielded retained members, conference registrations, and even gifts to the AFP Foundation's Be the Cause campaign.",
      "Their calling team serves as true ambassadors, well-versed in who AFP NJ members are and always ready to answer questions and provide assistance.",
      "As a pro bono partner, they have consistently demonstrated the highest level of professionalism and have been exceptional partners throughout our relationship.",
    ],
    excerpt:
      "Their calling team serves as true ambassadors, well-versed in who AFP NJ members are and always ready to answer questions and provide assistance.",
    name: "Natalie R. Krauser",
    org: "President, Association of Fundraising Professionals NJ Chapter",
    services: ["donor-engagement", "annual-fund"],
    logo: { src: "/clients/afp-new-jersey.png", alt: "AFP New Jersey Chapter", width: 177, height: 135 },
  },
  {
    id: "kelly-ries",
    quote: [
      "Catapult Fundraising Services was recommended to us by a nonprofit consultant who had conducted an audit of our development department, and it's been one of the best referrals we've received. From the start, Catapult was timely and thorough in putting together a proposal to implement fundraising campaigns for our program.",
      "What sets them apart is how collaborative they are. They involved me directly in training their team, taking the time to understand Special Olympics Indiana's vision and our events. I was consistently impressed by their thoughtful questions and professionalism, and it meant a lot that two of their fundraisers had firsthand experience attending one of our largest sports competitions. That kind of genuine familiarity with our work is rare.",
      "Catapult also conducts interviews that result in powerful story letters conveying the impact our organization has on the lives of the athletes, coaches, and families in the Special Olympics Indiana community. Every time, it's clear they consider it an honor to be part of telling those stories.",
      "Having worked with two other vendors offering similar services, I can say without hesitation that Catapult is by far the best telefunding partner we've had.",
    ],
    excerpt:
      "Having worked with two other vendors offering similar services, I can say without hesitation that Catapult is by far the best telefunding partner we've had.",
    name: "Kelly Ries",
    org: "Senior Director of Donor Engagement, Special Olympics Indiana",
    services: ["annual-fund", "donor-engagement"],
    logo: { src: "/clients/special-olympics-indiana.svg", alt: "Special Olympics Indiana", width: 288, height: 70 },
  },
  {
    id: "rene-cantu",
    quote: [
      "Thank you for the outstanding presentation you delivered to our board today! It certainly raised the level of awareness and engagement from these wonderful folks. You guys are an all star team!",
    ],
    excerpt:
      "It certainly raised the level of awareness and engagement from these wonderful folks. You guys are an all star team!",
    name: "Rene Cantu, Ph.D.",
    org: "Executive Director, Jobs for Nevada Grads",
    services: ["capital-campaign", "feasibility-study"],
    logo: { src: "/clients/jobs-for-nevada-grads.png", alt: "Jobs for Nevada's Graduates", width: 974, height: 596 },
  },
  {
    id: "rebekah-alexander-fishburne",
    quote: [
      "It's been a pleasure working with you and the Catapult team throughout this process.",
      "Thank you again for your excellent support, responsiveness, and partnership. We are grateful for all you've done to help advance our annual giving efforts.",
    ],
    excerpt:
      "Thank you again for your excellent support, responsiveness, and partnership. We are grateful for all you've done to help advance our annual giving efforts.",
    name: "Rebekah A. Alexander-Fishburne",
    org: "Senior Director of Annual Giving, Kean University",
    services: ["annual-fund"],
    logo: { src: "/clients/kean-university.svg", alt: "Kean University", width: 619, height: 168 },
  },
];

export function testimonialsFor(service: Testimonial["services"][number]): Testimonial[] {
  return TESTIMONIALS.filter((t) => t.services.includes(service));
}
