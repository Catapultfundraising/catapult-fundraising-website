/**
 * Scoring for the public Campaign Readiness Report Card.
 *
 * The questions are the ones Catapult already asks at the start of a
 * feasibility study: who is committed, what is written down, who can give the
 * lead gift, who has asked for money before, what the data looks like, how the
 * annual fund is holding up, and where the plan stands.
 *
 * Two questions are graded against the visitor's own goal rather than on a
 * curve, using the same gift chart math as the calculator: the largest gift
 * they have ever received against the lead gift their goal requires, and the
 * size of their prospect list against the prospects that chart needs. That is
 * where most organizations find out their goal is ahead of their donor base.
 *
 * A report card is a starting point for a conversation, not a verdict. The
 * copy says so, and the recommendations point at the work that closes the gap.
 */

import { buildGiftChart, formatCompactDollars, formatDollars } from "@/lib/gift-chart";

export type AreaId =
  | "leadership"
  | "case"
  | "prospects"
  | "majorGifts"
  | "data"
  | "annualFund"
  | "plan";

export type Area = {
  id: AreaId;
  label: string;
  /** Share of the overall score, 0-1. Weights sum to 1. */
  weight: number;
  /** Why this area carries the weight it does. Shown on the report card. */
  why: string;
  /** Named on the report card when this area is the biggest risk. */
  risk: string;
};

export const AREAS: Area[] = [
  {
    id: "leadership",
    label: "Board and leadership commitment",
    weight: 0.2,
    why: "Campaigns are led by volunteers who have already given. Boards that plan to lead later do not lead at all.",
    risk: "Leadership is not in place yet. A campaign announced before the board has given and a chair has committed stalls in the first six months.",
  },
  {
    id: "case",
    label: "Case for support",
    weight: 0.15,
    why: "Donors give to a need they can repeat in their own words, not to a budget gap.",
    risk: "There is no tested case for support. Without one, early solicitations turn into explanations and the lead gifts get deferred.",
  },
  {
    id: "prospects",
    label: "Prospect depth at the top",
    weight: 0.2,
    why: "The top ten gifts carry 60 percent or more of any goal. Depth at the top decides the goal.",
    risk: "The top of the chart has no one standing behind it. The goal is currently ahead of the donor base, which is a goal problem before it is a fundraising problem.",
  },
  {
    id: "majorGifts",
    label: "Major gift experience",
    weight: 0.15,
    why: "Six figure gifts are closed in person by people who have done it before.",
    risk: "No one on the team has closed a gift at the level this campaign needs. That is a training and staffing decision to make before the quiet phase, not during it.",
  },
  {
    id: "data",
    label: "Data and infrastructure",
    weight: 0.1,
    why: "You cannot solicit a donor you cannot reach, and you cannot rate a prospect who is not in the file.",
    risk: "The donor file cannot support a campaign yet. Screening and clean up are cheap compared to the gifts missed because a record was unusable.",
  },
  {
    id: "annualFund",
    label: "Annual fund and retention",
    weight: 0.1,
    why: "The annual fund is where campaign donors come from, and it still has to be there when the campaign ends.",
    risk: "The annual fund is losing ground. A campaign layered on a shrinking donor base borrows from next year to pay for this one.",
  },
  {
    id: "plan",
    label: "Plan and timeline",
    weight: 0.1,
    why: "A campaign without a written plan and a staffed quiet phase becomes an announcement with a thermometer.",
    risk: "There is no written plan behind the goal. The goal is a number until the gift chart, the prospect list, and the timeline agree with each other.",
  },
];

export type Choice = {
  label: string;
  /** 0-1. */
  score: number;
};

export type Question = {
  id: string;
  area: AreaId;
  prompt: string;
  help?: string;
  /** "choice" questions are scored from the option picked. */
  kind: "choice" | "dollar" | "count";
  choices?: Choice[];
  /** Advice printed when this question scores low. */
  fix: string;
};

export const QUESTIONS: Question[] = [
  {
    id: "boardGiving",
    area: "leadership",
    prompt: "How many of your board members made a personal gift in the last 12 months?",
    kind: "choice",
    choices: [
      { label: "All of them", score: 1 },
      { label: "Most of them", score: 0.7 },
      { label: "About half", score: 0.4 },
      { label: "Few or none", score: 0 },
    ],
    fix: "Get to 100 percent board giving before you go public. Any gift size counts, and the number is the first thing a major donor asks about.",
  },
  {
    id: "chair",
    area: "leadership",
    prompt: "Do you have a campaign chair or co-chairs identified and committed?",
    kind: "choice",
    choices: [
      { label: "Committed and ready to open doors", score: 1 },
      { label: "Identified but not yet asked", score: 0.5 },
      { label: "No one identified yet", score: 0 },
    ],
    fix: "Recruit a chair who can give and who can ask. Name the specific gifts you need them to help open, and ask them to make their own commitment first.",
  },
  {
    id: "boardVote",
    area: "leadership",
    prompt: "Has the board formally voted to move forward with a campaign?",
    kind: "choice",
    choices: [
      { label: "Yes, on the record", score: 1 },
      { label: "Discussed but not voted", score: 0.5 },
      { label: "Not raised with the board yet", score: 0 },
    ],
    fix: "Put the campaign to a recorded board vote. It converts general enthusiasm into shared accountability for the goal.",
  },
  {
    id: "writtenCase",
    area: "case",
    prompt: "Is there a written case for support?",
    kind: "choice",
    choices: [
      { label: "An approved written case", score: 1 },
      { label: "A rough draft", score: 0.6 },
      { label: "Only a project budget or drawings", score: 0.3 },
      { label: "Nothing written yet", score: 0 },
    ],
    fix: "Draft the case around the donor's outcome rather than the building. Budgets and renderings support a case, they are not the case.",
  },
  {
    id: "caseTested",
    area: "case",
    prompt: "Can you state the need in one sentence a donor would repeat?",
    kind: "choice",
    choices: [
      { label: "Yes, and we have tested it on donors", score: 1 },
      { label: "Yes, internally", score: 0.55 },
      { label: "Still working on it", score: 0 },
    ],
    fix: "Test the sentence on ten donors before you print anything. What they repeat back is your case, whatever the brochure says.",
  },
  {
    id: "largestGift",
    area: "prospects",
    prompt: "What is the largest single gift your organization has ever received?",
    help: "Graded against the lead gift your goal requires.",
    kind: "dollar",
    fix: "Close the gap between your largest gift ever and the lead gift the goal needs, either by finding the prospects who can make it or by phasing the goal.",
  },
  {
    id: "leadProspects",
    area: "prospects",
    prompt: "How many individuals, foundations or companies could realistically give your lead gift?",
    kind: "choice",
    choices: [
      { label: "Three or more", score: 1 },
      { label: "One or two", score: 0.5 },
      { label: "None identified", score: 0 },
    ],
    fix: "Build a named list of at least three credible lead gift prospects. One prospect for the lead gift is not a plan, it is a hope.",
  },
  {
    id: "prospectCount",
    area: "prospects",
    prompt: "How many qualified prospects are on your list for this campaign?",
    help: "Graded against three qualified prospects per gift on your chart.",
    kind: "count",
    fix: "Screen the file and rate the top of it. Plan on roughly three qualified prospects for every gift the chart needs.",
  },
  {
    id: "closerExperience",
    area: "majorGifts",
    prompt: "Does anyone on staff or the board have experience closing six figure gifts?",
    kind: "choice",
    choices: [
      { label: "Several people do", score: 1 },
      { label: "One person does", score: 0.6 },
      { label: "No one does", score: 0 },
    ],
    fix: "Pair whoever will make the top asks with someone who has closed gifts at that level, whether that is a volunteer, a consultant, or a new hire.",
  },
  {
    id: "visits",
    area: "majorGifts",
    prompt: "Do you make face to face solicitation visits today?",
    kind: "choice",
    choices: [
      { label: "Regularly", score: 1 },
      { label: "Occasionally", score: 0.5 },
      { label: "No", score: 0 },
    ],
    fix: "Start visits now, before the campaign. A team that has not asked in person all year will not start with a seven figure ask.",
  },
  {
    id: "movesManagement",
    area: "majorGifts",
    prompt: "Do you have a moves management or portfolio process?",
    kind: "choice",
    choices: [
      { label: "Documented, with assigned portfolios", score: 1 },
      { label: "Informal", score: 0.5 },
      { label: "None", score: 0 },
    ],
    fix: "Assign every top prospect an owner and a next step with a date. A campaign is a scheduling problem as much as a persuasion problem.",
  },
  {
    id: "crm",
    area: "data",
    prompt: "What system holds your donor records?",
    kind: "choice",
    choices: [
      { label: "A current donor CRM", score: 1 },
      { label: "An older database", score: 0.6 },
      { label: "Spreadsheets", score: 0.2 },
    ],
    fix: "Get the file into one system that can hold ratings, proposals, and pledge schedules before the quiet phase starts.",
  },
  {
    id: "contactData",
    area: "data",
    prompt: "Roughly what share of your donor records have usable phone or email?",
    kind: "choice",
    choices: [
      { label: "Most of them", score: 1 },
      { label: "About half", score: 0.5 },
      { label: "Few of them", score: 0.1 },
      { label: "We are not sure", score: 0.25 },
    ],
    fix: "Run an append and a screening pass. Unreachable records are the cheapest gifts you will ever recover.",
  },
  {
    id: "annualTrend",
    area: "annualFund",
    prompt: "How has annual giving trended over the last three years?",
    kind: "choice",
    choices: [
      { label: "Up", score: 1 },
      { label: "Flat", score: 0.55 },
      { label: "Down", score: 0.1 },
    ],
    fix: "Stabilize annual giving before or alongside the campaign, and budget for it during the campaign rather than pausing it.",
  },
  {
    id: "retention",
    area: "annualFund",
    prompt: "Roughly what is your donor retention rate?",
    kind: "choice",
    choices: [
      { label: "Over 60 percent", score: 1 },
      { label: "40 to 60 percent", score: 0.6 },
      { label: "Under 40 percent", score: 0.15 },
      { label: "We are not sure", score: 0.3 },
    ],
    fix: "Fix acknowledgment speed and second gift follow up first. Retention gains compound through a multi year campaign.",
  },
  {
    id: "planStage",
    area: "plan",
    prompt: "Where are you in planning?",
    kind: "choice",
    choices: [
      { label: "Feasibility study complete", score: 1 },
      { label: "Study underway", score: 0.75 },
      { label: "Already in a quiet phase without a study", score: 0.4 },
      { label: "No study yet", score: 0.15 },
    ],
    fix: "Test the goal, the case, and the top of the chart with confidential interviews before the goal becomes public.",
  },
];

export type Answers = Record<string, number>;

export type AreaResult = {
  area: Area;
  /** 0-100. */
  score: number;
  grade: string;
  /** Weighted points lost, used to rank the risks. */
  gap: number;
  /** The lowest scoring question in this area. */
  weakest: Question | null;
};

export type ReadinessVerdict = {
  label: string;
  summary: string;
  nextStep: string;
};

export type ReadinessReport = {
  goal: number;
  org: string;
  /** 0-100 weighted overall score. */
  score: number;
  grade: string;
  verdict: ReadinessVerdict;
  areas: AreaResult[];
  biggestRisk: AreaResult;
  /** Three prioritized actions, worst area first. */
  nextSteps: { area: string; action: string }[];
  /** Lead gift the goal requires, from the gift chart math. */
  leadGift: number;
  /** Qualified prospects the chart requires. */
  prospectsNeeded: number;
  largestGift: number;
  prospectCount: number;
  /** Plain sentence comparing their biggest gift to the lead gift needed. */
  leadGiftNote: string;
  prospectNote: string;
};

const GRADES: { min: number; grade: string }[] = [
  { min: 90, grade: "A" },
  { min: 85, grade: "A-" },
  { min: 80, grade: "B+" },
  { min: 75, grade: "B" },
  { min: 70, grade: "B-" },
  { min: 65, grade: "C+" },
  { min: 60, grade: "C" },
  { min: 55, grade: "C-" },
  { min: 50, grade: "D+" },
  { min: 45, grade: "D" },
  { min: 0, grade: "F" },
];

export function gradeFor(score: number): string {
  return GRADES.find((g) => score >= g.min)?.grade ?? "F";
}

/** Ratio scoring used by the two questions graded against the goal. */
function ratioScore(ratio: number): number {
  if (ratio >= 1) return 1;
  if (ratio >= 0.6) return 0.8;
  if (ratio >= 0.35) return 0.6;
  if (ratio >= 0.15) return 0.35;
  if (ratio > 0) return 0.15;
  return 0;
}

function questionScore(question: Question, answers: Answers, leadGift: number, prospectsNeeded: number): number {
  const raw = answers[question.id];
  if (raw === undefined || Number.isNaN(raw)) return 0;

  if (question.kind === "choice") {
    return question.choices?.[raw]?.score ?? 0;
  }
  if (question.id === "largestGift") {
    return ratioScore(raw / leadGift);
  }
  return ratioScore(raw / prospectsNeeded);
}

const VERDICTS: { min: number; verdict: ReadinessVerdict }[] = [
  {
    min: 80,
    verdict: {
      label: "Ready to build the campaign plan",
      summary:
        "The pieces a campaign runs on are in place. What is left is sequencing: a final gift chart against real names, assignments for the top of the chart, and a timeline the board signs off on.",
      nextStep: "Move to campaign planning and put dates against the top twenty asks.",
    },
  },
  {
    min: 65,
    verdict: {
      label: "Ready for a feasibility study",
      summary:
        "There is enough here to test a goal with donors rather than guess at one. A study is how you find out which parts of the chart hold and which need a different name behind them.",
      nextStep: "Start a feasibility study and interview the people the top of the chart depends on.",
    },
  },
  {
    min: 50,
    verdict: {
      label: "Close, but fix the gaps first",
      summary:
        "The foundation is partly built. Fixing the two or three items below before you test a goal will change the answer you get, and will change it in your favor.",
      nextStep: "Work the gaps below for one or two quarters, then test the goal.",
    },
  },
  {
    min: 0,
    verdict: {
      label: "Build the base first",
      summary:
        "A campaign right now would be asking a donor base that is not ready to carry it. The good news is that the work in front of you is ordinary fundraising work, and it pays off with or without a campaign.",
      nextStep: "Focus on board giving, major gift visits, and the donor file before setting a public goal.",
    },
  },
];

export function buildReadinessReport(input: {
  goal: number;
  org?: string;
  answers: Answers;
}): ReadinessReport {
  const chart = buildGiftChart(input.goal);
  const leadGift = chart.leadGift;
  const prospectsNeeded = chart.totalProspects;
  const largestGift = Number(input.answers.largestGift) || 0;
  const prospectCount = Number(input.answers.prospectCount) || 0;

  const areas: AreaResult[] = AREAS.map((area) => {
    const questions = QUESTIONS.filter((q) => q.area === area.id);
    const scored = questions.map((q) => ({
      question: q,
      score: questionScore(q, input.answers, leadGift, prospectsNeeded),
    }));
    const average = scored.reduce((sum, s) => sum + s.score, 0) / (scored.length || 1);
    const weakest = scored.slice().sort((a, b) => a.score - b.score)[0];
    return {
      area,
      score: Math.round(average * 100),
      grade: gradeFor(average * 100),
      gap: area.weight * (1 - average),
      weakest: weakest && weakest.score < 0.9 ? weakest.question : null,
    };
  });

  const score = Math.round(areas.reduce((sum, a) => sum + a.score * a.area.weight, 0));
  const ranked = areas.slice().sort((a, b) => b.gap - a.gap);
  const biggestRisk = ranked[0];

  const nextSteps = ranked
    .filter((a) => a.weakest)
    .slice(0, 3)
    .map((a) => ({ area: a.area.label, action: a.weakest!.fix }));

  const leadGiftNote =
    largestGift >= leadGift
      ? `Your goal needs a lead gift of about ${formatCompactDollars(leadGift)}, and you have already received a gift of ${formatDollars(largestGift)}. The top of the chart is credible.`
      : `Your goal needs a lead gift of about ${formatCompactDollars(leadGift)}. The largest gift you have ever received is ${formatDollars(largestGift)}, so the top of the chart depends on a gift larger than any in your history.`;

  const prospectNote =
    prospectCount >= prospectsNeeded
      ? `A ${formatDollars(chart.goal)} chart needs about ${prospectsNeeded.toLocaleString("en-US")} qualified prospects, and you have ${prospectCount.toLocaleString("en-US")} on the list.`
      : `A ${formatDollars(chart.goal)} chart needs about ${prospectsNeeded.toLocaleString("en-US")} qualified prospects at three per gift. You have ${prospectCount.toLocaleString("en-US")}, which leaves roughly ${Math.max(prospectsNeeded - prospectCount, 0).toLocaleString("en-US")} to identify.`;

  return {
    goal: chart.goal,
    org: (input.org || "").trim(),
    score,
    grade: gradeFor(score),
    verdict: VERDICTS.find((v) => score >= v.min)!.verdict,
    areas,
    biggestRisk,
    nextSteps,
    leadGift,
    prospectsNeeded,
    largestGift,
    prospectCount,
    leadGiftNote,
    prospectNote,
  };
}

/**
 * Compact URL encoding so the PDF route can rebuild the exact report card the
 * visitor saw: one character per question in QUESTIONS order, choice answers as
 * their option index and the two numeric answers as a dash placeholder.
 */
export function encodeAnswers(answers: Answers): string {
  return QUESTIONS.map((q) => {
    if (q.kind !== "choice") return "-";
    const value = answers[q.id];
    return value === undefined || value === null || Number.isNaN(value) ? "x" : String(value);
  }).join("");
}

export function decodeAnswers(encoded: string, largestGift: number, prospectCount: number): Answers {
  const answers: Answers = {};
  QUESTIONS.forEach((q, index) => {
    if (q.kind !== "choice") return;
    const char = encoded[index];
    if (char === undefined || char === "-" || char === "x") return;
    const value = Number(char);
    if (Number.isFinite(value) && q.choices?.[value]) answers[q.id] = value;
  });
  answers.largestGift = largestGift;
  answers.prospectCount = prospectCount;
  return answers;
}

/** True when every question has an answer. */
export function isComplete(answers: Answers): boolean {
  return QUESTIONS.every((q) => {
    const value = answers[q.id];
    if (q.kind === "choice") return value !== undefined && q.choices?.[value] !== undefined;
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  });
}
