// Campaign tracking entered in the CSNF portal after committee meetings.
export const PROSPECT_STATUSES = ["Active", "Assigned", "Cultivate", "New referral", "Hold", "Committed", "Disqualified"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];
export const ACTIVITY_KINDS = ["Visit", "Call", "Email", "Event", "Committee update", "Ask made", "Gift / pledge", "Note"] as const;
export interface ProspectState {
  status: ProspectStatus; level?: number; solicitor?: string; reason?: string; updatedAt: string; by: string;
}
export interface Activity { id: string; cptid: number; date: string; kind: string; note: string; by: string; at: string }
export interface CsnfTracking {
  prospects: Record<string, ProspectState>;
  activity: Activity[];
  pirs: Record<string, { name: string; url: string }>;
}
export const EMPTY_TRACKING: CsnfTracking = { prospects: {}, activity: [], pirs: {} };
export const STATUS_RANK: Record<string, number> = Object.fromEntries(PROSPECT_STATUSES.map((s, i) => [s, i]));
