// "Newest change wins" between a dashboard edit and the client's SQL tables (Anthony, 2026-11-18) for
// CSNF, JAG, WCBHC and BAQ. PVAS already works this way (its edits write the same SQL cells).
//
// The client tables carry no change dates, so "SQL changed after the edit" is detected by value:
// every dashboard edit records the value it replaced. If the SQL value today is neither that value nor the
// edit's own new value, someone changed SQL after the edit, so SQL wins and the dashboard edit stops applying.
// Unknown base values never drop an edit (keep the dashboard value when in doubt).

export type BaseValue = string | number | null | undefined; // undefined = not known for this record/field
export type BaseOf = (cptid: number, field: string) => BaseValue;
type Update = { id?: number; cptid: number; field: string; old_value: string | null; new_value: string | null };

/** Fields that edit a value the client's SQL tables also hold. Dashboard-only fields (outcome, merges, ...) never yield. */
export const SQL_BACKED = (field: string) => field.startsWith("contact:") || field === "wealth:capacity" || field === "wealth:rating" || field === "ask" || field === "solicitor2";

const text = (v: unknown) => String(v ?? "").toLowerCase().replace(/^unassigned$/, "").replace(/[^a-z0-9]/g, "");
const money = (v: unknown) => { const n = Number(String(v ?? "").replace(/[$,\s]/g, "")); return Number.isFinite(n) && n > 0 ? String(Math.round(n * 100) / 100) : "0"; };
export const sameValue = (field: string, a: unknown, b: unknown) => (field === "ask" ? money(a) === money(b) : text(a) === text(b));

/** Returns the (cptid, field) pairs whose dashboard edits are superseded by a newer SQL value. */
export function supersededEdits(updates: readonly Update[], baseOf: BaseOf): Set<string> {
  const groups = new Map<string, Update[]>();
  for (const u of [...updates].filter((u) => SQL_BACKED(u.field)).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))) {
    const k = `${Number(u.cptid)}|${u.field}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(u);
  }
  const out = new Set<string>();
  for (const [k, rows] of groups) {
    const field = rows[0].field, cptid = Number(rows[0].cptid);
    // The current run of edits starts where an edit no longer continues from the previous edit's value
    // (that edit was made against a newer SQL value that had already won).
    let start = 0;
    for (let i = 1; i < rows.length; i++) if (!sameValue(field, rows[i].old_value, rows[i - 1].new_value)) start = i;
    const base = baseOf(cptid, field);
    if (base === undefined) continue;
    if (sameValue(field, base, rows[start].old_value) || sameValue(field, base, rows[rows.length - 1].new_value)) continue;
    out.add(k);
  }
  return out;
}

/** Removes superseded dashboard edits from a portal state (view only; nothing is deleted from SQL). */
export function withoutSuperseded<T extends { updates?: unknown }>(state: T, drop: Set<string>): T {
  if (!drop.size || !Array.isArray(state.updates)) return state;
  return { ...state, updates: (state.updates as Update[]).filter((u) => !drop.has(`${Number(u.cptid)}|${u.field}`)) };
}

// ---- Committee tracking solicitors (stored in <client>.dashboard_prospect_status) ----
// When a solicitor is saved on the dashboard, the SQL value it replaced is kept beside it (solicitorBase /
// solicitor2Base in extra_json). If SQL later changes, SQL wins.
type Prospect = Record<string, unknown>;
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function stampTrackingBases(next: Record<string, Prospect>, prev: Record<string, Prospect> | null, baseOf: BaseOf): Record<string, Prospect> {
  const out: Record<string, Prospect> = {};
  for (const [id, p] of Object.entries(next)) {
    const q = { ...p }, before = prev?.[id], cptid = Number(id);
    for (const [key, stamp] of [["solicitor", "solicitorBase"], ["solicitor2", "solicitor2Base"]] as const) {
      const edited = own(q, key) && (!before || !own(before, key) || !sameValue(key, before[key], q[key]));
      if (edited) { const b = baseOf(cptid, key); if (b === undefined) delete q[stamp]; else q[stamp] = String(b ?? ""); }
      else if (!own(q, key)) delete q[stamp];
      else if (before && own(before, stamp) && !own(q, stamp)) q[stamp] = before[stamp];
    }
    out[id] = q;
  }
  return out;
}

export function applyTrackingBases(prospects: Record<string, Prospect>, baseOf: BaseOf): Record<string, Prospect> {
  const out: Record<string, Prospect> = {};
  for (const [id, p] of Object.entries(prospects)) {
    const q = { ...p }, cptid = Number(id);
    if (typeof q.solicitorBase === "string") {
      const b = baseOf(cptid, "solicitor");
      if (b !== undefined && !sameValue("solicitor", b, q.solicitorBase) && !sameValue("solicitor", b, q.solicitor)) {
        delete q.solicitor; delete q.solicitorBase; q.solicitorEdited = false; // SQL is newer: show its solicitor
      }
    }
    if (typeof q.solicitor2Base === "string") {
      const b = baseOf(cptid, "solicitor2");
      if (b !== undefined && !sameValue("solicitor2", b, q.solicitor2Base) && !sameValue("solicitor2", b, q.solicitor2)) {
        delete q.solicitor2; delete q.solicitor2Base;
      }
    }
    out[id] = q;
  }
  return out;
}

/** Base (SQL) values from a live build record, as the dashboard displays them before any edit. */
type Rec = { contact?: Record<string, unknown>; ds?: Record<string, unknown>; portfolio?: Record<string, unknown> | null; board?: { active?: boolean; ask?: number }[] };
export function recordBase(client: string, records: Record<string, unknown>): BaseOf {
  return (cptid, field) => {
    const r = records[String(cptid)] as Rec | undefined;
    if (!r) return undefined;
    if (field.startsWith("contact:")) return r.contact && own(r.contact, field.slice(8)) ? (r.contact[field.slice(8)] as BaseValue) : r.contact ? "" : undefined;
    if (field === "wealth:capacity") return r.ds ? ((r.ds["Wealth-Based Capacity"] as BaseValue) ?? "") : undefined;
    if (field === "wealth:rating") return r.ds ? ((r.ds["DS Rating"] as BaseValue) ?? "") : undefined;
    if (field === "ask") {
      const a = r.portfolio?.ask ?? (client !== "wcbhc" && client !== "baq" ? r.board?.find((b) => b.active && b.ask)?.ask : undefined);
      return a === undefined ? undefined : (a as BaseValue);
    }
    if (field === "solicitor") return r.portfolio ? ((r.portfolio.solicitor as BaseValue) ?? "") : "";
    if (field === "solicitor2") return r.portfolio ? ((r.portfolio.secondary ?? r.portfolio.solicitor2) as BaseValue) ?? "" : "";
    return undefined;
  };
}
