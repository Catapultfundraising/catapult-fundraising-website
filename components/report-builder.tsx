"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, FileSpreadsheet, Plus, Save, Trash2, X } from "lucide-react";
import {
  DEFAULT_FIELDS, TOP_MAX, FIELD_BY_ID, OPS, PDF_MAX_ROWS, REPORT_FIELDS, XLSX_MAX_ROWS, filterError, opsFor, queryErrors, reportNotes, sanitizeQuery,
  type FilterOp, type ReportFilter, type ReportQuery, type ReportRow,
} from "@/lib/portal-v2/report-fields";

type ExportKind = "text" | "usd" | "num" | "pct";
export interface ReportExportPayload { title: string; subtitle?: string; cols: { label: string; kind?: ExportKind }[]; sections: { heading?: string; rows: (string | number | null)[][] }[]; notes?: string[] }
interface SavedList { id: string; name: string; query: ReportQuery; savedAt: string }

const usd = (n: number) => (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const PREVIEW_ROWS = 500;
const groups = [...new Set(REPORT_FIELDS.map((f) => f.group))];
const btn = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60";
const input = "rounded-md border border-[rgb(var(--line))] bg-white px-2 py-1.5 text-sm";

function fmt(v: ReportRow[string], kind?: string) {
  if (v === null || v === undefined || v === "") return "";
  if (kind === "usd") return usd(Number(v));
  if (kind === "num") return Number(v).toLocaleString("en-US");
  return String(v);
}

function useSavedLists(client: string) {
  const key = `catapult-report-lists:${client}`;
  const [lists, setLists] = useState<SavedList[]>([]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "[]") as SavedList[];
      setLists(Array.isArray(raw) ? raw.map((l) => ({ ...l, query: sanitizeQuery(l.query) })) : []);
    } catch { setLists([]); }
  }, [key]);
  const write = (next: SavedList[]) => { setLists(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage full or blocked */ } };
  return { lists, write };
}

/**
 * Self-service report builder (VanillaSoft-style): pick fields from dropdowns, add filter rows, preview,
 * then download the filtered list as a branded PDF or Excel through the dashboard's existing export route.
 */
export function ReportBuilder({ client, clientLabel, api, onOpen, downloadExport }: {
  client: string; clientLabel: string; api: string; onOpen: (cptid: number) => void;
  downloadExport: (p: ReportExportPayload, format: "pdf" | "xlsx") => Promise<void>;
}) {
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [search, setSearch] = useState("");
  const [top, setTop] = useState("");
  const [sort, setSort] = useState<{ field: string; dir: 1 | -1 }>({ field: "lifetime", dir: -1 });
  const [res, setRes] = useState<{ total: number; rows: ReportRow[]; asOf?: string; campaignAvailable?: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [activeList, setActiveList] = useState<string>("");
  const { lists, write } = useSavedLists(client);
  const topN = Number(top);
  const topError = top.trim() && !(Number.isInteger(topN) && topN >= 1 && topN <= TOP_MAX) ? `Top rows: enter a whole number from 1 to ${TOP_MAX.toLocaleString()}` : null;
  const query = useMemo<ReportQuery>(() => ({ fields, filters, search, sort, top: top.trim() && !topError ? topN : undefined }), [fields, filters, search, sort, top, topError, topN]);
  const seq = useRef(0);

  const fetchRows = useCallback(async (q: ReportQuery, limit: number) => {
    const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, limit }) });
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      throw new Error(r.status === 401 ? "Your session expired. Please sign in again." : j?.error || "The report could not be loaded. Please try again.");
    }
    return (await r.json()) as { total: number; rows: ReportRow[]; asOf?: string; campaignAvailable?: boolean };
  }, [api]);

  const errors = useMemo(() => [...queryErrors(query), ...(topError ? [topError] : [])], [query, topError]);
  useEffect(() => {
    const n = ++seq.current;
    if (errors.length) { setLoading(false); return; } // never run a query with a malformed value
    setLoading(true);
    const t = setTimeout(() => {
      fetchRows(query, PREVIEW_ROWS).then((d) => { if (n === seq.current) { setRes(d); setErr(null); } })
        .catch((e: Error) => { if (n === seq.current) { setErr(e.message); setRes(null); } })
        .finally(() => { if (n === seq.current) setLoading(false); });
    }, 350);
    return () => clearTimeout(t);
  }, [query, fetchRows, errors]);

  const toggleField = (id: string) => setFields((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const move = (i: number, d: -1 | 1) => setFields((f) => { const n = [...f]; const j = i + d; if (j < 0 || j >= n.length) return f; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const setFilter = (i: number, patch: Partial<ReportFilter>) => setFilters((fs) => fs.map((f, k) => {
    if (k !== i) return f;
    const next = { ...f, ...patch };
    if (patch.field) { const ops = opsFor(FIELD_BY_ID.get(patch.field)?.kind ?? "text"); if (!ops.includes(next.op)) next.op = ops[0]; }
    return next;
  }));
  const loadList = (id: string) => {
    setActiveList(id);
    const l = lists.find((x) => x.id === id); if (!l) return;
    const q = sanitizeQuery(l.query);
    setFields(q.fields); setFilters(q.filters); setSearch(q.search ?? ""); setSort(q.sort ?? { field: "lifetime", dir: -1 }); setTop(q.top ? String(q.top) : ""); setListName(l.name);
  };
  const saveList = () => {
    const name = listName.trim().slice(0, 80); if (!name) return;
    const existing = lists.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (existing && !confirm(`Replace the saved list "${existing.name}"?`)) return;
    const item: SavedList = { id: existing?.id ?? `${Date.now()}`, name, query: sanitizeQuery(query), savedAt: new Date().toISOString() };
    write([...lists.filter((l) => l.id !== item.id), item].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveList(item.id);
  };
  const deleteList = () => {
    const l = lists.find((x) => x.id === activeList); if (!l || !confirm(`Delete the saved list "${l.name}"? This does not change any records.`)) return;
    write(lists.filter((x) => x.id !== l.id)); setActiveList("");
  };

  const runExport = async (format: "pdf" | "xlsx") => {
    if (errors.length) return;
    setBusy(format);
    try {
      const title = (lists.find((l) => l.id === activeList)?.name || listName.trim() || "Custom Report").slice(0, 100);
      if (format === "xlsx") {
        // Built server-side from every matching row, so a large list is never silently cut short.
        if (res && res.total > XLSX_MAX_ROWS) { alert(`This list has ${res.total.toLocaleString()} records; Excel downloads are limited to ${XLSX_MAX_ROWS.toLocaleString()}. Add a filter.`); return; }
        const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, format: "xlsx", title }) });
        if (!r.ok) { const j = (await r.json().catch(() => null)) as { error?: string } | null; throw new Error(j?.error || "Download failed. Please try again."); }
        const name = /filename="([^"]+)"/.exec(r.headers.get("content-disposition") || "")?.[1] || `${title}.xlsx`;
        const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = name; a.click();
        return;
      }
      const all = await fetchRows(query, PDF_MAX_ROWS);
      if (all.campaignAvailable === false) { alert("Dashboard edits are unavailable right now, so downloads are paused. Please try again shortly."); return; }
      if (all.total > PDF_MAX_ROWS) { alert(`PDF is limited to ${PDF_MAX_ROWS.toLocaleString()} rows; this list has ${all.total.toLocaleString()}. Add a filter or download Excel.`); return; }
      const cols = query.fields.map((f) => FIELD_BY_ID.get(f)!).filter(Boolean);
      await downloadExport({
        title, subtitle: `${all.total.toLocaleString()} records${all.asOf ? ` · Data as of ${all.asOf}` : ""}`,
        cols: cols.map((c) => ({ label: c.label, kind: c.kind === "usd" ? "usd" : c.kind === "num" && c.id !== "cptid" ? "num" : "text" })),
        sections: [{ rows: all.rows.map((r) => cols.map((c) => (c.id === "cptid" ? String(r.cptid ?? "") : (r[c.id] ?? "")))) }],
        notes: reportNotes(query, true), // unavailable SQL state returned above
      }, format);
    } catch (e) { alert((e as Error).message); } finally { setBusy(null); }
  };

  const cols = fields.map((f) => FIELD_BY_ID.get(f)!).filter(Boolean);
  return (
    <section className="space-y-4" data-testid="report-builder">
      <div>
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Reports</h2>
        <p className="mt-1 text-sm text-[rgb(var(--ink))]/70">Build a prospect list for {clientLabel}: choose the fields, add filters, then download it as PDF or Excel. Giving history and campaign pledges are separate fields and are never added together.</p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[rgb(var(--line))] bg-white p-3">
        <label className="text-xs text-[rgb(var(--ink))]/70">Saved lists
          <select value={activeList} onChange={(e) => loadList(e.target.value)} className={`${input} ml-0 mt-1 block min-w-48`} aria-label="Saved lists">
            <option value="">{lists.length ? "Choose a saved list..." : "No saved lists yet"}</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-[rgb(var(--ink))]/70">List name
          <input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="e.g. Las Vegas $10K+ donors" className={`${input} mt-1 block w-64`} />
        </label>
        <button onClick={saveList} disabled={!listName.trim()} className={`${btn} bg-[rgb(var(--navy))] text-white`}><Save className="h-3.5 w-3.5" />Save list</button>
        {activeList && <button onClick={deleteList} className={`${btn} border border-[rgb(var(--line))] text-[rgb(var(--ink))]`}><Trash2 className="h-3.5 w-3.5" />Delete list</button>}
        <p className="basis-full text-xs text-[rgb(var(--ink))]/55"><b>Saved on this browser only.</b> Lists keep the fields, filters, sort and top-N (not a frozen copy of records) and do not appear on other computers. This does not change the Prospect Ratings tab.</p>
      </div>

      <div className="rounded-lg border border-[rgb(var(--line))] bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/60">Fields</span>
          {cols.map((c, i) => (
            <span key={c.id} className="inline-flex items-center gap-0.5 rounded-full border border-[rgb(var(--brass))]/50 bg-[rgb(var(--paper))] py-0.5 pl-2.5 pr-1 text-xs">
              {c.label}
              <button aria-label={`Move ${c.label} left`} onClick={() => move(i, -1)} className="px-0.5 opacity-50 hover:opacity-100">‹</button>
              <button aria-label={`Move ${c.label} right`} onClick={() => move(i, 1)} className="px-0.5 opacity-50 hover:opacity-100">›</button>
              <button aria-label={`Remove ${c.label}`} onClick={() => toggleField(c.id)} className="opacity-50 hover:opacity-100"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <div className="relative">
            <button onClick={() => setPickerOpen((v) => !v)} className={`${btn} border border-[rgb(var(--brass))] text-[rgb(var(--navy))]`} aria-expanded={pickerOpen}>
              <Plus className="h-3.5 w-3.5" />Choose fields{pickerOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {pickerOpen && (
              <div className="absolute left-0 z-20 mt-1 max-h-96 w-[min(92vw,560px)] overflow-auto rounded-lg border border-[rgb(var(--line))] bg-white p-3 shadow-lg">
                <div className="grid gap-3 sm:grid-cols-2">
                  {groups.map((g) => (
                    <div key={g}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">{g}</p>
                      {REPORT_FIELDS.filter((f) => f.group === g).map((f) => (
                        <label key={f.id} className="flex items-start gap-2 py-0.5 text-sm" title={f.help}>
                          <input type="checkbox" checked={fields.includes(f.id)} onChange={() => toggleField(f.id)} className="mt-1" />
                          <span>{f.label}{f.help && <span className="block text-xs text-[rgb(var(--ink))]/50">{f.help}</span>}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setFields(DEFAULT_FIELDS)} className={`${btn} border border-[rgb(var(--line))]`}>Reset</button>
                  <button onClick={() => setPickerOpen(false)} className={`${btn} bg-[rgb(var(--navy))] text-white`}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/60">Filters</span>
          {filters.map((f, i) => {
            const kind = FIELD_BY_ID.get(f.field)?.kind ?? "text";
            const needsValue = f.op !== "empty" && f.op !== "not_empty";
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                {i > 0 && <span className="text-xs text-[rgb(var(--ink))]/50">and</span>}
                <select aria-label="Filter field" value={f.field} onChange={(e) => setFilter(i, { field: e.target.value })} className={input}>
                  {groups.map((g) => <optgroup key={g} label={g}>{REPORT_FIELDS.filter((x) => x.group === g).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</optgroup>)}
                </select>
                <select aria-label="Filter condition" value={f.op} onChange={(e) => setFilter(i, { op: e.target.value as FilterOp })} className={input}>
                  {opsFor(kind).map((o) => <option key={o} value={o}>{OPS[o]}</option>)}
                </select>
                {needsValue && <input aria-label="Filter value" aria-invalid={!!filterError(f)} value={f.value ?? ""} onChange={(e) => setFilter(i, { value: e.target.value })} placeholder={kind === "date" ? "MM/DD/YYYY" : kind === "usd" ? "Amount" : "Value"} className={`${input} w-44 ${filterError(f) ? "border-red-600" : ""}`} />}
                {filterError(f) && <span role="alert" className="text-xs text-red-700">{filterError(f)}</span>}
                <button aria-label="Remove filter" onClick={() => setFilters((fs) => fs.filter((_, k) => k !== i))} className="text-[rgb(var(--ink))]/50 hover:text-[rgb(var(--ink))]"><X className="h-4 w-4" /></button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setFilters((fs) => [...fs, { field: "lifetime", op: "gte", value: "" }])} className={`${btn} border border-[rgb(var(--line))]`}><Plus className="h-3.5 w-3.5" />Add filter</button>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, CPTID, city or email..." className={`${input} w-full sm:w-72`} />
            <label className="flex items-center gap-1.5 text-xs text-[rgb(var(--ink))]/70">Keep only the top
              <input aria-label="Top rows" aria-invalid={!!topError} inputMode="numeric" value={top} onChange={(e) => setTop(e.target.value)} placeholder="all" className={`${input} w-20 ${topError ? "border-red-600" : ""}`} />
              rows after filters and sort</label>
            {topError && <span role="alert" className="text-xs text-red-700">{topError}</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[rgb(var(--ink))]/70" aria-live="polite">
          {errors.length ? <span className="text-red-700">Fix the highlighted filter{errors.length > 1 ? "s" : ""} to update the list.</span> : err ? <span className="text-red-700">{err}</span> : res ? <>{res.total.toLocaleString()} records{res.total > res.rows.length ? `, previewing ${res.rows.length}` : ""}{loading ? " · updating..." : ""}</> : "Loading..."}
        </span>
        <span className="flex flex-wrap gap-2 sm:ml-auto">
          <button onClick={() => runExport("pdf")} disabled={!!busy || !res?.total || !!errors.length || res?.campaignAvailable === false} className={`${btn} bg-[rgb(var(--navy))] text-white`}><Download className="h-3.5 w-3.5" />{busy === "pdf" ? "Building..." : "PDF"}</button>
          <button onClick={() => runExport("xlsx")} disabled={!!busy || !res?.total || !!errors.length || res?.campaignAvailable === false} className={`${btn} border border-[rgb(var(--brass))] text-[rgb(var(--navy))]`}><FileSpreadsheet className="h-3.5 w-3.5" />{busy === "xlsx" ? "Building..." : "Excel"}</button>
        </span>
      </div>


      <div className="max-h-[560px] overflow-auto rounded-lg border border-[rgb(var(--line))]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[rgb(var(--navy))] text-left text-xs uppercase tracking-wider text-white">
            <tr>{cols.map((c) => {
              const right = c.kind === "usd" || (c.kind === "num" && c.id !== "cptid");
              return <th key={c.id} onClick={() => setSort({ field: c.id, dir: sort.field === c.id ? (sort.dir === 1 ? -1 : 1) : right ? -1 : 1 })} className={`cursor-pointer whitespace-nowrap px-3 py-2 ${right ? "text-right" : ""}`} title="Click to sort">{c.label}{sort.field === c.id ? (sort.dir === 1 ? " ▲" : " ▼") : ""}</th>;
            })}</tr>
          </thead>
          <tbody>
            {(res?.rows ?? []).map((r, i) => (
              <tr key={String(r.cptid)} onClick={() => onOpen(Number(r.cptid))} className={`cursor-pointer hover:bg-[rgb(var(--brass))]/10 ${i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"}`}>
                {cols.map((c) => {
                  const right = c.kind === "usd" || (c.kind === "num" && c.id !== "cptid");
                  return <td key={c.id} className={`whitespace-nowrap px-3 py-1.5 ${right ? "text-right tabular-nums" : ""} ${c.id === "name" ? "font-medium text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40" : ""}`}>{c.id === "cptid" ? String(r.cptid ?? "") : fmt(r[c.id], c.kind)}</td>;
                })}
              </tr>
            ))}
            {res && !res.rows.length && <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-sm text-[rgb(var(--ink))]/60">No records match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
