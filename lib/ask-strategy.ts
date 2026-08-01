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
// Perplexity API integration
// ---------------------------------------------------------------------------

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const INSIGHTS_MODEL = "sonar-pro";
const STRATEGY_MODEL = "sonar-pro";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResult {
  text: string;
  citations: string[];
}

async function callPerplexity(
  messages: PerplexityMessage[],
  model: string
): Promise<PerplexityResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Perplexity API key not configured. Add PERPLEXITY_API_KEY to the site's environment variables, then try again."
    );
  }

  const res = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Perplexity API error (${res.status}): ${body.slice(0, 500)}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || "";
  const citations: string[] = Array.isArray(json?.citations) ? json.citations : [];
  return { text, citations };
}

// ---------------------------------------------------------------------------
// Step 1: gather additional public insights about the prospect via
// Perplexity's real-time web search.
// ---------------------------------------------------------------------------

export async function gatherProspectInsights(
  prospectName: string,
  clientOrgName: string
): Promise<PerplexityResult> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content:
        "You are a prospect research analyst for a nonprofit fundraising consulting firm. " +
        "Research publicly available information ONLY. Never fabricate details. If nothing " +
        "relevant is found, say so plainly.",
    },
    {
      role: "user",
      content:
        `Research publicly available information about the philanthropic prospect "${prospectName}", ` +
        `who is being considered as a donor to "${clientOrgName}". Focus on: recent news, ` +
        `board memberships or civic involvement, philanthropic giving or foundation activity, ` +
        `business/professional background, and any recent life events (awards, milestones, ` +
        `company news) that could be relevant context for a face-to-face donor ask meeting. ` +
        `Provide a concise bulleted summary. If little or nothing public is found, state that clearly ` +
        `rather than guessing.`,
    },
  ];
  return callPerplexity(messages, INSIGHTS_MODEL);
}

// ---------------------------------------------------------------------------
// Step 2: synthesize the profile + case for support + insights into a
// structured donor ask strategy.
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

function safeArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim().length > 0);
}

function parseStrategyJson(raw: string): AskStrategy {
  let jsonText = raw.trim();
  // Strip markdown code fences if the model wrapped the JSON in one.
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  // Fallback: grab the outermost braces if there's stray prose around the JSON.
  if (!jsonText.startsWith("{")) {
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // If parsing still fails, fall back to putting the raw text in the
    // executive summary so nothing is silently lost.
    return {
      executiveSummary: raw.trim(),
      recommendedAskAmount: "",
      askRange: "",
      caseAlignment: [],
      talkingPoints: [],
      meetingPreparation: [],
      doThis: [],
      avoidThis: [],
      suggestedQuestions: [],
      objectionHandling: [],
      nextSteps: [],
    };
  }

  const objectionHandling = Array.isArray(parsed.objectionHandling)
    ? parsed.objectionHandling
        .filter((o: any) => o && (o.objection || o.response))
        .map((o: any) => ({ objection: String(o.objection || ""), response: String(o.response || "") }))
    : [];

  return {
    executiveSummary: String(parsed.executiveSummary || ""),
    recommendedAskAmount: String(parsed.recommendedAskAmount || ""),
    askRange: String(parsed.askRange || ""),
    caseAlignment: safeArray(parsed.caseAlignment),
    talkingPoints: safeArray(parsed.talkingPoints),
    meetingPreparation: safeArray(parsed.meetingPreparation),
    doThis: safeArray(parsed.doThis),
    avoidThis: safeArray(parsed.avoidThis),
    suggestedQuestions: safeArray(parsed.suggestedQuestions),
    objectionHandling,
    nextSteps: safeArray(parsed.nextSteps),
  };
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}\n...[truncated]` : text;
}

export async function synthesizeAskStrategy(params: {
  profileSummary: string;
  clientOrgName: string;
  caseForSupportText: string;
  insightsText: string;
}): Promise<AskStrategy> {
  const { profileSummary, clientOrgName, caseForSupportText, insightsText } = params;

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content:
        "You are a senior major-gifts fundraising strategist at Catapult Fundraising, a capital " +
        "campaign and donor engagement consulting firm. You write concise, actionable donor ask " +
        "strategies for gift officers preparing for a face-to-face meeting. " +
        "Respond with STRICT JSON ONLY — no markdown, no prose outside the JSON object — matching " +
        "exactly this shape: " +
        `{"executiveSummary": string, "recommendedAskAmount": string, "askRange": string, ` +
        `"caseAlignment": string[], "talkingPoints": string[], "meetingPreparation": string[], ` +
        `"doThis": string[], "avoidThis": string[], "suggestedQuestions": string[], ` +
        `"objectionHandling": [{"objection": string, "response": string}], "nextSteps": string[]}. ` +
        "Ground every recommendation in the prospect data and case-for-support content provided. " +
        "Keep each bullet string concise (one to two sentences).",
    },
    {
      role: "user",
      content:
        `CLIENT ORGANIZATION: ${clientOrgName}\n\n` +
        `PROSPECT INTELLIGENCE PROFILE:\n${truncate(profileSummary, 6000)}\n\n` +
        `CASE FOR SUPPORT (client's case document):\n${truncate(caseForSupportText, 12000)}\n\n` +
        `ADDITIONAL PUBLIC INSIGHTS ABOUT THE PROSPECT:\n${truncate(insightsText, 4000)}\n\n` +
        `Using all of the above, produce a donor ask strategy: a recommended ask amount and range ` +
        `(grounded in the prospect's wealth capacity and giving history), how the case for support ` +
        `aligns with this prospect's interests, key talking points, meeting preparation notes, ` +
        `do's and don'ts for the face-to-face meeting, suggested questions to ask the prospect, ` +
        `likely objections with suggested responses, and recommended next steps. Return JSON only.`,
    },
  ];

  const result = await callPerplexity(messages, STRATEGY_MODEL);
  return parseStrategyJson(result.text);
}

// ---------------------------------------------------------------------------
// Turns raw profile form data into a readable text block for prompting.
// ---------------------------------------------------------------------------

export function summarizeProfileForPrompt(data: any): string {
  const lines: string[] = [];
  const push = (label: string, value?: string) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  push("Prospect Name", data.name);
  push("Estimated Income", data.estimatedIncome);
  push("Estimated Net Worth", data.estimatedNetWorth);
  push("Stock Value", data.stockValue);
  push("Real Estate Value", data.realEstateValue);
  push("Estimated Giving Capacity (5 Yrs)", data.givingCapacity);
  push("Wealth Rating", data.wealthRating);
  push("Total Charitable Giving", data.totalCharitableGiving);
  push("Relationship to Organization", data.relationshipToOrg);
  push("Recommended Ask Amount (from profile)", data.recommendedAskAmount);
  push("Hobbies & Interests", data.hobbiesInterests);
  push("Boards", data.boards);
  push("Clubs & Affiliations", data.clubsAffiliations);
  push("Business Colleagues", data.businessColleagues);
  push("Religion", data.religion);
  push("Political Affiliation", data.politicalAffiliation);
  push("Family Foundation", data.familyFoundation);
  push("Additional Information", data.additionalInformation);

  if (Array.isArray(data.givingHistoryRows) && data.givingHistoryRows.length > 0) {
    lines.push("Giving History to Organization:");
    for (const row of data.givingHistoryRows) {
      lines.push(`  - ${row.year || ""}: ${row.amount || ""} ${row.comments ? `(${row.comments})` : ""}`.trim());
    }
  }

  if (Array.isArray(data.otherGiving) && data.otherGiving.length > 0) {
    lines.push("Other Giving History (public records):");
    for (const row of data.otherGiving) {
      lines.push(`  - ${row.recipient || ""}: ${row.giving || ""} ${row.year || ""} ${row.amount || ""}`.trim());
    }
  }

  if (Array.isArray(data.realEstate) && data.realEstate.length > 0) {
    lines.push("Real Estate:");
    for (const re of data.realEstate) {
      lines.push(`  - ${re.address || ""}: ${re.value || ""} ${re.description ? `(${re.description})` : ""}`.trim());
    }
  }

  return lines.join("\n");
}
