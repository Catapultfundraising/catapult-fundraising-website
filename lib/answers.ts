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

export interface AnswerSection {
  heading: string;
  body?: string[];
  bullets?: string[];
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
  // Optional in-depth body rendered below `answer` as H2 sections. The short
  // `answer` paragraphs stay the extractable direct answer (and the FAQPage
  // schema text); `sections` is the supporting depth a buyer researching the
  // decision actually reads. Only the highest-intent questions carry it.
  sections?: AnswerSection[];
  // Optional pointer to the service page that should rank for the commercial
  // version of this question. Rendered right under the short answer so Google
  // sees one clear primary page for the head term instead of rotating between
  // the answer, the service page, and related articles.
  primaryService?: { label: string; href: string; blurb: string };
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
      { label: "Feasibility Studies", href: "/services/feasibility-study" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
      { label: "Loyalty, Not Wealth: Jeff Grandy on Finding Your Next Legacy Donor", href: "/blog/planned-giving-loyalty-jeff-grandy-first-day-podcast" },
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
    sections: [
      {
        heading: "The goal is confirmed, not chosen",
        body: [
          "Most goals that fail were set in a boardroom by working backward from a construction estimate. The building costs $12 million, therefore the campaign is $12 million. Donor capacity was never part of the arithmetic.",
          "A defensible goal runs the other direction. The feasibility study interviews the top of your prospect list, tests specific gift ranges, and produces a number the prospects themselves indicated they can support. If that number is short of the project cost, you phase the project, extend the timeline, or go back to the capital budget. What you do not do is announce the gap and hope.",
        ],
      },
      {
        heading: "Build the gift chart before you name the number",
        body: [
          "A gift chart maps how many gifts at each level the goal requires, from a small number of leadership gifts at the top to a wider base below. The pattern is consistent across sectors: roughly 80 to 90 percent of the dollars come from the top 10 to 20 percent of donors.",
          "The chart is a readiness test, not a formatting exercise. If your goal requires three gifts at the top level and you can name one plausible prospect for the first, the goal is not yet real. Catapult builds the chart during Campaign Planning from actual screened prospect data and then tracks solicitations against it through the quiet phase, so the board can see the gap in the specific place it exists.",
        ],
      },
      {
        heading: "Rules of thumb, and their limits",
        body: [
          "Advisors sometimes quote shortcuts, such as a campaign goal of three to five times your best annual fundraising year, or a lead gift of 10 to 20 percent of the total. These are useful sanity checks and nothing more. An organization with one exceptional donor family can beat every ratio. An organization with a broad but shallow base will miss all of them.",
          "Use the ratios to decide whether a number is worth studying. Use the study to decide whether it is worth announcing.",
        ],
      },
      {
        heading: "What belongs inside the goal",
        bullets: [
          "Construction or acquisition cost, with a contingency your finance team signs off on.",
          "Furnishings, technology and equipment, which are routinely left out and then funded from operations.",
          "Endowment for the ongoing cost of operating whatever you are building.",
          "Campaign costs, including counsel, materials and events.",
          "Any debt the project retires, if donors are being asked to cover it.",
        ],
      },
      {
        heading: "Pledges, payment periods and what you can actually spend",
        body: [
          "Campaign gifts are usually pledged over three to five years, so a fully subscribed goal is not cash in hand on announcement day. Model the pledge payment schedule against the construction draw schedule before you commit to a timeline, and plan for attrition on multi year pledges rather than assuming full collection.",
        ],
      },
      {
        heading: "When the study number comes in short",
        body: [
          "This happens more often than boards expect, and it is not the end of the project. There are four honest responses. Phase the project, so the campaign funds what donors will fund now and a later phase carries the rest. Extend the timeline, which lets more prospects be cultivated to capacity rather than asked early. Revisit the capital budget with the architect and the finance committee. Or spend twelve to eighteen months on donor engagement and annual fund work and then retest.",
          "The dishonest response is announcing the original number anyway. A campaign that stalls in public costs the organization credibility with exactly the donors it will need for the next attempt.",
        ],
      },
      {
        heading: "Getting the board to a number it can defend",
        body: [
          "Board members will be asked what the goal is based on, most often by the donors whose gifts the campaign depends on. Give them a one page answer: the number of interviews conducted, what prospects indicated, the gift chart, and the board's own committed giving. A board that can answer that question sells the campaign. A board that says the number came from the construction estimate does not.",
        ],
      },
    ],
    related: [
      { label: "Free Gift Chart Calculator", href: "/resources/gift-chart-calculator" },
      { label: "Capital Campaigns for Schools and Universities", href: "/services/capital-campaign/education" },
      { label: "Feasibility Studies", href: "/services/feasibility-study" },
      { label: "Planning a Capital Campaign Gift Chart & Quiet Phase", href: "/blog/planning-a-capital-campaign-gift-chart-quiet-phase" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
      { label: "How Much Does a Capital Campaign Cost?", href: "/blog/how-much-does-a-capital-campaign-cost" },
    ],
  },
  {
    slug: "how-much-does-a-capital-campaign-consultant-cost",
    primaryService: {
      label: "Capital campaign consulting",
      href: "/services/capital-campaign",
      blurb: "How Catapult carries a campaign from feasibility study through quiet-phase major gifts and a staffed public phase, with one accountable team.",
    },
    pillar: "Capital Campaigns",
    question: "How much does a capital campaign consultant cost, and what does a consultant actually do?",
    metaTitle: "How much does a capital campaign consultant cost?",
    metaDescription: "Capital campaign consulting fees vary based on the campaign's dollar goal, timeline, and scope, whether an organization needs a feasibility study alone or",
    answer: [
      "Capital campaign consulting fees vary based on the campaign's dollar goal, timeline, and scope, whether an organization needs a feasibility study alone or full quiet-phase and public-phase management. Catapult builds a customized proposal after an initial conversation about goals and readiness rather than quoting a flat rate up front.",
      "What a consultant does across that engagement: runs the feasibility study and helps write the case statement, prioritizes and reviews prospect data, recruits and trains the Campaign Committee, provides the strategy and coaching behind major gift solicitations during the Quiet Phase, and, in Catapult's case, is the only national firm that also staffs the public-phase calling program with trained Engagement Officers rather than treating it as an afterthought handed to a separate vendor.",
      "That last point matters for cost comparisons: many organizations end up paying three separate vendors (a feasibility consultant, a campaign counsel firm, and a calling company) where Catapult is a single accountable partner across all five phases.",
    ],
    sections: [
      {
        heading: "What drives the fee",
        body: [
          "Four things move a campaign counsel fee more than anything else. The dollar goal, because a $3 million church campaign and a $50 million university campaign do not need the same team. The timeline, because a quiet phase that runs 24 to 36 months costs more to staff than a nine month study. The scope, meaning whether you are buying the feasibility study alone or feasibility, planning, quiet phase counsel and a public phase calling program. And travel, because in person interviews and on site committee meetings carry real cost that a phone only engagement does not.",
          "Catapult prices each engagement after a conversation about goal, readiness and timeline rather than publishing a flat rate, because a flat rate either overcharges the small campaign or underserves the large one.",
        ],
      },
      {
        heading: "Retainer, project fee, and why nobody credible charges a percentage",
        body: [
          "Most reputable firms, including Catapult, work on a fixed monthly retainer for a defined term, or a project fee for a defined deliverable like a study. You know the number before you start and it does not change if the campaign goes well.",
          "What you should not accept is a consultant paid a percentage of dollars raised, or one paid on commission. The Association of Fundraising Professionals Code of Ethical Standards is explicit that fundraisers should not accept percentage based compensation, and for good reason. A consultant paid on commission has an incentive to chase the easy gift rather than the right gift, and donors who learn a share of their gift went to a commission rarely give again.",
        ],
      },
      {
        heading: "Count the vendors, not just the invoices",
        body: [
          "Cost comparisons usually break down because organizations compare one firm's proposal to another firm's proposal, when the real comparison is one relationship against three. A common path is a feasibility consultant for the study, a campaign counsel firm for the quiet phase, and a separate telefunding vendor for the public phase.",
          "Three vendors means three contracts, three onboarding periods, three sets of prospect data handoffs, and nobody accountable for the whole result. Catapult is a single firm across all five phases, including staffing the public phase with trained Engagement Officers rather than handing it off. Whether that comes out cheaper depends on the campaign, but it is the honest comparison to run.",
        ],
      },
      {
        heading: "What you should get for the fee",
        bullets: [
          "A feasibility study with real interviews, not a survey link, and a written report with a confirmed or corrected goal.",
          "A gift chart built from your actual prospect data, tested against capacity rather than aspiration.",
          "Case statement and campaign material development, not just editing what your staff writes.",
          "Campaign Chair and Steering Committee recruitment and training, plus solicitation coaching before volunteers face a donor.",
          "Named senior counsel who attends your committee meetings, not a pitch team that hands you off to a junior associate after signing.",
          "Regular written progress reporting against the gift chart so the board can see where the campaign stands.",
        ],
      },
      {
        heading: "A cheap study is the most expensive line item in a campaign",
        body: [
          "The single most costly mistake we see is buying the least expensive study available and then launching against the goal it produced. A thin study means fewer interviews, less candid feedback, and a goal built on optimism. Organizations then spend three years chasing a number their donor base was never going to reach, and the campaign is remembered as a failure even though the fundraising work was competent.",
          "Spending appropriately at the front end is what keeps the rest of the budget from being wasted. If a proposal comes in far below everyone else, ask how many interviews it includes and who is conducting them.",
        ],
      },
    ],
    related: [
      { label: "Feasibility Studies", href: "/services/feasibility-study" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
      { label: "How Much Does a Capital Campaign Cost?", href: "/blog/how-much-does-a-capital-campaign-cost" },
      { label: "Catapult vs. Other Fundraising Consultants", href: "/blog/catapult-vs-fundraising-consultants" },
    ],
  },
  {
    slug: "what-is-a-capital-campaign-feasibility-study",
    primaryService: {
      label: "Capital campaign feasibility study",
      href: "/services/feasibility-study",
      blurb: "How Catapult runs a study: confidential interviews, a tested goal, a gift chart, and a written report for your board.",
    },
    pillar: "Feasibility Studies",
    question: "What is a capital campaign feasibility study, and who should conduct one?",
    metaTitle: "What is a capital campaign feasibility study?",
    metaDescription: "A feasibility study is the first phase of a Catapult capital campaign: a structured process of interviewing board members, staff, and top prospects to",
    answer: [
      "A feasibility study is the first phase of a Catapult capital campaign: a structured process of interviewing board members, staff, and top prospects to confirm (or rework) the campaign's dollar goal before it's announced, and to pressure-test the case for support.",
      "It should be conducted by an outside consultant rather than internal staff, because major donors and board members are far more candid with a neutral third party about concerns, giving capacity, and honest feedback on leadership than they would be face-to-face with the executive director asking for the gift.",
      "The output isn't just a yes/no on readiness. It's a confirmed (or adjusted) dollar goal, a draft case statement and budget, project prioritization, and the start of a Campaign Chair and Steering Committee recruitment list, all of which feed directly into Campaign Planning.",
    ],
    sections: [
      {
        heading: "What actually happens during a study",
        body: [
          "A study is a structured interview process, not a survey. Catapult typically conducts 25 to 30 confidential interviews for a single site organization, with more for a national or multi campus client, working from a prospect list the organization and the consultant build together. Interviews are conducted in person where possible, because a donor will say more across a table than on a call.",
          "Each conversation covers the same ground. Does the case for support make sense. Is the project the right priority for this organization right now. Who else should be at the table. Do you have confidence in the leadership and the board. And, near the end, would you consider a gift in a specific range if the campaign moves forward.",
        ],
      },
      {
        heading: "Why it has to be an outside consultant",
        body: [
          "This is the part organizations most often try to save money on, and the part where doing it internally quietly destroys the value. A longtime donor will not tell the executive director that they have doubts about the board, or that they think the building is the wrong project, or that their real capacity is triple what they have been giving. They will tell a neutral third party who is not going to ask them for the gift.",
          "The same holds inside the building. Board members and staff are far more candid about internal readiness, staffing gaps and past campaign fatigue when the interviewer does not report to anyone in the room.",
        ],
      },
      {
        heading: "What you get at the end",
        bullets: [
          "A confirmed goal, or a corrected one, with the reasoning and the prospect capacity behind it.",
          "A gift chart showing how many gifts at each level the goal requires.",
          "A tested case statement, revised against what donors said rather than what leadership hoped.",
          "Project prioritization, which matters when the study says you can fund phase one but not phase two yet.",
          "A recommended Campaign Chair and Steering Committee list drawn from the interviews.",
          "A candid readiness assessment covering staffing, data quality and board engagement.",
        ],
      },
      {
        heading: "Feasibility study, planning study, or readiness assessment",
        body: [
          "The terms overlap and firms use them differently. A feasibility study asks whether the goal is achievable. A planning study assumes the campaign is happening and focuses on how to structure it. A readiness assessment looks inward at staffing, data and board capacity rather than outward at donors.",
          "In practice a good study does all three at once, because a goal is only feasible if the organization can actually execute against it. What matters is not the label on the proposal but whether it includes real interviews with your top prospects and a written report you can hand to your board.",
        ],
      },
      {
        heading: "When a study says no",
        body: [
          "A study that never returns a hard answer is not worth what you paid for it. Sometimes the finding is that the goal is too high, that the case needs rebuilding, or that the organization needs a year of donor engagement work before it can ask for leadership gifts. That is a useful outcome, not a failure, and it is far cheaper than a public campaign that stalls at 40 percent.",
          "More often the finding is somewhere in the middle. The goal works if it is phased, or if two specific prospects can be cultivated further before they are asked, or if the board commits to its own giving first.",
        ],
      },
    ],
    related: [
      { label: "Why a Feasibility Study Matters Before a Capital Campaign", href: "/blog/why-a-feasibility-study-matters-before-a-capital-campaign" },
      { label: "Feasibility Studies", href: "/services/feasibility-study" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
      { label: "How Much Does a Capital Campaign Cost?", href: "/blog/how-much-does-a-capital-campaign-cost" },
    ],
  },
  {
    slug: "how-much-does-a-feasibility-study-cost",
    primaryService: {
      label: "Capital campaign feasibility study",
      href: "/services/feasibility-study",
      blurb: "How Catapult runs a study: confidential interviews, a tested goal, a gift chart, and a written report for your board.",
    },
    pillar: "Feasibility Studies",
    question: "How much does a fundraising feasibility study cost?",
    metaDescription: "Feasibility study cost varies with scope, but a well-run study generally ranges between $50,000 and $75,000, driven by interview volume, travel, and",
    answer: [
      "Feasibility study cost varies with scope, but a well-run study generally ranges between $50,000 and $75,000. The drivers are the number of prospect and stakeholder interviews conducted, how much of that interviewing happens in person, the geographic spread of those interviews, and whether the study is standalone or bundled with the full campaign engagement.",
      "A study priced well under that range usually buys fewer interviews, a thinner report, or a more junior team, which is exactly how organizations end up with a goal their donor base cannot reach. A 30-interview study for a single-site nonprofit is also a very different scope than a national organization needing interviews across multiple regions or chapters, so Catapult prices each study after an initial conversation.",
      "Many clients bundle the feasibility study into a broader Capital Campaign Counsel engagement, which prices more favorably than buying the phases one at a time, since the findings flow directly into Campaign Planning.",
    ],
    sections: [
      {
        heading: "What moves the price",
        bullets: [
          "Interview volume. Twenty five to thirty interviews is typical for a single site organization; national and multi campus clients need more.",
          "How many interviews happen in person rather than by phone or video.",
          "Geographic spread, which drives travel and scheduling time.",
          "Prospect research and screening, if your data needs work before interviews can be scheduled.",
          "Who does the work. Senior counsel conducting interviews costs more than a junior associate, and it shows in the report.",
          "Whether the study is standalone or bundled into a full campaign engagement.",
        ],
      },
      {
        heading: "What a study should include for that fee",
        body: [
          "A written report, not a slide summary. A confirmed or corrected goal with the capacity reasoning behind it. A gift chart. A revised case for support. Project prioritization. A recommended Campaign Chair and Steering Committee list. A candid readiness assessment of staffing, data and board engagement. And a presentation of findings to the board, which is where the value usually lands, because the board hears the donor feedback from a neutral party rather than filtered through staff.",
        ],
      },
      {
        heading: "Why the cheapest study costs the most",
        body: [
          "A study priced far under market buys fewer interviews, a thinner report, or a more junior team. The output looks similar. The difference shows up two years later, when the goal turns out to have been built on eight conversations and optimism, and the campaign stalls in public.",
          "Set against a multi million dollar campaign, the study is a small share of total cost and the single highest leverage decision in it. If a proposal is dramatically cheaper than the others, the question to ask is how many interviews it includes and who is conducting them.",
        ],
      },
      {
        heading: "Bundling with the campaign",
        body: [
          "Many clients fold the study into a broader Capital Campaign Counsel engagement, which prices more favorably than buying phases one at a time. The practical benefit is continuity: the people who heard what your donors actually said are the people building the plan, so nothing gets lost in a handoff to a second firm.",
          "If you would rather test the relationship before committing to the full engagement, a standalone study is a legitimate way to do that. Just confirm that the findings will be delivered in a form another firm could execute against.",
        ],
      },
      {
        heading: "Budgeting for it",
        body: [
          "Study costs are campaign costs and belong in the campaign budget, and in most cases a lead donor or a board member will underwrite the study specifically. It is a concrete, easy to explain ask: fund the work that tells us whether the campaign is real.",
        ],
      },
      {
        heading: "Questions to ask before you sign",
        bullets: [
          "How many interviews are included, and what happens if we want more.",
          "Who conducts them, by name, and how much of the work is delegated.",
          "How many are in person versus by phone or video.",
          "Is travel included in the fee or billed separately.",
          "Do we get a written report, and will you present the findings to our board.",
          "Does the study include a gift chart built from our own prospect data.",
          "Will you tell us plainly if the answer is that we are not ready.",
          "If we proceed to the campaign, how does the study fee apply to that engagement.",
        ],
      },
    ],
    related: [
      { label: "Why a Feasibility Study Matters Before a Capital Campaign", href: "/blog/why-a-feasibility-study-matters-before-a-capital-campaign" },
      { label: "Feasibility Studies", href: "/services/feasibility-study" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
    sections: [
      {
        heading: "The concentration is steeper than most boards expect",
        body: [
          "In a well structured campaign, roughly 80 to 90 percent of the dollars come from 10 to 20 percent of the donors, and the largest single gift often accounts for 10 to 20 percent of the goal on its own. Boards consistently guess a flatter distribution, which is why the first gift chart presentation is usually the most useful meeting of the planning phase.",
          "This is also why campaigns are not won by volume of activity. Ten well prepared leadership solicitations move a campaign further than a thousand letters.",
        ],
      },
      {
        heading: "How a gift chart is built",
        body: [
          "Start at the top with the lead gift level, sized as a meaningful share of the goal, then work down in tiers, roughly doubling the number of gifts at each step as the amounts fall. Because not every ask closes, the chart needs prospects in depth: a common working ratio is three to four qualified prospects for every gift required at a level, more at the very top where the pool is thinnest.",
          "Catapult builds the chart during Campaign Planning from the feasibility study's screened prospect data, then tracks committed, asked and outstanding against each level throughout the quiet phase. Anthony's rule for client charts is to use round gift levels and to have the chart reach the goal by the end of the major gift levels, so the campaign is not depending on a vague broad base line to close.",
        ],
      },
      {
        heading: "Where the rest comes from",
        body: [
          "The remaining 10 to 20 percent is the public phase. Catapult's Campaign Connect reaches the broader constituency, alumni, parents, grateful patients, members and subscribers, by phone to close that gap.",
          "The dollars matter, but the donor count matters more over time. A public phase run well adds thousands of donors and re engages lapsed ones, which is how the next campaign's mid level and major gift pipeline gets built. Treated as an afterthought, it closes the gap and leaves nothing behind.",
        ],
      },
      {
        heading: "Sector differences worth knowing",
        bullets: [
          "Higher education campaigns are typically the most concentrated, with alumni lead gifts carrying a large share of the goal.",
          "Church campaigns are usually flatter, because congregational giving is broad and sacrificial commitments come from across the membership rather than only the top.",
          "Social service organizations often lean more on foundations and corporations, which changes the prospect mix more than the concentration.",
          "Healthcare foundations depend heavily on grateful patient identification, which makes prospect research quality the limiting factor.",
        ],
      },
      {
        heading: "Common mistakes",
        bullets: [
          "Publishing a chart with a large unnamed base at the bottom to make the total work.",
          "Counting the same prospect at two different levels.",
          "Asking mid level prospects early, which anchors the campaign low.",
          "Never updating the chart after the first three gifts came in under ask.",
        ],
      },
      {
        heading: "Reading the chart during the campaign",
        body: [
          "A gift chart is a live management tool, not a planning artifact. Track three numbers at every level: gifts committed, asks outstanding, and qualified prospects remaining. The level to watch is never the one with the most activity, it is the highest level still open, because everything below it is anchored to what happens there.",
          "Two patterns should trigger a strategy conversation rather than more activity. Gifts closing consistently below the ask amount, which usually means asks are going out without enough cultivation. And a top level that stays open past the first year, which usually means the prospect pool at that level was thinner than the study suggested and needs rebuilding before the public phase is considered.",
        ],
      },
    ],
    related: [
      { label: "Free Gift Chart Calculator", href: "/resources/gift-chart-calculator" },
      { label: "Capital Campaigns for Healthcare Organizations", href: "/services/capital-campaign/healthcare" },
      { label: "Capital Campaigns for Social Service Organizations", href: "/services/capital-campaign/social-service" },
      { label: "Capital Campaigns for Churches and Faith Communities", href: "/services/capital-campaign/churches" },
      { label: "Capital Campaigns for Schools and Universities", href: "/services/capital-campaign/education" },
      { label: "Planning a Capital Campaign Gift Chart & Quiet Phase", href: "/blog/planning-a-capital-campaign-gift-chart-quiet-phase" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
    sections: [
      {
        heading: "What happens during the quiet phase",
        body: [
          "The quiet phase is where the campaign is actually won. Over roughly 24 to 36 months, the Campaign Chair, Steering Committee and staff work the top of the gift chart, asking individuals, foundations and corporations for the leadership gifts that carry the goal. Solicitations are sequenced from the top down, because the size of the first gifts sets the ceiling for everything after them.",
          "It is also the phase with the most preparation per ask. Each solicitation involves the right volunteer or staff pairing, a specific dollar range, a defined purpose, and a rehearsed conversation. A campaign that improvises its asks tends to hear a number the donor picked rather than the number the chart needs.",
        ],
      },
      {
        heading: "Board and leadership giving comes first",
        body: [
          "Before an outside prospect is asked, the board is asked. A campaign whose own board has not given at capacity has a very short answer waiting for it the first time a major donor asks what the board has committed. Getting 100 percent board participation, and getting it early, is one of the clearest predictors of a campaign that finishes.",
          "The same logic applies to staff leadership and to any past donor who is expected to be a lead gift. Sequence protects credibility.",
        ],
      },
      {
        heading: "When to announce publicly",
        body: [
          "The common benchmark is to announce once 70 to 80 percent or more of the goal is committed. That is not a superstition. A public launch is an act of social proof, and asking the broader community to fund an uncertain goal from near zero invites the question of why the people closest to the organization have not stepped up.",
          "The other half of the test is readiness, not just dollars. Are the materials done, is the website ready, can staff handle inbound volume, is the calling program staffed and trained. Catapult starts Campaign Connect only when the Chair and Steering Committee confirm both the threshold and that readiness.",
        ],
      },
      {
        heading: "Signs a quiet phase is in trouble",
        bullets: [
          "The top of the gift chart is still open twelve months in.",
          "Asks are being made without a specific dollar range attached.",
          "Board giving is incomplete and nobody wants to raise it.",
          "The committee meets but solicitation assignments do not move.",
          "The organization is talking about a public launch to create momentum, which is almost always a sign the quiet phase was cut short.",
        ],
      },
      {
        heading: "Quiet phase, silent phase, advance phase",
        body: [
          "These are the same thing under different names. Silent phase is the older term and still common in church campaigns. Advance gifts phase is sometimes used to describe just the leadership gift portion at the very top. Nothing about the work changes with the label.",
        ],
      },
      {
        heading: "Who does what during the quiet phase",
        body: [
          "The Campaign Chair opens doors and makes peer asks that staff cannot make. The Steering Committee carries assignments, reports on them, and holds each other accountable in meetings that have a real agenda. Staff prepare the materials, the research and the proposals, keep the pipeline current, and make sure no ask goes out unprepared.",
          "Counsel sits across all of it: building the strategy, coaching volunteers before solicitations, running committee meetings, and reporting progress against the gift chart so nobody is guessing where the campaign stands. The most common failure is a committee full of respected names with no assignments and no follow up, which produces meetings instead of gifts.",
        ],
      },
      {
        heading: "How long it really takes",
        body: [
          "Twenty four to thirty six months is typical, and the variable is rarely the number of prospects. It is calendar access to the top ten. Leadership prospects travel, sit on other boards, and have their own giving cycles, so a single lead gift conversation can take six months to arrange and three meetings to close.",
          "Plan the timeline from the top of the chart down, and treat any schedule that assumes every lead gift closes on the first ask as a wish rather than a plan.",
        ],
      },
    ],
    related: [
      { label: "Free Gift Chart Calculator", href: "/resources/gift-chart-calculator" },
      { label: "Capital Campaigns for Churches and Faith Communities", href: "/services/capital-campaign/churches" },
      { label: "Planning a Capital Campaign Gift Chart & Quiet Phase", href: "/blog/planning-a-capital-campaign-gift-chart-quiet-phase" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
    sections: [
      {
        heading: "Side by side",
        bullets: [
          "Purpose: a capital campaign funds a building, an endowment or a major program. The annual fund funds operations, this year.",
          "Duration: a campaign has a start date, a goal and an end. The annual fund never ends.",
          "Ask size: campaign asks are multi year commitments, often pledged over three to five years. Annual fund asks are single year gifts.",
          "Donor pool: campaigns are won at the top of the pyramid. The annual fund is where the base of that pyramid gets built and kept.",
          "Measure of success: a campaign is measured against its goal. The annual fund is measured on retention, average gift and donor count.",
        ],
      },
      {
        heading: "Why the annual fund is the campaign pipeline",
        body: [
          "The uncomfortable truth about capital campaigns is that they are largely decided before they start. Leadership gifts come from donors who already have a relationship with the organization, and that relationship almost always started with an annual gift. An organization that has let its annual fund shrink for five years does not have a prospect problem during its campaign, it has a cultivation problem it created earlier.",
          "This is why we do not treat the annual fund as the lesser program. It is the mechanism that produces the mid level donors who become the major donors a campaign depends on.",
        ],
      },
      {
        heading: "Running both without cannibalizing either",
        body: [
          "The real risk is not that donors give to the wrong thing, it is that they are asked twice with no explanation and give once. Sequencing solves most of it. Board and leadership donors are asked for the campaign commitment first and separately, with an explicit request to maintain annual giving alongside the pledge. Pledges are structured so the campaign payment does not replace the annual gift.",
          "The broader base is a different problem. During a quiet phase the annual fund often goes quiet too, because the development team is consumed by major gift work. That is where a calling program earns its place, keeping the base engaged and renewed while staff attention is on the top of the chart.",
        ],
      },
      {
        heading: "Where the two programs meet",
        body: [
          "Catapult coordinates the two deliberately. AF Connect keeps annual giving renewed and upgraded during the quiet phase, mid level donor engagement moves the tier just below major gift range into cultivation, and Campaign Connect then reaches the whole constituency by phone during the public phase to close the last 10 to 20 percent of the goal.",
          "The useful side effect is that the public phase does not just finish the campaign. It rebuilds and expands the donor base you will need for the next one.",
        ],
      },
      {
        heading: "Common questions",
        bullets: [
          "Can we pause the annual fund during a campaign. You can, and organizations that do usually spend the following three years rebuilding what they lost.",
          "Should a campaign gift count toward annual fund totals. Report them separately, or your annual fund trend line becomes unreadable.",
          "Can the same donor be asked for both in one year. Yes, if the two asks are coordinated, sequenced, and the reason for each is clear.",
        ],
      },
      {
        heading: "How to decide which one you need right now",
        body: [
          "If the need is a building, an endowment or a one time program launch, and you can name donors capable of leadership gifts, you are looking at a campaign, and the next step is a feasibility study rather than an announcement.",
          "If your donor count has been sliding, your retention rate is under half, or your average gift has been flat for three years, the campaign can wait. Fixing the annual fund first is not a delay, it is the cheapest campaign preparation available. Every retained donor is a future campaign prospect and every lapsed one is a prospect you will pay to reacquire.",
          "If both are true, which is common, sequence them. A year of disciplined annual fund and mid level engagement work before the study usually raises the goal the study can support.",
        ],
      },
    ],
    related: [
      { label: "Mid-Level Donor Engagement", href: "/services/donor-engagement" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
      { label: "Loyalty, Not Wealth: Jeff Grandy on Finding Your Next Legacy Donor", href: "/blog/planned-giving-loyalty-jeff-grandy-first-day-podcast" },
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
    sections: [
      {
        heading: "Start with the list, not the hire",
        body: [
          "The instinct is to hire a major gift officer and hand them the database. That is how good fundraisers burn out in eighteen months. Before anyone is hired, the prospect list needs screening and prioritization so there is a defined pool of names worth a visit, ranked by capacity and by affinity, not just by past gift size.",
          "Two donors who both gave $1,000 last year are not the same prospect. One may be giving at capacity. The other may be capable of a six figure commitment and has simply never been asked for more.",
        ],
      },
      {
        heading: "The pipeline stages",
        bullets: [
          "Identification: screening and research produce a ranked pool.",
          "Qualification: a real conversation confirms capacity, interest and willingness to engage. Most programs skip this and pay for it later.",
          "Cultivation: a sequence of meaningful touches, tours, briefings, volunteer roles, that connect the donor to the work.",
          "Solicitation: a specific number, for a specific purpose, from the right person.",
          "Fulfillment and reporting: the pledge is documented and the impact is reported back.",
          "Stewardship: consistent contact that has nothing to do with the next ask.",
        ],
      },
      {
        heading: "Where mid level donor engagement fits",
        body: [
          "The gap in most shops is the tier between annual fund and true major gift range. Those donors are too numerous for a major gift officer's portfolio and too valuable for a mass appeal, so they sit untouched for years.",
          "Catapult's Donor Engagement program is built for exactly that tier, running an eight stage journey from identification and prioritization, through a leadership introduction letter and a qualification call, into the gift phase, fulfillment and reporting, and ongoing stewardship. The purpose is to hand a major gifts program a pipeline of already qualified, already warmed prospects instead of asking one officer to discover and cultivate from a cold list.",
        ],
      },
      {
        heading: "Portfolio size, cadence and what to measure",
        body: [
          "A full time officer working genuine major gift relationships can carry roughly 100 to 150 qualified prospects, not 500. Each of those relationships needs a defined next step with a date on it, and the pipeline needs review at least monthly.",
          "Measure activity and progression, not just dollars, in the first two years. Visits completed, prospects qualified, proposals delivered and prospects moved from one stage to the next tell you whether the program is working long before the revenue arrives. Judging a new program on closed dollars in year one pushes officers toward the easy small gift and away from the relationships that matter.",
        ],
      },
      {
        heading: "What makes a program stall",
        bullets: [
          "No qualification step, so portfolios fill with names that were never real prospects.",
          "Leadership pulling the officer into events and administration.",
          "Asks with no number attached.",
          "No stewardship, which quietly caps every second gift.",
          "Turnover with no written relationship history, which resets the program to zero.",
        ],
      },
      {
        heading: "The first ninety days",
        body: [
          "A realistic start looks like this. Weeks one to four: screen and rank the database, and agree on what qualifies someone as a major gift prospect at your organization, which is a different number for a $2 million shop than a $50 million one. Weeks five to eight: build the initial portfolio from the top of that ranking and start qualification conversations, which are visits to learn, not to ask. Weeks nine to twelve: assign a next step with a date to every qualified prospect, get the first two or three proposals in front of donors, and set the monthly pipeline review that will keep the program honest.",
          "What does not belong in the first ninety days is a revenue target. Programs judged on dollars in quarter one drift straight back to the small, easy gifts they were built to move past.",
        ],
      },
    ],
    related: [
      { label: "How Do You Cultivate Major Donors?", href: "/answers/how-do-you-cultivate-major-donors" },
      { label: "Capital Campaign Consulting", href: "/services/capital-campaign" },
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
      { label: "Loyalty, Not Wealth: Jeff Grandy on Finding Your Next Legacy Donor", href: "/blog/planned-giving-loyalty-jeff-grandy-first-day-podcast" },
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
      { label: "Loyalty, Not Wealth: Jeff Grandy on Finding Your Next Legacy Donor", href: "/blog/planned-giving-loyalty-jeff-grandy-first-day-podcast" },
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
      { label: "Loyalty, Not Wealth: Jeff Grandy on Finding Your Next Legacy Donor", href: "/blog/planned-giving-loyalty-jeff-grandy-first-day-podcast" },
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
