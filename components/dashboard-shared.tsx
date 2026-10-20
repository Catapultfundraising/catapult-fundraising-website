"use client";

import { Component, createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Shared pieces for the five data dashboards (jag, csnf, pvas, wcbhc, baq).

// ---------- record navigation (any name opens the record; any aggregate opens its list) ----------
export interface RecordNavCtx {
  /** Open a donor record by CPTID. */
  open: (cptid: number) => void;
  /** Open by CPTID when known, else by exact name match in the records index (or a pick list when several match). */
  openName: (name: string, cptid?: number | null) => void;
  /** Show a list of records (by CPTID) in the drill-down modal; every name in it opens the record. */
  drillIds: (title: string, sub: string, cptids: number[]) => void;
  /** Server-side drill over full records: kind = year | retained | new | stage | attr | has. */
  drillQuery: (title: string, sub: string, kind: string, value: string | number) => void;
}
export const RecordNav = createContext<RecordNavCtx | null>(null);
export const useRecordNav = () => useContext(RecordNav);

/** A clickable prospect/donor name. Falls back to plain text outside a dashboard. */
export function NameLink({ name, cptid, className = "" }: { name: string; cptid?: number | null; className?: string }) {
  const nav = useRecordNav();
  if (!nav || !name) return <span className={className}>{name}</span>;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); nav.openName(name, cptid); }}
      className={`text-left font-medium text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/50 underline-offset-2 hover:decoration-[rgb(var(--brass))] ${className}`}>
      {name}
    </button>
  );
}

export const normName = (n: string) => n.toLowerCase().replace(/\b(mr|mrs|ms|dr|jr|sr|ii|iii|the)\b/g, "").replace(/[^a-z0-9]/g, "");

// ---------- dates ----------
/** MM/DD/YYYY (or YYYY-MM-DD) -> YYYY-MM-DD; null when not a real date; "" when blank. */
export function parseUsDateClient(v: string): string | null {
  const t = v.trim();
  if (!t) return "";
  let y: number, m: number, d: number;
  let x = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (x) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else { x = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t); if (!x) return null; m = +x[1]; d = +x[2]; y = +x[3]; }
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export const isoToUs = (iso: string | null | undefined) => { const x = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? ""); return x ? `${x[2]}/${x[3]}/${x[1]}` : (iso ?? ""); };
export const todayUs = () => isoToUs(new Date().toLocaleDateString("en-CA"));
export const DATE_MSG = "Use MM/DD/YYYY";

/** Text date field: shows "Use MM/DD/YYYY" inline while the value is not a real date. Value is what the user typed. */
export function DateInput({ value, onChange, className = "", placeholder = "MM/DD/YYYY", required }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string; required?: boolean }) {
  const [touched, setTouched] = useState(false);
  const parsed = parseUsDateClient(value);
  const bad = parsed === null || (required && parsed === "");
  return (
    <span className="block">
      <input value={value} inputMode="numeric" placeholder={placeholder} aria-invalid={touched && bad}
        onChange={(e) => onChange(e.target.value)} onBlur={() => setTouched(true)}
        className={`${className} ${touched && bad ? "border-red-500 ring-1 ring-red-400" : ""}`} />
      {touched && bad && <span role="alert" className="mt-0.5 block text-[11px] font-medium text-red-700">{DATE_MSG}</span>}
    </span>
  );
}

// ---------- error boundary (a bad value never kicks the user off the record) ----------
export class SafeBoundary extends Component<{ children: ReactNode; label?: string; onReset?: () => void }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: Error) { return { err: e?.message || "Something went wrong" }; }
  componentDidCatch(e: Error) { console.error(e); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-semibold">{this.props.label ?? "This section"} could not be shown.</p>
        <p className="mt-1">{this.state.err}. If you were entering a date, use MM/DD/YYYY.</p>
        <button className="mt-2 rounded border border-red-400 px-3 py-1 text-xs font-medium" onClick={() => { this.setState({ err: null }); this.props.onReset?.(); }}>Try again</button>
      </div>
    );
  }
}

// ---------- history notes: edit (date, type, note) or delete ----------
export interface HistoryItem { id: string; cptid: number; date: string; kind: string; note: string; by: string; at: string; editedBy?: string; editedAt?: string }
const inputCls = "w-full rounded-md border border-[rgb(var(--line))] px-2.5 py-1.5 text-sm";
export function HistoryList({ items, kinds, post, busy }: {
  items: HistoryItem[]; kinds: readonly string[];
  post: (body: Record<string, unknown>, which: string) => Promise<boolean>; busy: string | null;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState({ date: "", kind: "", note: "" });
  useEffect(() => { if (editing && !items.some((a) => a.id === editing)) setEditing(null); }, [items, editing]);
  if (!items.length) return <p className="text-sm text-[rgb(var(--ink))]/55">No contacts or committee updates logged yet.</p>;
  const dateOk = parseUsDateClient(f.date);
  return (
    <ol className="max-h-80 space-y-2 overflow-auto">
      {items.map((a) => (
        <li key={a.id} className="border-l-2 border-[rgb(var(--brass))] pl-3 text-sm">
          {editing === a.id ? (
            <div className="space-y-2 rounded-md bg-[rgb(var(--paper))] p-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">Type<select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={inputCls}>{[...new Set([...kinds, a.kind])].map((k) => <option key={k}>{k}</option>)}</select></label>
                <label className="text-xs">Date<DateInput value={f.date} onChange={(v) => setF({ ...f, date: v })} className={inputCls} required /></label>
              </div>
              <textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={3} className={inputCls} />
              <div className="flex gap-2">
                <button disabled={!!busy || !dateOk || !f.note.trim()} onClick={async () => { if (await post({ type: "editActivity", id: a.id, date: f.date, kind: f.kind, note: f.note }, "edit")) setEditing(null); }}
                  className="rounded-md bg-[rgb(var(--navy))] px-3 py-1 text-xs font-medium text-white disabled:opacity-50">{busy === "edit" ? "Saving..." : "Save changes"}</button>
                <button onClick={() => setEditing(null)} className="rounded-md border border-[rgb(var(--navy))] px-3 py-1 text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-[rgb(var(--ink))]/60">
                <span><span className="font-semibold text-[rgb(var(--navy))]">{isoToUs(a.date)}</span> · {a.kind} · {a.by}{a.editedBy ? ` · edited by ${a.editedBy}` : ""}</span>
                <button className="font-semibold text-[rgb(var(--navy))] hover:underline" onClick={() => { setEditing(a.id); setF({ date: isoToUs(a.date), kind: a.kind, note: a.note }); }}>Edit</button>
                <button className="font-semibold text-red-700 hover:underline" disabled={!!busy} onClick={() => { if (confirm("Delete this history note? It is kept in the audit log.")) void post({ type: "deleteActivity", id: a.id }, "del"); }}>Delete</button>
              </p>
              <p className="whitespace-pre-wrap">{a.note}</p>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
