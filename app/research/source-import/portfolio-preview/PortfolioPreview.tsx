"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PreviewRequest, Simulation, ReviewRow } from "@/lib/portal-v2/portfolio-preview";
import type { ParseSettings } from "@/lib/portal-v2/source-file-preview";

const targets = { clientId: "Client constituent ID (exact text)", verifyCptid: "Internal CPTID — verify only, never match", note: "New note — append only", askAmount: "Campaign ask amount (not giving)", portfolio: "Primary solicitor / portfolio", secondarySolicitor: "Secondary solicitor (independent)" };
const suggestions: Record<string, string> = { CPTID: "verifyCptid", Client_ID: "clientId", "New Notes": "note", "Campaign Ask": "askAmount", "Primary Solicitor": "portfolio", "Secondary Solicitor": "secondarySolicitor" };
const control = "w-full bg-white px-3 py-2 text-sm ring-1 ring-[rgb(var(--line))] focus:outline-2 focus:outline-[rgb(var(--brass))]";
const button = "bg-[rgb(var(--navy))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
async function call(body: object) {
  const r = await fetch("/api/research-source-import/portfolio-preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json(); if (!r.ok) throw new Error(data.error || "Simulation unavailable"); return data;
}
function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function encode(bytes: Uint8Array) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }
function downloadWorkbook(encoded: string) {
  const text = atob(encoded), bytes = new Uint8Array(text.length); for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a"); a.href = url; a.download = "synthetic-portfolio-row7.xlsx"; a.click(); URL.revokeObjectURL(url);
}
type Result = { binding: string; changes: number; reviews: ReviewRow[]; next: Simulation; fileDigest: string; receipt?: object };
export default function PortfolioPreview() {
  const [client, setClient] = useState("pvas"), [state, setState] = useState<Simulation | null>(null);
  const [bytes, setBytes] = useState(""), [fileName, setFileName] = useState(""), [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}), [date, setDate] = useState(""), [actor, setActor] = useState("");
  const [parseSettings, setParseSettings] = useState<ParseSettings>({ format: "csv" }), [sheets, setSheets] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null), [receipt, setReceipt] = useState<object | null>(null);
  const [sample, setSample] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const revision = useRef(0), scope = useRef(0); const file = useRef<HTMLInputElement>(null);
  // Every editable input invalidates the preview. Async responses also belong to exactly one scope/revision.
  function invalidate() { revision.current++; setResult(null); setReceipt(null); setError(""); setMessage(""); }
  useEffect(() => {
    const currentScope = ++scope.current; revision.current++; setState(null); setResult(null); setReceipt(null); setBytes(""); setFileName(""); setHeaders([]); setMapping({}); setParseSettings({ format: "csv" }); setSheets([]); setError(""); setMessage(""); setBusy(false);
    if (file.current) file.current.value = "";
    call({ op: "context", client }).then(d => { if (currentScope === scope.current) { setState(d.state); setSample(d.sample); } }).catch(e => { if (currentScope === scope.current) setError(e.message); });
  }, [client]);
  async function action(fn: () => Promise<void>) { setBusy(true); setError(""); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Simulation refused"); } finally { setBusy(false); } }
  async function upload(f: File) {
    invalidate(); const rev = revision.current;
    setBytes(""); setFileName(""); setHeaders([]); setMapping({}); setSheets([]); setParseSettings({ format: "csv" });
    if (!/\.(csv|xlsx)$/i.test(f.name)) throw new Error("Choose UTF-8 CSV or XLSX. XLS, XLSM and other formats are not supported.");
    if (f.size > 2 * 1024 * 1024) throw new Error("File exceeds 2 MB");
    const encoded = encode(new Uint8Array(await f.arrayBuffer()));
    if (/\.xlsx$/i.test(f.name)) {
      const d = await call({ op: "fileInfo", bytes: encoded, format: "xlsx" });
      if (rev !== revision.current) return;
      setBytes(encoded); setFileName(f.name); setSheets(d.sheets); setParseSettings({ format: "xlsx", sheet: "", headerRow: 1 }); return;
    }
    const d = await call({ op: "inspect", bytes: encoded, parseSettings: { format: "csv" } });
    if (rev !== revision.current) return;
    setBytes(encoded); setFileName(f.name); setHeaders(d.headers); setMapping(Object.fromEntries(d.headers.map((h: string) => [h, suggestions[h] || ""])));
  }
  function changeParse(settings: ParseSettings) { invalidate(); setParseSettings(settings); setHeaders([]); setMapping({}); }
  const input = (): PreviewRequest => ({ client, state: state!, bytes, fileName, mapping, sourceDate: date, actor, parseSettings });
  const mappingControl = (h: string) => <label key={h} className="space-y-1 text-sm">{h}<select aria-label={`Map ${h}`} disabled={busy} className={control} value={mapping[h] || ""} onChange={e => { invalidate(); setMapping(m => ({ ...m, [h]: e.target.value })); }}>
    <option value="">Ignore</option>{Object.entries(targets).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
  </select></label>;
  return <main className="mx-auto max-w-6xl space-y-6 px-5 py-10 text-[rgb(var(--navy))]">
    <Link href="/research/source-import" className="text-sm underline">← Guarded source importer</Link>
    <header className="space-y-3"><h1 className="font-serif text-3xl">Notes &amp; portfolio import preview</h1>
      <p className="max-w-3xl text-sm">Try the first direct-file workflow against fictional records. This is a simulation adapter for the existing importer, not an alternate live loader.</p>
    </header>
    <aside className="bg-[rgb(var(--navy))] p-5 text-white" role="note">
      <strong>Simulation only · no SQL save · no dashboard publication</strong>
      <p className="mt-2 text-sm">Use synthetic files only. Files are sent to this preview server for computation, not saved to staging storage. Results live only in this browser tab; refresh resets them. All five client choices use fictional schema-independent fixtures, not verified live mappings.</p>
    </aside>
    <section className="space-y-4 bg-[rgb(var(--paper))] p-5">
      <h2 className="font-serif text-xl">1. Choose scope and file</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">Client scope<select aria-label="Client scope" disabled={busy} className={control} value={client} onChange={e => { invalidate(); setClient(e.target.value); }}>
          {["pvas", "csnf", "jag", "wcbhc", "baq"].map(c => <option key={c} value={c}>{c.toUpperCase()} — fictional fixture</option>)}
        </select></label>
        <label className="space-y-2 text-sm">Import type<select className={control} defaultValue="portfolio"><option value="portfolio">Notes / ask / portfolio</option><option disabled>Gift transactions — next phase</option><option disabled>Giving-summary snapshot — separate future mode</option></select></label>
        <label className="space-y-2 text-sm">Verified source-as-of date<input aria-label="Source-as-of date" disabled={busy || !state} type="date" className={control} value={date} onChange={e => { invalidate(); setDate(e.target.value); }} /></label>
        <label className="space-y-2 text-sm">Staff attribution<input aria-label="Staff attribution" disabled={busy || !state} className={control} value={actor} onChange={e => { invalidate(); setActor(e.target.value); }} /></label>
      </div>
      <p className="text-sm">UTF-8 CSV: headers on row 1. XLSX: explicitly choose the worksheet and header row (portfolio template: row 7). Formulas are never executed; formula identity/write cells are held. Excel IDs and write values must be exact text, including currency. Numeric Excel cells are held, never rounded or inferred. This exact-value adapter gap means the actual portfolio workbook is not yet direct-import ready.</p>
      <div className="flex flex-wrap items-center gap-4">
        <button className={button} disabled={!sample || busy} onClick={() => download("synthetic-portfolio.csv", sample, "text/csv;charset=utf-8")}>Download synthetic CSV</button>
        <button className={button} disabled={busy || !state} onClick={() => void action(async () => { const d = await call({ op: "sampleXlsx" }); downloadWorkbook(d.bytes); })}>Download synthetic XLSX (row 7)</button>
        <label className="text-sm">Upload synthetic CSV / XLSX<input aria-label="Upload synthetic CSV" ref={file} disabled={busy || !state} type="file" accept=".csv,.xlsx" className="ml-3 max-w-full" onChange={e => { const f = e.target.files?.[0]; if (f) void action(() => upload(f)); }} /></label>
      </div>
      {parseSettings.format === "xlsx" && !!bytes && <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">Worksheet<select aria-label="Worksheet" disabled={busy} className={control} value={parseSettings.sheet} onChange={e => changeParse({ ...parseSettings, sheet: e.target.value })}><option value="">Choose worksheet explicitly</option>{sheets.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="space-y-2 text-sm">Header row (1–100)<input aria-label="Header row" type="number" min={1} max={100} disabled={busy} className={control} value={parseSettings.headerRow} onChange={e => changeParse({ ...parseSettings, headerRow: Number(e.target.value) })} /></label>
        <button className={button} disabled={busy || !parseSettings.sheet} onClick={() => void action(async () => { invalidate(); const rev = revision.current; const d = await call({ op: "inspect", bytes, parseSettings }); if (rev === revision.current) { setHeaders(d.headers); setMapping(Object.fromEntries(d.headers.map((h: string) => [h, suggestions[h] || ""]))); } })}>Read selected sheet and header row</button>
      </div>}
      {fileName && <p className="text-sm">Selected: {fileName} · {headers.length} headers. Exact IDs: 0001 matches; 1 is unknown; 0003 is ambiguous.</p>}
    </section>
    {!!headers.length && <section className="space-y-4"><h2 className="font-serif text-xl">2. Map business fields</h2>
      <p className="text-sm">Blank means no change. Map only New Notes; do not map Historical Notes, Task, Due Date or cumulative giving. Previous Campaign Ask is not the current Campaign Ask. Primary and secondary solicitors are independent fields. Manual ask and either solicitor correction are held.</p>
      <div className="grid gap-3 sm:grid-cols-2">{headers.filter(h => mapping[h]).map(mappingControl)}</div>
      <details><summary className="cursor-pointer text-sm">Ignored columns ({headers.filter(h => !mapping[h]).length}) — expand to map another column</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{headers.filter(h => !mapping[h]).map(mappingControl)}</div></details>
      <div className="flex flex-wrap gap-4">
        <button className={button} disabled={busy} onClick={() => void action(async () => { const d = await call({ op: "profile", client, bytes, mapping, parseSettings }); download(`${client}-simulation-mapping.json`, JSON.stringify(d, null, 2)); setMessage("Mapping metadata downloaded. It is not an approval or a live SQL profile."); })}>Download mapping profile</button>
        <label className="text-sm">Restore mapping profile<input aria-label="Restore mapping profile" disabled={busy} type="file" accept=".json" onChange={e => { const f = e.target.files?.[0]; if (f) { invalidate(); const rev = revision.current; void action(async () => { if (f.size > 65536) throw new Error("Profile exceeds 64 KB"); const d = await call({ op: "profile", client, bytes, mapping, parseSettings, profile: await f.text() }); if (rev === revision.current) setMapping(d.mapping); }); } }} /></label>
      </div>
      <button className={button} disabled={busy || !state} onClick={() => void action(async () => { const rev = revision.current; const d = await call({ op: "preview", input: input() }); if (rev === revision.current) { setResult(d); setReceipt(null); } })}>Preview changes</button>
    </section>}
    {error && <p role="alert" className="bg-[rgb(var(--paper))] p-4 font-semibold">{error}</p>}
    {message && <p role="status">{message}</p>}
    {result && <section className="space-y-4"><h2 className="font-serif text-xl">3. Review before / after</h2>
      <p>{result.changes} proposed simulation changes. Unknown and ambiguous IDs stay held; no records are inserted.</p>
      <p className="break-all text-xs">Original-byte SHA-256: {result.fileDigest}</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Line / exact client ID", "Target", "Before", "After", "Review"].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>
        {result.reviews.flatMap(r => r.fields.length ? r.fields.map((f, i) => <tr className="border-t border-[rgb(var(--line))]" key={`${r.line}/${i}`}><td className="p-2">{r.line} / {r.clientId}</td><td className="p-2">{f.target}</td><td className="p-2">{f.before}</td><td className="p-2">{f.after || "—"}</td><td className="p-2">{f.outcome}</td></tr>) : [<tr key={r.line}><td className="p-2">{r.line} / {r.clientId}</td><td colSpan={4}>{r.reason}</td></tr>])}
      </tbody></table></div>
      <div className="flex flex-wrap gap-4">
        <button className={button} disabled={busy || !result.changes || !!receipt} onClick={() => void action(async () => { const rev = revision.current; const d = await call({ op: "simulate", input: input(), binding: result.binding }); if (rev !== revision.current) return; revision.current++; setState(d.next); setReceipt(d.receipt); setMessage("Simulation completed in this tab only. No SQL committed; no dashboard published. Preview the same file again to check note deduplication."); })}>Simulate approved changes — no SQL</button>
        <button className={button} onClick={() => download("simulation-review-exceptions.json", JSON.stringify({ simulation: true, client, ...result, next: undefined }, null, 2))}>Download review / exceptions</button>
      </div>
    </section>}
    {receipt && <section className="space-y-3 bg-[rgb(var(--paper))] p-5"><h2 className="font-serif text-xl">Simulation receipt — not an import receipt</h2><pre className="overflow-auto text-xs">{JSON.stringify(receipt, null, 2)}</pre><button className={button} onClick={() => download("SIMULATION-receipt.json", JSON.stringify(receipt, null, 2))}>Download simulation receipt</button></section>}
    {state && <section className="space-y-3"><h2 className="font-serif text-xl">Current fictional records · simulation revision {state.version}</h2>
      {state.people.map(p => <article className="border-t border-[rgb(var(--line))] py-3 text-sm" key={p.cptid}><h3 className="font-semibold">Fictional CPTID {p.cptid} · ask {p.askAmount} · {p.portfolio}</h3><p>Primary: {p.portfolio} · Secondary: {p.secondarySolicitor}</p><ul className="mt-2 list-inside list-disc">{p.notes.map(n => <li key={n.id}>{n.sourceDate} · {n.text} · {n.source} · {n.actor}</li>)}</ul></article>)}
    </section>}
    <footer className="border-t border-[rgb(var(--line))] pt-5 text-sm">Still blocked for live release: per-client verified crosswalks and schema mappings, designated field ownership and cutover approvals, durable private staging and audit, signed server approvals, SQL concurrency / idempotency / conditional undo, crash recovery and hosted publication safety. Manual &gt; designated direct file &gt; Access fallback is the approved future field-by-field transition, not active production authority. Monthly gifts remain next.</footer>
  </main>;
}
