import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";
import { isJagAdminAuthed } from "@/lib/jag-admin-auth";
import type { JagDashboardData, NameDateOrg, NameOrg, DeclinedRow, DeceasedRow } from "@/lib/jag-data";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// PDF parsing — tailored to the exact layout of the "JAG Nevada Weekly
// Interview Status Report" template. Verified against real report PDFs:
// the summary stats, Completed/Scheduled/To Be Rescheduled/Deceased tables
// parse reliably. The "Declined to Interview" table (which has Reason and
// Organization text run together with no separating space in the extracted
// text) is best-effort — it correctly splits the vast majority of rows but
// can occasionally misplace a row when an entry uses an organization name
// in place of a person's name. That's why /jag-admin shows an editable
// preview before saving, rather than saving blind.
// ---------------------------------------------------------------------------

const STAT_LABELS: [string, keyof JagDashboardData["stats"]][] = [
  ["Total Prospects", "totalProspects"],
  ["Total Tier 1 Prospects", "tier1"],
  ["Total Tier 2 Prospects", "tier2"],
  ["Total Tier 3 Prospects", "tier3"],
  ["Total Tier 4 Prospects", "tier4"],
  ["Total Tier 5 Prospects", "tier5"],
  ["Number of Dials", "dials"],
  ["Emails Sent", "emailsSent"],
  ["Interviews Completed", "completed"],
  ["Interviews Scheduled", "scheduled"],
  ["To Be Rescheduled", "toBeRescheduled"],
  ["Declined", "declined"],
  ["Deceased", "deceased"],
  ["In Calling Process", "inCallingProcess"],
];

function parseStatsPage(page1: string) {
  const lines = page1.split("\n").map((l) => l.trim()).filter(Boolean);
  const stats: Partial<JagDashboardData["stats"]> = {};
  for (const line of lines) {
    for (const [label, key] of STAT_LABELS) {
      if (line.startsWith(label)) {
        const rest = line.slice(label.length).trim();
        const num = rest.match(/\d[\d,]*/);
        if (num) (stats as any)[key] = parseInt(num[0].replace(/,/g, ""), 10);
      }
    }
  }
  const dateLine = lines.find((l) => /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(l));
  return { stats, reportDate: dateLine || null };
}

function findSectionPages(pages: string[], header: string, nextHeaders: string[]): string[] {
  const startIdx = pages.findIndex((t) => t.trimStart().startsWith(header));
  if (startIdx === -1) return [];
  let endIdx = pages.length;
  for (let i = startIdx + 1; i < pages.length; i++) {
    if (nextHeaders.some((h) => pages[i].trimStart().startsWith(h))) {
      endIdx = i;
      break;
    }
  }
  return pages.slice(startIdx, endIdx);
}

function parseNameDateOrgTable(pages: string[]): NameDateOrg[] {
  const combined = pages.join("\n");
  const lines = combined.split("\n");
  const rows: NameDateOrg[] = [];
  let current: NameDateOrg | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(Completed Interviews|Scheduled Interviews|First Name Last Name)/.test(line)) continue;
    const m = line.match(/^(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{4})(.*)$/);
    if (m) {
      if (current) rows.push(current);
      current = { name: m[1].trim(), date: m[2].trim(), org: m[3].trim() };
    } else if (current) {
      current.org = (current.org + " " + line).trim();
    }
  }
  if (current) rows.push(current);
  return rows;
}

function parseNameOrgTable(pages: string[]): NameOrg[] {
  const lines = pages
    .join("\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(To Be Rescheduled|First Name Last Name Organization)$/.test(l));
  return lines.map((line) => {
    const tokens = line.split(/\s+/);
    return { name: tokens.slice(0, 2).join(" "), org: tokens.slice(2).join(" ") };
  });
}

const KNOWN_REASONS = [
  "Too Busy, but likes what JAG does",
  "Recommended another person in his office to do interview",
  "Is no longer interested in doing interview",
  "Does not do study interviews",
  "No longer lives in Las Vegas",
  "Not Interested",
  "Personal Issues",
  "Out of Country",
  "Out of Town",
  "Too Busy",
];

function parseDeclinedTable(pages: string[]): { rows: DeclinedRow[]; warning: string | null } {
  const lines = pages
    .join("\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(Declined to Interview|First Name Last Name Reason)/.test(l));
  const merged = lines.join(" ");
  if (!merged) return { rows: [], warning: null };

  const escaped = KNOWN_REASONS.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(escaped.join("|"), "g");
  const matches: { text: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(merged)) !== null) {
    matches.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  if (matches.length === 0) {
    return {
      rows: [],
      warning:
        "Could not recognize any decline reasons in this report (the reason wording may have changed). Please fill in the Declined table by hand this week.",
    };
  }

  const rows: (DeclinedRow & { _nextName?: string })[] = [];
  const firstName = merged.slice(0, matches[0].start).trim();

  for (let i = 0; i < matches.length; i++) {
    const name = i === 0 ? firstName : rows[i - 1]._nextName!;
    let org = "";
    if (i < matches.length - 1) {
      const gap = merged.slice(matches[i].end, matches[i + 1].start).trim();
      const tokens = gap.split(/\s+/).filter(Boolean);
      org = tokens.slice(0, -2).join(" ");
      const nextName = tokens.slice(-2).join(" ");
      rows.push({ name, reason: matches[i].text, org, _nextName: nextName });
    } else {
      org = merged.slice(matches[i].end).trim();
      rows.push({ name, reason: matches[i].text, org });
    }
  }

  return {
    rows: rows.map(({ _nextName, ...r }) => r),
    warning:
      "The Declined table is parsed automatically and is usually correct, but double-check it below — entity names entered in place of a person's name (e.g. a foundation name) can occasionally throw off one row.",
  };
}

function parseDeceasedTable(pages: string[]): DeceasedRow[] {
  const lines = pages
    .join("\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(Deceased|First Name Last Name Reason)$/.test(l));
  return lines.map((line) => {
    const idx = line.search(/Passed Away|Deceased/i);
    if (idx === -1) {
      const tokens = line.split(/\s+/);
      return { name: tokens.slice(0, 2).join(" "), reason: tokens.slice(2).join(" ") };
    }
    return { name: line.slice(0, idx).trim(), reason: line.slice(idx).trim() };
  });
}

// ---------------------------------------------------------------------------
// XLSX parsing — feasibility survey results. The column schema
// ("Survey N Question:/Answer:/Comments:") is consistent across weeks.
// ---------------------------------------------------------------------------

const REPUTATION_COL = "Survey 3 Answer:";
const FINANCIAL_GIFT_COL = "Survey 8 Answer:";
const MULTI_YEAR_COL = "Survey 8A Answer:";
const LEADERSHIP_COL = "Survey 12 Answer:";
const INTRODUCE_COL = "Survey 13 Answer:";
const MISSION_THEMES_COL = "Survey 5 Answer:";
// Only these two comment columns are used for pull-quotes: both ask for the
// respondent's own opinion of JAG (reputation / alignment), never about
// other people. Survey 16/17 explicitly ask respondents to NAME other
// prospects and are deliberately excluded from the quote pool for privacy.
const QUOTE_COMMENT_COLS = ["Survey 3 Comments:", "Survey 10 Comments:"];

function pct(count: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

function countAnswers(rows: any[][], headers: string[], colLabel: string): Record<string, number> {
  const idx = headers.indexOf(colLabel);
  const counts: Record<string, number> = {};
  if (idx === -1) return counts;
  for (const row of rows) {
    const v = (row[idx] ?? "").toString().trim();
    if (!v) continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

function parseFeasibilityXlsx(buf: Buffer) {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
  const headers = (allRows[0] || []).map((h) => String(h ?? ""));
  const dataRows = allRows.slice(1);
  const respondentCount = dataRows.filter((r) => r.some((c) => String(c ?? "").trim())).length;

  const reputation = countAnswers(dataRows, headers, REPUTATION_COL);
  const goodOrBetter = (reputation["Very Good"] || 0) + (reputation["Good"] || 0);

  const gift = countAnswers(dataRows, headers, FINANCIAL_GIFT_COL);
  const giftYes = gift["Yes"] || 0;

  const multiYear = countAnswers(dataRows, headers, MULTI_YEAR_COL);
  const multiYearYes = multiYear["Yes"] || 0;
  const multiYearTotal = Object.values(multiYear).reduce((a, b) => a + b, 0);

  const introduce = countAnswers(dataRows, headers, INTRODUCE_COL);
  const introduceYes = introduce["Yes"] || 0;

  const leadership = countAnswers(dataRows, headers, LEADERSHIP_COL);
  const leadershipYes = leadership["Yes"] || 0;
  const leadershipMaybe = leadership["Maybe"] || 0;

  const feasibilitySignals = [
    {
      stat: pct(goodOrBetter, respondentCount),
      label: `Rate JAG's reputation “Very Good” or “Good”`,
      detail: `${reputation["Very Good"] || 0} Very Good, ${reputation["Good"] || 0} Good, ${
        reputation["Don't Know"] || 0
      } Don't Know — out of ${respondentCount} respondents`,
    },
    {
      stat: pct(giftYes, respondentCount),
      label: "Would consider a financial gift to JAG if asked",
      detail: `${giftYes} Yes, ${gift["No"] || 0} No, ${gift["Maybe"] || 0} Maybe, ${
        gift["Don't Know"] || 0
      } Don't Know`,
    },
    {
      stat: pct(multiYearYes, multiYearTotal),
      label: "Of likely donors would consider a multi-year commitment",
      detail: `${multiYearYes} of ${multiYearTotal} who answered the multi-year follow-up said Yes`,
    },
    {
      stat: pct(introduceYes, respondentCount),
      label: "Are willing to introduce JAG to others in their network",
      detail: `${introduceYes} of ${respondentCount} respondents said Yes`,
    },
    {
      stat: pct(leadershipYes, respondentCount),
      label: "Would consider a leadership role with JAG",
      detail: `${leadershipYes} Yes, another ${leadershipMaybe} said Maybe`,
    },
  ];

  const themeIdx = headers.indexOf(MISSION_THEMES_COL);
  const themeCounts: Record<string, number> = {};
  if (themeIdx !== -1) {
    for (const row of dataRows) {
      const v = (row[themeIdx] ?? "").toString().trim();
      if (!v) continue;
      for (const tag of v.split(",")) {
        const t = tag.trim();
        if (t && t.toLowerCase() !== "other (please describe)") {
          themeCounts[t] = (themeCounts[t] || 0) + 1;
        }
      }
    }
  }
  const missionThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label: label === "Opportunity and access" ? "Opportunity & access" : label,
      pct: pct(count, respondentCount),
    }));

  const quotePool: string[] = [];
  for (const colLabel of QUOTE_COMMENT_COLS) {
    const idx = headers.indexOf(colLabel);
    if (idx === -1) continue;
    for (const row of dataRows) {
      const v = (row[idx] ?? "").toString().trim();
      if (v.length >= 60 && v.length <= 300 && !v.includes("\n") && !quotePool.includes(v)) {
        quotePool.push(v);
      }
    }
  }

  return { feasibilitySignals, missionThemes, quotes: quotePool, respondentCount };
}

export async function POST(req: NextRequest) {
  if (!(await isJagAdminAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const warnings: string[] = [];

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded files." }, { status: 400 });
  }

  const reportFile = form.get("report") as File | null;
  const surveyFile = form.get("survey") as File | null;
  if (!reportFile || !surveyFile) {
    return NextResponse.json(
      { error: "Please attach both the Weekly Interview Status Report (PDF) and the Feasibility Survey Results (Excel)." },
      { status: 400 }
    );
  }

  let stats: Partial<JagDashboardData["stats"]> = {};
  let reportDate = "";
  let completedInterviews: NameDateOrg[] = [];
  let scheduledInterviews: NameDateOrg[] = [];
  let toBeRescheduled: NameOrg[] = [];
  let declined: DeclinedRow[] = [];
  let deceased: DeceasedRow[] = [];

  try {
    const pdfBuf = new Uint8Array(await reportFile.arrayBuffer());
    const pdf = await getDocumentProxy(pdfBuf);
    const { text } = await extractText(pdf, { mergePages: false });

    const parsedStats = parseStatsPage(text[0] || "");
    stats = parsedStats.stats;
    reportDate =
      parsedStats.reportDate ||
      new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const headers = ["Completed Interviews", "Scheduled Interviews", "To Be Rescheduled", "Declined to Interview", "Deceased"];
    const completedPages = findSectionPages(text, headers[0], headers.slice(1));
    const scheduledPages = findSectionPages(text, headers[1], headers.slice(2));
    const rescheduledPages = findSectionPages(text, headers[2], headers.slice(3));
    const declinedPages = findSectionPages(text, headers[3], headers.slice(4));
    const deceasedPages = findSectionPages(text, headers[4], []);

    completedInterviews = parseNameDateOrgTable(completedPages);
    scheduledInterviews = parseNameDateOrgTable(scheduledPages);
    toBeRescheduled = parseNameOrgTable(rescheduledPages);
    const declinedResult = parseDeclinedTable(declinedPages);
    declined = declinedResult.rows;
    if (declinedResult.warning) warnings.push(declinedResult.warning);
    deceased = parseDeceasedTable(deceasedPages);

    if (!stats.totalProspects) {
      warnings.push("Could not find the summary stats table on page 1 — please check the numbers above carefully.");
    }
  } catch (err) {
    console.error("jag-admin parse: PDF error", err);
    return NextResponse.json(
      { error: "Could not read the Weekly Interview Status Report PDF. " + (err instanceof Error ? err.message : "") },
      { status: 400 }
    );
  }

  let feasibilitySignals: JagDashboardData["feasibilitySignals"] = [];
  let missionThemes: JagDashboardData["missionThemes"] = [];
  let quotes: string[] = [];
  let surveyRespondentCount = 0;

  try {
    const xlsxBuf = Buffer.from(await surveyFile.arrayBuffer());
    const parsed = parseFeasibilityXlsx(xlsxBuf);
    feasibilitySignals = parsed.feasibilitySignals;
    missionThemes = parsed.missionThemes;
    quotes = parsed.quotes;
    surveyRespondentCount = parsed.respondentCount;
    if (quotes.length < 3) {
      warnings.push("Fewer than 3 usable quotes were found in the survey comments — the quote pool may look thin this week.");
    }
  } catch (err) {
    console.error("jag-admin parse: xlsx error", err);
    return NextResponse.json(
      { error: "Could not read the Feasibility Survey Results spreadsheet. " + (err instanceof Error ? err.message : "") },
      { status: 400 }
    );
  }

  const data: JagDashboardData = {
    reportDate,
    updatedAt: new Date().toISOString(),
    surveyRespondentCount,
    stats: stats as JagDashboardData["stats"],
    completedInterviews,
    scheduledInterviews,
    toBeRescheduled,
    declined,
    deceased,
    feasibilitySignals,
    missionThemes,
    quotes,
  };

  return NextResponse.json({ data, warnings });
}
