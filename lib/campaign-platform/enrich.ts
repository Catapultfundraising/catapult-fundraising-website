// DonorSearch enrichment layer. Providers are swappable: the sample provider is fictitious and free;
// the live provider (server-side queue, one search at a time, unique screening IDs) comes in a later step.
import type { Constituent, DsResult, TenantRecord } from "./tenant";

export type Provider = (c: Constituent) => Promise<DsResult>;

const TIERS: [string, number][] = [["A", 1_000_000], ["B", 250_000], ["C", 100_000], ["D", 50_000], ["E", 25_000], ["F", 10_000], ["G", 5_000]];

function hash(s: string) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Deterministic, fictitious results for demos and tests. Never real data. */
export const sampleProvider: Provider = async (c) => {
  const h = hash(c.name.toLowerCase());
  const [rating, capacity] = TIERS[h % TIERS.length];
  return { rating, capacity, source: "sample", confidence: h % 5 === 0 ? "review" : "high" };
};

/** Append results to every constituent that has none. Existing results are never re-fetched (no double billing). */
export async function enrichTenant(t: TenantRecord, provider: Provider, onProgress?: (done: number, total: number) => void): Promise<TenantRecord> {
  const list = t.constituents ?? []; const out: Constituent[] = []; let done = 0;
  for (const c of list) {
    out.push(c.ds ? c : { ...c, ds: await provider(c) });
    onProgress?.(++done, list.length);
  }
  return { ...t, constituents: out };
}

/** CSV of the original rows' key fields plus appended DS columns, for the client to keep. */
export function enrichedCsv(t: TenantRecord): string {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = (t.constituents ?? []).map((c) => [c.name, c.state, c.given, c.ds?.rating ?? "", c.ds?.capacity ?? "", c.ds?.source ?? "", c.ds?.confidence ?? ""].map(q).join(","));
  return ["Name,State,Total given,DS rating,DS capacity,DS source,Match confidence", ...rows].join("\n") + "\n";
}
