import { put, get } from "@vercel/blob";

// Single JSON object in Vercel Blob storage that both /jag-dashboard and
// /api/jag-summary-pdf read from. Written by the internal /jag-admin tool
// each week (following the same private-blob pattern already used by
// lib/client-cases-store.ts and lib/research-profiles-store.ts). Falls back
// to DEFAULT_JAG_DATA (the last verified-correct report) if the blob
// doesn't exist yet or can't be reached, so the dashboard never breaks even
// before the upload tool has been used for the first time.
const DATA_PATH = "jag-dashboard/data.json";

export interface JagStats {
  totalProspects: number;
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
  tier5: number;
  dials: number;
  emailsSent: number;
  completed: number;
  scheduled: number;
  toBeRescheduled: number;
  declined: number;
  deceased: number;
  inCallingProcess: number;
}

// Snapshot of the stats that were live immediately before the most recent
// save, captured automatically by /api/jag-admin/save. Powers the "+N vs.
// last report" deltas on the tracker, the way the original standalone
// tracker app did.
export interface PreviousStats {
  totalProspects: number;
  completed: number;
  scheduled: number;
  toBeRescheduled: number;
  declined: number;
  deceased: number;
  inCallingProcess: number;
  dials: number;
  emailsSent: number;
}

export interface NameDateOrg {
  name: string;
  org: string;
  date: string;
}

export interface NameOrg {
  name: string;
  org: string;
}

export interface DeclinedRow {
  name: string;
  org: string;
  reason: string;
}

export interface DeceasedRow {
  name: string;
  reason: string;
}

export interface FeasibilitySignal {
  stat: string;
  label: string;
  detail: string;
}

export interface MissionTheme {
  label: string;
  pct: string;
}

export interface JagDashboardData {
  reportDate: string;
  updatedAt: string;
  surveyRespondentCount: number;
  stats: JagStats;
  previousStats?: PreviousStats;
  completedInterviews: NameDateOrg[];
  scheduledInterviews: NameDateOrg[];
  toBeRescheduled: NameOrg[];
  declined: DeclinedRow[];
  deceased: DeceasedRow[];
  feasibilitySignals: FeasibilitySignal[];
  missionThemes: MissionTheme[];
  quotes: string[];
}

// Source: JAG Nevada Weekly Interview Status Report, 8/5/2026, and
// JAG-Feasibility-Study_Survey_Results_080326.xlsx (26 completed surveys).
// This is the last data verified line-by-line against the client-supplied
// files, used as a safe fallback until the admin tool has been run at
// least once (and any time the blob store is unreachable).
export const DEFAULT_JAG_DATA: JagDashboardData = {
  reportDate: "August 5, 2026",
  updatedAt: "2026-08-05T00:00:00.000Z",
  surveyRespondentCount: 26,
  stats: {
    totalProspects: 268,
    tier1: 56,
    tier2: 54,
    tier3: 52,
    tier4: 52,
    tier5: 54,
    dials: 1982,
    emailsSent: 283,
    completed: 27,
    scheduled: 1,
    toBeRescheduled: 5,
    declined: 24,
    deceased: 1,
    inCallingProcess: 210,
  },
  // The prior report's actual figures (the last snapshot the old standalone
  // tracker ever displayed, since it was never wired to later reports) —
  // used as the seed "last report" comparison until /jag-admin captures a
  // fresh one on the next save.
  previousStats: {
    totalProspects: 268,
    completed: 22,
    scheduled: 5,
    toBeRescheduled: 6,
    declined: 18,
    deceased: 1,
    inCallingProcess: 216,
    dials: 1250,
    emailsSent: 282,
  },
  completedInterviews: [
    { name: "Dennis Perea", org: "KGHM", date: "6/15/2026" },
    { name: "Shauna Walch", org: "", date: "6/17/2026" },
    { name: "Jay Bloom", org: "", date: "6/18/2026" },
    { name: "Chris Giunchigliani", org: "Gray's Leadership Academy", date: "6/23/2026" },
    { name: "Tray Abney", org: "Abney Tauchen Group", date: "6/24/2026" },
    { name: "Joselyn Cousins", org: "Federal Reserve Bank", date: "6/24/2026" },
    { name: "Gerri Schroder", org: "", date: "6/26/2026" },
    { name: "Alletha Muzorewa", org: "Anthem", date: "6/30/2026" },
    { name: "Ann Silver", org: "Reno + Sparks Chamber of Commerce", date: "6/30/2026" },
    { name: "Angel Williams", org: "NV Energy", date: "6/30/2026" },
    { name: "Jan Blackhurst", org: "UNLV Black Fire Leadership Initiative", date: "7/6/2026" },
    { name: "David Foster", org: "", date: "7/8/2026" },
    { name: "Katei Horn", org: "Las Vegas Valley Water District", date: "7/8/2026" },
    { name: "Tracy Brown-May", org: "Nevada Legislature", date: "7/13/2026" },
    { name: "Peter Digrazia", org: "", date: "7/14/2026" },
    { name: "Tracy Moore", org: "Former JAG Nevada board member", date: "7/14/2026" },
    { name: "Elaine Silverstone", org: "Nevada Governor's Office of Economic Development", date: "7/14/2026" },
    { name: "George Keyes", org: "", date: "7/15/2026" },
    { name: "Amelia Hippert", org: "Sorpotimist International", date: "7/17/2026" },
    { name: "Thomas Burns", org: "", date: "7/20/2026" },
    { name: "Greg Moore", org: "State Farm", date: "7/20/2026" },
    { name: "Catherine Bellver", org: "UNLV and Soroptimist", date: "7/22/2026" },
    { name: "Greg Fine", org: "Marketing Consultant - Greg the Fine", date: "7/23/2026" },
    { name: "Edward Estipona", org: "Estipona Group", date: "7/28/2026" },
    { name: "Magda Iwanska-Hirsch", org: "PNC", date: "7/30/2026" },
    { name: "Chris Reilly", org: "State of Nevada", date: "8/3/2026" },
    { name: "Jane'e Murphy", org: "Al Davis Eddie Robinson Leadership Academy", date: "8/4/2026" },
  ],
  scheduledInterviews: [{ name: "Jason Moultrie", org: "WestPac Wealth Partners", date: "8/6/2026" }],
  toBeRescheduled: [
    { name: "Becky Harris", org: "" },
    { name: "Cinthia Moore", org: "" },
    { name: "Nora Perez", org: "Enterprise Financial Serv Corp" },
    { name: "Nick Rowe", org: "Bank of America" },
    { name: "Brook Sweeting", org: "United Federal Credit Union" },
  ],
  declined: [
    { name: "Elizabeth Day", org: "", reason: "Not Interested" },
    { name: "Michael Dermody", org: "Dermody Properties", reason: "Not Interested" },
    { name: "Eaton Dunkelberger", org: "Community Foundation NN", reason: "Does not do study interviews" },
    { name: "EL Cord Foundation", org: "EL Cord Foundation", reason: "Does not do study interviews" },
    { name: "Matt Engle", org: "Insurance Office of America", reason: "Too Busy" },
    { name: "Caesar Fonte", org: "", reason: "No longer lives in Las Vegas" },
    { name: "Nicole Freestone", org: "", reason: "Too Busy" },
    { name: "Vadim Fridman", org: "Windsong Trust", reason: "Does not do study interviews" },
    { name: "Steven Hussain", org: "Prologis", reason: "Recommended another person in his office to do interview" },
    { name: "Gary Kantor", org: "", reason: "Personal Issues" },
    { name: "Gary Klein", org: "LPL Financial", reason: "Too Busy, but likes what JAG does" },
    { name: "Mike Kramer", org: "", reason: "Too Busy" },
    { name: "Tim Kuptz", org: "", reason: "Too Busy" },
    { name: "Charles Litt", org: "", reason: "Not Interested" },
    { name: "Dawn Mack", org: "Cyrus and Michael Tang Foundation", reason: "Out of Country" },
    { name: "Erica Mosca", org: "", reason: "Too Busy" },
    { name: "Melanie Narish", org: "", reason: "Too Busy" },
    { name: "Lori Nelson", org: "", reason: "Too Busy" },
    { name: "John Shepherd", org: "", reason: "Not Interested" },
    { name: "Don Snyder", org: "United Way of Southern Nevada", reason: "Out of Town" },
    { name: "Nathan Thomas", org: "Empire Cat", reason: "Not Interested" },
    { name: "Gerry Tomac", org: "", reason: "Not Interested" },
    { name: "LaWanda Torres", org: "", reason: "Is no longer interested in doing interview" },
    { name: "George Wallace", org: "", reason: "Not Interested" },
  ],
  deceased: [{ name: "Robert Mendenhall", reason: "Passed Away" }],
  feasibilitySignals: [
    {
      stat: "85%",
      label: "Rate JAG's reputation “Very Good” or “Good”",
      detail: "14 Very Good, 8 Good, 4 Don't Know — out of 26 respondents",
    },
    {
      stat: "69%",
      label: "Would consider a financial gift to JAG if asked",
      detail: "18 Yes, 6 No, 1 Maybe, 1 Don't Know",
    },
    {
      stat: "60%",
      label: "Of likely donors would consider a multi-year commitment",
      detail: "9 of 15 who answered the multi-year follow-up said Yes",
    },
    {
      stat: "73%",
      label: "Are willing to introduce JAG to others in their network",
      detail: "19 of 26 respondents said Yes",
    },
    {
      stat: "42%",
      label: "Would consider a leadership role with JAG",
      detail: "11 Yes, another 6 said Maybe",
    },
  ],
  missionThemes: [
    { label: "Workforce development", pct: "73%" },
    { label: "Opportunity & access", pct: "69%" },
    { label: "Mentorship", pct: "54%" },
    { label: "Student success", pct: "50%" },
    { label: "Leadership training", pct: "31%" },
  ],
  quotes: [
    "I believe JAG has a very good reputation among those who know about the organization and understand the work it does in the community.",
    "I believe JAG has a very good reputation because it consistently delivers measurable results for students who are most at risk of not graduating.",
    "I feel JAG is a wonderful organization, is well respected, and has a positive reputation.",
    "JAG aligns closely with what motivates me because it prepares young people for successful careers while helping them overcome challenges that could prevent them from reaching their goals.",
    "JAG aligns with my passion for public education, helping young people develop meaningful life skills, and creating opportunities for students who may otherwise struggle to find their path.",
    "It aligns completely — I feel a strong sense of ownership and can clearly see the direct impact and immense return on investment it brings to youth.",
    "That alignment is one of the reasons I serve on the board. I believe in the organization's mission, leadership, and ability to produce results.",
    "JAG is very valuable and needed in Las Vegas. I see the dropout rates improving and feel JAG is doing a very good job.",
    "I have seen firsthand the instructors' enthusiasm and passion, and it is very inspirational.",
    "From what I've seen, JAG gets really good results for those that need another outlet and need a chance.",
    "JAG's focus on youth and its commitment to preparing students for quality employment strongly align with my values.",
    "JAG aligns closely with our organization's priorities because it focuses on education and workforce development.",
  ],
};

export async function getJagDashboardData(): Promise<JagDashboardData> {
  try {
    const result = await get(DATA_PATH, { access: "private", useCache: false });
    if (!result || !result.stream) return DEFAULT_JAG_DATA;
    const text = await new Response(result.stream).text();
    const data = JSON.parse(text) as JagDashboardData;
    // Minimal shape check so a corrupted/partial blob never breaks the page.
    if (!data || !data.stats || !Array.isArray(data.completedInterviews)) {
      return DEFAULT_JAG_DATA;
    }
    return data;
  } catch {
    return DEFAULT_JAG_DATA;
  }
}

export async function saveJagDashboardData(data: JagDashboardData): Promise<void> {
  await put(DATA_PATH, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export function pickRandomQuotes(quotes: string[], count: number): string[] {
  const pool = [...quotes];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Tracker helpers — used by the in-app tracker on /jag-dashboard, which
// recreates the standalone jag-nevada-tracker app's layout (stat cards with
// week-over-week deltas, status breakdown, contact list, observations) using
// live data from this same store, so it updates every time /jag-admin saves.
// ---------------------------------------------------------------------------

export type ContactStatus = "Completed" | "Scheduled" | "To Be Rescheduled" | "Declined" | "Deceased";

export interface ContactRow {
  name: string;
  org: string;
  status: ContactStatus;
  date: string;
  note: string;
}

export function buildContactList(data: JagDashboardData): ContactRow[] {
  const rows: ContactRow[] = [];
  for (const r of data.completedInterviews) {
    rows.push({ name: r.name, org: r.org, status: "Completed", date: r.date, note: "" });
  }
  for (const r of data.scheduledInterviews) {
    rows.push({ name: r.name, org: r.org, status: "Scheduled", date: r.date, note: "" });
  }
  for (const r of data.toBeRescheduled) {
    rows.push({ name: r.name, org: r.org, status: "To Be Rescheduled", date: "", note: "" });
  }
  for (const r of data.declined) {
    rows.push({ name: r.name, org: r.org, status: "Declined", date: "", note: r.reason });
  }
  for (const r of data.deceased) {
    rows.push({ name: r.name, org: "", status: "Deceased", date: "", note: r.reason });
  }
  return rows;
}

// Returns a "+N vs. last report" / "-N vs. last report" string, or null if
// there's no prior snapshot yet (e.g. the very first save).
export function deltaLabel(current: number, previous?: number): string | null {
  if (previous === undefined || previous === null) return null;
  const diff = current - previous;
  if (diff === 0) return "No change vs. last report";
  return `${diff > 0 ? "+" : ""}${diff} vs. last report`;
}

// Share of total prospects that have any tracked outreach outcome so far
// (completed, scheduled, to-be-rescheduled, declined, or deceased) versus
// the full prospect pool.
export function computeResponseRate(stats: JagStats): number {
  if (!stats.totalProspects) return 0;
  const reached = stats.completed + stats.scheduled + stats.toBeRescheduled + stats.declined + stats.deceased;
  return Math.round((reached / stats.totalProspects) * 100);
}

const LOGISTICAL_KEYWORDS = ["busy", "out of", "no longer lives", "personal issues", "another person"];

export function classifyDeclineReasons(declined: DeclinedRow[]): { logistical: number; other: number } {
  let logistical = 0;
  for (const d of declined) {
    const r = d.reason.toLowerCase();
    if (LOGISTICAL_KEYWORDS.some((k) => r.includes(k))) logistical++;
  }
  return { logistical, other: declined.length - logistical };
}

// Auto-written narrative bullets, mirroring the "General Observations"
// section of the original standalone tracker.
export function generateObservations(data: JagDashboardData): string[] {
  const { stats, feasibilitySignals, missionThemes, declined, previousStats } = data;
  const obs: string[] = [];

  for (const f of feasibilitySignals) {
    const label = f.label.charAt(0).toLowerCase() + f.label.slice(1);
    obs.push(`${f.stat} ${label} — ${f.detail}.`);
  }

  if (missionThemes.length > 0) {
    const top = missionThemes[0];
    const others = missionThemes.slice(1, 3).map((m) => m.label);
    const othersText = others.length ? ` followed by ${others.join(" and ")}` : "";
    obs.push(`“${top.label}” is the top-resonating mission theme (${top.pct})${othersText}.`);
  }

  if (previousStats) {
    const diff = stats.completed - previousStats.completed;
    if (diff > 0) {
      obs.push(
        `${stats.completed} interviews have now been completed, up from ${previousStats.completed} at the last report — ${diff} new completed interview${diff === 1 ? "" : "s"} since then.`
      );
    } else if (diff === 0) {
      obs.push(`${stats.completed} interviews have been completed to date, unchanged since the last report.`);
    }
  }

  const reached = stats.completed + stats.scheduled + stats.toBeRescheduled + stats.declined + stats.deceased;
  obs.push(
    `${reached} of ${stats.totalProspects} total prospects (${computeResponseRate(stats)}%) have a tracked outreach outcome, with ${stats.dials.toLocaleString()} dials and ${stats.emailsSent} emails sent to date.`
  );

  if (declined.length > 0) {
    const { logistical, other } = classifyDeclineReasons(declined);
    const skew =
      logistical >= other
        ? `remain overwhelmingly logistical (“too busy”, “out of town/country”)`
        : `include a meaningful mix of logistical reasons and outright disinterest`;
    obs.push(`${declined.length} decline${declined.length === 1 ? "" : "s"} to date ${skew} rather than disinterest alone.`);
  }

  return obs;
}
