/** HELD native-v2 read foundation. No route, capability issuer or runtime wiring. */
import type { PvasGiftValue } from "./pvas-gift-wire";

export const PVAS_NATIVE_READ_PIN = Object.freeze({
  backendCommit: "6c1db58738874eb095c5a63debd909b0925f9f2a",
  contractSha256: "3f9953e5f42045b94e1893d320c6768e19daa148c8caea7f5f87e574a00d5117",
  readerSha256: "567c78ba0d77cce49181000a67ae770357fff8b40008d7f21506de936e3874a0",
  schemaRevision: "native-v2-manual-retirement-1",
});
export class NativeGiftWireHold extends Error {
  constructor(readonly code: "request" | "record" | "page" | "source" | "incomplete") {
    super(`PVAS native read foundation held: ${code}`);
  }
}
const fail = (code: NativeGiftWireHold["code"]): never => { throw new NativeGiftWireHold(code); };
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const own = (x: object, k: string) => Object.prototype.hasOwnProperty.call(x, k);
const exact = (x: object, keys: readonly string[]) => Object.keys(x).sort().join("|") === [...keys].sort().join("|");
const id = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x > 0 && x <= 2147483647;
const text = (x: unknown, max = 1000000): x is string => typeof x === "string" && x.length <= max;
const nullable = (x: unknown, max = 1000000) => x === null || text(x, max);
const finite = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
export function nativeOrder(x: unknown): string {
  if (typeof x !== "string" || !/^(0|[1-9]\d{0,18})$/.test(x) || BigInt(x) > 9223372036854775807n) return fail("record");
  return x;
}
const positiveBigint = (x: unknown) => typeof x === "string" && /^[1-9]\d{0,18}$/.test(x) && BigInt(x) <= 9223372036854775807n;
function day(x: unknown): boolean {
  if (x === null) return true;
  if (typeof x !== "string" || !/^\d{4}-\d\d-\d\d$/.test(x) || x < "0001-01-01") return false;
  const d = new Date(`${x}T00:00:00Z`);
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === x;
}
function loadedAt(x: unknown): boolean {
  if (typeof x !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{7}$/.test(x)) return false;
  return day(x.slice(0, 10)) && Number(x.slice(11, 13)) < 24 && Number(x.slice(14, 16)) < 60 && Number(x.slice(17, 19)) < 60;
}
export type NativeSource = { system: "portal_gifts" | "client_gift_history" | "website_db" | "manual" | "caller" | "monthly_import"; key: string };
export type NativeLane = "history" | "campaign";
export type NativeView = "current" | "provenance";
export interface NativePageRequest { v: 2; lane: NativeLane; view: NativeView; after: string | null; limit: number }
interface Base { giftId: number; cptid: number; version: number; order: string; sources: NativeSource[] }
export interface NativeCampaignRow {
  id: number | string; cptid: number; donor_name: string; kind: "gift" | "pledge"; amount: number; gift_date: string | null;
  client_id?: string | null; note?: string | null; source?: string | null; batch_id?: number | string | null;
  created_by?: string | null; created_at?: string | null; key?: string; status?: string | null;
  corrected?: { by: string; at: string; from: number };
}
export interface NativeHistoryValue {
  amount: string; date: string | null; year: number | null; status: string | null; campaign: string | null; fund: string | null;
  type: string | null; recordType: string | null; note: string | null; loadedAt: string;
}
export interface NativeHistoryLegacy {
  id: string; cptid: number; date: string | null; amount: string; status: string | null; campaign: string | null;
  fund: string | null; type: string | null; year: number | null; note: string | null; record_type: string | null;
}
export type NativeHistoryRecord = Base & { representation: "native-history"; source: NativeSource & { system: "client_gift_history" }; native: NativeHistoryValue; legacy: NativeHistoryLegacy };
export type NativeCampaignRecord = Base & { representation: "native-campaign"; source: NativeSource & { system: "portal_gifts" | "website_db" }; native: NativeCampaignRow; legacy: NativeCampaignRow;
  membership: { state: "active" | "retired"; retiredByRequestId: string | null } };
export type NativeEventRecord = Base & { representation: "admitted-event"; event: PvasGiftValue; voidReason: string | null };
export type NativeGiftRecord = NativeHistoryRecord | NativeCampaignRecord | NativeEventRecord;
export interface NativeGiftPage { v: 2; lane: NativeLane; view: NativeView; records: NativeGiftRecord[]; next: string | null; done: boolean }

function source(x: unknown): NativeSource {
  if (!object(x) || !exact(x, ["system", "key"]) || typeof x.system !== "string" || !["portal_gifts", "client_gift_history", "website_db", "manual", "caller", "monthly_import"].includes(x.system) ||
    !text(x.key, 400) || !x.key || x.key.trim() !== x.key || /[\x00-\x1f\x7f]/.test(x.key)) return fail("source");
  return { system: x.system, key: x.key } as NativeSource;
}
function stable(x: unknown): unknown {
  return Array.isArray(x) ? x.map(stable) : object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
function campaignIdentity(x: unknown): boolean {
  return typeof x === "number" ? Number.isSafeInteger(x) : typeof x === "string" && /^-?(0|[1-9]\d*)$/.test(x) && x.length <= 20;
}
function eventValid(e: unknown): e is PvasGiftValue {
  if (!object(e) || !exact(e, "amount currency date year kind status scope credit campaign fund type note donorName".split(" "))) return false;
  if (typeof e.amount !== "string" || !/^(0|[1-9]\d{0,15})\.\d{2}$/.test(e.amount) || BigInt(e.amount.replace(".", "")) <= 0n ||
    typeof e.currency !== "string" || !/^[A-Z]{3}$/.test(e.currency) || !day(e.date) ||
    !(e.year === null || typeof e.year === "number" && Number.isInteger(e.year) && e.year >= 1 && e.year <= 9999) ||
    !["kind", "status", "scope", "credit"].every(k => typeof e[k] === "string") ||
    !["gift", "pledge"].includes(String(e.kind)) || !["received", "pledged", "void"].includes(String(e.status)) ||
    !["historical", "campaign"].includes(String(e.scope)) || !["hard", "soft"].includes(String(e.credit)) ||
    e.status !== "void" && (e.kind === "gift" ? e.status !== "received" : e.status !== "pledged")) return false;
  if (e.note !== null && (!text(e.note) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(e.note))) return false;
  if (e.donorName !== null && (!text(e.donorName, 300) || /[\x00-\x1f\x7f]/.test(e.donorName))) return false;
  return ["campaign", "fund", "type"].every(k => e[k] === null || text(e[k], 200) && !/[\x00-\x1f\x7f]/.test(e[k] as string));
}
export function decodeNativeGiftRecordV2(input: unknown): NativeGiftRecord {
  if (!object(input) || !id(input.giftId) || !id(input.cptid) || !id(input.version) || !Array.isArray(input.sources) || !input.sources.length) return fail("record");
  nativeOrder(input.order);
  const common = ["giftId", "cptid", "version", "order", "sources", "representation"];
  const aliases = input.sources.map(source), tokens = aliases.map(s => JSON.stringify(s));
  if (new Set(tokens).size !== tokens.length) return fail("source");
  if (input.representation === "admitted-event") {
    if (!exact(input, [...common, "event", "voidReason"]) || !eventValid(input.event) ||
      (input.event.status === "void") !== (input.voidReason !== null) ||
      !(input.voidReason === null || text(input.voidReason, 400) && input.voidReason.trim())) return fail("record");
  } else {
    const campaign = input.representation === "native-campaign";
    if ((!campaign && input.representation !== "native-history") ||
      !exact(input, [...common, "source", "native", "legacy", ...(campaign ? ["membership"] : [])]) || !object(input.native)) return fail("record");
    const s = source(input.source), n = input.native;
    if (!aliases.some(a => a.system === s.system && a.key === s.key)) return fail("source");
    if (campaign) {
      const required = "id cptid donor_name kind amount gift_date".split(" ");
      const optional = "client_id note source batch_id created_by created_at key status corrected".split(" ");
      if (!required.every(k => own(n, k)) || Object.keys(n).some(k => !required.includes(k) && !optional.includes(k)) ||
        !campaignIdentity(n.id) || n.cptid !== input.cptid || !text(n.donor_name) || (n.kind !== "gift" && n.kind !== "pledge") ||
        !finite(n.amount) || !nullable(n.gift_date) || !object(input.legacy) || !exact(input.legacy, Object.keys(n)) || !equal(n, input.legacy)) return fail("record");
      for (const k of ["client_id", "note", "source", "created_by", "created_at", "status"]) if (own(n, k) && !nullable(n[k])) return fail("record");
      if (own(n, "batch_id") && n.batch_id !== null && !campaignIdentity(n.batch_id)) return fail("record");
      if (own(n, "corrected") && (!object(n.corrected) || !exact(n.corrected, ["by", "at", "from"]) ||
        !text(n.corrected.by) || !text(n.corrected.at) || !finite(n.corrected.from))) return fail("record");
      if (own(n, "key")) {
        if (!text(n.key) || !n.key.startsWith("db|") || typeof n.id !== "number" || n.id >= 0 || s.system !== "website_db" || s.key !== n.key) return fail("source");
      } else if (s.system !== "portal_gifts" || !positiveBigint(String(n.id)) || s.key !== String(n.id)) return fail("source");
      const m = input.membership;
      if (!object(m) || !exact(m, ["state", "retiredByRequestId"]) ||
        !(m.state === "active" && m.retiredByRequestId === null ||
          m.state === "retired" && s.system === "portal_gifts" && typeof m.retiredByRequestId === "string" && /^[a-f0-9]{32}$/.test(m.retiredByRequestId) && positiveBigint(String(n.batch_id ?? "")))) return fail("record");
    } else {
      if (!exact(n, "amount date year status campaign fund type recordType note loadedAt".split(" ")) ||
        typeof n.amount !== "string" || !/^-?(0|[1-9]\d{0,15})\.\d{2}$/.test(n.amount) || !day(n.date) ||
        !(n.year === null || typeof n.year === "number" && Number.isInteger(n.year) && n.year >= -2147483648 && n.year <= 2147483647) ||
        !nullable(n.status, 40) || !nullable(n.campaign, 200) || !nullable(n.fund, 200) || !nullable(n.type, 60) ||
        !nullable(n.recordType, 60) || !nullable(n.note, 500) || !loadedAt(n.loadedAt)) return fail("record");
      if (s.system !== "client_gift_history" || !positiveBigint(s.key) || aliases.filter(a => a.system === "client_gift_history").length !== 1) return fail("source");
      if (!equal(input.legacy, { id: s.key, cptid: input.cptid, date: n.date, amount: n.amount, status: n.status,
        campaign: n.campaign, fund: n.fund, type: n.type, year: n.year, note: n.note, record_type: n.recordType })) return fail("record");
    }
  }
  return structuredClone(input) as unknown as NativeGiftRecord;
}
export function decodeNativePageRequestV2(input: unknown): NativePageRequest {
  if (!object(input) || !exact(input, ["v", "lane", "view", "after", "limit"]) || input.v !== 2 ||
    (input.lane !== "history" && input.lane !== "campaign") || (input.view !== "current" && input.view !== "provenance") ||
    typeof input.limit !== "number" || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 500 ||
    !(input.after === null || typeof input.after === "string")) return fail("request");
  if (input.after !== null) nativeOrder(input.after);
  return { ...input } as unknown as NativePageRequest;
}
export function decodeNativeGiftPageV2(input: unknown, request: NativePageRequest): NativeGiftPage {
  const req = decodeNativePageRequestV2(request);
  if (!object(input) || !exact(input, ["v", "lane", "view", "records", "next", "done"]) || input.v !== 2 ||
    input.lane !== req.lane || input.view !== req.view || !Array.isArray(input.records) || input.records.length > req.limit ||
    typeof input.done !== "boolean") return fail("page");
  const records = input.records.map(decodeNativeGiftRecordV2), ids = new Set<number>(), aliases = new Set<string>();
  let last = req.after === null ? -1n : BigInt(req.after);
  for (const record of records) {
    if (BigInt(record.order) <= last || ids.has(record.giftId)) return fail("page");
    last = BigInt(record.order); ids.add(record.giftId);
    for (const s of record.sources) {
      const key = JSON.stringify([s.system, s.key]);
      if (aliases.has(key)) return fail("source");
      aliases.add(key);
    }
    if (req.lane === "history" && record.representation === "native-campaign" ||
      req.lane === "campaign" && record.representation === "native-history" ||
      record.representation === "admitted-event" && record.event.scope !== (req.lane === "history" ? "historical" : "campaign") ||
      req.view === "current" && record.representation === "native-campaign" && record.membership.state !== "active") return fail("page");
  }
  const full = records.length === req.limit;
  if (input.done !== !full || input.next !== (full ? records[records.length - 1].order : null)) return fail("page");
  return { v: 2, lane: req.lane, view: req.view, records, next: input.next as string | null, done: input.done };
}
