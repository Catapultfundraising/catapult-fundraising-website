import { buildGiftChart, type GiftChart } from "@/lib/gift-chart";
import {moneyCents,centsMoney,displayMoney}from"./pvas-financials";
import type{PvasGiftMetadata}from"./pvas-gift-wire";
import type{PvasContactProfile}from"./pvas-contact-wire";
import type { UploadHistoryIdentity, HistoricalBatchPage } from "./pvas-upload-history";
import type { NativeGiftRecord } from "./pvas-native-gift-wire";
import type { MixedGiftRecord } from "./pvas-native-v3";
import { pvasChart, PVAS_GOAL } from "@/lib/pvas-gc2p";
import { wcbhcChart, WCBHC_GOAL } from "@/lib/wcbhc-gc2p";
import { baqChart, BAQ_GOAL } from "@/lib/baq-gc2p";
import { imasChart, IMAS_GOAL } from "@/lib/imas-gc2p";

// Portal v2 per-client config (safe for client components).
export const PORTAL_V2_CLIENTS = ["pvas", "csnf", "jag", "wcbhc", "baq", "imas"] as const;
export type PortalClient = (typeof PORTAL_V2_CLIENTS)[number];

export interface PortalV2Config {
  key: PortalClient;
  /** What the client calls its own CRM id (shown on the upload screen). */
  clientIdLabel: string;
  goal: number;
  chart: (goal: number) => GiftChart;
  api: string;
}
export const PORTAL_V2: Record<PortalClient, PortalV2Config> = {
  pvas: { key: "pvas", clientIdLabel: "Client ID", goal: PVAS_GOAL, chart: pvasChart, api: "/api/pvas-data-v2" },
  csnf: { key: "csnf", clientIdLabel: "Account ID", goal: 10_000_000, chart: buildGiftChart, api: "/api/csnf-data-v2" },
  jag: { key: "jag", clientIdLabel: "Client ID", goal: 1_750_000, chart: buildGiftChart, api: "/api/jag-data-v2" },
  wcbhc: { key: "wcbhc", clientIdLabel: "Client ID", goal: WCBHC_GOAL, chart: wcbhcChart, api: "/api/wcbhc-data-v2" },
  baq: { key: "baq", clientIdLabel: "Client ID", goal: BAQ_GOAL, chart: baqChart, api: "/api/baq-data-v2" },
  imas: { key: "imas", clientIdLabel: "Client ID", goal: IMAS_GOAL, chart: imasChart, api: "/api/imas-data-v2" },
};
export const idsPath = (c: string) => `${c}-data/ids.json`;

export interface PortalGift { id: number | string; cptid: number | null; client_id?: string | null; donor_name: string; kind: "gift" | "pledge"; amount: number; gift_date: string | null; note?: string | null; source?: string | null; batch_id?: number | string | null; created_by?: string | null; created_at?: string | null;
  amountExact?:string;_canonicalGift?:PvasGiftMetadata; _nativeGift?: NativeGiftRecord | MixedGiftRecord;
  /** Stable key for database (weekly refresh) rows, used to save corrections/voids without touching refreshed data. */
  key?: string; corrected?: { by: string; at: string; from: number } | null }
export interface GiftOverride { id: number; gift_key: string; cptid: number | null; donor_name: string | null; kind: "gift" | "pledge" | null; amount: number | null; gift_date: string | null; note: string | null; voided: boolean; void_reason: string | null; created_by: string; created_at: string }
export interface VoidedGift { id: number | string; cptid: number | null; donor_name: string; kind: string; amount: number; gift_date: string | null; void_reason: string | null; voided_by: string | null; voided_at: string | null }
export interface PortalProspect { _canonicalContact?:PvasContactProfile;id: number; cptid: number; client_id: string | null; full_name: string; first_name: string | null; last_name: string | null; org_name: string | null; address1: string | null; city: string | null; state: string | null; zip: string | null; email: string | null; phone: string | null; note?: string | null; source: string; batch_id: number | null; created_by: string | null; created_at: string }
export interface PortalBatch extends UploadHistoryIdentity { kind: string; file_name: string | null; created_by: string | null; created_at: string; new_rows: number; changed_rows: number; gift_rows: number; undone_at: string | null; undone_by: string | null }
export interface PortalUpdate { id: number; cptid: number; client_id: string | null; field: string; old_value: string | null; new_value: string | null; batch_id: number | null; created_at: string }
export interface PortalState { prospects: PortalProspect[]; gifts: PortalGift[]; updates: PortalUpdate[]; batches: PortalBatch[]; giftWireVersion?:2|3;databaseGiftEditsAvailable?:boolean;nativeCampaignInventory?:(NativeGiftRecord|MixedGiftRecord)[]; historicalBatchPage?: HistoricalBatchPage; giftOverrides?: GiftOverride[]; voidedGifts?: VoidedGift[];otherCanonicalGifts?:Record<string,unknown>[] }

export interface CampaignDonor { key: string; cptid: number | null; name: string; gifts: number; pledges: number; credit: number; level: number | null; items: PortalGift[] }
export interface CampaignLevel { level: number; gifts: number; value: number; secured: number; securedValue: number; remaining: number; remainingValue: number; donors: CampaignDonor[] }

/**
 * Campaign credit per donor = the larger of total pledges and total gifts, so a pledge
 * and the payments against it are not counted twice (outright gifts with no pledge still count).
 * Each donor sits at the largest chart level their credit reaches; below the smallest level = "below chart".
 */
export function campaignByLevel(chart: GiftChart, gifts: PortalGift[]) {
  const byDonor = new Map<string, CampaignDonor>();
  const exact=gifts.some(g=>g.amountExact!==undefined),balances=new Map<string,{gifts:bigint;pledges:bigint;credit:bigint}>();
  if(exact&&!gifts.every(g=>typeof g.amountExact==="string"))throw new Error("Incomplete exact campaign amounts");
  for (const g of gifts) {
    const key = g.cptid ? `c${g.cptid}` : `n${g.donor_name.trim().toLowerCase()}`;
    const d = byDonor.get(key) ?? { key, cptid: g.cptid, name: g.donor_name, gifts: 0, pledges: 0, credit: 0, level: null, items: [] };
    if(exact){const b=balances.get(key)??{gifts:BigInt(0),pledges:BigInt(0),credit:BigInt(0)};b[g.kind==="pledge"?"pledges":"gifts"]+=moneyCents(g.amountExact);balances.set(key,b);}
    else if (g.kind === "pledge") d.pledges += Number(g.amount); else d.gifts += Number(g.amount);
    d.items.push(g); byDonor.set(key, d);
  }
  const rows = chart.rows.filter((r) => r.level !== null && r.gifts !== null);
  const levels = rows.map((r) => r.level as number).sort((a, b) => b - a);
  const donors = [...byDonor.values()].map((d) => {
    if(exact){const b=balances.get(d.key)!;b.credit=b.gifts>b.pledges?b.gifts:b.pledges;d.gifts=displayMoney(centsMoney(b.gifts));d.pledges=displayMoney(centsMoney(b.pledges));}
    d.credit = Math.max(d.gifts, d.pledges);
    d.level = levels.find((l) => d.credit >= l) ?? null;
    return d;
  }).sort((a, b) => b.credit - a.credit);
  const out: CampaignLevel[] = rows.map((r) => {
    const level = r.level as number;
    const ds = donors.filter((d) => d.level === level);
    const securedValue = exact?displayMoney(centsMoney(ds.reduce((s,d)=>s+balances.get(d.key)!.credit,BigInt(0)))):ds.reduce((s, d) => s + d.credit, 0);
    const gifts = r.gifts as number;
    return { level, gifts, value: r.value, secured: ds.length, securedValue, remaining: Math.max(0, gifts - ds.length), remainingValue: Math.max(0, r.value - securedValue), donors: ds };
  });
  const below = donors.filter((d) => d.level === null);
  const total=(rows:CampaignDonor[],key:"gifts"|"pledges"|"credit")=>exact?displayMoney(centsMoney(rows.reduce((s,d)=>s+balances.get(d.key)![key],BigInt(0)))):rows.reduce((s,d)=>s+d[key],0);
  const totalGifts = total(donors,"gifts");
  const totalPledges = total(donors,"pledges");
  const raised = total(donors,"credit");
  return { levels: out, below, belowValue:total(below,"credit"), donors, totalGifts, totalPledges, raised };
}
