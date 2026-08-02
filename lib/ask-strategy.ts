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

export interface CaseAlignmentPoint {
  profileTrait: string;
  profileValue: string;
  caseConnection: string;
}

export interface AskStrategy {
  executiveSummary: string;
  recommendedAskAmount: string;
  askRange: string;
  askBasis: string;
  caseAlignmentPoints: CaseAlignmentPoint[];
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

/**
 * Guarantees a dollar sign (and thousands separators) is visible on any
 * value that reads as a monetary figure (plain numbers, "10000", "10K",
 * "10M+", etc.) without one already, so ask amounts and cited gift figures
 * never appear as bare, unformatted numbers. Non-numeric values ("TBD",
 * "Unknown") are left untouched.
 */
function ensureDollarSign(value?: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("$")) return trimmed;
  // Must look like a number (optionally with commas/decimal and a K/M/B/+
  // shorthand suffix) to be treated as money — avoids prefixing years,
  // percentages, or plain words with a $ sign.
  if (!/^[0-9][0-9,.]*\s*[KkMmBb]?\+?$/.test(trimmed)) return trimmed;
  const hasPlus = /\+\s*$/.test(trimmed);
  const parsed = parseMoney(trimmed);
  if (parsed === null) return `$${trimmed}`;
  return `${fmtMoney(parsed)}${hasPlus ? "+" : ""}`;
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
  "the a an and or of to for in on with is are was were be been being this that these those our your their his her its as at by from into over under about after before during between it we you they he she i not no so than then also can will would could should more most all any each other than which who whom what when where while".split(
    " "
  )
);

function keywordsFrom(value: string): string[] {
  const words = new Set<string>();
  for (const w of value.toLowerCase().split(/[^a-z0-9']+/)) {
    if (w.length > 3 && !STOPWORDS.has(w)) words.add(w);
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
  return raw.length > 320 ? `${raw.slice(0, 320).trim()}...` : raw;
}

/** Picks the most frequently repeated substantive words in the case text as a
 * quick proxy for the organization's core mission "pillars" (e.g. "education",
 * "animals", "housing"), used to tie the strategy language back to the case. */
function extractCaseThemes(text: string, max = 4): string[] {
  const counts = new Map<string, number>();
  for (const w of text.toLowerCase().split(/[^a-z']+/)) {
    if (w.length > 5 && !STOPWORDS.has(w)) {
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  const ranked = Array.from(counts.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  // Collapse simple singular/plural duplicates (e.g. "animal" / "animals")
  // so themes read as a clean, non-repetitive list.
  const seenNormalized = new Set<string>();
  const chosen: string[] = [];
  for (const [word] of ranked) {
    const normalized = word.replace(/s$/, "");
    if (seenNormalized.has(normalized)) continue;
    seenNormalized.add(normalized);
    chosen.push(word);
    if (chosen.length >= max) break;
  }
  return chosen;
}

/**
 * Builds the Case Alignment Points: a direct, trait-by-trait comparison of
 * what's on the Prospect Intelligence Profile against what's in the client's
 * case for support, so the connection between the two documents is explicit
 * rather than left for the reader to infer.
 */
function buildCaseAlignmentPoints(
  profileData: any,
  caseSentences: string[],
  caseThemes: string[]
): CaseAlignmentPoint[] {
  const fields: Array<{ key: string; label: string }> = [
    { key: "hobbiesInterests", label: "Personal Interests" },
    { key: "boards", label: "Board & Civic Involvement" },
    { key: "clubsAffiliations", label: "Clubs & Affiliations" },
    { key: "relationshipToOrg", label: "Existing Relationship to Organization" },
    { key: "familyFoundation", label: "Family Foundation" },
    { key: "businessColleagues", label: "Professional Network" },
  ];

  const points: CaseAlignmentPoint[] = [];

  for (const { key, label } of fields) {
    const profileValue = profileData?.[key];
    if (!profileValue) continue;

    const keywords = keywordsFrom(profileValue);
    let caseConnection = "";
    if (keywords.length > 0 && caseSentences.length > 0) {
      const best = caseSentences
        .map((sentence) => ({ sentence, score: scoreSentence(sentence, keywords) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)[0];
      if (best) {
        caseConnection = `"${best.sentence}"`;
      }
    }
    if (!caseConnection) {
      caseConnection =
        caseThemes.length > 0
          ? `No exact excerpt matched, but this broadly connects to the case for support's focus on ${caseThemes.join(", ")}.`
          : "No direct overlap found in the extracted case for support text; consider referencing this manually.";
    }

    points.push({ profileTrait: label, profileValue, caseConnection });
  }

  return points;
}

export function buildAskStrategy(params: {
  profileData: any;
  clientOrgName: string;
  caseForSupportText: string;
}): AskStrategy {
  const { profileData, clientOrgName, caseForSupportText } = params;
  const name = profileData?.name || "This prospect";

  // --- Recommended ask amount & range -------------------------------------
  // Blends every available wealth/giving signal (estimated giving capacity,
  // estimated net worth, and previous giving history) rather than picking
  // just one, so the recommendation reflects the full picture on file. An
  // explicit Recommended Ask Amount already entered on the profile is
  // treated as the gift officer's own override and takes precedence.
  const stated = ensureDollarSign((profileData?.recommendedAskAmount || "").trim());
  const capacity = parseMoney(profileData?.givingCapacity);
  const netWorth = parseMoney(profileData?.estimatedNetWorth);

  let largestPriorGift: number | null = null;
  if (Array.isArray(profileData?.givingHistoryRows)) {
    for (const row of profileData.givingHistoryRows) {
      const amt = parseMoney(row?.amount);
      if (amt !== null && (largestPriorGift === null || amt > largestPriorGift)) {
        largestPriorGift = amt;
      }
    }
  }

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
  } else {
    const candidates: Array<{ value: number; label: string }> = [];
    if (capacity) candidates.push({ value: capacity, label: "estimated 5-year giving capacity" });
    if (netWorth) candidates.push({ value: netWorth * 0.02, label: "roughly 2% of estimated net worth" });
    if (largestPriorGift) {
      candidates.push({ value: largestPriorGift * 2, label: "about double their largest prior gift" });
    }

    if (candidates.length > 0) {
      const blended = candidates.reduce((sum, c) => sum + c.value, 0) / candidates.length;
      recommendedAskAmount = fmtMoney(blended);
      askRange = `${fmtMoney(blended * 0.8)} – ${fmtMoney(blended * 1.2)}`;
      askBasis =
        candidates.length > 1
          ? `a blend of ${candidates.map((c) => c.label).join(", ")}`
          : candidates[0].label;
    } else {
      recommendedAskAmount = "Not enough data to estimate";
      askRange = "";
      askBasis = "";
    }
  }

  // --- Case Alignment Points -----------------------------------------------
  const caseSentences = toSentences(caseForSupportText);
  const caseThemes = extractCaseThemes(caseForSupportText);
  const caseAlignmentPoints = buildCaseAlignmentPoints(profileData, caseSentences, caseThemes);
  const hasDirectMatches = caseAlignmentPoints.some((p) => p.caseConnection.startsWith('"'));

  const caseSummary = firstMeaningfulParagraph(caseForSupportText);

  // --- Executive summary ---------------------------------------------------
  const summaryParts: string[] = [];
  summaryParts.push(
    `${name} is being considered as a prospective donor to ${clientOrgName}.` +
      (recommendedAskAmount !== "Not enough data to estimate"
        ? ` Based on ${askBasis}, a recommended ask of ${recommendedAskAmount} is suggested.`
        : " There is not yet enough wealth or capacity data on file to recommend a specific ask amount. Add an Estimated Giving Capacity, Estimated Net Worth, or a Recommended Ask Amount to the profile for a more precise figure.")
  );
  if (caseThemes.length > 0) {
    summaryParts.push(
      `${clientOrgName}'s case for support centers on ${caseThemes.join(", ")}, and the strategy below is built to connect ${name}'s specific background directly to that mission.`
    );
  }
  if (profileData?.relationshipToOrg) {
    summaryParts.push(`Existing relationship to the organization: ${profileData.relationshipToOrg}.`);
  }
  if (profileData?.wealthRating) {
    summaryParts.push(`Wealth rating on file: ${profileData.wealthRating}.`);
  }
  if (caseForSupportText.trim().length < 200) {
    summaryParts.push(
      "Note: little extractable text was found in the client's case for support PDF (it may be a " +
        "scanned or image-based document). Review that case for support directly for full details."
    );
  }
  const executiveSummary = summaryParts.join(" ");

  // --- Talking points --------------------------------------------------------
  const talkingPoints: string[] = [];
  if (caseSummary) {
    talkingPoints.push(
      `Open by grounding the ask in the mission: "${caseSummary}," then bridge directly into why ${name} in particular is positioned to help advance it` +
        (hasDirectMatches
          ? ` (see the Case Alignment Points below for the specific connection).`
          : ".")
    );
  }
  if (Array.isArray(profileData?.givingHistoryRows) && profileData.givingHistoryRows.length > 0) {
    const rows = profileData.givingHistoryRows;
    const last = rows[rows.length - 1];
    const lastAmount = ensureDollarSign(last?.amount);
    const historyNote = last?.year || lastAmount
      ? ` (most recently ${[last.year, lastAmount].filter(Boolean).join(", ")})`
      : "";
    talkingPoints.push(
      `Acknowledge their giving history with ${clientOrgName}${historyNote} and express appreciation before ` +
        "introducing the new ask, then connect this new ask to the next stage of the case for support's work."
    );
  }
  if (profileData?.hobbiesInterests) {
    const themeNote =
      caseThemes.length > 0 ? `, particularly where it touches ${caseThemes[0]}, a core focus of the case for support` : "";
    talkingPoints.push(
      `Connect the ask to their personal interests (${profileData.hobbiesInterests})${themeNote}.`
    );
  }
  if (profileData?.boards) {
    talkingPoints.push(`Reference their board/civic involvement (${profileData.boards}) as shared community leadership behind ${clientOrgName}'s mission.`);
  }
  if (profileData?.familyFoundation) {
    talkingPoints.push(
      `If appropriate, explore whether ${profileData.familyFoundation} could be a co-funding vehicle for this gift, tied to the specific program area of the case for support that resonates most with them.`
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
    "Set a clear goal for the meeting: cultivation, solicitation, or stewardship. Know which one this is.",
  ];

  const doThis = [
    "Let the prospect talk first about what motivates their giving before presenting the case.",
    "Be specific: name the exact ask amount and what it funds rather than speaking in generalities.",
    "Pause after making the ask and let silence sit. Do not fill it.",
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
    askBasis,
    caseAlignmentPoints,
    talkingPoints,
    meetingPreparation,
    doThis,
    avoidThis,
    suggestedQuestions,
    objectionHandling,
    nextSteps,
  };
}
