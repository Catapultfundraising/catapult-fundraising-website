// Campaign tracking entered in the PVAS portal after committee meetings.
export const PROSPECT_STATUSES = ["Active", "Assigned", "Cultivate", "New referral", "Hold", "Committed", "Disqualified"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];
export const ACTIVITY_KINDS = ["Visit", "Call", "Email", "Event", "Committee update", "Ask made", "Gift / pledge", "Note"] as const;
export interface ProspectState {
  status: ProspectStatus; level?: number; solicitor?: string; /** False only when a status-only request did not edit primary. Absent preserves legacy clear semantics. */ solicitorEdited?: boolean; /** Saved in Engage SQL (dashboard-origin). */ solicitor2?: string; reason?: string; updatedAt: string; by: string;
}
export interface CanonicalNoteState {
  noteId: number; rowId: number; cptid: number; version: number;
  text: string | null; date: string | null; source: string | null; order: number | null; deleted: boolean;
}
export interface Activity { id: string; cptid: number; date: string; sourceDate?: string; kind: string; note: string; by: string; at: string; editedBy?: string; editedAt?: string; _canonical?: CanonicalNoteState }
/** Deleted history entries are kept here (who/when), never dropped. */
export interface RemovedActivity extends Activity { removedBy: string; removedAt: string }
export interface PvasTracking {
  /** Opaque canonical current-state revision; preserve unchanged until saved. */
  revision?: string;
  prospects: Record<string, ProspectState>;
  activity: Activity[];
  removed?: RemovedActivity[];
  pirs: Record<string, { name: string; url: string }>;
}
export const EMPTY_TRACKING: PvasTracking = { prospects: {}, activity: [], pirs: {} };
export const STATUS_RANK: Record<string, number> = Object.fromEntries(PROSPECT_STATUSES.map((s, i) => [s, i]));
