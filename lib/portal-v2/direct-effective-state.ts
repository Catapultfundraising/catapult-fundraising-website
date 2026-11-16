/**
 * OFF-lane composition contract. No endpoint/SQL/registration authority here.
 * Call ONLY with server-validated, approved source rows and strict current manual state.
 * Every main consumer must participate before any registration can be enabled.
 */
export const APPROVED_DIRECT_READ_REGISTRATIONS: readonly never[] = Object.freeze([]);
export const DIRECT_READ_INTEGRATION_ACCEPTED = false;
export type Observation<T> = { kind: "known"; value: T } | { kind: "unavailable" };
export type Presence<T> = { present: false } | { present: true; value: T };
export class DirectReadUnavailable extends Error {
  constructor() { super("Direct/manual state unavailable; retain last good view"); }
}
/** Presence, not truthiness or equality. Source withdrawal is a KNOWN absence. */
export function composeDirectValue<T>(
  manual: Observation<Presence<T>>, direct: Observation<Presence<T>>, access: T,
): T {
  const valid = (o: Observation<Presence<T>>) => o?.kind === "known" && o.value !== null &&
    typeof o.value === "object" && typeof o.value.present === "boolean" &&
    (!o.value.present || Object.prototype.hasOwnProperty.call(o.value, "value"));
  if (!valid(manual) || !valid(direct) || manual.kind !== "known" || direct.kind !== "known") throw new DirectReadUnavailable();
  return manual.value.present ? manual.value.value : direct.value.present ? direct.value.value : access;
}
export type SourceNote = {
  cptid: number; event_key: string; body: string; note_date: string; template: string;
  request_id: string; source_date: string; committed_at: string; declared_actor: string;
  file_name: string; file_digest: string; authority_rev: string;
};
/** Immutable attributed lane, never injected into mutable tracking.activity. */
export function sourceNoteEntries(notes: readonly SourceNote[], cptid: number) {
  return notes.filter(n => n.cptid === cptid).map(n => Object.freeze({
    ...n, lane: "direct-source" as const, editable: false as const,
    attribution: "Declared shared-login attribution; not verified staff identity" as const,
  }));
}
