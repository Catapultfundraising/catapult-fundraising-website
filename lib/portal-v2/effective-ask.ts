import { finalId, mergedSources, type Overlay, type UpdateRow } from "./record-overlay";

export type AskValue = { ask?: number | null; askEdited?: boolean; askBlank?: boolean; askConflict?: boolean; askFromCptid?: number };
export type AskEdit = { value: number | null; oldValue: number | null; by: string; at: string };
const amount = (v: string | null): number | null => v === null || !v.trim() ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;

/** Presence matters: an explicit blank or zero is not permission to revive a base ask. */
export function askEdits(updates: UpdateRow[]): Map<number, AskEdit> {
  const out = new Map<number, AskEdit>();
  for (const u of [...updates].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) {
    if (u.field === "ask") out.set(Number(u.cptid), { value: amount(u.new_value), oldValue: amount(u.old_value), by: u.created_by ?? "", at: String(u.created_at ?? "") });
  }
  return out;
}

/** Survivor's explicit edit wins, then its nonzero base. Only unambiguous merged-source asks fill an absent base. */
export function effectiveAsk(cptid: number, o: Overlay, edits: Map<number, AskEdit>, base: (id: number) => number | null | undefined): AskValue {
  const target = finalId(o, cptid), own = edits.get(target);
  if (own) return { ask: own.value, askEdited: true, askBlank: own.value === null };
  const current = base(target);
  if (current != null && current > 0) return { ask: current };
  const candidates = mergedSources(o, target).map((id) => {
    const edit = edits.get(id);
    return edit ? { ask: edit.value, askEdited: true, askBlank: edit.value === null, askFromCptid: id } : { ask: base(id), askFromCptid: id };
  }).filter((x) => x.askEdited || (x.ask != null && x.ask > 0));
  const values = new Set(candidates.map((x) => x.ask));
  if (values.size > 1) return { ask: current, askConflict: true };
  return candidates[0] ?? { ask: current };
}

/** The legacy fallback to rating remains only when there is no explicit saved ask. */
export function campaignAskAmount(p: AskValue & { rating?: number }, fallback = p.rating ?? 0): number {
  return (p.askEdited || p.askConflict) ? p.ask ?? 0 : p.ask || fallback;
}

type Row = AskValue & { cptid?: number | null; name?: string; active?: boolean; [key: string]: unknown };
type Snapshot = { pool: Row[]; portfolio?: Row[]; board: Row[]; [key: string]: unknown };

/** Read-time view only. Never alter commitment/Stewardship asks, received gifts or the cached snapshot. */
export function overlayCampaignAsks<T>(snapshot: T, o: Overlay, edits: Map<number, AskEdit>, boardCampaignAsk: boolean): T {
  const s = snapshot as T & Snapshot;
  const byId = new Map<number, Row>();
  // Portfolio owns campaign ask. A pool rating is NOT a campaign ask.
  for (const row of [...s.pool, ...(boardCampaignAsk ? s.board.filter((r) => r.active) : []), ...(s.portfolio ?? [])]) {
    if (row.cptid && row.ask != null) byId.set(row.cptid, row);
  }
  const apply = (rows: Row[], unique: boolean): Row[] => {
    const seen = new Set<number>();
    return rows.flatMap((row) => {
      if (!row.cptid) return [row];
      const id = finalId(o, row.cptid);
      if (o.deleted.has(id) || (unique && seen.has(id))) return [];
      seen.add(id);
      const survivor = rows.find((r) => r.cptid === id) ?? row;
      const value = effectiveAsk(id, o, edits, (c) => byId.get(c)?.ask);
      if (value.ask === undefined && !value.askEdited && !value.askConflict && id === row.cptid) return [row];
      return [{ ...survivor, cptid: id, ...value, ask: value.ask ?? 0 }];
    });
  };
  return { ...s, pool: apply(s.pool, true), ...(s.portfolio ? { portfolio: apply(s.portfolio, true) } : {}),
    ...(boardCampaignAsk ? { board: s.board.map((r) => {
      if (!r.active || !r.cptid) return r;
      const ask = effectiveAsk(r.cptid, o, edits, (c) => byId.get(c)?.ask);
      return { ...r, ...ask, ask: ask.ask ?? 0 };
    }) } : {}) };
}
