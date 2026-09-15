// ---------------------------------------------------------------------------
// Registry of the client study portals that build themselves from VanillaSoft.
//
// Adding a new calling program to the portal system is meant to be a
// config entry here plus a page that renders <StudyDashboard />. Everything
// else (stats, tiers, contact tables, feedback trends, quotes) is derived
// from the project's VanillaSoft data by lib/vs-sync.ts.
// ---------------------------------------------------------------------------

export interface SurveySignalConfig {
  /** Survey question number as it appears in VanillaSoft ("8", "8A", "12"). */
  question: string;
  /** Headline shown next to the percentage on the dashboard. */
  label: string;
  /** Answers that count toward the percentage (case-insensitive). */
  positiveAnswers: string[];
  /**
   * Answers that count toward the denominator. Leave empty to use every
   * respondent who answered the question at all.
   */
  countedAnswers?: string[];
}

export interface StudyPortalConfig {
  slug: string;
  label: string;
  clientName: string;
  eyebrow: string;
  projectId: number;
  /** Vercel Blob path holding the dashboard JSON for this portal. */
  dataPath: string;
  /** Vercel Blob path holding the accumulated VanillaSoft contact snapshot. */
  contactsPath: string;
  /** First date to pull call history from. */
  historyStart: string;
  /** Multi-select question whose answers become the mission-theme bars. */
  missionThemeQuestion: string;
  /** Questions whose free-text comments are eligible to become pull quotes. */
  quoteQuestions: string[];
  signals: SurveySignalConfig[];
  /** PDF summary endpoint, if the portal has one. */
  pdfPath?: string;
  /**
   * Whether the scheduled sync may refresh this portal. A finished study is
   * set to false so its delivered numbers can never be rewritten.
   */
  syncEnabled: boolean;
}

const STANDARD_SIGNALS: SurveySignalConfig[] = [
  {
    question: "3",
    label: "Rate the organization's reputation “Very Good” or “Good”",
    positiveAnswers: ["very good", "good"],
  },
  {
    question: "8",
    label: "Would consider a financial gift if asked",
    positiveAnswers: ["yes"],
  },
  {
    question: "8A",
    label: "Of likely donors would consider a multi-year commitment",
    positiveAnswers: ["yes"],
  },
  {
    question: "13",
    label: "Are willing to introduce the organization to others in their network",
    positiveAnswers: ["yes"],
  },
  {
    question: "12",
    label: "Would consider a leadership role",
    positiveAnswers: ["yes"],
  },
];

export const STUDY_PORTALS: Record<string, StudyPortalConfig> = {
  jag: {
    slug: "jag",
    label: "JAG Nevada Interview Tracker",
    clientName: "JAG Nevada",
    eyebrow: "JAG Nevada · Donor Assessment Study",
    projectId: 319113,
    dataPath: "jag-dashboard/data.json",
    contactsPath: "jag-dashboard/vs-contacts.json",
    historyStart: "2026-06-01",
    missionThemeQuestion: "5",
    quoteQuestions: ["3", "10"],
    signals: STANDARD_SIGNALS.map((s) =>
      s.question === "3"
        ? { ...s, label: "Rate JAG’s reputation “Very Good” or “Good”" }
        : s.question === "8"
          ? { ...s, label: "Would consider a financial gift to JAG if asked" }
          : s.question === "13"
            ? { ...s, label: "Are willing to introduce JAG to others in their network" }
            : s.question === "12"
              ? { ...s, label: "Would consider a leadership role with JAG" }
              : s
    ),
    pdfPath: "/api/jag-summary-pdf",
    syncEnabled: false, // donor assessment study closed 2026-09; page is frozen as delivered
  },
  csnf: {
    slug: "csnf",
    label: "CSNF Interview Tracker",
    clientName: "CSNF",
    eyebrow: "CSNF · Feasibility Study",
    projectId: 327148,
    dataPath: "csnf-dashboard/data.json",
    contactsPath: "csnf-dashboard/vs-contacts.json",
    historyStart: "2026-09-01",
    missionThemeQuestion: "5",
    quoteQuestions: ["3", "10"],
    signals: STANDARD_SIGNALS.map((s) =>
      s.question === "3"
        ? { ...s, label: "Rate CSNF’s reputation “Very Good” or “Good”" }
        : s.question === "8"
          ? { ...s, label: "Would consider a financial gift to CSNF if asked" }
          : s.question === "13"
            ? { ...s, label: "Are willing to introduce CSNF to others in their network" }
            : s.question === "12"
              ? { ...s, label: "Would consider a leadership role with CSNF" }
              : s
    ),
    pdfPath: "/api/jag-summary-pdf?portal=csnf",
    syncEnabled: true,
  },
};

export function getStudyPortal(slug: string): StudyPortalConfig | null {
  return STUDY_PORTALS[slug] ?? null;
}

// ---------------------------------------------------------------------------
// VanillaSoft result-code vocabulary shared across calling projects.
// ---------------------------------------------------------------------------

/** Result codes that end a prospect's journey, most recent one wins. */
export const TERMINAL_RESULT_CODES: Record<string, "completed" | "declined" | "rescheduled" | "closed" | "deceased"> = {
  Completed: "completed",
  CallFinish: "completed",
  Declined: "declined",
  "DNA-Interv": "declined",
  Reschedule: "rescheduled",
  DNC: "closed",
  Deceased: "deceased",
};

/** Result codes that represent an email touch rather than a dial. */
export function isEmailResult(code: string): boolean {
  return /^emai/i.test(code);
}
