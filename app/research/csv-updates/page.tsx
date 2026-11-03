"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { postApply } from "@/lib/portal-v2/csv-updates-client";

// Staff-only (behind the /research password). Shared across the five client dashboards.
const CLIENTS = [
  { id: "pvas", label: "PVAS" }, { id: "csnf", label: "CSNF" }, { id: "jag", label: "JAG" }, { id: "wcbhc", label: "WCBHC" }, { id: "baq", label: "BAQ" },
] as const;
const TARGETS: { v: string; label: string }[] = [
  { v: "", label: "Ignore this column" }, { v: "cptid", label: "CPTID (required)" },
  { v: "street", label: "Street address" }, { v: "city", label: "City" }, { v: "state", label: "State" }, { v: "zip", label: "ZIP" },
  { v: "phone", label: "Phone" }, { v: "mobile", label: "Mobile" }, { v: "phone2", label: "Phone 2" }, { v: "phone3", label: "Phone 3" },
  { v: "email", label: "Email" }, { v: "email2", label: "Email 2" }, { v: "email3", label: "Email 3" }, { v: "workEmail", label: "Work email" },
];
type FieldState = "changed" | "unchanged" | "blank" | "invalid" | "protected";
type Row = { line: number; cptidRaw: string; cptid: number | null; name: string; status: "changed" | "unchanged" | "invalid" | "held"; reason?: string; fields: { key: string; label: string; old: string; new: string; state: FieldState; reason?: string }[] };
type Preview = { headers: string[]; mapping: Record<string, string>; rows: Row[]; counts: { rows: number; changedRows: number; changedValues: number; unchanged: number; invalid: number; held: number; protectedValues: number }; asOf: string };
type Filter = "changed" | "held" | "invalid" | "unchanged" | "all";

const card = "rounded-2xl border border-[rgb(var(--line))] bg-white p-5";
const label = "text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]";
const input = "mt-1 w-full rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm text-[rgb(var(--navy))] focus:border-[rgb(var(--brass))] focus:outline-none";
const navyBtn = "inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))] disabled:cursor-not-allowed disabled:opacity-50";
const lineBtn = "inline-flex items-center gap-2 rounded-full border border-[rgb(var(--line))] px-4 py-2 text-sm font-semibold text-[rgb(var(--navy))] hover:border-[rgb(var(--brass))] disabled:opacity-50";
const STATE_TXT: Record<FieldState, string> = { changed: "Will update", unchanged: "Same", blank: "Blank, left as is", invalid: "Invalid", protected: "Protected" };
const STATE_CLS: Record<FieldState, string> = {
  changed: "text-[rgb(var(--navy))] font-semibold", unchanged: "text-[rgb(var(--ink))]/45", blank: "text-[rgb(var(--ink))]/35", invalid: "text-red-700", protected: "text-[rgb(var(--brass))]",
};

export default function CsvUpdatesPage() {
  const [demo, setDemo] = useState(false);
  const [client, setClient] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [mapping, setMapping] = useState<Record<string, string> | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [applyEnabled, setApplyEnabled] = useState(false);
  const [filter, setFilter] = useState<Filter>("changed");
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState<"" | "preview" | "apply" | "status">("");
  const [err, setErr] = useState("");
  const [result, setResult] = useState<string>("");
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);

  useEffect(() => { setDemo(new URLSearchParams(window.location.search).get("demo") === "1"); }, []);

  async function call(body: Record<string, unknown>) {
    const r = await fetch("/api/research-csv-updates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, demo }) });
    const j = await r.json().catch(() => ({ error: `Request failed (${r.status})` }));
    return { ok: r.ok, status: r.status, j };
  }
  function reset() { setPreview(null); setToken(null); setRequestId(null); setResult(""); setErr(""); setUnconfirmed(null); }
  /** Any mapping change discards the previous plan: a fresh preview is required before saving. */
  function changeMapping(h: string, v: string) { setPreview(null); setToken(null); setRequestId(null); setResult(""); setMapping({ ...(mapping ?? {}), [h]: v }); }
  async function inspect(text: string, name: string) {
    setBusy("preview"); setErr("");
    try {
      const { ok, j } = await call({ op: "inspect", client, csv: text, fileName: name });
      if (!ok) { setHeaders([]); setErr(j.error || "Could not read this CSV"); return; }
      setHeaders(j.headers); setMapping(j.mapping);
      if (Object.values(j.mapping as Record<string, string>).includes("cptid")) await runPreview(text, name, j.mapping);
      else setErr("Choose which column holds the CPTID, then preview.");
    } finally { setBusy(""); }
  }

  async function runPreview(text = csv, name = fileName, map = mapping) {
    if (!client) { setErr("Choose a client first"); return; }
    setBusy("preview"); setErr(""); setResult(""); setUnconfirmed(null);
    try {
      const { ok, j } = await call({ op: "preview", client, csv: text, fileName: name, mapping: map });
      if (!ok) { setPreview(null); setToken(null); setRequestId(null); setErr(j.error || "Preview failed"); return; }
      setPreview(j.preview); setMapping(j.preview.mapping); setToken(j.token); setRequestId(j.requestId ?? null); setApplyEnabled(!!j.applyEnabled);
      setFilter(j.preview.counts.changedRows ? "changed" : "all");
    } finally { setBusy(""); }
  }
  async function onFile(f: File | undefined) {
    reset(); setMapping(null); setHeaders([]);
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) { setErr("Upload a .csv file (save Excel files as CSV first)"); return; }
    if (f.size > 2 * 1024 * 1024) { setErr("CSV must be 2 MB or smaller"); return; }
    const text = await f.text();
    setFileName(f.name); setCsv(text);
    await inspect(text, f.name);
  }
  async function loadDemoFile() {
    const r = await fetch("/api/research-csv-updates/demo-file").catch(() => null);
    if (!r?.ok) { setErr("Demo file unavailable"); return; }
    const text = await r.text(); reset(); setMapping(null); setHeaders([]); setFileName("fictional-demo.csv"); setCsv(text);
    await inspect(text, "fictional-demo.csv");
  }
  async function apply() {
    if (!token || !requestId || !by.trim()) return;
    setBusy("apply"); setErr(""); setResult("");
    try {
      const o = await postApply(fetch, { op: "apply", client, token, by: by.trim(), demo }, requestId);
      if (o.kind === "unconfirmed") { setUnconfirmed(o.requestId); setToken(null); setErr(o.error); return; }
      if (o.kind === "rejected") {
        const held = (o.body.detail?.held ?? []) as { cptid: number; key: string; reason: string }[];
        setErr([o.error, ...held.slice(0, 5).map((h) => `CPTID ${h.cptid} ${h.key}: ${h.reason}`)].join(" \u2022 "));
        return;
      }
      const j = o.body;
      setToken(null);
      setResult(j.alreadyApplied ? `Already saved earlier as batch #${j.batchId}. Nothing new was written.` : `Saved ${j.changed} value${j.changed === 1 ? "" : "s"} on ${j.records} record${j.records === 1 ? "" : "s"} (batch #${j.batchId}).`);
    } finally { setBusy(""); }
  }
  async function checkStatus() {
    if (!unconfirmed) return;
    setBusy("status");
    try {
      const { ok, j } = await call({ op: "status", client, requestId: unconfirmed });
      if (!ok) { setErr(j.error || "Status check failed; try again shortly"); return; }
      if (j.found) { setUnconfirmed(null); setToken(null); setErr(""); setResult(`Confirmed saved as batch #${j.batchId}${j.undone ? " (since undone)" : ""}.`); }
      else setErr("Not found as saved yet. Wait a minute and check again. Preview the file again only if it still shows as not saved.");
    } catch { setErr("Status check failed; try again shortly"); } finally { setBusy(""); }
  }

  const rows = useMemo(() => (preview?.rows ?? []).filter((r) => filter === "all" || r.status === filter), [preview, filter]);
  const mappedCols = useMemo(() => (preview ? preview.headers.filter((h) => preview.mapping[h] && preview.mapping[h] !== "cptid") : []), [preview]);
  const c = preview?.counts;

  return (
    <div className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-16">
      <Link href="/research" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--ink))]/60 hover:text-[rgb(var(--navy))]"><ArrowLeft className="h-4 w-4" />Research portal</Link>
      <p className={`${label} mt-6`}>Internal Tool</p>
      <h1 className="mt-1 font-display text-3xl text-[rgb(var(--navy))]">Contact updates from CSV</h1>
      <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">
        Update contact details on existing records by CPTID. Nothing is added, deleted or merged, and gifts and asks are never touched.
        Blank cells leave values as they are. Values staff edited in the dashboard are protected and never overwritten.
      </p>
      {demo && <p className="mt-3 rounded-lg bg-[rgb(var(--paper))] px-3 py-2 text-xs text-[rgb(var(--ink))]/70">Local demo: fictional records only. Nothing is read from or saved to a client dashboard.</p>}

      <div className={`${card} mt-6 grid gap-4 md:grid-cols-[220px_1fr]`}>
        <label className="text-xs font-semibold text-[rgb(var(--ink))]/70">Client dashboard
          <select value={client} onChange={(e) => { setClient(e.target.value); reset(); setHeaders([]); setMapping(null); setFileName(""); setCsv(""); }} className={input}>
            <option value="">Choose a client</option>
            {CLIENTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <div>
          <span className="text-xs font-semibold text-[rgb(var(--ink))]/70">CSV file (up to 500 rows, 2 MB)</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <label className={`${lineBtn} cursor-pointer ${!client ? "pointer-events-none opacity-50" : ""}`}>
              {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Choose CSV
              <input type="file" accept=".csv,text/csv" className="hidden" disabled={!client} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {demo && <button onClick={loadDemoFile} disabled={!client || !!busy} className={lineBtn}>Use fictional demo file</button>}
            {fileName && <span className="text-sm text-[rgb(var(--ink))]/70">{fileName}</span>}
          </div>
        </div>
      </div>

      {err && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {unconfirmed && <button onClick={checkStatus} disabled={!!busy} className={`${lineBtn} mt-3`}>{busy === "status" && <Loader2 className="h-4 w-4 animate-spin" />}Check status</button>}
      {result && <p role="status" className="mt-4 rounded-lg border border-[rgb(var(--line))] bg-[rgb(var(--paper))] px-3 py-2 text-sm text-[rgb(var(--navy))]">{result}</p>}

      {headers.length > 0 && (
          <div className={`${card} mt-6`}>
            <p className={label}>Column mapping</p>
            <p className="mt-1 text-xs text-[rgb(var(--ink))]/60">Match each column to a contact field. One column must be CPTID. Columns set to Ignore are not read.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h) => (
                <label key={h} className="text-xs text-[rgb(var(--ink))]/70"><span className="font-semibold text-[rgb(var(--navy))]">{h || "(blank header)"}</span>
                  <select value={mapping?.[h] ?? ""} onChange={(e) => changeMapping(h, e.target.value)} className={input}>
                    {TARGETS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <button onClick={() => runPreview()} disabled={!!busy} className={`${lineBtn} mt-3`}>{busy === "preview" && <Loader2 className="h-4 w-4 animate-spin" />}Preview with this mapping</button>
            {!preview && <p className="mt-2 text-xs text-[rgb(var(--ink))]/60">Preview needed before anything can be saved.</p>}
          </div>
      )}

      {preview && (
        <>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-[rgb(var(--ink))]/70">
            <span><b className="text-[rgb(var(--navy))]">{c!.changedValues}</b> value{c!.changedValues === 1 ? "" : "s"} to update on <b className="text-[rgb(var(--navy))]">{c!.changedRows}</b> record{c!.changedRows === 1 ? "" : "s"}</span>
            <span>{c!.unchanged} unchanged</span><span>{c!.held} held</span><span>{c!.invalid} invalid</span><span>{c!.protectedValues} protected value{c!.protectedValues === 1 ? "" : "s"}</span>
            <span className="text-xs">Records as of {preview.asOf}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1" role="tablist">
            {(["changed", "held", "invalid", "unchanged", "all"] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? "bg-[rgb(var(--navy))] text-white" : "border border-[rgb(var(--line))] text-[rgb(var(--navy))]"}`}>
                {f === "all" ? "All rows" : f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-[rgb(var(--line))] bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[rgb(var(--paper))] text-xs uppercase tracking-wide text-[rgb(var(--ink))]/60">
                <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">CPTID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Result</th>
                  {mappedCols.map((h) => <th key={h} className="px-3 py-2">{TARGETS.find((t) => t.v === preview.mapping[h])?.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={4 + mappedCols.length} className="px-3 py-6 text-center text-[rgb(var(--ink))]/50">No rows in this view.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.line} className="border-t border-[rgb(var(--line))]/70 align-top">
                    <td className="px-3 py-2 text-[rgb(var(--ink))]/50">{r.line}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.cptidRaw || "\u2014"}</td>
                    <td className="px-3 py-2 text-[rgb(var(--navy))]">{r.name || "\u2014"}</td>
                    <td className="px-3 py-2"><span className="font-semibold text-[rgb(var(--navy))]">{r.status[0].toUpperCase() + r.status.slice(1)}</span>{r.reason && <span className="block text-xs text-[rgb(var(--ink))]/60">{r.reason}</span>}</td>
                    {mappedCols.map((h) => {
                      const f = r.fields.find((x) => x.key === preview.mapping[h]);
                      if (!f) return <td key={h} className="px-3 py-2 text-[rgb(var(--ink))]/30">{"\u2014"}</td>;
                      return (
                        <td key={h} className="px-3 py-2 text-xs">
                          <span className={`block ${STATE_CLS[f.state]}`}>{STATE_TXT[f.state]}</span>
                          {f.state === "changed" || f.state === "protected" || f.state === "invalid"
                            ? <><span className="block text-[rgb(var(--ink))]/50 line-through">{f.old || "(empty)"}</span><span className="block text-[rgb(var(--navy))]">{f.new}</span></>
                            : <span className="block text-[rgb(var(--ink))]/50">{f.old || "(empty)"}</span>}
                          {f.reason && <span className="block text-[11px] text-[rgb(var(--ink))]/60">{f.reason}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`${card} mt-6 flex flex-wrap items-end gap-3`}>
            <label className="text-xs font-semibold text-[rgb(var(--ink))]/70">Your name (recorded with the change; the shared staff login does not verify it)
              <input value={by} onChange={(e) => setBy(e.target.value)} maxLength={200} placeholder="Required to save" className={`${input} min-w-[260px]`} />
            </label>
            <button onClick={apply} disabled={!applyEnabled || !token || !requestId || !by.trim() || !!busy} className={navyBtn}>
              {busy === "apply" && <Loader2 className="h-4 w-4 animate-spin" />}Save {c!.changedValues} update{c!.changedValues === 1 ? "" : "s"}
            </button>
            <p className="w-full text-xs text-[rgb(var(--ink))]/60">
              {!applyEnabled ? "Saving is turned off until rollout is approved. You can still preview files."
                : "Saving re-checks every value. If anyone changed one of these records after this preview, nothing is saved and you preview again. The preview expires after 15 minutes."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
