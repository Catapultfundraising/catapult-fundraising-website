import { finalId, mergedSources, type Overlay, type UpdateRow } from "./record-overlay";

export type Assignment = { solicitor: string; solicitor2: string; assignmentConflict?: boolean };
export type AssignmentRecord = { portfolio?: { solicitor?: string; secondary?: string; solicitor2?: string } | null };
export type AssignmentTracking = { prospects: Record<string, { solicitor?: string; solicitor2?: string; solicitorEdited?: boolean; updatedAt?: string; by?: string }> };
export const assignmentText = (v: unknown): string => {
  const s = String(v ?? "").trim();
  return /^unassigned$/i.test(s) ? "" : s;
};
export const isUnassigned = (a: Assignment) => !a.assignmentConflict && !assignmentText(a.solicitor) && !assignmentText(a.solicitor2);

/** SQL secondary edits include explicit blanks. Tracking saves encode cleared primary as absent. */
export function assignmentResolver(records: Record<string, unknown>, tracking: AssignmentTracking | null, updates: UpdateRow[], o: Overlay) {
  const secondary = new Map<number, string>();
  for (const u of [...updates].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))) {
    if (u.field === "solicitor2") secondary.set(Number(u.cptid), assignmentText(u.new_value));
  }
  const value = (id: number, key: "solicitor" | "solicitor2") => {
    const t = tracking?.prospects[String(id)];
    const p = (records[String(id)] as AssignmentRecord | undefined)?.portfolio;
    if (key === "solicitor2" && secondary.has(id)) return { value: secondary.get(id)!, manual: true };
    if (t && (Object.prototype.hasOwnProperty.call(t, key) || (key === "solicitor" && !!t.updatedAt && t.solicitorEdited !== false))) {
      return { value: assignmentText(t[key]), manual: true };
    }
    return { value: assignmentText(key === "solicitor" ? p?.solicitor : p?.secondary ?? p?.solicitor2), manual: false };
  };
  return (cptid: number): Assignment => {
    const id = finalId(o, cptid);
    const out: Assignment = { solicitor: "", solicitor2: "" };
    for (const key of ["solicitor", "solicitor2"] as const) {
      const own = value(id, key);
      if (own.manual || own.value) { out[key] = own.value; continue; }
      const candidates = mergedSources(o, id).map((c) => value(c, key)).filter((v) => v.manual || v.value);
      const distinct = new Set(candidates.map((v) => v.value));
      if (distinct.size === 1) out[key] = candidates[0].value;
      else if (distinct.size > 1) out.assignmentConflict = true;
    }
    return out;
  };
}

/** Client read-time view. Index carries server-resolved source/SQL/merge values;
 * current tracking can supersede it immediately after an in-session save. */
const indexes = new WeakMap<object, Map<number, Partial<Assignment>>>();
function indexed(index: readonly ({ cptid: number } & Partial<Assignment>)[] | null) {
  if (!index) return undefined;
  let m = indexes.get(index);
  if (!m) { m = new Map(index.map((r) => [r.cptid, r])); indexes.set(index, m); }
  return m;
}

export function viewAssignment(row: { cptid?: number | null; solicitor?: string; solicitor2?: string }, index: readonly ({ cptid: number } & Partial<Assignment>)[] | null, tracking: AssignmentTracking): Assignment {
  const base = indexed(index)?.get(row.cptid ?? 0) ?? row;
  const t = tracking.prospects[String(row.cptid)];
  return {
    solicitor: assignmentText(t && (Object.prototype.hasOwnProperty.call(t, "solicitor") || (t.updatedAt && t.solicitorEdited !== false)) ? t.solicitor : base.solicitor),
    solicitor2: assignmentText(t && Object.prototype.hasOwnProperty.call(t, "solicitor2") ? t.solicitor2 : base.solicitor2),
    assignmentConflict: "assignmentConflict" in base ? !!base.assignmentConflict : undefined,
  };
}

export function assignmentSnapshot<T>(snapshot: T, index: readonly ({ cptid: number } & Partial<Assignment>)[] | null, tracking: AssignmentTracking, o?: Overlay): T {
  const s = snapshot as Record<string, unknown>;
  const out = { ...s };
  for (const key of ["pool", "portfolio", "highWealth", "midLevel", "legacy", "lapsed", "top"]) {
    if (!Array.isArray(s[key])) continue;
    const rows = s[key] as { cptid: number; name?: string; [key: string]: unknown }[];
    const byId = new Map(rows.map((r) => [r.cptid, r]));
    const seen = new Set<number>();
    out[key] = rows.flatMap((row) => {
      const id = o ? finalId(o, row.cptid) : row.cptid;
      if (o?.deleted.has(id) || seen.has(id)) return [];
      // Prefer the actual survivor, regardless of source-array order. Merged giving must
      // come from the folded index, never whichever source happened to appear first.
      const selected = byId.get(id) ?? row;
      const merged = o ? mergedSources(o, id).length > 0 : false;
      const financial: Record<string, unknown> = {};
      const indexedRow = indexed(index)?.get(id) as Record<string, unknown> | undefined;
      // Never format unknown merged totals as null/zero or relabel partial source totals.
      // The dashboard gates while the index loads; a genuinely missing target stays excluded.
      if (merged && !indexedRow) return [];
      seen.add(id);
      if (merged) {
        for (const field of ["lifetime", "gifts", "largest", "last", "years"]) {
          if (Object.prototype.hasOwnProperty.call(selected, field)) financial[field] = indexedRow![field] ?? (field === "last" ? "" : 0);
        }
        // The index has no merged first-gift date. Do not mislabel a source's date as final.
        if (Object.prototype.hasOwnProperty.call(selected, "first")) financial.first = "";
      }
      const a = viewAssignment({ ...selected, cptid: id }, index, tracking);
      const survivor = indexed(index)?.get(id) as { name?: string } | undefined;
      return [{ ...selected, ...financial, cptid: id, ...(survivor?.name ? { name: survivor.name } : {}), ...a, solicitor: a.solicitor || (isUnassigned(a) ? "Unassigned" : "") }];
    });
  }
  return out as T;
}

export function filterAssignments<T extends Partial<Assignment>>(rows: T[], filter: string): T[] {
  if (filter === "all") return rows;
  return rows.filter((r) => filter === "review" ? !!r.assignmentConflict : filter === "unassigned" ? isUnassigned({ ...r, solicitor: r.solicitor ?? "", solicitor2: r.solicitor2 ?? "" }) : !!(assignmentText(r.solicitor) || assignmentText(r.solicitor2)));
}

export function assignmentMembers(a: Partial<Assignment>): string[] {
  const members = [...new Set([assignmentText(a.solicitor), assignmentText(a.solicitor2)].filter(Boolean))];
  return members.length ? members : [a.assignmentConflict ? "Needs assignment review" : "Unassigned"];
}
export const belongsToSolicitor = (a: Partial<Assignment>, name: string) => assignmentMembers(a).includes(name);
