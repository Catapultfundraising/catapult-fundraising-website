/** Paired mixed snapshot protocol. No capability issuer, cache or write owner. */
import { decodeNativeGiftRecordV2, nativeOrder, NativeGiftWireHold, type NativeCampaignRecord, type NativeCampaignRow, type NativeEventRecord, type NativeGiftRecord } from "./pvas-native-gift-wire";
import { displayMoney } from "./pvas-financials";
export const nativeOrderV3 = nativeOrder;
export const PVAS_NATIVE_V3_PIN = Object.freeze({
  backendCommit: "7ec9c0b086bec734959111a251c05d5b40f3456b",
  readerCommit: "38eb5c9dd221753fde444d68b3681b361bdf1d63",
});
export const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
export const exact = (x: object, keys: readonly string[]) => Object.keys(x).sort().join("|") === [...keys].sort().join("|");
export const positive = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x > 0 && x <= 2147483647;
export const hex = (x: unknown, n = 32): x is string => typeof x === "string" && new RegExp(`^[a-f0-9]{${n}}$`).test(x);
export const hold = (): never => { throw new NativeGiftWireHold("record"); };
export type CampaignValueV3 = Omit<NativeCampaignRow, "cptid"> & { cptid: number | null };
export type CampaignRecordV3 = Omit<NativeCampaignRecord, "native" | "legacy" | "membership"> & {
  native: CampaignValueV3;
  membership: NativeCampaignRecord["membership"] | { state: "voided"; requestId: string; reason: string };
};
export type MixedGiftRecord = Exclude<NativeGiftRecord, NativeCampaignRecord> | CampaignRecordV3;
export interface MixedPageRequest { v: 3; lane: "history" | "campaign"; view: "current" | "provenance"; after: string | null; limit: number; donor?: number | null }
export interface MixedGiftPage { v: 3; lane: MixedPageRequest["lane"]; view: MixedPageRequest["view"]; records: MixedGiftRecord[]; next: string | null; done: boolean }
const common = "giftId cptid version order sources representation".split(" ");
/** Validate v2 snapshot fields with the unchanged v2 scalar codec. Generated
 * legacy presentation is internal only; it is never accepted on the wire. */
export function decodeMixedSnapshot(input: unknown): MixedGiftRecord {
  if (!object(input) || !exact(input, ["v", "gift"]) || !object(input.gift)) return hold();
  const g = input.gift;
  if (input.v === 3) {
    if (g.representation !== "native-campaign" || !exact(g, [...common, "source", "native", "membership"]) ||
      !object(g.native) || !Object.hasOwn(g.native, "cptid") || !(g.native.cptid === null || positive(g.native.cptid)) ||
      !object(g.membership)) return hold();
    const m = g.membership;
    if (m.state === "voided" && (!exact(m, ["state", "requestId", "reason"]) || !hex(m.requestId) ||
      typeof m.reason !== "string" || !m.reason.trim() || m.reason.length > 500)) return hold();
    // Exactly the backend's technical validation surrogate, NEVER business data.
    const n = { ...g.native, cptid: g.cptid };
    decodeNativeGiftRecordV2({ ...g, native: n, legacy: n,
      membership: m.state === "voided" ? { state: "active", retiredByRequestId: null } : m });
    return structuredClone(g) as unknown as CampaignRecordV3;
  }
  if (input.v !== 2 || !["native-history", "admitted-event"].includes(String(g.representation))) return hold();
  if (g.representation === "admitted-event") {
    if (!exact(g, [...common, "event", "voidReason"])) return hold();
    return decodeNativeGiftRecordV2(g) as NativeEventRecord;
  }
  if (!exact(g, [...common, "source", "native"]) || !object(g.native) || !object(g.source)) return hold();
  const n = g.native;
  return decodeNativeGiftRecordV2({ ...g, legacy: { id: g.source.key, cptid: g.cptid, date: n.date, amount: n.amount,
    status: n.status, campaign: n.campaign, fund: n.fund, type: n.type, year: n.year, note: n.note, record_type: n.recordType } }) as Exclude<MixedGiftRecord, CampaignRecordV3 | NativeEventRecord>;
}
export function mixedPageRequest(input: unknown): MixedPageRequest {
  if (!object(input) || !["v", "lane", "view", "after", "limit"].every(k => Object.hasOwn(input, k)) ||
    Object.keys(input).some(k => !["v", "lane", "view", "after", "limit", "donor"].includes(k)) || input.v !== 3 ||
    (input.lane !== "history" && input.lane !== "campaign") || (input.view !== "current" && input.view !== "provenance") ||
    typeof input.limit !== "number" || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 500 ||
    !(input.after === null || typeof input.after === "string") ||
    Object.hasOwn(input, "donor") && input.donor !== null && !positive(input.donor)) throw new NativeGiftWireHold("request");
  if (input.after !== null) nativeOrder(input.after);
  return { ...input } as unknown as MixedPageRequest;
}
export function mixedGiftPage(input: unknown, request: MixedPageRequest): MixedGiftPage {
  const req = mixedPageRequest(request);
  if (!object(input) || !exact(input, ["v", "lane", "view", "records", "next", "done"]) || input.v !== 3 ||
    input.lane !== req.lane || input.view !== req.view || !Array.isArray(input.records) ||
    input.records.length > req.limit || typeof input.done !== "boolean") throw new NativeGiftWireHold("page");
  const records = input.records.map(decodeMixedSnapshot), ids = new Set<number>(), aliases = new Set<string>();
  let last = req.after === null ? BigInt("-1") : BigInt(req.after);
  for (const r of records) {
    if (BigInt(r.order) <= last || ids.has(r.giftId) || req.lane === "history" && r.representation === "native-campaign" ||
      req.lane === "campaign" && r.representation === "native-history" ||
      r.representation === "admitted-event" && r.event.scope !== (req.lane === "history" ? "historical" : "campaign") ||
      req.view === "current" && r.representation === "native-campaign" && r.membership.state !== "active" ||
      Object.hasOwn(req, "donor") && (r.representation === "native-campaign" ? r.native.cptid : r.cptid) !== req.donor) throw new NativeGiftWireHold("page");
    ids.add(r.giftId); last = BigInt(r.order);
    for (const s of r.sources) {
      const k = JSON.stringify([s.system, s.key]);
      if (aliases.has(k)) throw new NativeGiftWireHold("source");
      aliases.add(k);
    }
  }
  const full = records.length === req.limit;
  if (input.done !== !full || input.next !== (full ? records[records.length - 1].order : null)) throw new NativeGiftWireHold("page");
  return { v: 3, lane: req.lane, view: req.view, records, next: input.next as string | null, done: input.done };
}
export function mixedPageBody(client: string, request: unknown) {
  if (client !== "pvas") throw new NativeGiftWireHold("request");
  return { op: "nativeGiftPageV3" as const, client: "pvas" as const, request: mixedPageRequest(request) };
}
export async function collectMixedPages(client: string, send: (body: ReturnType<typeof mixedPageBody>) => Promise<unknown>, input: MixedPageRequest, maxPages = 4096) {
  let request = mixedPageBody(client, input).request;
  if (request.after !== null || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 16384) throw new NativeGiftWireHold("request");
  const records: MixedGiftRecord[] = [], ids = new Set<number>(), aliases = new Set<string>();
  for (let p = 0; p < maxPages; p++) {
    const page = mixedGiftPage(await send(mixedPageBody(client, request)), request);
    for (const r of page.records) {
      if (ids.has(r.giftId)) throw new NativeGiftWireHold("page");
      ids.add(r.giftId);
      for (const s of r.sources) {
        const k = JSON.stringify([s.system, s.key]);
        if (aliases.has(k)) throw new NativeGiftWireHold("source");
        aliases.add(k);
      }
      records.push(r);
    }
    if (page.done) return { v: 3 as const, lane: request.lane, view: request.view, records };
    request = { ...request, after: page.next };
  }
  throw new NativeGiftWireHold("incomplete");
}
/** Mixed legacy Number presentation only. Exact event metadata is retained,
 * never mislabeled amountExact, never substituted for GHO/CYG. */
export function campaignPresentationV3(records: MixedGiftRecord[]) {
  const rows: { row: CampaignValueV3; metadata: CampaignRecordV3 | NativeEventRecord }[] = [];
  const inventory = records.map(r => decodeMixedSnapshot({ v: r.representation === "native-campaign" ? 3 : 2, gift: r }));
  const ids = new Set<number>(), aliases = new Set<string>();
  let previous = BigInt("-1");
  for (const r of inventory) {
    if (ids.has(r.giftId) || BigInt(r.order) <= previous) return hold();
    ids.add(r.giftId); previous = BigInt(r.order);
    for (const s of r.sources) {
      const key = JSON.stringify([s.system, s.key]);
      if (aliases.has(key)) return hold();
      aliases.add(key);
    }
    if (r.representation === "native-history") return hold();
    if (r.representation === "native-campaign") {
      if (r.membership.state === "active") rows.push({ row: structuredClone(r.native), metadata: r });
    } else {
      const e = r.event;
      if (e.scope !== "campaign") return hold();
      if (e.currency === "USD" && e.credit === "hard" && (e.kind === "gift" && e.status === "received" || e.kind === "pledge" && e.status === "pledged"))
        rows.push({ row: { id: r.giftId, cptid: r.cptid, donor_name: e.donorName ?? "", amount: displayMoney(e.amount), kind: e.kind, gift_date: e.date, note: e.note }, metadata: r });
    }
  }
  return { inventory, rows };
}
