/** First-release boundary. This is an operation restriction, not authorization
 * or backend readiness. Call only within the server's canonical PVAS branch. */
const reads = new Set(["state", "nativeStateV3", "nativeGiftPageV3", "nativeGiftPageV2",
  "nativeCampaignStatusV3", "clientContacts", "getTracking", "getTrackingCompactV1", "pvasHistoricalUploads", "pvasRequestStatus"]);
/** Shared documents and saved report lists: separate non-donor owners that the
 * backend serves unchanged in SQL mode. Their envelopes carry no PVAS requestId. */
export const PVAS_DOCUMENT_REPORT_OPS: ReadonlySet<string> = new Set(["listDocuments", "getDocument", "documentByPath",
  "addDocument", "deleteDocument", "listReportLists", "createReportList", "updateReportList", "deleteReportList"]);
export function pvasExistingOperationAllowed(op: string, body: Record<string, unknown>): boolean {
  if (reads.has(op) || PVAS_DOCUMENT_REPORT_OPS.has(op) || ["pvasFields", "pvasNote", "setTracking", "setTrackingCompactV1", "nativeCampaignMutationV3"].includes(op)) return true;
  if (op !== "pvasContact") return false;
  const command = body.command;
  if (!command || typeof command !== "object" || Array.isArray(command)) return false;
  const operation = (command as Record<string, unknown>).operation;
  return typeof operation === "string" && ["contact-edit", "contact-prospect-edit"].includes(operation);
}
export const PVAS_EXISTING_ONLY = {
  error: "Only existing-record edits are available. New donors, new gifts, uploads, Undo and record merge/delete/restore are unavailable.",
  code: "pvas-existing-records-only", retry: false,
};
