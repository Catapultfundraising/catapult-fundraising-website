/**
 * W0 website side (PLAN-W-A1 + PLAN-W-A2). The BACKEND is the sole authority for source-gift activation and the
 * one-way database-key edit deny latch; the website keeps NO policy/approval/latch list. It consumes only the strict
 * boolean projection `databaseGiftEditsAvailable` from the backend state (missing/malformed => false, fail closed)
 * and maps the backend's typed refusals. The mixed id+key check runs locally BEFORE request normalization.
 */
export const dbGiftEditsAvailable = (v: unknown): boolean => v === true;

/** true when a gift request names a positive SQL id AND carries a `key` PROPERTY (any value incl. null/""/0/false) — refused, never normalized. */
export function mixedGiftIdentity(g: unknown): boolean {
  if (!g || typeof g !== "object") return false;
  const r = g as Record<string, unknown>;
  return Number(r.id) > 0 && Object.prototype.hasOwnProperty.call(r, "key");
}

export const DB_GIFT_EDIT_UNAVAILABLE_UI = "Corrections to client-database gifts are unavailable for this client right now. Dashboard-entered gifts can still be edited.";
export const MIXED_GIFT_IDENTITY_UI = "Send either a gift id or a gift key, not both.";
