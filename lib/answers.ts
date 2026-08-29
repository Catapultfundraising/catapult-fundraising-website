// AEO ("Answer Engine Optimization") question/answer library.
//
// These pages exist to directly answer the high-intent search questions
// nonprofit leaders type into Google, ChatGPT, and Perplexity while
// researching a fundraising decision. They are intentionally NOT linked
// from the primary site navigation (see components/site-header.tsx /
// site-footer.tsx) -- they're meant to be found through search, AI answer
// engines, and internal links from articles/case studies/service pages,
// not to add another dropdown for human visitors to click through.
//
// Every answer is grounded in Catapult's actual documented methodology
// (the FAQS/SECTIONS content already on app/services/*/page.tsx), real
// case study results (lib/case-studies.ts), and real published articles
// (app/blog/*) -- nothing here is generic filler or invented capability.

export interface RelatedLink {
  label: string;
  href: string;
}

export interface Answer {
  slug: string;
  pillar: string;
  question: string;
  answer: string[]; // paragraphs
  related: RelatedLink[];
  // Optional shorter overrides for the <title> tag and meta description.
  // `question` stays the on-page H1 (full, natural phrasing -- good for
  // AEO extraction); `metaTitle` is only set on the handful of questions
  // whose full phrasing runs past ~60 characters, since that's what
  // actually shows in a search result. `metaDescription` is a concise,
  // ~150-character summary distinct from `answer[0]` (which runs up to
  // ~500 characters -- fine as the on-page first paragraph, far too long
  // for a meta description that Google truncates around 155 characters).
  metaTitle?: string;
  metaDescription?: string;
}

export const PILLARS = [
  "Capital Campaigns",
  "Feasibility Studies",
  "Major Gifts",
  "Fundraising Strategy",
  "Donor Acquisition & Retention",
  "Planned Giving",
  "Annual Fund",
] as const;

export const ANSWERS: Answer[] = [
  // ---------------------------------------------------------------------
  // 1. CAPITAL CAMPAIGNS
  // ---------------------------------------------------------------------
  {
    slug: "what-is-a-capital-campaign",
    pillar: "Capital Campaigns",
    question: "What is a capital campaign?",
    metaDescription: "A capital campaign is a structured, time-bound fundraising effort to raise a specific dollar goal, typically for a building project, endowment, or major",
    answer: [
      "A capital campaign is a structured, time-bound fundraising effort to raise a specific dollar goal, typically for a building project, endowment, or major program, rather than ongoing operating support.",
      "Catapult runs every capital campaign through five phases: a Feasibility Study to confirm the dollar goal, Campaign Planning to build the execution blueprint, a Quiet Phase to solicit major gifts from individuals, foundations, and corporations, Campaign Connect (the public or community phase) to reach the broader donor base by phone, and ongoing stewardship.",
      "Unlike an annual fund, which repeats every year for unrestricted operating support, a capital campaign has a defined start, a defined dollar goal, and a defined end.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
      { label: "How Much Does a Capital Campaign Cost?", href: "/blog/how-much-does-a-capital-campaign-cost" },
    ],
  },
  {
    slug: "how-do-you-plan-and-conduct-a-capital-campaign",
    pillar: "Capital Campaigns",
    question: "How do you plan and conduct a capital campaign?",
    metaDescription: "Catapult plans and runs a capital campaign in five sequential phases.",
    answer: [
      "Catapult plans and runs a capital campaign in five sequential phases. The Feasibility Study comes first: we interview board members, staff, and top prospects to pressure-test the goal before a single dollar is asked for.",
      "Campaign Planning follows over a focused 3-6 month runway, prioritizing prospect data, finalizing campaign materials, and recruiting and training a Campaign Committee.",
      "The Quiet Phase runs 24-36 months, working alongside the Campaign Chair and Steering Committee to solicit major gifts from individuals, foundations, and corporations, typically securing the majority of the goal before any public announcement.",
      "Campaign Connect, the public or community phase, then reaches core constituencies (alumni, parents, grateful patients, members, subscribers) by phone to raise the remaining 10-20% of the goal while dramatically expanding the donor base.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
      { label: "Planning a Capital Campaign Gift Chart & Quiet Phase", href: "/blog/planning-a-capital-campaign-gift-chart-quiet-phase" },
    ],
  },
  {
    slug: "is-my-nonprofit-ready-for-a-capital-campaign",
    pillar: "Capital Campaigns",
    question: "How do I know if my nonprofit is ready for a capital campaign?",
    metaTitle: "Is my nonprofit ready for a capital campaign?",
    metaDescription: "Readiness is exactly what a feasibility study is designed to answer honestly, before an organization commits publicly to a dollar goal.",
    answer: [
      "Readiness is exactly what a feasibility study is designed to answer honestly, before an organization commits publicly to a dollar goal. Catapult's feasibility process interviews board members, staff, and top prospects to test whether the case for support resonates, whether leadership and top donors will actually make and ask for gifts, and whether the organization's current systems and staffing can support a multi-year campaign.",
      "A few practical signals we look for: a board willing to give and ask first, a compelling and specific project (not just \"we need money\"), a donor file with at least a handful of prospects capable of leadership-level gifts, and organizational capacity to track pledges and steward donors for years, not months.",
      "If those pieces aren't yet in place, that's not a reason to abandon the goal, it's information that shapes a realistic timeline and often points to a Donor Engagement or Legacy Call program first, to build the donor base a campaign will eventually need.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
    ],
  },
  {
    slug: "how-much-should-a-nonprofit-raise-in-a-capital-campaign",
    pillar: "Capital Campaigns",
    question: "How much should a nonprofit raise in a capital campaign, and how do you set the goal?",
    metaTitle: "How much should a nonprofit raise in a capital campaign?",
    metaDescription: "The campaign goal isn't set by picking a number and hoping donors meet it, it's confirmed through the feasibility study by testing real prospect capacity",
    answer: [
      "The campaign goal isn't set by picking a number and hoping donors meet it, it's confirmed through the feasibility study by testing real prospect capacity and interest before the goal is ever announced publicly.",
      "In practice, that means building a gift table (or gift chart) that maps how many gifts at each level are needed to reach the goal, typically led by a small number of large leadership gifts at the top rather than a large number of small ones. A widely used rule of thumb is that roughly 80-90% of a campaign's dollars come from the top 10-20% of donors.",
      "Catapult confirms that structure during Campaign Planning, prioritizing prospect data and building the detailed gift table and timeline the Quiet Phase will run on, so the number isn't aspirational, it's tested.",
    ],
    related: [
      { label: "Planning a Capital Campaign Gift Chart & Quiet Phase", href: "/blog/planning-a-capital-campaign-gift-chart-quiet-phase" },
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
    ],
  },
  {
    slug: "how-long-does-a-capital-campaign-take",
    pillar: "Capital Campaigns",
    question: "How long does a capital campaign take?",
    metaDescription: "A full Catapult capital campaign typically spans several years across its phases: a feasibility study, then 3-6 months of Campaign Planning, then a Quiet",
    answer: [
      "A full Catapult capital campaign typically spans several years across its phases: a feasibility study, then 3-6 months of Campaign Planning, then a Quiet Phase of 24-36 months to secure major gifts, followed by the public Campaign Connect phase to reach the broader donor base.",
      "The single biggest driver of timeline is the Quiet Phase, since major gift cultivation and solicitation can't be rushed without damaging the relationships the campaign depends on. Organizations that skip or compress this phase typically fall short of goal or burn out donor relationships they need for future campaigns.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
      { label: "How Much Does a Capital Campaign Cost?", href: "/blog/how-much-does-a-capital-campaign-cost" },
    ],
  },
  {
    slug: "how-much-does-a-capital-campaign-consultant-cost",
    pillar: "Capital Campaigns",
    question: "How much does a capital campaign consultant cost, and what does a consultant actually do?",
    metaTitle: "How much does a capital campaign consultant cost?",
    metaDescription: "Capital campaign consulting fees vary based on the campaign's dollar goal, timeline, and scope, whether an organization needs a feasibility study alone or",
    answer: [
      "Capital campaign consulting fees vary based on the campaign's dollar goal, timeline, and scope, whether an organization needs a feasibility study alone or full quiet-phase and public-phase management. Catapult builds a customized proposal after an initial conversation about goals and readiness rather than quoting a flat rate up front.",
      "What a consultant does across that engagement: runs the feasibility study and helps write the case statement, prioritizes and reviews prospect data, recruits and trains the Campaign Committee, provides the strategy and coaching behind major gift solicitations during the Quiet Phase, and, in Catapult's case, is the only national firm that also staffs the public-phase calling program with trained Engagement Officers rather than treating it as an afterthought handed to a separate vendor.",
      "That last point matters for cost comparisons: many organizations end up paying three separate vendors (a feasibility consultant, a campaign counsel firm, and a calling company) where Catapult is a single accountable partner across all five phases.",
    ],
    related: [
      { label: "How Much Does a Capital Campaign Cost?", href: "/blog/how-much-does-a-capital-campaign-cost" },
      { label: "Catapult vs. Other Fundraising Consultants", href: "/blog/catapult-vs-fundraising-consultants" },
    ],
  },
  {
    slug: "what-is-a-capital-campaign-feasibility-study",
    pillar: "Feasibility Studies",
    question: "What is a capital campaign feasibility study, and who should conduct one?",
    metaTitle: "What is a capital campaign feasibility study?",
    metaDescription: "A feasibility study is the first phase of a Catapult capital campaign: a structured process of interviewing board members, staff, and top prospects to",
    answer: [
      "A feasibility study is the first phase of a Catapult capital campaign: a structured process of interviewing board members, staff, and top prospects to confirm (or rework) the campaign's dollar goal before it's announced, and to pressure-test the case for support.",
      "It should be conducted by an outside consultant rather than internal staff, because major donors and board members are far more candid with a neutral third party about concerns, giving capacity, and honest feedback on leadership than they would be face-to-face with the executive director asking for the gift.",
      "The output isn't just a yes/no on readiness. It's a confirmed (or adjusted) dollar goal, a draft case statement and budget, project prioritization, and the start of a Campaign Chair and Steering Committee recruitment list, all of which feed directly into Campaign Planning.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
      { label: "How Much Does a Capital Campaign Cost?", href: "/blog/how-much-does-a-capital-campaign-cost" },
    ],
  },
  {
    slug: "how-much-does-a-feasibility-study-cost",
    pillar: "Feasibility Studies",
    question: "How much does a fundraising feasibility study cost?",
    metaDescription: "Feasibility study cost depends on the number of prospect and stakeholder interviews conducted, the geographic spread of those interviews, and whether the",
    answer: [
      "Feasibility study cost depends on the number of prospect and stakeholder interviews conducted, the geographic spread of those interviews, and whether the study is standalone or bundled with the full campaign engagement.",
      "Catapult prices feasibility studies individually after an initial conversation, since a 30-interview study for a single-site nonprofit is a very different scope than a national organization needing interviews across multiple regions or chapters. Many clients choose to bundle the feasibility study into a broader Capital Campaign Counsel engagement, since the findings flow directly into Campaign Planning.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
    ],
  },
  {
    slug: "what-percentage-of-a-capital-campaign-should-come-from-major-gifts",
    pillar: "Capital Campaigns",
    question: "What percentage of a capital campaign should come from major gifts, and how do you build a gift chart?",
    metaTitle: "What percentage of a campaign should come from major gifts?",
    metaDescription: "In a well-structured campaign, the large majority of dollars, often 80% or more, comes from a relatively small number of major gifts secured quietly",
    answer: [
      "In a well-structured campaign, the large majority of dollars, often 80% or more, comes from a relatively small number of major gifts secured quietly before the public phase, not from broad-based public appeals.",
      "A gift chart (or gift pyramid) makes that structure concrete: it lays out how many gifts are needed at each level, from a small handful of leadership gifts at the top down to a broader base of smaller gifts, to add up to the full campaign goal. Catapult builds this chart during Campaign Planning using the feasibility study's prospect data, then tracks actual solicitations against it throughout the Quiet Phase.",
      "Catapult's Campaign Connect public phase then adds the remaining 10-20% of the goal by reaching the broader donor base directly, which also expands the donor pool for future campaigns rather than only closing the current one.",
    ],
    related: [
      { label: "Planning a Capital Campaign Gift Chart & Quiet Phase", href: "/blog/planning-a-capital-campaign-gift-chart-quiet-phase" },
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
    ],
  },
  {
    slug: "what-is-the-quiet-phase-of-a-capital-campaign",
    pillar: "Capital Campaigns",
    question: "What is the quiet phase of a capital campaign, and when should you announce publicly?",
    metaTitle: "What is the quiet phase of a capital campaign?",
    metaDescription: "The quiet phase (sometimes called the silent phase) is the period, typically 24-36 months, when a campaign solicits major gifts from individuals",
    answer: [
      "The quiet phase (sometimes called the silent phase) is the period, typically 24-36 months, when a campaign solicits major gifts from individuals, foundations, and corporations privately, before any public announcement.",
      "The goal is to secure the majority of the campaign total quietly, so that by the time the campaign goes public, it can be announced already 70-80%+ funded, which builds momentum and social proof for the broader donor base rather than asking the public to fund an uncertain goal from zero.",
      "Catapult's Campaign Connect public phase begins only once the Steering Committee and Campaign Chair confirm the quiet phase has reached that threshold, at which point the program shifts to reaching the wider constituency (alumni, parents, grateful patients, members) by phone to close the remaining gap.",
    ],
    related: [
      { label: "Planning a Capital Campaign Gift Chart & Quiet Phase", href: "/blog/planning-a-capital-campaign-gift-chart-quiet-phase" },
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
    ],
  },
  {
    slug: "how-do-you-recruit-a-capital-campaign-committee",
    pillar: "Capital Campaigns",
    question: "How do you recruit a capital campaign committee?",
    metaDescription: "Committee recruitment starts during the feasibility study, when interviews with board members and top prospects surface the natural candidates for",
    answer: [
      "Committee recruitment starts during the feasibility study, when interviews with board members and top prospects surface the natural candidates for Campaign Chair, people the community already respects and who have (or will make) a leadership-level gift themselves.",
      "During Campaign Planning, Catapult formally recruits and trains the full Campaign Committee and Steering Committee, prioritizing people who bring three things: credibility with top prospects, willingness to make their own leading gift, and willingness to personally ask others.",
      "A committee recruited without that third quality, willingness to ask, is the single most common reason campaigns underperform their gift chart even with a strong case for support.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
      { label: "Key Steps for Soliciting Major Donors", href: "/blog/key-steps-for-soliciting-major-donors" },
    ],
  },
  {
    slug: "biggest-capital-campaign-mistakes",
    pillar: "Capital Campaigns",
    question: "What are the biggest capital campaign mistakes nonprofits make?",
    metaTitle: "What are the biggest capital campaign mistakes?",
    metaDescription: "The most common mistake is skipping or rushing the feasibility study and announcing a goal that hasn't been tested against real prospect capacity, which",
    answer: [
      "The most common mistake is skipping or rushing the feasibility study and announcing a goal that hasn't been tested against real prospect capacity, which either leaves money on the table or sets the organization up to publicly fall short.",
      "A close second is going public too early, before the quiet phase has secured the majority of the goal, which removes the momentum a strong public announcement is supposed to create.",
      "A third is treating the public/community phase as an afterthought, handed to a generic calling vendor instead of run as a real campaign discipline, which is exactly the gap Catapult's Campaign Connect program was built to close: trained Engagement Officers, personalized ask amounts from prospect research, and a program run with the same rigor as the quiet phase.",
      "Fourth: recruiting a Campaign Committee for prestige rather than willingness to give and ask, which quietly stalls solicitations for months.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
      { label: "Catapult vs. Other Fundraising Consultants", href: "/blog/catapult-vs-fundraising-consultants" },
    ],
  },
  {
    slug: "capital-campaign-vs-annual-fund",
    pillar: "Capital Campaigns",
    question: "What is the difference between a capital campaign and an annual fund?",
    metaTitle: "Capital campaign vs. annual fund: what is the difference?",
    metaDescription: "A capital campaign is a time-bound effort to raise a specific dollar goal for a building project, endowment, or major program, typically running several",
    answer: [
      "A capital campaign is a time-bound effort to raise a specific dollar goal for a building project, endowment, or major program, typically running several years through feasibility, quiet, and public phases.",
      "An annual fund is an ongoing yearly appeal for unrestricted operating support that repeats indefinitely rather than closing out at a fixed goal.",
      "Many organizations run both at the same time, which is a real coordination challenge: a poorly sequenced capital campaign can cannibalize annual fund giving if the same donors are asked twice without a clear rationale. Catapult coordinates the two so they reinforce each other, often using AF Connect annual fund calling to keep the broader base warm and engaged while quiet-phase major gift conversations happen in parallel.",
    ],
    related: [
      { label: "Capital Campaign Counsel", href: "/services/capital-campaign" },
      { label: "Annual Fund Calling (AF Connect)", href: "/services/annual-fund" },
    ],
  },

  // ---------------------------------------------------------------------
  // 2. MAJOR GIFTS
  // ---------------------------------------------------------------------
  {
    slug: "how-do-you-find-major-donors",
    pillar: "Major Gifts",
    question: "How do you find and identify major gift prospects for your nonprofit?",
    metaTitle: "How do you find major gift prospects?",
    metaDescription: "Major donor prospects are rarely a mystery hiding outside the donor file, they're usually already inside it, hiding in plain sight among small",
    answer: [
      "Major donor prospects are rarely a mystery hiding outside the donor file, they're usually already inside it, hiding in plain sight among small, consistent, long-tenured givers whose true capacity has never been assessed.",
      "Catapult's approach starts with wealth screening and giving-pattern analysis across the existing donor file, looking specifically for donors with long giving tenure at modest levels, since consistent multi-year loyalty is often a stronger predictor of major gift readiness than a single large past gift.",
      "That's the exact methodology behind Catapult's Donor Engagement program and Legacy Call program: both start by re-screening an organization's own donor file rather than assuming major donors must be found externally. In one documented case, a targeted engagement campaign among donors with a lifetime giving history under $350 generated 467 new gifts and a 72% increase in overall giving from that segment.",
    ],
    related: [
      { label: "Hidden Major Gift Potential in a Performing Arts Organization's Donor Base", href: "/insights/case-studies/engaging-hidden-donor-potential-performing-arts-organization" },
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
    ],
  },
  {
    slug: "how-do-you-build-a-major-gifts-program",
    pillar: "Major Gifts",
    question: "How do you build a major gifts program from scratch?",
    metaDescription: "A major gifts program needs three things working together, not just a job description: a screened and prioritized prospect list, a structured cultivation",
    answer: [
      "A major gifts program needs three things working together, not just a job description: a screened and prioritized prospect list, a structured cultivation sequence that builds the relationship before the ask, and a consistent stewardship cadence after the gift.",
      "Catapult's Donor Engagement program is built as exactly that structure for the tier of donors between annual fund and true major gift status: an 8-stage journey running from identification and prioritization, through a leadership introduction letter and qualification call, to the gift phase, fulfillment and reporting, and ongoing stewardship touchpoints.",
      "The result is meant to feed a true major gifts program a pipeline of already-warmed, qualified prospects, rather than asking a single major gift officer to both discover and cultivate donors from a cold list.",
    ],
    related: [
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
      { label: "Key Steps for Soliciting Major Donors", href: "/blog/key-steps-for-soliciting-major-donors" },
    ],
  },
  {
    slug: "how-do-you-cultivate-major-donors",
    pillar: "Major Gifts",
    question: "How do you cultivate major donors before asking for a gift?",
    metaDescription: "Cultivation means building genuine affinity before ever discussing a gift amount, and Catapult's Donor Engagement methodology treats that sequencing as",
    answer: [
      "Cultivation means building genuine affinity before ever discussing a gift amount, and Catapult's Donor Engagement methodology treats that sequencing as non-negotiable: a personalized letter of introduction from leadership comes first, followed by an area-of-impact conversation and qualification call, and only then a pre-call letter that previews the ask.",
      "The relationship-first discipline matters because donors who feel cultivated rather than solicited give larger gifts and stay engaged longer. It's the same principle behind Legacy Call's planned-giving process, where a Stewardship Officer's qualifying conversation always comes before any referral to a Gift Planning Specialist for the actual gift discussion.",
    ],
    related: [
      { label: "Seven Touchpoints for Donor Loyalty Between Asks", href: "/blog/seven-touchpoints-donor-loyalty-between-asks" },
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
    ],
  },
  {
    slug: "how-do-you-ask-for-a-major-gift",
    pillar: "Major Gifts",
    question: "How do you ask for a major gift?",
    metaDescription: "A major gift ask should never be the first conversation with a prospect, it's the culmination of a cultivation sequence that has already established a",
    answer: [
      "A major gift ask should never be the first conversation with a prospect, it's the culmination of a cultivation sequence that has already established a personal relationship, a clear case for support, and a specific, well-researched ask amount tied to that donor's known capacity and giving history.",
      "Catapult builds ask amounts from prospect research and giving history rather than a flat, round-number request across the board, whether that's an Engagement Officer working from five-year giving history in an AF Connect program, or a Gift Planning Specialist discussing a specific planned gift structure with a qualified Legacy Call prospect.",
      "The ask itself should also always include a genuine thank-you for past support before the request for more, a discipline built into every Catapult calling program's first-touch script.",
    ],
    related: [
      { label: "The Ask Ladder: Structuring a Major Gift Solicitation", href: "/blog/the-ask-ladder-structuring-a-major-gift-solicitation" },
      { label: "Key Steps for Soliciting Major Donors", href: "/blog/key-steps-for-soliciting-major-donors" },
    ],
  },
  {
    slug: "major-gift-officer-vs-donor-engagement-program",
    pillar: "Major Gifts",
    question: "What's the difference between a major gift officer and a donor engagement program?",
    metaTitle: "Major gift officer vs. donor engagement program",
    metaDescription: "A major gift officer typically manages a portfolio of donors who are already identified as major gift prospects, cultivating and soliciting a relatively",
    answer: [
      "A major gift officer typically manages a portfolio of donors who are already identified as major gift prospects, cultivating and soliciting a relatively small, known list one relationship at a time.",
      "Catapult's Donor Engagement program works one tier below that: it identifies and cultivates mid-level donors, too significant for a form letter but not yet assigned to a major gift portfolio, at a scale a single officer's calendar can't reach on their own.",
      "In practice, the two work together rather than compete: Donor Engagement's 8-stage methodology surfaces and warms the next generation of major gift prospects, so the major gift officer's pipeline stays full instead of shrinking to only the donors already known.",
    ],
    related: [
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
      { label: "Mid-Level Donor Engagement for a Faith-Based Organization", href: "/insights/case-studies/mid-level-donor-engagement-faith-based-organization" },
    ],
  },

  // ---------------------------------------------------------------------
  // 3. FUNDRAISING STRATEGY / CONSULTING
  // ---------------------------------------------------------------------
  {
    slug: "how-can-my-nonprofit-raise-more-money",
    pillar: "Fundraising Strategy",
    question: "How can my nonprofit raise more money?",
    metaDescription: "The fastest, lowest-risk path to more revenue is almost always inside an organization's existing donor file, not a new acquisition channel: re-screening",
    answer: [
      "The fastest, lowest-risk path to more revenue is almost always inside an organization's existing donor file, not a new acquisition channel: re-screening lapsed and mid-level donors for upgrade and reactivation potential, closing the planned-giving gifts loyal donors are already prepared to make, and running a properly segmented annual fund with personalized ask amounts.",
      "Catapult's own case results reflect that order of operations. A faith-based organization's segmented Reactivate/Renewal/Upgrade donor engagement campaign drove a 32% higher response rate among lapsed donors and qualified 9% of participants for a major gift appointment, without acquiring a single new donor.",
      "Only after that existing-donor capacity is captured does a capital campaign or new-donor acquisition strategy typically make sense, since a campaign performs best when it's building on an already-engaged base rather than trying to create one from scratch under a public deadline.",
    ],
    related: [
      { label: "Mid-Level Donor Engagement for a Faith-Based Organization", href: "/insights/case-studies/mid-level-donor-engagement-faith-based-organization" },
      { label: "Multi-Channel Fundraising — Are You Missing the Mark?", href: "/blog/multi-channel-fundraising-are-you-missing-the-mark" },
    ],
  },
  {
    slug: "how-do-you-create-a-successful-fundraising-strategy",
    pillar: "Fundraising Strategy",
    question: "How do you create a successful fundraising strategy?",
    metaDescription: "A sound fundraising strategy starts with an honest assessment of the current donor file and program mix, not a wishlist of goals.",
    answer: [
      "A sound fundraising strategy starts with an honest assessment of the current donor file and program mix, not a wishlist of goals. That means understanding, program by program, where the organization already has traction (annual fund, mid-level, planned giving, major gifts) and where the biggest untapped gap sits.",
      "Catapult builds strategy around that gap analysis across four coordinated service lines: Capital Campaign Counsel for a defined major project, Mid-Level Donor Engagement to build the pipeline between annual fund and major gifts, Legacy & Planned Giving (Legacy Call) to close deferred gifts most campaigns leave on the table, and Annual Fund Calling (AF Connect) to keep the broader base engaged and upgrading year over year.",
      "The strongest strategies run more than one of these in parallel rather than sequentially, since a healthy planned giving pipeline and a well-cultivated mid-level donor base directly strengthen the prospect pool for a future capital campaign.",
    ],
    related: [
      { label: "About Catapult", href: "/about" },
      { label: "Multi-Channel Fundraising — Are You Missing the Mark?", href: "/blog/multi-channel-fundraising-are-you-missing-the-mark" },
    ],
  },
  {
    slug: "what-fundraising-strategies-work-best-for-nonprofits",
    pillar: "Fundraising Strategy",
    question: "What fundraising strategies work best for nonprofits right now?",
    metaTitle: "What fundraising strategies work best for nonprofits?",
    metaDescription: "The strategies producing the strongest documented results share one trait: they treat every donor conversation, on the phone or in person, with the same",
    answer: [
      "The strategies producing the strongest documented results share one trait: they treat every donor conversation, on the phone or in person, with the same rigor as a face-to-face major gift solicitation, rather than defaulting to mass, generic outreach.",
      "That discipline is behind Catapult's best-performing programs: an AF Connect annual fund program achieved an 85% pledge rate with lapsed donors for Special Olympics of Indiana, nearly double the 45% industry average, while lifting average gift size by 39%. A Legacy Call planned-giving program identified $6.8 million in planned gifts for an international ministry across two calling phases.",
      "Multi-channel reinforcement matters too: pairing a phone conversation with personalized digital touchpoints (text, email, ringless voicemail) consistently outperforms either channel alone, since donors respond differently depending on the moment they're reached.",
    ],
    related: [
      { label: "AF Connect — Special Olympics of Indiana", href: "/insights/case-studies/af-connect-special-olympics-indiana" },
      { label: "Multi-Channel Fundraising — Are You Missing the Mark?", href: "/blog/multi-channel-fundraising-are-you-missing-the-mark" },
    ],
  },
  {
    slug: "how-do-nonprofits-increase-individual-giving",
    pillar: "Fundraising Strategy",
    question: "How do nonprofits increase individual giving?",
    metaDescription: "Individual giving grows fastest through better segmentation and personalization, not through asking a broader audience for the same generic gift.",
    answer: [
      "Individual giving grows fastest through better segmentation and personalization, not through asking a broader audience for the same generic gift. Catapult's AF Connect program individualizes ask amounts using five-year giving history and applies 3 to 15+ differentiated calling attempts per donor rather than a single blanket appeal.",
      "Upgrading existing mid-level donors is typically a faster lever than acquiring new individual donors: Catapult's Donor Engagement program has produced 20-30% average gift growth at renewal and up to a 100% increase in meaningful donor engagement compared to mail-only outreach.",
      "Speed of stewardship matters as much as the ask itself. AF Connect sends thank-you letters within 24-48 hours of contact, since a fast, genuine thank-you measurably improves the odds of the next gift.",
    ],
    related: [
      { label: "Annual Fund Calling (AF Connect)", href: "/services/annual-fund" },
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
    ],
  },

  // ---------------------------------------------------------------------
  // 4. DONOR ACQUISITION & RETENTION
  // ---------------------------------------------------------------------
  {
    slug: "how-do-you-reactivate-lapsed-donors",
    pillar: "Donor Acquisition & Retention",
    question: "How do you reactivate lapsed donors?",
    metaDescription: "Lapsed donor reactivation works best as a distinct, segmented campaign rather than folding lapsed donors into a standard annual appeal.",
    answer: [
      "Lapsed donor reactivation works best as a distinct, segmented campaign rather than folding lapsed donors into a standard annual appeal. Catapult's Donor Engagement methodology builds a specific \"Reactivate\" segment, typically donors whose most recent gift was a meaningful amount but given many months or years ago, and reaches them with a personalized, multi-touch sequence: a preferred-channel message, a genuine thank-you call for their past support, and a personal invitation to re-engage.",
      "In a documented case for a faith-based organization, that Reactivate segment alone achieved a 32% higher response rate than the organization's historical benchmark, without discounting the ask or resorting to generic \"we miss you\" messaging.",
      "The common mistake is treating a lapsed donor's silence as disinterest rather than as a signal that the last stewardship touch didn't land, most lapsed donors respond well to being thanked and asked again, just not with the same message that didn't work the first time.",
    ],
    related: [
      { label: "Mid-Level Donor Engagement for a Faith-Based Organization", href: "/insights/case-studies/mid-level-donor-engagement-faith-based-organization" },
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
    ],
  },
  {
    slug: "how-do-you-increase-donor-retention",
    pillar: "Donor Acquisition & Retention",
    question: "How do you increase donor retention?",
    metaDescription: "Retention is driven far more by the quality and speed of stewardship between gifts than by the ask itself.",
    answer: [
      "Retention is driven far more by the quality and speed of stewardship between gifts than by the ask itself. Catapult's programs are built around fast, genuine touchpoints: thank-you letters within 24-48 hours of contact in AF Connect, and up to 15 differentiated, non-repetitive outreach attempts per donor so no donor is contacted the same way twice in a row.",
      "The Donor Engagement program adds structured stewardship touchpoints (thank-you calls, special-occasion calls, digital voicemail, handwritten notes) as a defined stage in the donor journey, not an afterthought, which is a meaningful driver of the up-to-100% increase in donor engagement Catapult has documented compared to mail-only outreach.",
      "The consistent theme across every program: donors who feel genuinely thanked and known are dramatically more likely to give again, regardless of channel.",
    ],
    related: [
      { label: "Seven Touchpoints for Donor Loyalty Between Asks", href: "/blog/seven-touchpoints-donor-loyalty-between-asks" },
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
    ],
  },
  {
    slug: "why-do-donors-stop-giving",
    pillar: "Donor Acquisition & Retention",
    question: "Why do donors stop giving?",
    metaDescription: "Most lapses aren't a loss of belief in the mission, they're a stewardship failure: the donor never received a genuine, timely thank-you, was never asked",
    answer: [
      "Most lapses aren't a loss of belief in the mission, they're a stewardship failure: the donor never received a genuine, timely thank-you, was never asked again in a way that felt personal, or simply lost touch with the organization's impact between appeals.",
      "That's why Catapult treats stewardship speed and personalization as core program design rather than an add-on: fast thank-yous, individualized ask amounts based on giving history, and multiple differentiated touchpoints across phone, text, email, and voicemail, so the organization stays present in a donor's life between asks, not just at solicitation time.",
    ],
    related: [
      { label: "Seven Touchpoints for Donor Loyalty Between Asks", href: "/blog/seven-touchpoints-donor-loyalty-between-asks" },
      { label: "Annual Fund Calling (AF Connect)", href: "/services/annual-fund" },
    ],
  },
  {
    slug: "how-can-nonprofits-increase-average-gift-size",
    pillar: "Donor Acquisition & Retention",
    question: "How can nonprofits increase average gift size?",
    metaDescription: "Average gift size grows most reliably when the ask amount is personalized to each donor's actual giving history and capacity, rather than a single",
    answer: [
      "Average gift size grows most reliably when the ask amount is personalized to each donor's actual giving history and capacity, rather than a single suggested amount applied across the board. Catapult's AF Connect program builds individualized ask amounts from five-year giving history for exactly this reason.",
      "Documented results bear this out: Catapult's AF Connect program lifted average gift size by 39% for Special Olympics of Indiana, and Donor Engagement programs have produced 20-30% average gift growth at renewal.",
      "Genuine cultivation before the ask, not just a bigger number on the appeal, is what makes a larger ask land. A donor who has been thanked, engaged, and shown real impact is far more receptive to an upgraded ask than one who receives an unexplained higher number in the mail.",
    ],
    related: [
      { label: "AF Connect — Special Olympics of Indiana", href: "/insights/case-studies/af-connect-special-olympics-indiana" },
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
    ],
  },

  // ---------------------------------------------------------------------
  // 5. PLANNED / LEGACY GIVING
  // ---------------------------------------------------------------------
  {
    slug: "how-do-you-start-a-planned-giving-program",
    pillar: "Planned Giving",
    question: "How do you start a planned giving program?",
    metaDescription: "The right starting point is almost never a new brochure or newsletter, it's a live conversation with the donors most likely to already be considering a",
    answer: [
      "The right starting point is almost never a new brochure or newsletter, it's a live conversation with the donors most likely to already be considering a legacy gift: the organization's most loyal, longest-tenured donors, often those giving consistently for 10+ years at modest annual levels.",
      "Catapult's Legacy Call program formalizes that starting point into a seven-step process: prospect identification using donor-data analysis, a donor list review with the client team, a pre-call letter previewing the conversation, qualification calls from a trained Stewardship Officer, referral to a Gift Planning Specialist for eligible prospects, confirmation and reporting, and a warm hand-off to the organization's internal team.",
      "A new planned giving program doesn't need to build all of this internally on day one, it needs the qualifying conversations to start, since 41% of planned giving donors give 10+ consecutive years and are already more receptive than most organizations assume.",
    ],
    related: [
      { label: "Legacy & Planned Giving Programs", href: "/services/legacy-giving" },
      { label: "Growing Your Legacy Society — Why Aren't We Asking?", href: "/blog/growing-your-legacy-society-why-arent-we-asking" },
    ],
  },
  {
    slug: "how-do-you-increase-planned-gifts",
    pillar: "Planned Giving",
    question: "How do you increase planned gifts?",
    metaDescription: "Planned gifts increase when an organization moves from passive marketing (a newsletter mention, a webpage) to active, live qualifying conversations with",
    answer: [
      "Planned gifts increase when an organization moves from passive marketing (a newsletter mention, a webpage) to active, live qualifying conversations with the donors most likely to have legacy-gift capacity, typically the longest-tenured, most loyal annual donors rather than the largest one-time givers.",
      "Catapult's Legacy Call methodology is built around that shift: Tier 1 qualifying calls reach 60-70% of prospects with a 10-15% positive response rate, and Tier 2 gift-planning follow-up conversations close 25-32% of those qualified leads, at an average confirmed gift commitment of roughly $48,500, often 200-300 times the donor's largest annual gift.",
      "Documented results scale with the size of the donor file reached: a two-phase Legacy Call program identified $6.8 million in planned gifts across 3,100 loyal donors for an international ministry, while a single-phase program for a New Jersey hospital secured $1,023,000 at a cost of just $0.06 per dollar raised.",
    ],
    related: [
      { label: "Legacy Call — International Ministry", href: "/insights/case-studies/legacy-call-international-ministry" },
      { label: "Legacy Call — New Jersey Hospital", href: "/insights/case-studies/legacy-call-new-jersey-hospital" },
    ],
  },
  {
    slug: "how-do-you-identify-planned-giving-prospects",
    pillar: "Planned Giving",
    question: "How do you identify planned giving prospects?",
    metaDescription: "The strongest planned giving prospects are almost never the organization's largest annual donors, they're the most loyal ones: donors who have given",
    answer: [
      "The strongest planned giving prospects are almost never the organization's largest annual donors, they're the most loyal ones: donors who have given consistently, often at modest levels, for a decade or more. That consistency is a stronger signal of legacy-gift readiness than gift size alone, since it reflects genuine, sustained affinity for the mission.",
      "Catapult's Legacy Call program identifies these prospects through proprietary donor-data analysis of the existing file, then confirms real interest through live Tier 1 qualifying calls rather than guessing from giving history alone. That two-step process (data analysis, then a real conversation) is what separates a legitimate prospect list from a mailing list.",
      "The Hill School's own experience illustrates the scale difference a live process makes: as Assistant Headmaster Christian Sockel put it, \"It would take about 8 years for one Director of Planned Giving to visit 1,000 donors; it took Legacy Calls 3 months.\"",
    ],
    related: [
      { label: "Legacy Calls — The Hill School", href: "/insights/case-studies/legacy-calls-hill-school" },
      { label: "Legacy & Planned Giving Programs", href: "/services/legacy-giving" },
    ],
  },

  // ---------------------------------------------------------------------
  // 6. ANNUAL FUND
  // ---------------------------------------------------------------------
  {
    slug: "how-do-you-increase-annual-giving",
    pillar: "Annual Fund",
    question: "How do you increase annual giving?",
    metaDescription: "Annual giving grows through better segmentation, personalized ask amounts, and faster stewardship, not simply more solicitations.",
    answer: [
      "Annual giving grows through better segmentation, personalized ask amounts, and faster stewardship, not simply more solicitations. Catapult's AF Connect program segments donors by giving history and interest group, sets individualized ask amounts from five-year giving history, and applies 3 to 15+ differentiated calling attempts so no donor is contacted the same way twice.",
      "Speed matters as much as personalization: thank-you letters go out within 24-48 hours of contact, and every AF Connect program includes digital stewardship (text, email, ringless voicemail, social) at no additional fee, layering modern touchpoints on top of the phone conversation rather than replacing it.",
      "Results back the approach: an AF Connect program for Special Olympics of Indiana achieved an 85% pledge rate with lapsed donors, nearly double the 45% industry average, while lifting average gift size by 39%.",
    ],
    related: [
      { label: "Annual Fund Calling (AF Connect)", href: "/services/annual-fund" },
      { label: "AF Connect — Special Olympics of Indiana", href: "/insights/case-studies/af-connect-special-olympics-indiana" },
    ],
  },
  {
    slug: "how-do-you-build-an-annual-fund",
    pillar: "Annual Fund",
    question: "How do you build an annual fund program?",
    metaDescription: "A strong annual fund starts with database work most organizations underinvest in: research, cleanup, and proper segmentation by giving history and",
    answer: [
      "A strong annual fund starts with database work most organizations underinvest in: research, cleanup, and proper segmentation by giving history and interest group, before a single call or letter goes out.",
      "From there, Catapult's AF Connect approach applies the standard of a face-to-face solicitation to every donor conversation, training Engagement Officers on the organization's specific mission and case rather than a generic script, and setting individualized ask amounts from five-year giving history.",
      "Consistent fulfillment closes the loop: thank-you letters within 24-48 hours, and dedicated fulfillment services to maximize collection of pledged dollars, since a pledge that's never collected doesn't help the annual fund total.",
    ],
    related: [
      { label: "Annual Fund Calling (AF Connect)", href: "/services/annual-fund" },
      { label: "How to Effectively Use the Phone Today", href: "/blog/how-to-effectively-use-the-phone-today" },
    ],
  },
];

export function getAnswerBySlug(slug: string): Answer | undefined {
  return ANSWERS.find((a) => a.slug === slug);
}

export function answersByPillar(): Record<string, Answer[]> {
  const grouped: Record<string, Answer[]> = {};
  for (const pillar of PILLARS) grouped[pillar] = [];
  for (const a of ANSWERS) {
    if (!grouped[a.pillar]) grouped[a.pillar] = [];
    grouped[a.pillar].push(a);
  }
  return grouped;
}
