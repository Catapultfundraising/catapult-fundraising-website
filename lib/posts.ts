// Shared article index. Lives here (not inside app/blog/page.tsx) so the
// homepage, service pages, and any other surface can link to articles
// directly. Before this existed, no page outside /blog linked to a single
// article, which left every post orphaned from the site's important pages.

export interface Post {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  image: string;
  alt: string;
  /** Answer-library pillars this article supports, used for related links. */
  pillars: string[];
  /** Service pages this article is most relevant to. */
  services: string[];
}

export const POSTS: Post[] = [
  {
    slug: "why-a-feasibility-study-matters-before-a-capital-campaign",
    title: "Why a Feasibility Study Matters Before a Capital Campaign",
    description:
      "Jeff Grandy on why campaigns rarely struggle because the mission is weak, and how a feasibility study tests the goal, the case, the leadership, and the prospect pipeline before you go public.",
    readTime: "8 min read",
    image: "/blog/why-a-feasibility-study-matters/hero-board-meeting.jpg",
    alt: "Nonprofit leadership team in a planning conversation around a conference table before a capital campaign",
    pillars: ["Feasibility Studies", "Capital Campaigns"],
    services: ["capital-campaign"],
  },
  {
    slug: "national-make-a-will-month-planned-giving-conversation",
    title: "National Make a Will Month: The Planned Giving Conversation You Keep Avoiding",
    description:
      "Anthony R. Alonso on why National Make a Will Month is the perfect low-pressure moment to start the bequest conversation, and the two-tier calling model that turns loyal donors into legacy donors.",
    readTime: "6 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/195e3163b35e43c2813bec32cf08e4f6.jpeg",
    alt: "A shaggy, wide-eyed puppy resting its chin on the table next to Monopoly money, looking up at the camera",
    pillars: ["Planned Giving"],
    services: ["legacy-giving"],
  },
  {
    slug: "giving-usa-2026-record-giving-wealth-transfer",
    title: "Giving USA 2026: Record Giving, the Great Wealth Transfer, and the Ask We Keep Avoiding",
    description:
      "Anthony R. Alonso on what Giving USA 2026's record $617.2 billion, a 19.7% jump in bequest giving, and the aging of the Baby Boomer generation mean for nonprofit fundraisers who've stopped asking.",
    readTime: "7 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/37c1fee2-8ec9-4776-997f-51cd02b24659.png",
    alt: "A multigenerational family looking through a photo album together, symbolizing the great wealth transfer in philanthropy",
    pillars: ["Planned Giving", "Fundraising Strategy"],
    services: ["legacy-giving", "donor-engagement"],
  },
  {
    slug: "the-state-of-fundraising-in-nevada",
    title: "The State of Fundraising in Nevada",
    description:
      "Nevada ranks 49th out of 50 states in WalletHub's 2025 Most Charitable States study. What the data actually means for capital campaign strategy.",
    readTime: "5 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/5c32ad35-1e99-4b00-9b7f-38f3069c476e.png",
    alt: "A desert landscape transitioning into a modern city skyline at golden hour, evoking Nevada's growth",
    pillars: ["Fundraising Strategy"],
    services: ["capital-campaign"],
  },
  {
    slug: "how-much-does-a-capital-campaign-cost",
    title: "How Much Does a Capital Campaign Cost?",
    description:
      "What drives capital campaign consulting fees, typical fee structures, and how to think about ROI before you sign a contract.",
    readTime: "5 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/a71dcf44-5db6-48bb-9179-843db4b80626.png",
    alt: "A board member and fundraising consultant reviewing a capital campaign budget and financial charts",
    pillars: ["Capital Campaigns"],
    services: ["capital-campaign"],
  },
  {
    slug: "capital-campaign-donor-engagement-legacy-giving-best-practices",
    title:
      "Capital Campaigns, Mid-Level Donor Engagement, and Legacy Giving: A Best Practices Guide",
    description:
      "Feasibility studies, gift charts, donor upgrade paths, and legacy call scripts, the practical playbook nonprofits use to raise more at every donor level.",
    readTime: "14 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/a5f9279c-f719-4630-a417-9b3588a39175.png",
    alt: "A nonprofit development team reviewing capital campaign, donor engagement, and legacy giving strategy together",
    pillars: ["Capital Campaigns", "Donor Acquisition & Retention", "Planned Giving"],
    services: ["capital-campaign", "donor-engagement", "legacy-giving"],
  },
  {
    slug: "understanding-latino-philanthropy",
    title: "Understanding Latino Philanthropy: Lessons for Nonprofit Fundraisers",
    description:
      "Anthony Alonso on why 'Latinos don't give' is a myth, what the data actually says about Hispanic and Latino giving, and how to frame a case for support that resonates.",
    readTime: "7 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0aacf9dc-33f6-420d-a5a3-b1b98483dd83.png",
    alt: "A warm multigenerational Latino family gathered together, symbolizing family, community, and generosity",
    pillars: ["Fundraising Strategy"],
    services: ["donor-engagement"],
  },
  {
    slug: "the-ask-ladder-structuring-a-major-gift-solicitation",
    title: "The Ask Ladder: How to Structure a Major Gift Solicitation",
    description:
      "How to build an ask ladder, plan a three-visit solicitation, and frame naming opportunities so major donors say yes.",
    readTime: "6 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/cb138a99-442d-4779-9849-845501a69ef3.png",
    alt: "A fundraising professional presenting an ask ladder chart to a colleague",
    pillars: ["Major Gifts"],
    services: ["capital-campaign"],
  },
  {
    slug: "planning-a-capital-campaign-gift-chart-quiet-phase",
    title: "Planning a Capital Campaign: The Gift Chart and Quiet Phase",
    description:
      "The gift chart math, feasibility study, board participation standard, and quiet-phase discipline behind a successful capital campaign.",
    readTime: "6 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/93175c40-3d98-48bd-b885-9005127752be.png",
    alt: "A campaign steering committee meeting with an architectural rendering of a capital project",
    pillars: ["Capital Campaigns", "Feasibility Studies"],
    services: ["capital-campaign"],
  },
  {
    slug: "growing-your-legacy-society-why-arent-we-asking",
    title: "Growing Your Legacy Society: Why Aren't We Asking?",
    description:
      "Who your best legacy giving prospects really are, the two-step call process that closes bequests, and why loyalty beats wealth every time.",
    readTime: "6 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/96ee0ee1-0dac-47d1-a6c6-f2044a67c885.png",
    alt: "A donor and nonprofit staff member in warm conversation about legacy giving, with a handwritten letter on the table",
    pillars: ["Planned Giving"],
    services: ["legacy-giving"],
  },
  {
    slug: "seven-touchpoints-donor-loyalty-between-asks",
    title: "Seven Touchpoints: Building Donor Loyalty Between Asks",
    description:
      "The low-cost touchpoints, from the 'five by ten' calling habit to digital voicemail drops, that build donor loyalty and quietly upgrade mid-level gifts.",
    readTime: "5 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/38cfee64-edbb-4288-8e20-2687a1044863.png",
    alt: "A fundraising officer writing a handwritten thank-you note, symbolizing donor stewardship",
    pillars: ["Donor Acquisition & Retention"],
    services: ["donor-engagement", "annual-fund"],
  },
  {
    slug: "key-steps-for-soliciting-major-donors",
    title: "Key Steps for Soliciting Major Donors",
    description:
      "Catapult's “four-right rule” for turning long-time supporters into major gift donors: the right person asking the right prospect for the right amount at the right time.",
    readTime: "4 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/25847c17-f9f0-4a0a-958f-c0f9db77bde2.png",
    alt: "Two professionals shaking hands after a successful major gift solicitation meeting",
    pillars: ["Major Gifts"],
    services: ["capital-campaign", "donor-engagement"],
  },
  {
    slug: "how-to-effectively-use-the-phone-today",
    title: "How to Effectively Use the Phone Today",
    description:
      "Anthony R. Alonso on why telefundraising is far from dead, and the two-step, personalized method that lifts gift sizes 25 to 30 percent.",
    readTime: "3 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/bf533301-7515-409e-ac31-57d9e2df3c30.png",
    alt: "A fundraising engagement officer smiling while making a personalized phone call",
    pillars: ["Annual Fund", "Donor Acquisition & Retention"],
    services: ["annual-fund", "donor-engagement"],
  },
  {
    slug: "multi-channel-fundraising-are-you-missing-the-mark",
    title: "Multi-Channel Fundraising — Are You Missing the Mark?",
    description:
      "Anthony Alonso on why digital fundraising alone can't upgrade donors or build a major gift pipeline, and the segmentation, storytelling, and calling strategy that can.",
    readTime: "6 min read",
    image: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e601e588-b9aa-4027-aa86-0a2a5ec61431.png",
    alt: "Illustration of multiple communication channels, phone, mail, and email, converging toward a single donor",
    pillars: ["Fundraising Strategy", "Annual Fund"],
    services: ["annual-fund", "donor-engagement"],
  },

];

export function postsForService(service: string, limit = 3): Post[] {
  return POSTS.filter((p) => p.services.includes(service)).slice(0, limit);
}

export function postsForPillar(pillar: string, limit = 3): Post[] {
  return POSTS.filter((p) => p.pillars.includes(pillar)).slice(0, limit);
}
