import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { pvasCanonicalEnabled } from "./pvas-canonical";

const scope = new AsyncLocalStorage<{ requestId?: unknown }>();
export const withPvasAction = <T,>(requestId: unknown, action: () => T): T => scope.run({ requestId }, action);
const commands = new Set(["pvasFields", "pvasContact", "pvasNote", "pvasGift", "pvasBatch", "pvasBatchUndo"]);
const reads = new Set(["state", "nativeStateV3", "nativeGiftPageV3", "nativeCampaignStatusV3", "clientContacts", "clientGifts", "pvasFinancials", "getTracking", "monthlyPreview", "monthlyStatus", "pvasRequestStatus", "pvasHistoricalUploads", "nativeGiftPageV2"]);
export class PvasActionIdentityError extends Error {
  constructor() { super("Canonical mutation requires the original requestId"); }
}
export function pvasActionBody(client: string, op: string, body: Record<string, unknown>): Record<string, unknown> {
  if (!pvasCanonicalEnabled(client) || reads.has(op)) return body;
  // Native v3 owns original command identity and declared actor; never widen
  // this exact envelope with the unrelated generic mutation identity.
  if (op === "nativeCampaignMutationV3") return body;
  // These repositories own identity inside command. The backend accepts
  // exactly {op,client,command}; ALS must never widen that strict envelope.
  if (commands.has(op)) {
    const command = body.command;
    if (!command || typeof command !== "object" || Array.isArray(command)) throw new PvasActionIdentityError();
    const nested = command as Record<string, unknown>;
    const requestId = nested.requestId ?? body.requestId ?? scope.getStore()?.requestId;
    if (typeof requestId !== "string" || !/^[a-f0-9]{32}$/.test(requestId) ||
        body.requestId !== undefined && body.requestId !== requestId) throw new PvasActionIdentityError();
    const { requestId: _outerRequestId, ...rest } = body;
    return { ...rest, command: { ...nested, requestId } };
  }
  const request = body.request;
  const nested = request && typeof request === "object" ? (request as Record<string, unknown>).requestId : undefined;
  const requestId = body.requestId ?? nested ?? scope.getStore()?.requestId;
  if (typeof requestId !== "string" || !/^[a-f0-9]{32}$/.test(requestId)) throw new PvasActionIdentityError();
  // MonthlyRequest already owns the ID. Do not add a new outer key to its
  // independently exact import envelope.
  if (op === "monthlyCommit") return body;
  return { ...body, requestId };
}
