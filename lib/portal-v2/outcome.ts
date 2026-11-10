// Dashboard-only manual metadata, never an Engage calling disposition.
export const OUTCOME_FIELD = "dashboard:outcome";
export const OUTCOME_OPTIONS = ["Deceased", "Not interested", "Moved", "Can’t afford", "Committed elsewhere", "Other"] as const;
export const OUTCOME_NOTE_LIMIT = 300;
export type Outcome = { value: "" | typeof OUTCOME_OPTIONS[number]; note: string };
export function validateOutcome(value: unknown, note: unknown): Outcome {
  if (typeof value !== "string" || (value !== "" && !(OUTCOME_OPTIONS as readonly string[]).includes(value))) throw new Error("Choose a valid outcome or leave it blank");
  if (typeof note !== "string" || note.length > OUTCOME_NOTE_LIMIT) throw new Error(`Explanation must be at most ${OUTCOME_NOTE_LIMIT} characters`);
  if (value === "Other" && !note.trim()) throw new Error("Enter a short explanation for Other");
  return { value: value as Outcome["value"], note: value === "Other" ? note.trim() : "" };
}
export function readOutcome(raw: string | null | undefined): Outcome {
  try { const v = JSON.parse(raw || "null"); return validateOutcome(v?.value, v?.note); }
  catch { return { value: "", note: "" }; }
}
