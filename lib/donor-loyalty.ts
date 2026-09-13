/**
 * Scoring for the public Donor Loyalty and Legacy Report Card.
 *
 * This is the do-it-yourself version of the discovery conversation Catapult
 * has before recommending a Legacy Call program or a mid-level donor
 * engagement program. It grades two tracks separately, because they are two
 * different pools of people:
 *
 *  - Legacy: the small-dollar donors who have given for many consecutive
 *    years. Loyalty, not wealth, is what predicts a gift in a will.
 *  - Mid-level: the $250 to $4,999 donors nobody is assigned to, who are
 *    treated like direct mail names because there is no one to call them.
 *
 * Only the legacy track carries a dollar projection. Legacy outcomes across
 * Catapult programs are consistent enough to state as an average with a range.
 * Mid-level results depend entirely on the client's own file, band mix and
 * lapsed volume, so this tool reports pool size and coverage gaps instead of
 * inventing a per-donor number.
 *
 * Every count question accepts an estimate. The point is to start a
 * conversation, not to fail anyone for not knowing their own file.
 */

export type TrackId = "legacy" | "midlevel";

export type AreaId =
  | "loyaltyPool"
  | "legacyProgram"
  | "legacyStewardship"
  | "legacyDocumentation"
  | "midPool"
  | "midCoverage"
  | "midUpgrade"
  | "midReactivation";

export type Area = {
  id: AreaId;
  track: TrackId;
  label: string;
  /** Share of that track's score, 0-1. Weights sum to 1 per track. */
  weight: number;
  why: string;
  /** Named on the report card when this area is the track's biggest gap. */
  risk: string;
};

export const AREAS: Area[] = [
  {
    id: "loyaltyPool",
    track: "legacy",
    label: "Loyal donor pool",
    weight: 0.3,
    why: "Consecutive years of giving predicts a gift in a will far better than gift size does. A donor who has given $50 for fifteen years is a stronger legacy prospect than a donor who gave $10,000 once.",
    risk: "You cannot see your loyal donors yet. Until the file is sorted by consecutive years of giving, the best legacy prospects in the building stay invisible.",
  },
  {
    id: "legacyProgram",
    track: "legacy",
    label: "Asking for the gift",
    weight: 0.3,
    why: "Most bequests are never asked for. Organizations wait for donors to volunteer the information, and the ones who do not are counted as if they were not interested.",
    risk: "Nobody is asking. A planned gift is one of the few gifts that almost always requires the donor to be invited, and a brochure is not an invitation.",
  },
  {
    id: "legacyStewardship",
    track: "legacy",
    label: "Stewardship of small loyal gifts",
    weight: 0.2,
    why: "The loyal $100 donor is usually the least contacted person in the database, which is exactly backwards for planned giving.",
    risk: "Your most loyal small donors hear from you only when you are asking for money. That is the relationship a bequest conversation has to be built on.",
  },
  {
    id: "legacyDocumentation",
    track: "legacy",
    label: "Documentation and recognition",
    weight: 0.2,
    why: "An undocumented intention is a rumor. Documented expectancies can be stewarded, reported to the board, and protected through leadership changes.",
    risk: "Expectancies are not being documented or recognized, so the ones you already have cannot be stewarded and will not survive a staff change.",
  },
  {
    id: "midPool",
    track: "midlevel",
    label: "Mid-level pool visibility",
    weight: 0.3,
    why: "Mid-level donors are usually invisible because they are too big for direct mail treatment and too small for a major gift portfolio.",
    risk: "The mid-level band has not been isolated, so these donors are being treated as mail names and their upgrade potential is unmeasured.",
  },
  {
    id: "midCoverage",
    track: "midlevel",
    label: "Human coverage",
    weight: 0.3,
    why: "A mid-level program is not a mail program with better paper. It works because a person calls, listens, and asks.",
    risk: "No one owns these relationships. A $1,000 donor with no assigned person is a major gift prospect being managed by a mailing schedule.",
  },
  {
    id: "midUpgrade",
    track: "midlevel",
    label: "Upgrade path",
    weight: 0.2,
    why: "Without a defined next ask and a reason to move up, mid-level donors give the same amount for years and then stop.",
    risk: "There is no upgrade path. Donors who could double their giving are being asked for the same amount they gave the first time.",
  },
  {
    id: "midReactivation",
    track: "midlevel",
    label: "Reactivation and reachability",
    weight: 0.2,
    why: "Lapsed mid-level donors are the cheapest gifts on the table, and they are only recoverable while you can still reach them.",
    risk: "Lapsed mid-level donors are not being worked, or cannot be reached. Both are fixable, and both are costing money right now.",
  },
];

export type Choice = { label: string; score: number };

export type Question = {
  id: string;
  area: AreaId;
  prompt: string;
  help?: string;
  /** "count" questions are graded as a share of the total donor file. */
  kind: "choice" | "count";
  choices?: Choice[];
  /** Advice printed when this question scores low. */
  fix: string;
};

export const QUESTIONS: Question[] = [
  // Legacy track.
  {
    id: "loyalCount",
    area: "loyaltyPool",
    prompt: "About how many of your donors have given in 10 or more consecutive years?",
    help: "An estimate is fine. Most organizations have never counted this, and the estimate is enough to size the opportunity.",
    kind: "count",
    fix: "Run a consecutive-years report on the file, at any gift level. This one list is the foundation of a legacy program, and it usually surprises people.",
  },
  {
    id: "loyalVisibility",
    area: "loyaltyPool",
    prompt: "Can you produce a list of your longest-giving donors today?",
    kind: "choice",
    choices: [
      { label: "Yes, and we use it", score: 1 },
      { label: "We could build it if we had to", score: 0.55 },
      { label: "No, the system does not track it that way", score: 0.1 },
    ],
    fix: "Make loyalty a standing segment, not a one-time query. Consecutive years belongs next to gift amount in every report you look at.",
  },
  {
    id: "everAsked",
    area: "legacyProgram",
    prompt: "Have you ever directly asked loyal donors whether they have included you in their will?",
    kind: "choice",
    choices: [
      { label: "Yes, systematically", score: 1 },
      { label: "Once or twice, informally", score: 0.45 },
      { label: "Never", score: 0 },
    ],
    fix: "Start asking the question out loud. The single largest source of new expectancies is asking loyal donors directly, and most of the yes answers were already true and undisclosed.",
  },
  {
    id: "plannedGivingEffort",
    area: "legacyProgram",
    prompt: "What does your planned giving effort look like today?",
    kind: "choice",
    choices: [
      { label: "A staffed program with active conversations", score: 1 },
      { label: "Bequest language on the website and in appeals", score: 0.45 },
      { label: "Nothing active", score: 0 },
    ],
    fix: "Website language collects the donors who were going to tell you anyway. A conversation, by phone or in person, reaches the ones who never would.",
  },
  {
    id: "personalContact",
    area: "legacyStewardship",
    prompt: "How often does a loyal donor giving under $1,000 hear from a person, not a mailing?",
    kind: "choice",
    choices: [
      { label: "At least once a year, by phone or in person", score: 1 },
      { label: "Occasionally", score: 0.5 },
      { label: "Only through mail and email", score: 0.1 },
    ],
    fix: "Put a thank-you call program in front of the loyalty list. It raises annual giving on its own and it opens every legacy conversation that follows.",
  },
  {
    id: "loyaltyRecognition",
    area: "legacyStewardship",
    prompt: "Do you recognize donors for years of consecutive giving, not just amount?",
    kind: "choice",
    choices: [
      { label: "Yes", score: 1 },
      { label: "Informally", score: 0.5 },
      { label: "No, recognition is by gift level only", score: 0 },
    ],
    fix: "Recognize loyalty explicitly. Telling a donor you noticed twelve straight years of support costs nothing and is the most natural opening to a legacy conversation there is.",
  },
  {
    id: "expectancies",
    area: "legacyDocumentation",
    prompt: "Do you track documented bequest expectancies?",
    kind: "choice",
    choices: [
      { label: "Yes, with values and stewardship plans", score: 1 },
      { label: "We keep a list of names", score: 0.5 },
      { label: "No", score: 0 },
    ],
    fix: "Create one record type for expectancies with the donor, the intention, the date documented and who is stewarding it. Undocumented intentions disappear with the staff who heard them.",
  },
  {
    id: "legacySociety",
    area: "legacyDocumentation",
    prompt: "Do you have a legacy society or named recognition for planned gift donors?",
    kind: "choice",
    choices: [
      { label: "Yes, active", score: 1 },
      { label: "It exists on paper", score: 0.4 },
      { label: "No", score: 0 },
    ],
    fix: "Stand up a simple legacy society. It gives a donor a reason to tell you now instead of leaving it as a surprise for your successor.",
  },

  // Mid-level track.
  {
    id: "midCount",
    area: "midPool",
    prompt: "About how many donors give between $250 and $4,999 a year?",
    help: "An estimate is fine.",
    kind: "count",
    fix: "Isolate the $250 to $4,999 band and look at it as its own program. It is almost always larger than the team expects and almost never has an owner.",
  },
  {
    id: "midSegmented",
    area: "midPool",
    prompt: "Is that band treated as its own segment with its own strategy?",
    kind: "choice",
    choices: [
      { label: "Yes, its own strategy and reporting", score: 1 },
      { label: "It is segmented for mail only", score: 0.4 },
      { label: "No", score: 0 },
    ],
    fix: "Give the band its own goal, its own contact plan and its own report. What is not measured separately does not get managed.",
  },
  {
    id: "assigned",
    area: "midCoverage",
    prompt: "Are these donors assigned to a specific person on your team?",
    kind: "choice",
    choices: [
      { label: "Yes, all of them", score: 1 },
      { label: "Some of them", score: 0.5 },
      { label: "None of them", score: 0 },
    ],
    fix: "Assign every donor in the band to a person, even at a high ratio. An unassigned donor has no next step, and no next step means no upgrade.",
  },
  {
    id: "callCapacity",
    area: "midCoverage",
    prompt: "Does your team have the capacity to call this band every year?",
    kind: "choice",
    choices: [
      { label: "Yes, and we do", score: 1 },
      { label: "We want to, but there is no time", score: 0.35 },
      { label: "No", score: 0 },
    ],
    fix: "Decide honestly whether the calls will happen with current staffing. If not, the choice is not calling versus not calling, it is outsourced calling versus nothing.",
  },
  {
    id: "askStrategy",
    area: "midUpgrade",
    prompt: "Do you use a defined ask amount for each donor based on their giving history?",
    kind: "choice",
    choices: [
      { label: "Yes, personalized ask amounts", score: 1 },
      { label: "The same ask for the whole band", score: 0.35 },
      { label: "No defined ask", score: 0 },
    ],
    fix: "Set a personalized ask for every donor off their own history. Asking a $1,000 donor for $1,000 again is a decision, and it is the wrong one.",
  },
  {
    id: "midSociety",
    area: "midUpgrade",
    prompt: "Is there a giving society or benefit that gives donors a reason to move up?",
    kind: "choice",
    choices: [
      { label: "Yes", score: 1 },
      { label: "Only at higher levels", score: 0.5 },
      { label: "No", score: 0 },
    ],
    fix: "Create a rung between the annual fund and the major gift club. Donors upgrade toward something, not because you asked for a bigger number.",
  },
  {
    id: "lapsedWork",
    area: "midReactivation",
    prompt: "How do you work mid-level donors who have lapsed?",
    kind: "choice",
    choices: [
      { label: "A personal outreach plan", score: 1 },
      { label: "They stay in the mail file", score: 0.35 },
      { label: "We do not work them", score: 0 },
    ],
    fix: "Call the lapsed mid-level donors first. They have already proven they will give at that level, and the reason they stopped is usually recoverable.",
  },
  {
    id: "reachability",
    area: "midReactivation",
    prompt: "Roughly what share of these donors have a usable phone number or email?",
    kind: "choice",
    choices: [
      { label: "Most of them", score: 1 },
      { label: "About half", score: 0.5 },
      { label: "Few of them", score: 0.1 },
      { label: "We are not sure", score: 0.3 },
    ],
    fix: "Run a phone and email append on the band before anything else. You cannot have a conversation with a record you cannot reach.",
  },
];

export type Answers = Record<string, number>;

/* ------------------------------------------------------------------ *
 * Legacy projection
 *
 * Catapult's proposal model projects roughly 30 documented commitments per
 * 1,000 loyal prospects, at an average initial gift value that puts a 1,000
 * prospect program near $1.4M. Actual programs have ranged from over $850,000
 * per 1,000 prospects to well over $12M, so the projection is always presented
 * as an average with that range attached, never as a promise.
 * ------------------------------------------------------------------ */

const COMMITMENTS_PER_PROSPECT = 0.03;
const AVERAGE_INITIAL_VALUE_PER_1000 = 1_400_000;
/** Documented low end of Catapult's legacy results, per 1,000 prospects. */
const LOW_INITIAL_VALUE_PER_1000 = 850_000;
/** Below this many prospects a standalone program is not worth building yet. */
export const MIN_LEGACY_PROSPECTS = 500;
export const LEGACY_RANGE_NOTE =
  "Across Catapult's legacy programs, results have ranged from over $850,000 per 1,000 prospects to well over $12 million. Your own file, your donors' loyalty and their capacity decide where you land in that range.";

export type LegacyProjection = {
  prospects: number;
  commitments: number;
  averageValue: number;
  /** Documented low end, scaled to this pool. */
  lowValue: number;
  /** True when the pool is too small for a standalone program. */
  belowMinimum: boolean;
  headline: string;
  detail: string;
};

export function buildLegacyProjection(loyalCount: number): LegacyProjection {
  const prospects = Math.max(Math.round(loyalCount) || 0, 0);
  const commitments = Math.round(prospects * COMMITMENTS_PER_PROSPECT);
  const averageValue = Math.round((prospects / 1000) * AVERAGE_INITIAL_VALUE_PER_1000);
  const lowValue = Math.round((prospects / 1000) * LOW_INITIAL_VALUE_PER_1000);
  const belowMinimum = prospects < MIN_LEGACY_PROSPECTS;

  const headline = belowMinimum
    ? "Your loyal pool is smaller than a standalone legacy program needs"
    : `About ${commitments.toLocaleString("en-US")} documented commitments, averaging ${formatMoney(averageValue)} in initial gift value`;

  const detail = belowMinimum
    ? `A legacy calling program is usually built on at least ${MIN_LEGACY_PROSPECTS.toLocaleString("en-US")} loyal prospects. With about ${prospects.toLocaleString("en-US")}, the better first move is to widen the loyalty list, count donors at five or more consecutive years as well, and start the conversations by hand.`
    : `On average, a legacy program yields about 30 documented commitments per 1,000 loyal prospects. Applied to your estimated ${prospects.toLocaleString("en-US")} loyal donors, that is roughly ${commitments.toLocaleString("en-US")} documented expectancies with an average initial gift value near ${formatMoney(averageValue)}. This is an average, not a forecast: at the documented low end a pool this size would produce closer to ${formatMoney(lowValue)}, and the strongest programs have produced many times the average.`;

  return { prospects, commitments, averageValue, lowValue, belowMinimum, headline, detail };
}

function formatMoney(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions >= 10 ? Math.round(millions) : Number(millions.toFixed(1))} million`;
  }
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export { formatMoney };

/* ------------------------------------------------------------------ *
 * Grading
 * ------------------------------------------------------------------ */

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

/**
 * Count questions are graded on the share of the file they represent, not on
 * raw size, so a 900 donor organization is not punished for being small. A
 * healthy loyal segment is roughly a tenth of the file; a healthy mid-level
 * band is roughly a twentieth. Not knowing is never scored as zero: the
 * question accepts an estimate and a low answer only signals a thin pool.
 */
function shareScore(count: number, totalDonors: number, healthyShare: number): number {
  if (!totalDonors || totalDonors <= 0) return 0.5;
  const share = count / totalDonors;
  const ratio = share / healthyShare;
  if (ratio >= 1) return 1;
  if (ratio >= 0.6) return 0.8;
  if (ratio >= 0.3) return 0.6;
  if (ratio > 0) return 0.4;
  return 0.15;
}

function questionScore(question: Question, answers: Answers, totalDonors: number): number {
  const raw = answers[question.id];
  if (raw === undefined || Number.isNaN(raw)) return 0;
  if (question.kind === "choice") return question.choices?.[raw]?.score ?? 0;
  if (question.id === "loyalCount") return shareScore(raw, totalDonors, 0.1);
  return shareScore(raw, totalDonors, 0.05);
}

export type AreaResult = {
  area: Area;
  score: number;
  grade: string;
  gap: number;
  weakest: Question | null;
};

export type TrackResult = {
  id: TrackId;
  label: string;
  score: number;
  grade: string;
  areas: AreaResult[];
  biggestGap: AreaResult;
};

export type Recommendation = {
  /** Which program to start with. */
  headline: string;
  body: string;
  second: string;
};

export type LoyaltyReport = {
  org: string;
  totalDonors: number;
  loyalCount: number;
  midCount: number;
  legacy: TrackResult;
  midlevel: TrackResult;
  projection: LegacyProjection;
  /** Mid-level findings in counts, never in dollars. */
  midFindings: string[];
  recommendation: Recommendation;
  nextSteps: { area: string; action: string }[];
};

const TRACK_LABELS: Record<TrackId, string> = {
  legacy: "Legacy and planned giving readiness",
  midlevel: "Mid-level donor engagement readiness",
};

function buildTrack(track: TrackId, answers: Answers, totalDonors: number): TrackResult {
  const areas = AREAS.filter((a) => a.track === track).map((area) => {
    const questions = QUESTIONS.filter((q) => q.area === area.id);
    const scored = questions.map((q) => ({
      question: q,
      score: questionScore(q, answers, totalDonors),
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

  const score = Math.round(
    areas.reduce((sum, a) => sum + a.score * a.area.weight, 0) /
      areas.reduce((sum, a) => sum + a.area.weight, 0),
  );
  const biggestGap = areas.slice().sort((a, b) => b.gap - a.gap)[0];

  return { id: track, label: TRACK_LABELS[track], score, grade: gradeFor(score), areas, biggestGap };
}

function buildRecommendation(input: {
  legacy: TrackResult;
  midlevel: TrackResult;
  loyalCount: number;
  midCount: number;
  projection: LegacyProjection;
  answers: Answers;
}): Recommendation {
  const { legacy, midlevel, loyalCount, midCount, projection, answers } = input;
  const unassigned = (answers.assigned ?? 2) >= 1;
  const neverAsked = (answers.everAsked ?? 2) >= 1;

  const legacyReady = !projection.belowMinimum && neverAsked;
  const midReady = midCount >= 300 && unassigned;

  if (legacyReady && (!midReady || loyalCount >= midCount)) {
    return {
      headline: "Start with a legacy program",
      body: `You have roughly ${loyalCount.toLocaleString("en-US")} donors who have supported you for a decade or more, and no one has systematically asked them about a gift in their will. That is the clearest opportunity in your file, and it is also the one that is easiest to lose, because the window closes quietly.`,
      second: `Mid-level engagement is the natural second phase. You have about ${midCount.toLocaleString("en-US")} donors in the $250 to $4,999 band, and the coverage gaps below are what a mid-level program is built to close.`,
    };
  }

  if (midReady) {
    return {
      headline: "Start with mid-level donor engagement",
      body: `About ${midCount.toLocaleString("en-US")} of your donors give between $250 and $4,999, and they are not assigned to anyone. These are the donors most likely to double their giving if a person calls, listens and asks, and they are the pipeline your future major gifts come out of.`,
      second: projection.belowMinimum
        ? `On the legacy side, your loyal pool is still small for a standalone program. Widen the loyalty list first and handle those conversations personally as they come up.`
        : `A legacy program is the natural second phase. Your loyal pool of about ${loyalCount.toLocaleString("en-US")} donors projects to roughly ${projection.commitments.toLocaleString("en-US")} documented commitments on average.`,
    };
  }

  return {
    headline: "Start by sorting the file",
    body: "Before either program, the file has to be able to tell you two things: who has given for many consecutive years, and who sits in the $250 to $4,999 band. Both lists are queries, not projects, and everything else follows from them.",
    second: `Once those two lists exist, the choice usually makes itself. Loyalty depth points to a legacy program, and an unassigned mid-level band points to donor engagement.`,
  };
}

export function buildLoyaltyReport(input: {
  org?: string;
  totalDonors: number;
  answers: Answers;
}): LoyaltyReport {
  const totalDonors = Math.max(Math.round(input.totalDonors) || 0, 0);
  const loyalCount = Math.max(Math.round(Number(input.answers.loyalCount)) || 0, 0);
  const midCount = Math.max(Math.round(Number(input.answers.midCount)) || 0, 0);

  const legacy = buildTrack("legacy", input.answers, totalDonors);
  const midlevel = buildTrack("midlevel", input.answers, totalDonors);
  const projection = buildLegacyProjection(loyalCount);

  const midFindings: string[] = [];
  if (midCount > 0) {
    midFindings.push(
      `About ${midCount.toLocaleString("en-US")} donors sit in the $250 to $4,999 band${
        totalDonors > 0 ? `, roughly ${Math.round((midCount / totalDonors) * 100)} percent of your file` : ""
      }.`,
    );
  }
  const assigned = input.answers.assigned;
  if (assigned === 2) {
    midFindings.push(
      `None of them are assigned to a person, so all ${midCount.toLocaleString("en-US")} are unmanaged relationships.`,
    );
  } else if (assigned === 1) {
    midFindings.push("Only some of them are assigned, which usually means the largest few and no one else.");
  }
  if (input.answers.callCapacity !== undefined && input.answers.callCapacity >= 1) {
    midFindings.push("Your team does not have the capacity to call this band, so the real choice is outsourced calling or no calling.");
  }
  if (input.answers.askStrategy !== undefined && input.answers.askStrategy >= 1) {
    midFindings.push("Ask amounts are not personalized to giving history, so donors who could upgrade are being asked for what they already give.");
  }
  if (input.answers.lapsedWork !== undefined && input.answers.lapsedWork >= 1) {
    midFindings.push("Lapsed mid-level donors are not being personally worked, and they are the cheapest gifts available to you.");
  }
  midFindings.push(
    "We do not put a dollar projection on mid-level potential from a questionnaire. That number depends on your band mix, your lapsed volume and your data quality, and it comes out of a look at your actual file.",
  );

  const nextSteps = [...legacy.areas, ...midlevel.areas]
    .filter((a) => a.weakest)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map((a) => ({ area: a.area.label, action: a.weakest!.fix }));

  return {
    org: (input.org || "").trim(),
    totalDonors,
    loyalCount,
    midCount,
    legacy,
    midlevel,
    projection,
    midFindings,
    recommendation: buildRecommendation({
      legacy,
      midlevel,
      loyalCount,
      midCount,
      projection,
      answers: input.answers,
    }),
    nextSteps,
  };
}

/** One character per question in QUESTIONS order, so the PDF route can rebuild the report. */
export function encodeAnswers(answers: Answers): string {
  return QUESTIONS.map((q) => {
    if (q.kind !== "choice") return "-";
    const value = answers[q.id];
    return value === undefined || value === null || Number.isNaN(value) ? "x" : String(value);
  }).join("");
}

export function decodeAnswers(encoded: string, loyalCount: number, midCount: number): Answers {
  const answers: Answers = {};
  QUESTIONS.forEach((q, index) => {
    if (q.kind !== "choice") return;
    const char = encoded[index];
    if (char === undefined || char === "-" || char === "x") return;
    const value = Number(char);
    if (Number.isFinite(value) && q.choices?.[value]) answers[q.id] = value;
  });
  answers.loyalCount = loyalCount;
  answers.midCount = midCount;
  return answers;
}

export function isComplete(answers: Answers): boolean {
  return QUESTIONS.every((q) => {
    const value = answers[q.id];
    if (q.kind === "choice") return value !== undefined && q.choices?.[value] !== undefined;
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  });
}
