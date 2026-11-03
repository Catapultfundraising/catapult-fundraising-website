"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { parseCsv } from "@/lib/portal-v2/csv-parse";
import { createScopeFence, StaleScope } from "@/lib/portal-v2/scope-fence";
import { buildJobManifest, summarizeJob, JOB_BATCH_ROWS, type BatchStatus, type JobManifest } from "@/lib/portal-v2/source-jobs";

const webSha = async (x: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x)))).map((b) => b.toString(16).padStart(2, "0")).join("");
type JobBatch = BatchStatus & { token?: string | null; requestId?: string; would?: number; values?: number };
const SMALL_MAX_BYTES = 2 * 1024 * 1024;

// Staff-only source CSV reconciliation preview. Read-only: there is no save button because raw source writes are OFF.
type Dest = { col: string; ty: string; st: string; why: string; key: string; kk?: string };
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
  const [clients, setClients] = useState<string[]>([]);
  const [fresh, setFresh] = useState<{ summary: string; rows: { table: string; label: string }[] } | null>(null);
  const [fileName, setFileName] = useState(""); const [fileDate, setFileDate] = useState(""); // blank = unknown, never today
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [token, setToken] = useState<string | null>(null); const [requestId, setRequestId] = useState("");
  const [applyAvailable, setApplyAvailable] = useState(false); const [actor, setActor] = useState("");
  const [saveMsg, setSaveMsg] = useState(""); const [unconfirmed, setUnconfirmed] = useState(false);
  // Large files (>500 rows or >2 MB): parsed in the browser, bound into a whole-file manifest, uploaded in 500-row batches.
  const [bigRows, setBigRows] = useState<Record<string, string>[] | null>(null);
  const [job, setJob] = useState<{ manifest: JobManifest; jobId: string } | null>(null);
  const [batches, setBatches] = useState<JobBatch[]>([]); const [confirmed, setConfirmed] = useState(false);
  const running = useRef(false); // blocks double-click / parallel dispatch
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (running.current) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, []);
  // ONE scope fence: reset() bumps it; every async callback/send/state write checks a token taken before it started.
  const fence = useRef(createScopeFence()).current;
  const guard = <T,>(p: Promise<T>) => fence.token().guard(p);
  const onErr = (e: Error) => { if (!(e instanceof StaleScope)) setErr(e.message); };
  useEffect(() => { setDemo(new URLSearchParams(window.location.search).get("demo") === "1"); call({ op: "clients" }).then((j) => setClients(j.clients ?? [])).catch((e) => setErr(e.message)); }, []);
  const reset = () => { fence.bump(); setBusy(false); if (running.current) return; setJob(null); setBatches([]); setConfirmed(false); setResult(null); setErr(""); setToken(null); setRequestId(""); setApplyAvailable(false); setSaveMsg(""); setUnconfirmed(false); };
  const clearFile = () => { setBigRows(null); setCsv(""); setHeaders([]); setMapping({}); setFileName(""); };
  // ONE effect for client/table so scope is invalidated once, before any request of the new scope starts.
  const prevClient = useRef("");
  useEffect(() => {
    const clientChanged = prevClient.current !== client;
    if (clientChanged && table) { reset(); setTable(""); return; } // re-runs with table "" for the new client
    prevClient.current = client;
    setDests([]); clearFile(); reset();
    if (clientChanged) { setTables([]); if (client) { guard(call({ op: "tables", client })).then((j) => setTables(j.tables)).catch(onErr); guard(call({ op: "provenance", client })).then(setFresh).catch((e) => { if (!(e instanceof StaleScope)) setFresh(null); }); } else setFresh(null); }
    if (client && table) guard(call({ op: "fields", client, table })).then((j) => setDests(j.fields)).catch(onErr);
  }, [client, table]); // eslint-disable-line react-hooks/exhaustive-deps

  const useCsv = (t: string, name: string, preset?: Record<string, string>) => {
    reset(); clearFile(); setCsv(t); setFileName(name);
    guard(call({ op: "inspect", client, table, csv: t })).then((j: { headers: string[] }) => {
      setHeaders(j.headers);
      setMapping(preset ?? Object.fromEntries(j.headers.map((x) => [x, dests.find((d) => d.col.toLowerCase() === x.trim().replace(/\W+/g, "_").toLowerCase())?.col ?? ""])));
    }).catch(onErr);
  };
  const onFile = async (f: File | undefined) => {
    reset(); clearFile(); if (!f) return;
    const tk = fence.token(); // a file read that finishes after the selection changed is dropped
    const text = await f.text().catch(() => null);
    if (!tk.live()) return;
    if (text === null) { setErr("Could not read the file"); return; }
    let grid: string[][]; try { grid = parseCsv(text); } catch (e) { setErr((e as Error).message); return; }
    if ((f.size <= SMALL_MAX_BYTES && grid.length - 1 <= JOB_BATCH_ROWS)) return useCsv(text, f.name);
    const hs = grid[0] ?? []; const norm = hs.map((h) => h.trim().toLowerCase());
    if (!hs.length || norm.some((h) => !h) || new Set(norm).size !== norm.length) { setErr("Every column needs a unique header"); return; }
    setFileName(f.name); setHeaders(hs);
    setBigRows(grid.slice(1).map((r) => Object.fromEntries(hs.map((h, i) => [h, r[i] ?? ""]))));
    setMapping(Object.fromEntries(hs.map((x) => [x, dests.find((d) => d.col.toLowerCase() === x.trim().replace(/\W+/g, "_").toLowerCase())?.col ?? ""])));
  };
  const setBatch = (i: number, patch: Partial<JobBatch>) => setBatches((bs) => bs.map((b) => (b.index === i ? { ...b, ...patch } : b)));
  const committed = async (jobId: string) => { const st = await call({ op: "jobStatus", client, jobId }); return new Map<number, { state: string; savedRecords: number; heldRows: number }>((st.found ? st.batches : []).map((b: { index: number; state: string; savedRecords: number; heldRows: number }) => [b.index, b])); };
  // Whole-file plan: duplicate IDs anywhere in the file stop everything before any upload; saved batches (resume) are skipped.
  const previewJob = async () => {
    if (!bigRows || running.current) return; running.current = true; setBusy(true); const tk = fence.token(); const live = tk.live; setErr(""); setBatches([]); setConfirmed(false);
    try {
      const keyCol = dests.find((d) => d.key)?.key ?? "";
      const j = await buildJobManifest(webSha, { client, table, keyCol, keyKind: (dests.find((d) => d.key)?.kk ?? "int") as "int" | "bigint" | "text", mapping, headers, rows: bigRows, fileName, fileDate: fileDate || null, actor, registryRev: "" + (await call({ op: "tables", client })).registry.rev });
      if (!live()) return; setJob(j);
      const done = demo ? new Map() : await committed(j.jobId).catch(() => new Map());
      const list: JobBatch[] = j.manifest.batchHashes.map((_, i) => { const c = done.get(i); return c ? { index: i, state: c.state as BatchStatus["state"], savedRecords: c.savedRecords, heldRows: c.heldRows } : { index: i, state: "pending" }; });
      if (!live()) return; setBatches(list);
      for (const b of list) {
        if (!live()) return;
        if (b.state !== "pending") continue;
        try {
          const r = await call({ op: "jobPreview", demo, client, table, actor, manifest: j.manifest, jobId: j.jobId, batchIndex: b.index, rows: bigRows.slice(b.index * JOB_BATCH_ROWS, (b.index + 1) * JOB_BATCH_ROWS) });
          if (!live()) return;
          const held = r.job?.heldRows ?? r.result.rows.filter((x: { outcome: string; fields: { outcome: string }[] }) => x.outcome === "held" || x.outcome === "invalid" || x.fields.some((f) => ["held", "conflict", "protected", "invalid"].includes(f.outcome))).length;
          setBatch(b.index, r.token ? { state: "previewed", token: r.token, requestId: r.requestId, heldRows: held, would: r.result.counts.update, values: r.result.counts.applyValues } : { state: held ? "held_only" : "verified_unchanged", heldRows: held, would: 0 });
          setApplyAvailable(r.applyAvailable === true || applyAvailable);
        } catch (e) { if (!live()) return; setBatch(b.index, { state: "failed", error: (e as Error).message }); }
      }
    } catch (e) { if (live()) setErr((e as Error).message); } finally { running.current = false; if (live()) setBusy(false); }
  };
  // Sequential save, one batch at a time; stops at the first unconfirmed batch (no automatic retry, no new upload).
  const saveJob = async () => {
    if (!job || running.current || !confirmed) return; running.current = true; setBusy(true); const tk = fence.token();
    try {
      for (const b of batches) {
        if (!tk.live()) break;
        if (b.state !== "previewed" || !b.token) continue;
        let r: Record<string, unknown>;
        try { r = await call({ op: "apply", client, table, token: b.token, actor }); }
        catch (e) { if (!tk.live()) break; const m = (e as Error).message; if (/expired|preview again/i.test(m)) { setBatch(b.index, { state: "failed", error: m, token: null }); continue; } setBatch(b.index, { state: "unconfirmed", error: m }); break; }
        if (!tk.live()) break;
        if (r.unconfirmed) { setBatch(b.index, { state: "unconfirmed" }); break; }
        setBatch(b.index, { state: b.heldRows ? "saved_with_holds" : "saved", savedRecords: Number(r.records ?? 0), token: null });
      }
    } finally { running.current = false; if (tk.live()) setBusy(false); }
  };
  const checkJob = async () => { if (!job) return; const tk = fence.token(); try { const done = await committed(job.jobId); if (!tk.live()) return; setBatches((bs) => bs.map((b) => { const c = done.get(b.index); return c ? { ...b, state: c.state as BatchStatus["state"], savedRecords: c.savedRecords, heldRows: c.heldRows, token: null } : b.state === "unconfirmed" ? { ...b, error: "still unconfirmed (may be in progress); check again" } : b; })); } catch (e) { if (tk.live()) setErr(`Status unavailable (${(e as Error).message})`); } };
  const jobSum = job ? summarizeJob(job.manifest.batchHashes.length, batches) : null;
  const loadDemo = () => { const cols = dests.filter((d) => d.st === "candidate" && d.col !== d.key && d.ty === "nvarchar").slice(0, 2).map((d) => d.col); const held = dests.find((d) => d.st === "held"); const hs = ["Constituent number", ...cols, ...(held ? [held.col] : []), "Spreadsheet note"]; const v = (k: string) => [k, ...cols.map(() => "B"), ...(held ? ["x"] : []), "n"].join(","); const t = [hs.join(","), v("900001"), v("900002"), v("900003"), v("900009"), v("abc")].join("\n"); useCsv(t, "fictional-demo.csv", Object.fromEntries(hs.map((h, i) => [h, i === 0 ? "CPTID" : dests.find((d) => d.col === h)?.col ?? ""]))); };
  const loadBigDemo = () => { const cols = dests.filter((d) => d.st === "candidate" && d.col !== d.key && d.ty === "nvarchar").slice(0, 1).map((d) => d.col); const hs = ["Constituent number", ...cols]; reset(); clearFile(); setFileName("fictional-large-demo.csv"); setHeaders(hs);
    setBigRows(Array.from({ length: 1200 }, (_, i) => Object.fromEntries([["Constituent number", String(i < 3 ? 900001 + i : 910000 + i)], ...cols.map((c) => [c, "B"])]))); setMapping(Object.fromEntries(hs.map((h, i) => [h, i === 0 ? "CPTID" : h]))); if (!actor) setActor("Demo Reviewer"); };
  const preview = () => { reset(); setBusy(true); const tk = fence.token(); guard(call({ op: "preview", client, table, csv, mapping, demo, fileName, fileDate: fileDate || null })).then((j) => { setResult(j.result); setToken(j.token ?? null); setRequestId(j.requestId ?? ""); setApplyAvailable(j.applyAvailable === true); }).catch(onErr).finally(() => { if (tk.live()) setBusy(false); }); };
  // Apply (hidden unless the server reports it configured). One request, never retried automatically; lost reply => Check status.
  const save = () => { setBusy(true); setSaveMsg(""); const tk = fence.token(); call({ op: "apply", client, table, token, actor }).then((j) => { if (!tk.live()) return;
      if (j.unconfirmed) { setUnconfirmed(true); setSaveMsg("Save not confirmed. Use Check status; do not upload again."); }
      else { setToken(null); setSaveMsg(j.replayed ? "Already saved earlier (same request)." : `Saved ${j.records} records (${j.values} values).`); }
    }).catch((e) => { if (!tk.live()) return; setUnconfirmed(true); setSaveMsg(`Save not confirmed (${(e as Error).message}). Use Check status; do not upload again.`); }).finally(() => { if (tk.live()) setBusy(false); }); };
  const checkStatus = () => { const tk = fence.token(); call({ op: "status", client, table, requestId }).then((j) => { if (!tk.live()) return; setUnconfirmed(!j.found); if (j.found) { setToken(null); setSaveMsg("Saved: this request committed."); } else setSaveMsg("Still unconfirmed: Engage has no committed record of this request yet (it may still be in progress). Check again shortly; do not upload again."); }).catch((e) => tk.run(() => setSaveMsg(`Status unavailable (${(e as Error).message}); try again.`))); };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/research" className="inline-flex items-center gap-1 text-sm text-[rgb(var(--ink))]/60 hover:text-[rgb(var(--navy))]"><ArrowLeft className="h-4 w-4" /> Research</Link>
      <h1 className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">Source file reconciliation</h1>
      <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">Preview only. Compares a source export with the last loaded baseline and the current dashboard data. Portal edits and records are protected; anything without a known baseline or verified key is held. Saving source data is turned off.{demo && " Showing fictional demo data."}</p>
      <section className={`${card} mt-6 grid gap-4 sm:grid-cols-3`}>
        <label className="block"><span className={label}>Client</span><select className={input} value={client} disabled={busy} onChange={(e) => setClient(e.target.value)}><option value="">Choose…</option>{clients.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></label>
        <label className="block"><span className={label}>Dashboard table</span><select className={input} value={table} disabled={busy || !tables.length} onChange={(e) => setTable(e.target.value)}><option value="">Choose…</option>{tables.map((t) => <option key={t.table} value={t.table}>{t.table} ({t.candidate ? `${t.candidate} reviewable fields` : "all held"})</option>)}</select></label>
        <label className="block"><span className={label}>CSV file</span><input key={`${client}/${table}`} type="file" accept=".csv,text/csv" className={input} disabled={busy || !table} onChange={(e) => onFile(e.target.files?.[0])} /></label>
        <label className="block"><span className={label}>Source export date</span><input type="date" className={input} disabled={busy} value={fileDate} onChange={(e) => { setFileDate(e.target.value); reset(); }} /><span className="mt-1 block text-xs text-[rgb(var(--ink))]/50">Leave blank if unknown; it is recorded as unknown, never today.</span></label>
        {fileName && <p className="text-xs text-[rgb(var(--ink))]/60 sm:col-span-2">File: {fileName}</p>}
        {demo && table && <button type="button" className="text-left text-sm font-semibold text-[rgb(var(--brass))] underline" disabled={busy} onClick={loadDemo}>Load fictional demo file</button>}
        {demo && table && <button type="button" className="text-left text-sm font-semibold text-[rgb(var(--brass))] underline" disabled={busy} onClick={loadBigDemo}>Load fictional 1,200-row demo file</button>}
      </section>
      {fresh && (
        <details className={`${card} mt-4 text-sm`}><summary className="cursor-pointer text-[rgb(var(--navy))]"><span className={label}>Source dates</span> {fresh.summary}</summary>
          <ul className="mt-2 text-xs text-[rgb(var(--ink))]/70">{fresh.rows.map((r) => <li key={r.table}>{r.table}: {r.label}</li>)}</ul></details>)}
      {headers.length > 0 && (
        <section className={`${card} mt-4`}>
          <h2 className={label}>Column mapping</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{headers.map((h) => (
            <label key={h} className="block text-sm"><span className="text-[rgb(var(--navy))]">{h}</span>
              <select className={input} disabled={busy} value={mapping[h] ?? ""} onChange={(e) => { setMapping({ ...mapping, [h]: e.target.value }); reset(); }}>
                <option value="">Ignore this column</option>{dests.map((d) => <option key={d.col} value={d.col}>{d.col}{d.key === d.col ? " (key)" : d.st !== "candidate" ? ` — ${d.st}` : ""}</option>)}
              </select></label>))}</div>
          <button type="button" className={`${navyBtn} mt-4`} disabled={busy || (!!bigRows && !actor.trim()) || !Object.values(mapping).includes(dests.find((d) => d.key)?.key ?? "~")} onClick={bigRows ? previewJob : preview}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{bigRows ? `Preview whole file (${bigRows.length.toLocaleString()} rows, ${Math.ceil(bigRows.length / JOB_BATCH_ROWS)} batches)` : "Preview"}</button>
          {bigRows && <label className="ml-3 inline-block text-sm align-bottom"><span className={label}>Your name</span><input className={input} disabled={busy} value={actor} onChange={(e) => { setActor(e.target.value); reset(); }} placeholder="Recorded as author (shared login)" /></label>}
        </section>)}
      {job && jobSum && (
        <section className={`${card} mt-4`} aria-label="Large file plan">
          <h2 className={label}>Whole-file plan</h2>
          <p className="mt-2 text-sm text-[rgb(var(--navy))]" role="status">{jobSum.label}</p>
          <p className="mt-1 text-sm text-[rgb(var(--ink))]/70">{batches.reduce((n, b) => n + (b.would ?? 0), 0)} rows would update ({batches.reduce((n, b) => n + (b.values ?? 0), 0)} values) across {batches.length} batches · {jobSum.heldRows} rows held or invalid · each batch is checked again against current data when saved</p>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="text-xs uppercase text-[rgb(var(--ink))]/60"><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Rows</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Would update / held</th></tr></thead>
            <tbody>{batches.map((b) => <tr key={b.index} className="border-t border-[rgb(var(--line))]"><td className="px-3 py-2">{b.index + 1}</td><td className="px-3 py-2">{b.index * JOB_BATCH_ROWS + 2}–{Math.min((b.index + 1) * JOB_BATCH_ROWS, job.manifest.totalRows) + 1}</td>
              <td className="px-3 py-2 font-semibold text-[rgb(var(--navy))]">{({ pending: "Not previewed", previewed: "Ready", saved: "Saved", saved_with_holds: "Saved (some rows or fields held)", held_only: "Nothing to save (held rows)", verified_unchanged: "Already up to date (checked at preview)", unconfirmed: "Not confirmed", failed: "Failed" } as Record<string, string>)[b.state]}{b.error && <span className="block text-xs font-normal text-[rgb(var(--ink))]/60">{b.error}</span>}</td>
              <td className="px-3 py-2">{b.state === "saved" || b.state === "saved_with_holds" ? `${b.savedRecords ?? 0} saved` : `${b.would ?? "—"}`} / {b.heldRows ?? "—"}</td></tr>)}</tbody></table></div>
          {applyAvailable && batches.some((b) => b.state === "previewed") && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[rgb(var(--line))] pt-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I reviewed the whole-file plan; save ready batches one at a time</label>
              <button type="button" className={navyBtn} disabled={busy || !confirmed || jobSum.unconfirmed > 0} onClick={saveJob}>Save ready batches</button>
            </div>)}
          {jobSum.unconfirmed > 0 && <p className="mt-3 text-sm text-[rgb(var(--navy))]">A batch was not confirmed. <button type="button" className="font-semibold text-[rgb(var(--brass))] underline" onClick={checkJob}>Check status</button> before anything else; do not upload again.</p>}
          <p className="mt-3 text-xs text-[rgb(var(--ink))]/50">Job {job.jobId.slice(0, 12)} · re-choosing the identical file resumes it; a changed file, date, mapping or name starts a different job.</p>
        </section>)}
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}
      {result && (
        <section className={`${card} mt-4`}>
          <p className="text-sm text-[rgb(var(--ink))]/70">{result.counts.update} rows would update ({result.counts.applyValues} values) · {result.counts.held} held · {result.counts.invalid} invalid · {result.counts.unchanged} unchanged · {result.counts.conflicts} conflicts · {result.counts.protectedValues} protected · {result.notInSource.length} dashboard records not in file (never deleted)</p>
          <h3 className={`${label} mt-4`}>Columns</h3>
          <ul className="mt-2 text-sm">{result.columns.map((c) => <li key={c.header}><span className="text-[rgb(var(--navy))]">{c.header}</span> → {c.col ?? "ignored"}: <b>{c.state}</b> <span className="text-[rgb(var(--ink))]/60">{c.reason}</span></li>)}</ul>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="text-xs uppercase text-[rgb(var(--ink))]/60"><th className="px-3 py-2">Line</th><th className="px-3 py-2">Key</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Fields (baseline / current / file)</th></tr></thead>
            <tbody>{result.rows.map((r) => <tr key={r.line} className="border-t border-[rgb(var(--line))] align-top"><td className="px-3 py-2">{r.line}</td><td className="px-3 py-2">{r.key ?? "—"}</td><td className="px-3 py-2 font-semibold text-[rgb(var(--navy))]">{r.outcome}{r.reason && <span className="block text-xs font-normal text-[rgb(var(--ink))]/60">{r.reason}</span>}</td>
              <td className="px-3 py-2 text-xs">{r.fields.map((f) => <div key={f.col}><b>{f.col}</b>: {f.baseline ?? "∅"} / {f.current ?? "∅"} / {f.latest ?? "∅"} — {OUT[f.outcome] ?? f.outcome}{f.reason ? ` (${f.reason})` : ""}</div>)}</td></tr>)}</tbody></table></div>
          {applyAvailable && token && (
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[rgb(var(--line))] pt-4">
              <label className="block text-sm"><span className={label}>Your name</span><input className={input} value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Recorded as author (shared login)" /></label>
              <button type="button" className={navyBtn} disabled={busy || !actor.trim() || unconfirmed} onClick={save}>Save {result.counts.applyValues} values</button>
            </div>)}
          {(saveMsg || unconfirmed) && <p role="status" className="mt-3 text-sm text-[rgb(var(--navy))]">{saveMsg} {unconfirmed && requestId && <button type="button" className="font-semibold text-[rgb(var(--brass))] underline" onClick={checkStatus}>Check status</button>} {unconfirmed && token && <button type="button" className="ml-2 font-semibold text-[rgb(var(--brass))] underline" disabled={busy} onClick={save}>Send the same request again (safe: never saves twice)</button>}</p>}
          <p className="mt-3 text-xs text-[rgb(var(--ink))]/50">Registry from builder commit {result.registry.builder_commit.slice(0, 7)}, SQL metadata {result.registry.sql_metadata_checked_at.slice(0, 10)}. Historical evidence, not live acceptance.</p>
        </section>)}
    </main>
  );
}
