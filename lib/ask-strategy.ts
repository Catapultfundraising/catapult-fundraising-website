import { CaseIndexEntry } from "./client-cases-store";

// ---------------------------------------------------------------------------
// Matching: profiles reference their client organization via the
// "Client Name / Profiler Initials" field (e.g. "SCFTA/JG"). The acronym
// before the slash is the same acronym used as the file name for that
// client's case-for-support upload in the Client Case Library (e.g.
// SCFTA.pdf). We match on that acronym.
// ---------------------------------------------------------------------------

function normalize(input: string): string {
  return (input || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function extractClientAcronym(clientProfiler: string): string {
  const raw = (clientProfiler || "").trim();
  if (!raw) return "";
  const firstSegment = raw.split("/")[0] || raw;
  return firstSegment.trim();
}

function fileBaseName(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

export function findMatchingCase(
  cases: CaseIndexEntry[],
  acronym: string
): CaseIndexEntry | undefined {
  const target = normalize(acronym);
  if (!target) return undefined;

  // Exact match against the file name (without extension) is the primary,
  // most reliable signal since case files are named with the client acronym.
  const byFileName = cases.find((c) => normalize(fileBaseName(c.fileName)) === target);
  if (byFileName) return byFileName;

  // Fallback: acronym appears in (or equals) the stored client name.
  return cases.find((c) => {
    const name = normalize(c.clientName);
    return name === target || name.includes(target) || target.includes(name);
  });
}

// ---------------------------------------------------------------------------
// Deterministic donor ask strategy synthesis. No external API calls — the
// strategy is derived entirely from the Prospect Intelligence Profile and
// the client's case-for-support document already on file, so this runs
// instantly with no configuration required.
// ---------------------------------------------------------------------------

export interface AskStrategy {
  executiveSummary: string;
  recommendedAskAmount: string;
  askRange: string;
  caseAlignment: string[];
  talkingPoints: string[];
  meetingPreparation: string[];
  doThis: string[];
  avoidThis: string[];
  suggestedQuestions: string[];
  objectionHandling: Array<{ objection: string; response: string }>;
  nextSteps: string[];
}

function parseMoney(value?: string): number | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  let n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  if (/\bK\b|k$/i.test(trimmed)) n *= 1_000;
  if (/\bM\b|m$/i.test(trimmed)) n *= 1_000_000;
  return n;
}

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Splits case-for-support text into clean, reasonably sized sentences. */
function toSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 400);
}

const STOPWORDS = new Set(
  "the a an and or of to for in on with is are was were be been being this that these those our your their his her its as at by from into over under about after before during between it we you they he she i not no so than then also can will would could should".split(
    " "
  )
);

function keywordsFrom(...values: Array<string | undefined>): string[] {
  const words = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    for (const w of v.toLowerCase().split(/[^a-z0-9']+/)) {
      if (w.length > 3 && !STOPWORDS.has(w)) words.add(w);
    }
  }
  return Array.from(words);
}

function scoreSentence(sentence: string, keywords: string[]): number {
  const lower = sentence.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score += 1;
  }
  return score;
}

function firstMeaningfulParagraph(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 80);
  const raw = paragraphs[0] || toSentences(text).slice(0, 2).join(" ") || "";
  return raw.length > 500 ? `${raw.slice(0, 500).trim()}...` : raw;
}

export function buildAskStrategy(params: {
  profileData: any;
  clientOrgName: string;
  caseForSupportText: string;
}): AskStrategy {
  const { profileData, clientOrgName, caseForSupportText } = params;
  const name = profileData?.name || "This prospect";

  // --- Recommended ask amount & range -------------------------------------
  const stated = (profileData?.recommendedAskAmount || "").trim();
  const capacity = parseMoney(profileData?.givingCapacity);
  const netWorth = parseMoney(profileData?.estimatedNetWorth);

  let recommendedAskAmount = "";
  let askRange = "";
  let askBasis = "";

  if (stated) {
    recommendedAskAmount = stated;
    const statedNum = parseMoney(stated);
    if (statedNum) {
      askRange = `${fmtMoney(statedNum * 0.85)} – ${fmtMoney(statedNum * 1.15)}`;
    }
    askBasis = "the ask amount already recorded on this profile";
  } else if (capacity) {
    recommendedAskAmount = fmtMoney(capacity);
    askRange = `${fmtMoney(capacity * 0.8)} – ${fmtMoney(capacity * 1.2)}`;
    askBasis = "the profile's estimated 5-year giving capacity";
  } else if (netWorth) {
    const est = netWorth * 0.02; // conservative default: ~2% of net worth
    recommendedAskAmount = fmtMoney(est);
    askRange = `${fmtMoney(est * 0.7)} – ${fmtMoney(est * 1.4)}`;
    askBasis = "a conservative estimate (~2%) of estimated net worth, since no giving capacity was recorded";
  } else {
    recommendedAskAmount = "Not enough data to estimate";
    askRange = "";
    askBasis = "";
  }

  // --- Case for support alignment -----------------------------------------
  const caseSentences = toSentences(caseForSupportText);
  const interestKeywords = keywordsFrom(
    profileData?.hobbiesInterests,
    profileData?.boards,
    profileData?.clubsAffiliations,
    profileData?.relationshipToOrg,
    profileData?.familyFoundation,
    profileData?.businessColleagues
  );

  let caseAlignment: string[] = [];
  if (interestKeywords.length > 0 && caseSentences.length > 0) {
    caseAlignment = caseSentences
      .map((s) => ({ s, score: scoreSentence(s, interestKeywords) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.s);
  }
  if (caseAlignment.length === 0 && caseSentences.length > 0) {
    // No direct keyword overlap found — fall back to the case's own
    // strongest opening statements so the document is never empty.
    caseAlignment = caseSentences.slice(0, 3);
  }

  const caseSummary = firstMeaningfulParagraph(caseForSupportText);

  // --- Executive summary ---------------------------------------------------
  const summaryParts: string[] = [];
  summaryParts.push(
    `${name} is being considered as a prospective donor to ${clientOrgName}.` +
      (recommendedAskAmount !== "Not enough data to estimate"
        ? ` Based on ${askBasis}, a recommended ask of ${recommendedAskAmount} is suggested.`
        : " There is not yet enough wealth or capacity data on file to recommend a specific ask amount — add an Estimated Giving Capacity, Estimated Net Worth, or a Recommended Ask Amount to the profile for a more precise figure.")
  );
  if (profileData?.relationshipToOrg) {
    summaryParts.push(`Existing relationship to the organization: ${profileData.relationshipToOrg}.`);
  }
  if (profileData?.wealthRating) {
    summaryParts.push(`Wealth rating on file: ${profileData.wealthRating}.`);
  }
  const executiveSummary = summaryParts.join(" ");

  // --- Talking points --------------------------------------------------------
  const talkingPoints: string[] = [];
  if (caseSummary) {
    talkingPoints.push(`Lead with the organization's core case: ${caseSummary}`);
  }
  if (Array.isArray(profileData?.givingHistoryRows) && profileData.givingHistoryRows.length > 0) {
    const rows = profileData.givingHistoryRows;
    const last = rows[rows.length - 1];
    talkingPoints.push(
      `Acknowledge their giving history with ${clientOrgName}` +
        (last?.year || last?.amount ? ` (most recently ${last.year || ""} ${last.amount ? `— ${last.amount}` : ""})`.trim() : "") +
        " and express appreciation before introducing the new ask."
    );
  }
  if (profileData?.hobbiesInterests) {
    talkingPoints.push(
      `Connect the ask to their personal interests (${profileData.hobbiesInterests}) where the case for support overlaps.`
    );
  }
  if (profileData?.boards) {
    talkingPoints.push(`Reference their board/civic involvement (${profileData.boards}) as shared community leadership.`);
  }
  if (profileData?.familyFoundation) {
    talkingPoints.push(
      `If appropriate, explore whether ${profileData.familyFoundation} could be a co-funding vehicle for this gift.`
    );
  }
  if (talkingPoints.length === 0) {
    talkingPoints.push(
      "Open with the case for support's core mission statement, then transition to how this gift specifically advances it."
    );
  }

  // --- Meeting preparation / do / avoid / questions --------------------------
  const meetingPreparation = [
    `Review this profile and the ${clientOrgName} case for support immediately before the meeting.`,
    "Confirm who else will attend (staff, board member, peer donor) and align on roles in advance.",
    "Bring a printed or digital copy of the case for support and any relevant campaign materials.",
    "Set a clear goal for the meeting: cultivation, solicitation, or stewardship — know which one this is.",
  ];

  const doThis = [
    "Let the prospect talk first about what motivates their giving before presenting the case.",
    "Be specific: name the exact ask amount and what it funds rather than speaking in generalities.",
    "Pause after making the ask and let silence sit — do not fill it.",
    "Thank them for their time and prior generosity regardless of the outcome.",
  ];

  const avoidThis = [
    "Do not lead with the ask amount before establishing rapport and shared purpose.",
    "Avoid jargon or internal organizational acronyms the prospect may not recognize.",
  ];
  if (profileData?.politicalAffiliation) {
    avoidThis.push("Avoid discussing partisan politics directly; keep the conversation mission-focused.");
  }
  if (profileData?.religion) {
    avoidThis.push("Be respectful and non-presumptive regarding religious topics unless the prospect raises them.");
  }

  const suggestedQuestions = [
    `What first drew you to ${clientOrgName}?`,
    "What outcomes matter most to you when you support a cause like this?",
    "Is there a particular program or initiative within the case for support that resonates most with you?",
  ];
  if (profileData?.hobbiesInterests) {
    suggestedQuestions.push(`How does ${profileData.hobbiesInterests} shape the causes you choose to support?`);
  }
  if (profileData?.familyFoundation) {
    suggestedQuestions.push(`Would ${profileData.familyFoundation} be interested in partnering on this gift?`);
  }

  // --- Objection handling ------------------------------------------------
  const objectionHandling = [
    {
      objection: "“I need to think about it.”",
      response:
        "Acknowledge that a decision of this size deserves reflection. Offer to follow up with written materials and propose a specific date for a follow-up conversation.",
    },
    {
      objection: "“That's more than I was expecting to give.”",
      response:
        "Reaffirm the ask is a starting point for conversation, not a fixed number, and ask what level would feel right, or discuss a multi-year pledge to reach the target.",
    },
    {
      objection: "“I'm already supporting several other organizations.”",
      response:
        "Acknowledge their generosity broadly, then re-anchor on the unique, time-sensitive impact this specific gift would have.",
    },
    {
      objection: "“I'd like to see more information first.”",
      response:
        "Offer the full case for support, a site visit, or a conversation with a program leader, and set a concrete follow-up date.",
    },
  ];

  // --- Next steps ----------------------------------------------------------
  const nextSteps = [
    "Schedule the face-to-face meeting and confirm attendees.",
    "Prepare and print the case for support and any relevant gift agreement templates.",
    "Do a quick supplemental check for recent news or public updates about the prospect before the meeting.",
    "Log the outcome of the meeting in the prospect's record immediately afterward, including next follow-up date.",
  ];

  return {
    executiveSummary,
    recommendedAskAmount,
    askRange,
    caseAlignment,
    talkingPoints,
    meetingPreparation,
    doThis,
    avoidThis,
    suggestedQuestions,
    objectionHandling,
    nextSteps,
  };
}
