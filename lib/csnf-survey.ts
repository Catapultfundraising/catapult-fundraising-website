import { get } from "@vercel/blob";
import { getStudyPortal } from "@/lib/study-portals";
import type { VsContact } from "@/lib/vanillasoft";

// CSNF Donor Assessment Study interview questions (source: "CSNF Donor
// Assessment Study Interview Questions FINAL 9.14.26"). Answers live on the
// calling contact as custom fields "Survey N Answer:" / "Survey N Comments:",
// which the daily portal sync keeps in the contacts store blob.
export const CSNF_QUESTIONS: [string, string][] = [
  ["1", "What best describes your role in the community?"],
  ["2", "What is your current relationship with CSN and/or the CSN Foundation?"],
  ["3", "How would you describe the reputation and image of CSN in the community?"],
  ["4", "Before receiving the Case Summary and FAQ, how familiar were you with the proposed Northwest Campus?"],
  ["5", "Should CSN move forward with a fourth full-service campus in Northwest Las Vegas?"],
  ["6", "How compelling are the needs the Northwest Campus is intended to address?"],
  ["7", "Which elements of the Northwest Campus resonate most with you?"],
  ["8", "Does the public-private partnership approach strengthen the case for philanthropic support?"],
  ["9", "Can the CSN Foundation raise $10 million in private support for the Northwest Campus?"],
  ["10", "Are leadership gifts of $500,000 to $2 million available for this project?"],
  ["11", "What would make the case more persuasive to major donors?"],
  ["12", "When this goes to campaign, would you consider being a donor?"],
  ["12A", "Which color of the giving pyramid best represents the support you would consider?"],
  ["13", "Would serving on the 10-12 member Campaign Committee interest you?"],
  ["14", "Are there individuals with capacity and interest to make a significant gift?"],
  ["15", "Are there corporations, foundations or organizations that may support the project?"],
  ["16", "Are there other campaigns or priorities that may compete for support?"],
  ["17", "What concerns or objections do you expect prospective donors may raise?"],
  ["18", "Is there anyone else we should interview for this Study?"],
  ["19", "Is there anything else you would like to share?"],
];

export interface SurveyAnswer { q: string; question: string; answer: string; comments: string }
export interface SurveyResult {
  name: string; tier: string; interviewee: string; interviewType: string; updated: string;
  answers: SurveyAnswer[];
}

const field = (c: VsContact, n: string) => c.custom_fields?.find((f) => f.name.trim().toLowerCase() === n.toLowerCase())?.value?.trim() ?? "";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

async function loadContacts(): Promise<VsContact[]> {
  const path = getStudyPortal("csnf")?.contactsPath;
  if (!path) return [];
  try {
    const r = await get(path, { access: "private", useCache: false });
    if (!r?.stream) return [];
    const store = JSON.parse(await new Response(r.stream).text());
    return Object.values(store ?? {}) as VsContact[];
  } catch {
    return [];
  }
}

function toResult(c: VsContact): SurveyResult {
  const answers: SurveyAnswer[] = [];
  const known = new Set(CSNF_QUESTIONS.map(([q]) => q));
  const extra = (c.custom_fields ?? [])
    .map((f) => /^Survey (\S+) Answer:$/.exec(f.name.trim())?.[1])
    .filter((q): q is string => !!q && !known.has(q));
  for (const [q, question] of [...CSNF_QUESTIONS, ...extra.map((q) => [q, field(c, `Survey ${q} Question:`) || `Question ${q}`] as [string, string])]) {
    const answer = field(c, `Survey ${q} Answer:`);
    const comments = field(c, `Survey ${q} Comments:`);
    if (answer || comments) answers.push({ q, question, answer, comments });
  }
  return {
    name: [c.first_name, c.last_name].filter(Boolean).join(" "),
    tier: field(c, "Tier"), interviewee: field(c, "Interviewee"), interviewType: field(c, "Interview Type"),
    updated: c.modified_date_time_utc ?? "", answers,
  };
}

/** Finds the interview for a donor: CPTID / Client ID custom field first, then exact name. */
export async function getCsnfSurvey(cptid: string, name: string): Promise<SurveyResult[]> {
  const contacts = await loadContacts();
  let hits = contacts.filter((c) => !c.deleted && [field(c, "CPTID"), field(c, "Client ID")].some((v) => v && v.replace(/\.0+$/, "") === cptid));
  if (!hits.length && name) {
    const n = norm(name);
    hits = contacts.filter((c) => {
      const f = norm(c.first_name ?? ""), l = norm(c.last_name ?? "");
      return !c.deleted && f && l && n.includes(f) && n.includes(l);
    });
  }
  return hits.map(toResult).filter((r) => r.answers.length).sort((a, b) => b.answers.length - a.answers.length);
}
