// Server-only helpers for the reserved first load (node crypto). See source-allocator.ts.
import { SourceError, preparedDigest } from "./source-reconcile";
import { verifySourceToken } from "./source-import-apply";
export { preparedDigest };
/** Apply-time: a token minted for the reserved first load must carry the CURRENT allocator digest of its client;
 *  a token for an allocator-registered client without that binding (i.e. an insert outside the reserved path) is refused. */
/** secret/now optional (default process.env.PORTAL_WRITE_SECRET / Date.now(), unchanged); expired tokens still pass here (allowExpired) so
 *  the backend decides replay/expiry. Checks are identical whichever secret/clock is supplied. */
export function verifySourceTokenPayloadForAlloc(token: unknown, client: string, current: (client: string) => { allocatorDigest: string; identityConfigDigest: string } | null, secret: string | undefined = process.env.PORTAL_WRITE_SECRET, now: number = Date.now()) {
  const { payload } = verifySourceToken(token, secret, now, true);
  const c = current(client); const cur = c?.allocatorDigest ?? null;
  if ((payload.allocatorDigest !== undefined || payload.identityConfigDigest !== undefined) && (payload.allocatorDigest !== cur || payload.identityConfigDigest !== c?.identityConfigDigest)) throw new SourceError("The reviewed allocator configuration changed since this preview; preview again");
  if (cur && payload.allocatorDigest === undefined && payload.ops.some((o) => o.kind === "insert")) throw new SourceError("New records for this client are added only through the reserved first load");
}
