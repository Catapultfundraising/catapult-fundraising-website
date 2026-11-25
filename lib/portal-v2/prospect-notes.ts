import { finalId, mergedSources, type Overlay } from "./record-overlay";
import type { Prospect } from "./records-route";

/** Read-only report projection. Canonical PVAS history is already current in
 * tracking.activity; sourceHistory is provenance, never a second note owner. */
type Context = { records: Record<string, unknown>; prospects?: Prospect[]; tracking: unknown; overlay: Overlay };
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue => v && typeof v === "object" && !Array.isArray(v) ? v as ObjectValue : {};
const text = (v: unknown) => typeof v === "string" ? v : "";
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
// Test whitespace only to decide presence; never trim/rewrite a genuine body.
const substantive = (v: unknown) => text(v).trim().length > 0;

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
    const append = (body: unknown) => { if (substantive(body)) parts.push(text(body)); };
    const appendDirect = (n: ObjectValue) => {
      const key = text(n.event_key);
      if (key && directSeen.has(key)) return;
      if (key) directSeen.add(key);
      append(n.body);
    };
    for (const c of sourceIds) {
      const r = object(records[String(c)]);
      for (const note of list(r.notes)) append(note);
      for (const raw of list(r.calls)) {
        const call = object(raw);
        append(call.comments);
      }
      const portfolio = object(r.portfolio);
      append(portfolio.task);
      append(portfolio.relationship);
      for (const raw of list(r.directSourceNotes)) appendDirect(object(raw));
      // Numeric collisions with a genuinely named source record do not prove
      // that a separately saved manual prospect is the same constituent.
      const p = manual.get(c), name = text(r.name).trim();
      if (p && (!name || name.toLowerCase() === `cptid ${c}`) && p.note != null)
        append(p.note);
      const state = object(object(t.prospects)[String(c)]);
      append(state.reason);
    }
    for (const a of activity.get(id) ?? []) {
      const native = object(a._canonical), canonical = Object.keys(native).length > 0;
      // Canonical raw NULL and explicit empty are different current values;
      // neither may revive the original imported text.
      append(canonical ? native.text : a.note);
    }
    for (const n of direct.get(id) ?? []) appendDirect(n);
    return parts.join("\n\n");
  };
}
export function prospectNotes(cptid: number, context: Context): string { return createProspectNotes(context)(cptid); }

/** Some source GC2P pools contain synthetic/nonrecord prospects. Preserve their
 * source note/history too; suppress only the known exact pool->portfolio copy. */
export function gc2pSourceNotes(row: unknown, record: unknown): string {
  const p = object(row), portfolio = object(object(record).portfolio), out: string[] = [];
  if (substantive(p.note) && p.note !== portfolio.task) out.push(text(p.note));
  if (substantive(p.history) && p.history !== portfolio.relationship) out.push(text(p.history));
  return out.join("\n\n");
}
