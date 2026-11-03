"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

// Staff-only source CSV reconciliation preview. Read-only: there is no save button because raw source writes are OFF.
const CLIENTS = ["pvas", "csnf", "jag", "wcbhc", "baq"] as const;
type Dest = { col: string; ty: string; st: string; why: string; key: string };
type Field = { col: string; outcome: string; latest: string | null; baseline: string | null; current: string | null; reason?: string };
type Result = { columns: { header: string; col: string | null; state: string; reason: string }[]; rows: { line: number; key: number | null; outcome: string; reason?: string; fields: Field[] }[]; notInSource: number[]; counts: Record<string, number>; registry: { builder_commit: string; sql_metadata_checked_at: string } };
const card = "rounded-2xl border border-[rgb(var(--line))] bg-white p-5";
const label = "text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]";
const input = "mt-1 w-full rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm text-[rgb(var(--navy))] focus:border-[rgb(var(--brass))] focus:outline-none";
const navyBtn = "inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))] disabled:cursor-not-allowed disabled:opacity-50";
const OUT: Record<string, string> = { apply: "Would update", unchanged: "Same", converged: "Already matches", conflict: "Conflict: changed since baseline", protected: "Protected portal edit", held: "Held", invalid: "Invalid", blank: "Blank, left as is" };

async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/research-source-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
}

export default function SourceImportPage() {
  const [demo, setDemo] = useState(false);
  const [client, setClient] = useState("");
  const [tables, setTables] = useState<{ table: string; candidate: number }[]>([]);
  const [table, setTable] = useState("");
  const [dests, setDests] = useState<Dest[]>([]);
  const [csv, setCsv] = useState(""); const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  // Every request carries a sequence number; responses from an older client/table/file selection are ignored.
  const seq = useRef(0);
  const guard = <T,>(p: Promise<T>) => { const n = ++seq.current; return p.then((v) => { if (n !== seq.current) throw new Error("stale"); return v; }); };
  const onErr = (e: Error) => { if (e.message !== "stale") setErr(e.message); };
  useEffect(() => { setDemo(new URLSearchParams(window.location.search).get("demo") === "1"); }, []);
  const reset = () => { setResult(null); setErr(""); };
  const clearFile = () => { setCsv(""); setHeaders([]); setMapping({}); };
  useEffect(() => { setTables([]); setTable(""); setDests([]); clearFile(); reset(); if (client) guard(call({ op: "tables", client })).then((j) => setTables(j.tables)).catch(onErr); }, [client]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDests([]); clearFile(); reset(); if (client && table) guard(call({ op: "fields", client, table })).then((j) => setDests(j.fields)).catch(onErr); }, [client, table]); // eslint-disable-line react-hooks/exhaustive-deps
  const useCsv = (t: string, preset?: Record<string, string>) => {
    reset(); clearFile(); setCsv(t);
    guard(call({ op: "inspect", client, table, csv: t })).then((j: { headers: string[] }) => {
      setHeaders(j.headers);
      setMapping(preset ?? Object.fromEntries(j.headers.map((x) => [x, dests.find((d) => d.col.toLowerCase() === x.trim().replace(/\W+/g, "_").toLowerCase())?.col ?? ""])));
    }).catch(onErr);
  };
  const onFile = async (f: File | undefined) => { reset(); clearFile(); if (f) useCsv(await f.text()); };
  const loadDemo = () => { const cols = dests.filter((d) => d.st === "candidate" && d.col !== d.key && d.ty === "nvarchar").slice(0, 2).map((d) => d.col); const held = dests.find((d) => d.st === "held"); const hs = ["Constituent number", ...cols, ...(held ? [held.col] : []), "Spreadsheet note"]; const v = (k: string) => [k, ...cols.map(() => "B"), ...(held ? ["x"] : []), "n"].join(","); const t = [hs.join(","), v("900001"), v("900002"), v("900003"), v("900009"), v("abc")].join("\n"); useCsv(t, Object.fromEntries(hs.map((h, i) => [h, i === 0 ? "CPTID" : dests.find((d) => d.col === h)?.col ?? ""]))); };
  const preview = () => { setBusy(true); reset(); guard(call({ op: "preview", client, table, csv, mapping, demo })).then((j) => setResult(j.result)).catch(onErr).finally(() => setBusy(false)); };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/research" className="inline-flex items-center gap-1 text-sm text-[rgb(var(--ink))]/60 hover:text-[rgb(var(--navy))]"><ArrowLeft className="h-4 w-4" /> Research</Link>
      <h1 className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">Source file reconciliation</h1>
      <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">Preview only. Compares a source export with the last loaded baseline and the current dashboard data. Portal edits and records are protected; anything without a known baseline or verified key is held. Saving source data is turned off.{demo && " Showing fictional demo data."}</p>
      <section className={`${card} mt-6 grid gap-4 sm:grid-cols-3`}>
        <label className="block"><span className={label}>Client</span><select className={input} value={client} onChange={(e) => setClient(e.target.value)}><option value="">Choose…</option>{CLIENTS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></label>
        <label className="block"><span className={label}>Dashboard table</span><select className={input} value={table} disabled={!tables.length} onChange={(e) => setTable(e.target.value)}><option value="">Choose…</option>{tables.map((t) => <option key={t.table} value={t.table}>{t.table} ({t.candidate ? `${t.candidate} reviewable fields` : "all held"})</option>)}</select></label>
        <label className="block"><span className={label}>CSV file</span><input key={`${client}/${table}`} type="file" accept=".csv,text/csv" className={input} disabled={!table} onChange={(e) => onFile(e.target.files?.[0])} /></label>
        {demo && table && <button type="button" className="text-left text-sm font-semibold text-[rgb(var(--brass))] underline" onClick={loadDemo}>Load fictional demo file</button>}
      </section>
      {headers.length > 0 && (
        <section className={`${card} mt-4`}>
          <h2 className={label}>Column mapping</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{headers.map((h) => (
            <label key={h} className="block text-sm"><span className="text-[rgb(var(--navy))]">{h}</span>
              <select className={input} value={mapping[h] ?? ""} onChange={(e) => { setMapping({ ...mapping, [h]: e.target.value }); reset(); }}>
                <option value="">Ignore this column</option>{dests.map((d) => <option key={d.col} value={d.col}>{d.col}{d.key === d.col ? " (key)" : d.st !== "candidate" ? ` — ${d.st}` : ""}</option>)}
              </select></label>))}</div>
          <button type="button" className={`${navyBtn} mt-4`} disabled={busy || !Object.values(mapping).includes(dests.find((d) => d.key)?.key ?? "~")} onClick={preview}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Preview</button>
        </section>)}
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}
      {result && (
        <section className={`${card} mt-4`}>
          <p className="text-sm text-[rgb(var(--ink))]/70">{result.counts.update} rows would update ({result.counts.applyValues} values) · {result.counts.held} held · {result.counts.invalid} invalid · {result.counts.unchanged} unchanged · {result.counts.conflicts} conflicts · {result.counts.protectedValues} protected · {result.notInSource.length} dashboard records not in file (never deleted)</p>
          <h3 className={`${label} mt-4`}>Columns</h3>
          <ul className="mt-2 text-sm">{result.columns.map((c) => <li key={c.header}><span className="text-[rgb(var(--navy))]">{c.header}</span> → {c.col ?? "ignored"}: <b>{c.state}</b> <span className="text-[rgb(var(--ink))]/60">{c.reason}</span></li>)}</ul>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs uppercase text-[rgb(var(--ink))]/60"><th className="px-3 py-2">Line</th><th className="px-3 py-2">Key</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Fields (baseline / current / file)</th></tr></thead>
            <tbody>{result.rows.map((r) => <tr key={r.line} className="border-t border-[rgb(var(--line))] align-top"><td className="px-3 py-2">{r.line}</td><td className="px-3 py-2">{r.key ?? "—"}</td><td className="px-3 py-2 font-semibold text-[rgb(var(--navy))]">{r.outcome}{r.reason && <span className="block text-xs font-normal text-[rgb(var(--ink))]/60">{r.reason}</span>}</td>
              <td className="px-3 py-2 text-xs">{r.fields.map((f) => <div key={f.col}><b>{f.col}</b>: {f.baseline ?? "∅"} / {f.current ?? "∅"} / {f.latest ?? "∅"} — {OUT[f.outcome] ?? f.outcome}{f.reason ? ` (${f.reason})` : ""}</div>)}</td></tr>)}</tbody></table></div>
          <p className="mt-3 text-xs text-[rgb(var(--ink))]/50">Registry from builder commit {result.registry.builder_commit.slice(0, 7)}, SQL metadata {result.registry.sql_metadata_checked_at.slice(0, 10)}. Historical evidence, not live acceptance.</p>
        </section>)}
    </main>
  );
}
