import { finalId, mergedSources, type Overlay } from "./record-overlay";
import type { Prospect } from "./records-route";

/** Read-only report projection. Canonical PVAS history is already current in
 * tracking.activity; sourceHistory is provenance, never a second note owner. */
type Context = { records: Record<string, unknown>; prospects?: Prospect[]; tracking: unknown; overlay: Overlay };
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue => v && typeof v === "object" && !Array.isArray(v) ? v as ObjectValue : {};
const text = (v: unknown) => typeof v === "string" ? v : "";
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const meta = (values: unknown[]) => values.map(text).filter(Boolean).join(" · ");

export function createProspectNotes({ records, prospects = [], tracking, overlay: o }: Context): (cptid: number) => string {
  const t = object(tracking), activity = new Map<number, ObjectValue[]>(), direct = new Map<number, ObjectValue[]>();
  // Removed history is an audit lane, not current prospect notes. Never replay it.
  for (const raw of list(t.activity)) {
    const a = object(raw), c = Number(a.cptid);
    if (!(c > 0) || object(a._canonical).deleted === true || o.deleted.has(finalId(o, c))) continue;
    const id = finalId(o, c); activity.set(id, [...(activity.get(id) ?? []), a]);
  }
  for (const raw of list(t.directSourceNotes)) {
    const n = object(raw), c = Number(n.cptid);
    if (!(c > 0) || o.deleted.has(finalId(o, c))) continue;
    const id = finalId(o, c); direct.set(id, [...(direct.get(id) ?? []), n]);
  }
  const manual = new Map(prospects.map(p => [p.cptid, p]));
  return (asked: number) => {
    const id = finalId(o, asked);
    if (o.deleted.has(id)) return "";
    const parts: string[] = [], sourceIds = [id, ...mergedSources(o, id)], directSeen = new Set<string>();
    const prefix = (c: number) => c === id ? "" : ` [from CPTID ${c}]`;
    const appendDirect = (n: ObjectValue, c: number) => {
      const key = text(n.event_key);
      if (key && directSeen.has(key)) return;
      if (key) directSeen.add(key);
      parts.push(`Imported source note${prefix(c)} (read only; declared attribution) · ${meta([n.note_date, n.declared_actor, n.file_name])}\n${text(n.body)}${n.source_date ? `\nSource date ${text(n.source_date)}` : ""}`);
    };
    for (const c of sourceIds) {
      const r = object(records[String(c)]);
      for (const note of list(r.notes)) if (typeof note === "string") parts.push(`Original source note${prefix(c)}\n${note}`);
      for (const raw of list(r.calls)) {
        const call = object(raw);
        parts.push(`Source call${prefix(c)} · ${meta([call.date, call.by, call.result, call.reason])}\n${text(call.comments)}`);
      }
      const portfolio = object(r.portfolio);
      if (text(portfolio.task)) parts.push(`Source portfolio task / note${prefix(c)}\n${text(portfolio.task)}`);
      if (text(portfolio.relationship)) parts.push(`Source portfolio relationship / history${prefix(c)}\n${text(portfolio.relationship)}`);
      for (const raw of list(r.directSourceNotes)) appendDirect(object(raw), c);
      // Numeric collisions with a genuinely named source record do not prove
      // that a separately saved manual prospect is the same constituent.
      const p = manual.get(c), name = text(r.name).trim();
      if (p && (!name || name.toLowerCase() === `cptid ${c}`) && p.note != null)
        parts.push(`Dashboard-added prospect note${prefix(c)} · ${meta([p.created_at, p.created_by])}\n${p.note}`);
      const state = object(object(t.prospects)[String(c)]);
      if (text(state.reason)) parts.push(`Current tracking reason${prefix(c)} · ${meta([state.updatedAt, state.by])}\n${text(state.reason)}`);
    }
    for (const a of activity.get(id) ?? []) {
      const native = object(a._canonical), canonical = Object.keys(native).length > 0;
      // Canonical raw NULL and explicit empty are different current values;
      // neither may revive the original imported text.
      const body = canonical ? native.text === null ? "[Note text is NULL]" : native.text === "" ? "[Note explicitly blank]" : text(native.text) : text(a.note);
      const date = canonical ? native.date : a.sourceDate ?? a.date;
      const edited = a.editedAt || a.editedBy ? `\nEdited ${meta([a.editedAt, a.editedBy])}` : "";
      parts.push(`${canonical ? "Campaign history" : "Dashboard activity"}${prefix(Number(a.cptid))} · ${meta([a.kind, date, a.by, a.at])}\n${body}${edited}`);
    }
    for (const n of direct.get(id) ?? []) appendDirect(n, Number(n.cptid));
    return parts.join("\n\n");
  };
}
export function prospectNotes(cptid: number, context: Context): string { return createProspectNotes(context)(cptid); }

/** Some source GC2P pools contain synthetic/nonrecord prospects. Preserve their
 * source note/history too; suppress only the known exact pool->portfolio copy. */
export function gc2pSourceNotes(row: unknown, record: unknown): string {
  const p = object(row), portfolio = object(object(record).portfolio), out: string[] = [];
  if (text(p.note) && p.note !== portfolio.task) out.push(`Source GC2P note\n${text(p.note)}`);
  if (text(p.history) && p.history !== portfolio.relationship) out.push(`Source GC2P history\n${text(p.history)}`);
  return out.join("\n\n");
}
