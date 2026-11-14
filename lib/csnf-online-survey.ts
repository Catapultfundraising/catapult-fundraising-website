// Online questionnaire; separate from the existing VanillaSoft interview module.
export const SURVEY_VERSION = "csnf-2026-11-v2";
export const SURVEY_SCHEMA_VERSION = 2;
export const SUBMITTED_REVISION = 1000001;
export const IDENTITY_FIELDS = [
  { id: "firstName", label: "First name", required: true },
  { id: "lastName", label: "Last name", required: true },
  { id: "telephone", label: "Telephone", required: false },
] as const;
export interface SurveyQuestion {
  id: string;
  label: string;
  type: "text" | "single" | "multi";
  options?: string[];
  required?: boolean;
  commentFor?: string;
}
const YES_NO = ["Yes", "No", "Maybe", "Don’t know"];
// Source: "CSNF Donor Assessment Study Online Questions.docx", supplied in
// Tina Romero's November 13, 2026 email attachment. Printed date is a placeholder, not launch.
// Required names, optional telephone and identified autosave were subsequently
// authorized by Anthony during his preview review. Questions remain verbatim.
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: "q1", label: "1. How would you describe the reputation and image of the College of Southern Nevada in the community?", type: "single", options: ["Very good", "Good", "Average", "Problematic", "Don’t know"] },
  { id: "q1_comments", label: "Comments:", type: "text", commentFor: "q1" },
  { id: "q2", label: "2. Do you believe CSN should move forward with developing a fourth full-service campus in Northwest Las Vegas?", type: "single", options: YES_NO },
  { id: "q2_comments", label: "Why or why not?\nComments:", type: "text", commentFor: "q2" },
  { id: "q3", label: "3. How compelling are the needs the Northwest Campus is intended to address?", type: "single", options: ["Very compelling", "Compelling", "Somewhat compelling", "Not compelling", "Don’t know"] },
  { id: "q3_comments", label: "Comments:", type: "text", commentFor: "q3" },
  { id: "q4", label: "4. Which elements of the proposed Northwest Campus resonate most with you? Select all that apply.", type: "multi", options: ["Affordable higher education closer to home", "Student support services", "General education offerings", "Police Academy training", "Workforce development", "Economic growth", "Other"] },
  { id: "q4_comments", label: "Comments:", type: "text", commentFor: "q4" },
  { id: "q5", label: "5. Do you believe the CSN Foundation can raise $10 million in private philanthropic support for the Northwest Campus?", type: "single", options: YES_NO },
  { id: "q5_comments", label: "What gives you confidence or concern about this goal?\nComments:", type: "text", commentFor: "q5" },
  { id: "q6", label: "6. The CSN $10 million campaign will require leadership-level gifts ranging from $500,000 to $2 million. Do you believe gifts of that scale are available for this project?", type: "single", options: YES_NO },
  { id: "q6_comments", label: "Comments:", type: "text", commentFor: "q6" },
  { id: "q7", label: "7. When this project moves to campaign, would you consider being a donor?", type: "single", options: YES_NO },
  { id: "q7_comments", label: "Comments:", type: "text", commentFor: "q7" },
  { id: "q8", label: "8. When this goes to campaign, a Campaign Committee consisting of 10-12 key volunteers will be needed to strategize and guide the campaign. Would this interest you?", type: "single", options: YES_NO },
  { id: "q8_comments", label: "Comments:", type: "text", commentFor: "q8" },
  { id: "q9", label: "9. Are you aware of any individuals, corporations, foundations, public safety organizations, or other organizations that may have the capacity and interest to support the Northwest Campus?", type: "single", options: YES_NO },
  { id: "q9_comments", label: "If yes, who, and what aspect of the project may appeal to them?\nComments:", type: "text", commentFor: "q9" },
  { id: "q10", label: "10. Is there anything else you would like to share that we have not asked?\nComments:", type: "text" },
];
export type SurveyAnswers = Record<string, string | string[]>;
export interface SurveyIdentity { firstName: string; lastName: string; telephone: string }
export interface SurveyWrite extends SurveyIdentity {
  id: string;
  writeToken: string;
  revision: number;
  status: "draft" | "submitted";
  surveyVersion: string;
  answers: SurveyAnswers;
}
export interface SurveyResponse extends Omit<SurveyWrite, "writeToken"> {
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}
export interface SurveyQuestionResults { id: string; label: string; answered: number; counts: { label: string; count: number }[] }
export interface SurveyResults {
  surveyVersion: string;
  asOf: string;
  responseCount: number;
  questions: SurveyQuestionResults[];
  partialResponseCount: number;
  partialQuestions: SurveyQuestionResults[];
}

export class SurveyValidationError extends Error {}
export class SurveyConflictError extends Error {}

export function validateSurvey(input: unknown): SurveyWrite {
  const fail = (): never => { throw new SurveyValidationError("Please check your responses and try again."); };
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail();
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(k => !["id", "writeToken", "revision", "status", "surveyVersion", "firstName", "lastName", "telephone", "answers", "website"].includes(k))) return fail();
  if (body.website || body.surveyVersion !== SURVEY_VERSION || typeof body.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.id)) return fail();
  if (typeof body.writeToken !== "string" || !/^[0-9a-f]{64}$/.test(body.writeToken)) return fail();
  if (!Number.isSafeInteger(body.revision) || (body.status !== "draft" && body.status !== "submitted")) return fail();
  if (body.status === "draft" ? Number(body.revision) < 1 || Number(body.revision) >= SUBMITTED_REVISION : body.revision !== SUBMITTED_REVISION) return fail();
  const identity: SurveyIdentity = { firstName: "", lastName: "", telephone: "" };
  for (const key of ["firstName", "lastName", "telephone"] as const) {
    const value = body[key] ?? (key === "telephone" ? "" : null);
    if (typeof value !== "string" || value.length > (key === "telephone" ? 80 : 120) || /[\u0000-\u001f\u007f]/.test(value)) return fail();
    identity[key] = value.trim();
    if (key !== "telephone" && !identity[key]) return fail();
  }
  if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return fail();
  const supplied = body.answers as Record<string, unknown>;
  if (Object.keys(supplied).some(k => !SURVEY_QUESTIONS.some(q => q.id === k))) return fail();
  const answers: SurveyAnswers = {};
  for (const q of SURVEY_QUESTIONS) {
    const value = supplied[q.id] ?? (q.type === "multi" ? [] : "");
    if (q.type === "multi") {
      if (!Array.isArray(value) || value.length > (q.options?.length ?? 0) ||
        value.some(v => typeof v !== "string" || !q.options?.includes(v)) || new Set(value).size !== value.length) return fail();
      answers[q.id] = q.options!.filter(v => value.includes(v));
    } else {
      if (typeof value !== "string" || value.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return fail();
      const trimmed = value.trim();
      if (q.type === "single" && trimmed && !q.options?.includes(trimmed)) return fail();
      answers[q.id] = trimmed;
    }
    if (q.required && answers[q.id].length === 0) return fail();
  }
  return { id: body.id, writeToken: body.writeToken, revision: Number(body.revision), status: body.status, surveyVersion: SURVEY_VERSION, ...identity, answers };
}

// Only fixed-choice counts are reportable. Never include names, free text,
// individual response rows or contact details in client-facing summaries.
export function aggregateSurvey(responses: SurveyResponse[], asOf: Date): SurveyResults {
  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid survey cutoff");
  const latest = new Map<string, SurveyResponse>();
  for (const r of responses) {
    if (r.surveyVersion !== SURVEY_VERSION || Date.parse(r.updatedAt) > asOf.getTime()) continue;
    if (!latest.has(r.id) || latest.get(r.id)!.revision < r.revision) latest.set(r.id, r);
  }
  const eligible = [...latest.values()];
  const submitted = eligible.filter(r => r.status === "submitted");
  const partial = eligible.filter(r => r.status === "draft");
  const breakdown = (cohort: SurveyResponse[]) => SURVEY_QUESTIONS.filter(q => q.type !== "text").map(q => ({
    id: q.id, label: q.label,
    answered: cohort.filter(r => (r.answers[q.id]?.length ?? 0) > 0).length,
    counts: (q.options ?? []).map(label => ({
      label, count: cohort.filter(r => {
        const v = r.answers[q.id]; return Array.isArray(v) ? v.includes(label) : v === label;
      }).length,
    })),
  }));
  return {
    surveyVersion: SURVEY_VERSION, asOf: asOf.toISOString(),
    responseCount: submitted.length, questions: breakdown(submitted),
    partialResponseCount: partial.length, partialQuestions: breakdown(partial),
  };
}

// Previous Friday, inclusive, in Pacific civil time. Noon UTC avoids DST
// transitions while finding the date; Intl resolves the correct UTC offset.
export function surveyWeeklyCutoff(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  const date = new Date(`${part("year")}-${part("month")}-${part("day")}T12:00:00Z`);
  const daysBack = (date.getUTCDay() + 2) % 7 || 7;
  date.setUTCDate(date.getUTCDate() - daysBack + 1); // midnight Saturday Pacific
  const day = date.toISOString().slice(0, 10);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" }).formatToParts(date).find(p => p.type === "timeZoneName")!.value;
  const hours = Number(/GMT([+-]\d+)/.exec(offset)?.[1] ?? 0);
  return new Date(Date.parse(`${day}T00:00:00Z`) - hours * 3600000 - 1);
}
