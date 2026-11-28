// Resumable DonorSearch queue. One search at a time; each constituent gets a stable unique screening ID so a retry
// reads the existing result instead of being billed again. The transport is injected so tests never touch the paid API.
import type { Constituent, DsResult, TenantRecord } from "./tenant";

export type QueueState = { campaignId: string; done: Record<string, DsResult>; failed: Record<string, string>; startedAt: string };
export type Transport = {
  /** Free read of an existing screening (get.php). Returns null if none exists. */
  read(screeningId: string): Promise<DsResult | null>;
  /** Billable single search. */
  search(screeningId: string, c: Constituent): Promise<DsResult>;
};

export const screeningId = (tenantId: string, c: Constituent) => `cp-${tenantId}-${c.profile?.id ?? c.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 80);

/** Process up to `limit` constituents. Safe to call repeatedly; skips excluded, already-done and already-screened records. */
export async function runQueue(t: TenantRecord, state: QueueState, transport: Transport, limit = 25): Promise<{ state: QueueState; processed: number; remaining: number; billed: number }> {
  let processed = 0, billed = 0;
  const todo = (t.constituents ?? []).filter((c) => !c.ds && !c.excluded && !state.done[c.name]);
  for (const c of todo) {
    if (processed >= limit) break;
    const id = screeningId(t.id, c);
    try {
      let r = await transport.read(id);
      if (!r) { r = await transport.search(id, c); billed++; }
      state.done[c.name] = r; delete state.failed[c.name];
    } catch (e) { state.failed[c.name] = String((e as Error).message ?? e); }
    processed++;
  }
  const remaining = todo.length - processed;
  return { state, processed, remaining: Math.max(remaining, 0), billed };
}

export function applyQueue(t: TenantRecord, s: QueueState): TenantRecord {
  return { ...t, constituents: (t.constituents ?? []).map((c) => (c.ds || !s.done[c.name] ? c : { ...c, ds: s.done[c.name] })) };
}

/** Link clients use to order a full PIR without leaving the platform's flow. */
export const pirOrderUrl = (name: string, state?: string) =>
  `https://prospectintelligence.catapultfr.com/?${new URLSearchParams({ prospect: name, ...(state ? { state } : {}) })}`;
