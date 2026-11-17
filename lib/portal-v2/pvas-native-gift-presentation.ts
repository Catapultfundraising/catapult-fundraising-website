/** HELD legacy presentation only; no aggregate/cash authority or runtime wiring. */
import { displayMoney } from "./pvas-financials";
import { decodeNativeGiftRecordV2, NativeGiftWireHold, type NativeGiftRecord, type NativeHistoryRecord, type NativeEventRecord, type NativeHistoryLegacy, type NativeCampaignRecord, type NativeCampaignRow } from "./pvas-native-gift-wire";
import type { PvasGiftValue } from "./pvas-gift-wire";
type HistoryRow = { metadata: NativeHistoryRecord; row: NativeHistoryLegacy } |
  { metadata: NativeEventRecord; row: PvasGiftValue & { id: number; cptid: number } };
type CampaignRow = { metadata: NativeCampaignRecord | NativeEventRecord; row: NativeCampaignRow };

function laneRecords(input: readonly NativeGiftRecord[], lane: "history" | "campaign") {
  let last = -1n;
  const ids = new Set<number>(), aliases = new Set<string>();
  return input.map(raw => {
    const r = decodeNativeGiftRecordV2(raw);
    if (BigInt(r.order) <= last || ids.has(r.giftId) ||
      lane === "history" && r.representation === "native-campaign" ||
      lane === "campaign" && r.representation === "native-history" ||
      r.representation === "admitted-event" && r.event.scope !== (lane === "history" ? "historical" : "campaign")) throw new NativeGiftWireHold("page");
    last = BigInt(r.order); ids.add(r.giftId);
    for (const source of r.sources) {
      const key = JSON.stringify([source.system, source.key]);
      if (aliases.has(key)) throw new NativeGiftWireHold("source");
      aliases.add(key);
    }
    return r;
  });
}
/** Native history is NOT run through received/status filters or year-as-date. */
export function nativeHistoryPresentationV2(input: readonly NativeGiftRecord[]) {
  const inventory = laneRecords(input, "history");
  const rows = inventory.flatMap<HistoryRow>(record => {
    if (record.representation === "native-history") return [{ metadata: record, row: structuredClone(record.legacy) }];
    if (record.representation !== "admitted-event") throw new NativeGiftWireHold("record");
    const e = record.event;
    if (!(e.currency === "USD" && e.credit === "hard" && e.kind === "gift" && e.status === "received")) return [];
    return [{ metadata: record, row: { id: record.giftId, cptid: record.cptid, ...structuredClone(e) } }];
  });
  return { inventory, rows };
}
/** Contribution rows ONLY. Full provenance inventory, including retired manual
 * memberships and hidden admitted statuses, is returned separately unchanged.
 * Never attach amountExact to the mixed legacy Number rows. */
export function nativeCampaignPresentationV2(input: readonly NativeGiftRecord[]) {
  const inventory = laneRecords(input, "campaign");
  const rows = inventory.flatMap<CampaignRow>(record => {
    if (record.representation === "native-campaign") return record.membership.state === "active" ?
      [{ metadata: record, row: structuredClone(record.legacy) }] : [];
    if (record.representation !== "admitted-event") throw new NativeGiftWireHold("record");
    const e = record.event;
    if (!(e.currency === "USD" && e.credit === "hard" && (e.kind === "gift" && e.status === "received" || e.kind === "pledge" && e.status === "pledged"))) return [];
    return [{ metadata: record, row: { id: record.giftId, cptid: record.cptid, donor_name: e.donorName ?? "",
      kind: e.kind, amount: displayMoney(e.amount), gift_date: e.date, note: e.note } }];
  });
  return { inventory, rows };
}
