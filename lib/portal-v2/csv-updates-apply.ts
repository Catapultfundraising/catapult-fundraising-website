// Apply step of the staff CSV contact updater, with injected dependencies so it can be tested offline.
import { CsvError, baseValue, csvApplyEnabled, verifyToken, type CsvClient } from "@/lib/portal-v2/csv-updates";

export interface ApplyDeps {
  env?: Record<string, string | undefined>;
  recordsFor: (c: CsvClient) => Promise<{ asOf?: string; records?: Record<string, { contact?: Record<string, string> }> } | null>;
  engageCall: (c: CsvClient, op: string, body: Record<string, unknown>) => Promise<{ status: number; body: Record<string, unknown> }>;
}
export type ApplyResult = { status: number; body: Record<string, unknown> };

/** No automatic retry: a lost response is reported as unconfirmed with its requestId (Check status, or resend the SAME token,
 *  which Engage treats idempotently under lock). */
export async function applyCsvPreview(b: Record<string, unknown>, client: CsvClient, secret: string | undefined, deps: ApplyDeps): Promise<ApplyResult> {
  const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => ({ status, body: { error, saved: false, ...extra } });
  if (!csvApplyEnabled(deps.env)) return fail("Saving CSV updates is turned off until rollout is approved", 403, { code: "disabled" });
  const by = typeof b.by === "string" ? b.by.trim() : "";
  if (!by || by.length > 200 || /[-\u001f\u007f]/.test(by)) return fail("Enter your name", 400);
  let v: ReturnType<typeof verifyToken>;
  try { v = verifyToken(b.token, secret); } catch (e) { return fail(e instanceof CsvError ? e.message : "Preview token is not valid", 400); }
  const { payload, hash } = v;
  if (payload.client !== client) return fail("Preview belongs to another client", 409);
  const recs = await deps.recordsFor(client);
  if (!recs?.asOf || recs.asOf !== payload.asOf) return fail("Client records were refreshed after this preview. Preview the file again.", 409, { code: "stale" });
  if (payload.changes.some((c) => !recs.records?.[String(c.cptid)])) return fail("A CPTID is no longer in the client records. Preview again.", 409, { code: "stale" });
  // Source values can change with the same asOf: every change without an overlay must still see exactly the previewed base value.
  // (Non-atomic: the records blob is not locked; a refresh landing between this check and the SQL commit is not detected.)
  const moved = payload.changes.filter((c) => c.expectedUpdateId === null && baseValue(recs.records?.[String(c.cptid)] as never, c.key) !== (c.baseOld ?? ""));
  if (moved.length) return fail("Client record values changed after this preview. Preview the file again.", 409, { code: "stale", cptids: [...new Set(moved.map((c) => c.cptid))].slice(0, 20) });
  let res: { status: number; body: Record<string, unknown> };
  const unconfirmed = () => fail("No confirmation came back. The save may or may not have happened. Use Check status; do not upload again.", 502, { unconfirmed: true, requestId: payload.requestId });
  try {
    res = await deps.engageCall(client, "applyCsvContactUpdates", {
      requestId: payload.requestId, previewHash: hash, expectedMaxBatchId: payload.maxBatchId, fileName: payload.fileName, by, changes: payload.changes,
    });
  } catch { return unconfirmed(); }
  if (res.status >= 500) return unconfirmed();
  if (res.status !== 200) return { status: res.status, body: { ...res.body, saved: false } };
  return { status: 200, body: { saved: true, ...res.body, requestId: payload.requestId } };
}
