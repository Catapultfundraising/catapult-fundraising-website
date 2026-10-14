import { buildGiftChart, type GiftChart } from "@/lib/gift-chart";
import { pvasChart, PVAS_GOAL } from "@/lib/pvas-gc2p";
import { wcbhcChart, WCBHC_GOAL } from "@/lib/wcbhc-gc2p";
import { baqChart, BAQ_GOAL } from "@/lib/baq-gc2p";

// Portal v2 per-client config (safe for client components).
export const PORTAL_V2_CLIENTS = ["pvas", "csnf", "jag", "wcbhc", "baq"] as const;
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
};
export const idsPath = (c: string) => `${c}-data/ids.json`;

export interface PortalGift { id: number; cptid: number | null; client_id: string | null; donor_name: string; kind: "gift" | "pledge"; amount: number; gift_date: string | null; note: string | null; source: string; batch_id: number | null; created_by: string | null; created_at: string }
export interface PortalProspect { id: number; cptid: number; client_id: string | null; full_name: string; first_name: string | null; last_name: string | null; org_name: string | null; address1: string | null; city: string | null; state: string | null; zip: string | null; email: string | null; phone: string | null; source: string; batch_id: number | null; created_by: string | null; created_at: string }
export interface PortalBatch { id: number; kind: string; file_name: string | null; created_by: string | null; created_at: string; new_rows: number; changed_rows: number; gift_rows: number; undone_at: string | null; undone_by: string | null }
export interface PortalUpdate { id: number; cptid: number; client_id: string | null; field: string; old_value: string | null; new_value: string | null; batch_id: number | null; created_at: string }
export interface PortalState { prospects: PortalProspect[]; gifts: PortalGift[]; updates: PortalUpdate[]; batches: PortalBatch[] }

export interface CampaignDonor { key: string; cptid: number | null; name: string; gifts: number; pledges: number; credit: number; level: number | null; items: PortalGift[] }
export interface CampaignLevel { level: number; gifts: number; value: number; secured: number; securedValue: number; remaining: number; remainingValue: number; donors: CampaignDonor[] }

/**
 * Campaign credit per donor = the larger of total pledges and total gifts, so a pledge
 * and the payments against it are not counted twice (outright gifts with no pledge still count).
 * Each donor sits at the largest chart level their credit reaches; below the smallest level = "below chart".
 */
export function campaignByLevel(chart: GiftChart, gifts: PortalGift[]) {
  const byDonor = new Map<string, CampaignDonor>();
  for (const g of gifts) {
    const key = g.cptid ? `c${g.cptid}` : `n${g.donor_name.trim().toLowerCase()}`;
    const d = byDonor.get(key) ?? { key, cptid: g.cptid, name: g.donor_name, gifts: 0, pledges: 0, credit: 0, level: null, items: [] };
    if (g.kind === "pledge") d.pledges += Number(g.amount); else d.gifts += Number(g.amount);
    d.items.push(g); byDonor.set(key, d);
  }
  const rows = chart.rows.filter((r) => r.level !== null && r.gifts !== null);
  const levels = rows.map((r) => r.level as number).sort((a, b) => b - a);
  const donors = [...byDonor.values()].map((d) => {
    d.credit = Math.max(d.gifts, d.pledges);
    d.level = levels.find((l) => d.credit >= l) ?? null;
    return d;
  }).sort((a, b) => b.credit - a.credit);
  const out: CampaignLevel[] = rows.map((r) => {
    const level = r.level as number;
    const ds = donors.filter((d) => d.level === level);
    const securedValue = ds.reduce((s, d) => s + d.credit, 0);
    const gifts = r.gifts as number;
    return { level, gifts, value: r.value, secured: ds.length, securedValue, remaining: Math.max(0, gifts - ds.length), remainingValue: Math.max(0, r.value - securedValue), donors: ds };
  });
  const below = donors.filter((d) => d.level === null);
  const totalGifts = donors.reduce((s, d) => s + d.gifts, 0);
  const totalPledges = donors.reduce((s, d) => s + d.pledges, 0);
  const raised = donors.reduce((s, d) => s + d.credit, 0);
  return { levels: out, below, belowValue: below.reduce((s, d) => s + d.credit, 0), donors, totalGifts, totalPledges, raised };
}
