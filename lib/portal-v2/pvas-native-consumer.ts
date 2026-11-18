/** HELD paired read consumer. No write capability or financial aggregate owner. */
import { collectNativeGiftPagesV2, type NativeGiftReadBody } from "./pvas-native-gift-read";
import { nativeHistoryPresentationV2 } from "./pvas-native-gift-presentation";
import { NativeGiftWireHold, type NativeGiftRecord } from "./pvas-native-gift-wire";
import { collectMixedPages, object, exact } from "./pvas-native-v3";
export const NATIVE_STATE_CAMPAIGN_REQUEST = Object.freeze({
  v: 2 as const, lane: "campaign" as const, view: "current" as const, after: null, limit: 500,
});
export interface NativeDonorHistory {
  v: 2; lane: "history"; view: "current" | "provenance"; records: NativeGiftRecord[];
}
export async function consumeNativeStateCampaignV2(raw: Record<string, unknown>, send: (body: NativeGiftReadBody) => Promise<unknown>) {
  if (raw.giftWireVersion !== 2 || ["gifts", "giftOverrides", "voidedGifts"].some(k => Object.hasOwn(raw, k)) ||
      !Object.hasOwn(raw, "nativeCampaignPage")) throw new NativeGiftWireHold("page");
  let initialUsed = false;
  return collectNativeGiftPagesV2("pvas", body => {
    if (!initialUsed) { initialUsed = true; return Promise.resolve(raw.nativeCampaignPage); }
    return send(body);
  }, NATIVE_STATE_CAMPAIGN_REQUEST);
}
export const NATIVE_STATE_V3_CAMPAIGN_REQUEST = Object.freeze({
  v: 3 as const, lane: "campaign" as const, view: "current" as const, after: null, limit: 500,
});
export async function consumeNativeStateCampaignV3(raw: Record<string, unknown>, send: Parameters<typeof collectMixedPages>[1]) {
  const keys = "v stateVersion giftWireVersion nativeCampaignPage prospects updates batches databaseGiftEditsAvailable canonicalAudit historicalBatchPage".split(" ");
  if (Object.keys(raw).sort().join("|") !== keys.sort().join("|") || raw.v !== 3 || raw.stateVersion !== 3 ||
    raw.giftWireVersion !== 3 || raw.databaseGiftEditsAvailable !== false ||
    !["prospects", "updates", "batches", "canonicalAudit"].every(k => Array.isArray(raw[k])) ||
    !object(raw.historicalBatchPage) || !exact(raw.historicalBatchPage, ["next", "done"]) ||
    typeof raw.historicalBatchPage.done !== "boolean" ||
    !(raw.historicalBatchPage.next === null || typeof raw.historicalBatchPage.next === "string" &&
      /^[1-9]\d{0,18}$/.test(raw.historicalBatchPage.next) && BigInt(raw.historicalBatchPage.next) <= BigInt("9223372036854775807")) ||
    raw.historicalBatchPage.done !== (raw.historicalBatchPage.next === null))
    throw new NativeGiftWireHold("page");
  let initialUsed = false;
  return collectMixedPages("pvas", body => {
    if (!initialUsed) { initialUsed = true; return Promise.resolve(raw.nativeCampaignPage); }
    return send(body);
  }, NATIVE_STATE_V3_CAMPAIGN_REQUEST);
}

/** Raw original history columns remain strings/nulls/int32; never Number(amount),
 * Date(loadedAt), date-from-year, received-status filtering or SQL-history sums. */
export function nativeHistoryDetail(history: NativeDonorHistory, cptid: number) {
  if (history.v !== 2 || history.lane !== "history" || !["current", "provenance"].includes(history.view))
    throw new NativeGiftWireHold("page");
  const { inventory } = nativeHistoryPresentationV2(history.records);
  if (inventory.some(record => record.cptid !== cptid)) throw new NativeGiftWireHold("record");
  return inventory.map(record => {
    const n = record.representation === "native-history" ? record.native :
      record.representation === "admitted-event" ? record.event : (() => { throw new NativeGiftWireHold("record"); })();
    return { giftId: record.giftId, order: record.order, amount: n.amount, date: n.date, year: n.year,
      status: n.status, campaign: n.campaign, fund: n.fund, type: n.type, note: n.note,
      loadedAt: record.representation === "native-history" ? record.native.loadedAt : null,
      recordType: record.representation === "native-history" ? record.native.recordType : null,
      sources: record.sources, representation: record.representation, view: history.view, raw: record };
  });
}
