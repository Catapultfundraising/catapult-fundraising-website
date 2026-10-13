import { getJagRecords } from "@/lib/jag-data-store";

// JAG feasibility study interview answers. They come from the Access
// "Feasibility-Results" table (Azure jag.feasibility_results), which holds
// yes/no answers to the four campaign questions plus interview status. The
// builder copies them onto each donor record as `feasibility`.
export const JAG_QUESTIONS: [string, string][] = [
  ["1", "Would consider a donation to JAG Nevada"],
  ["2", "Would consider a multi-year donation"],
  ["3", "Would consider campaign leadership"],
  ["4", "Would introduce someone to JAG Nevada"],
];

export interface SurveyAnswer { q: string; question: string; answer: string; comments: string }
export interface SurveyResult {
  name: string; tier: string; interviewee: string; interviewType: string; updated: string;
  answers: SurveyAnswer[];
}

export async function getJagSurvey(cptid: string, _name: string): Promise<SurveyResult[]> {
  const data = await getJagRecords();
  const f = data?.records[cptid]?.feasibility;
  if (!f) return [];
  const yn = (v?: boolean) => (v ? "Yes" : "No");
  const answers: SurveyAnswer[] = f.completed
    ? [f.consider, f.multiYear, f.leadership, f.introduce].map((v, i) => ({ q: JAG_QUESTIONS[i][0], question: JAG_QUESTIONS[i][1], answer: yn(v), comments: "" }))
    : [{ q: "-", question: "Interview status", answer: f.declined ? "Declined to be interviewed" : f.result || "Not interviewed", comments: "" }];
  return [{
    name: data!.records[cptid].name, tier: f.tier ?? "", interviewee: [f.title, f.company].filter(Boolean).join(", "),
    interviewType: f.completed ? "Completed interview" : "", updated: f.date ?? "", answers,
  }];
}
