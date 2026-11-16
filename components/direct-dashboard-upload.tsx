"use client";
import { useEffect, useRef, useState } from "react";
import type { DirectFileCapabilities, DirectFilePlan, DirectFileReceipt } from "@/lib/portal-v2/directFileProtocol";
import type { ParseSettings } from "@/lib/portal-v2/source-file-preview";
import { confirmedDirectPreview, confirmedDirectReceipt } from "@/lib/portal-v2/direct-public-response";

const input = "w-full rounded border border-[rgb(var(--line))] px-3 py-2 text-sm";
const button = "rounded bg-[rgb(var(--navy))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
const targets = [["", "Do not import"], ["clientId", "Exact client ID"], ["ask", "Campaign ask"], ["primarySolicitor", "Primary solicitor"], ["secondarySolicitor", "Secondary solicitor"], ["note", "New notes only"], ["noteDate", "Note date (ISO text)"], ["eventId", "Stable note event ID"]] as const;
const suggested: Record<string, string> = { Client_ID: "clientId", "Campaign Ask": "ask", "Primary Solicitor": "primarySolicitor", "Secondary Solicitor": "secondarySolicitor", "New Notes": "note" };
type Upload = { fileName: string; bytes: string };
type Pending = { requestId: string; uncertain: boolean; receipt?: DirectFileReceipt };
/** Lives inside the existing all-five Add + Upload tab; never uses legacy multipart applyBatch. */
export function DirectDashboardUpload({ client }: { client: string }) {
  const [caps, setCaps] = useState<DirectFileCapabilities | null>(null), [research, setResearch] = useState(false);
  const [upload, setUpload] = useState<Upload | null>(null), [sheets, setSheets] = useState<string[]>([]), [sheet, setSheet] = useState("");
  const [format, setFormat] = useState<"csv" | "xlsx">("csv"), [headerRow, setHeaderRow] = useState(1), [integerId, setIntegerId] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]), [mapping, setMapping] = useState<Record<string, string>>({}), [verify, setVerify] = useState<string | null>(null);
  const [sourceDate, setSourceDate] = useState(""), [actor, setActor] = useState(""), [template, setTemplate] = useState("");
  const [useSourceDate, setUseSourceDate] = useState(false), [resolutions, setResolutions] = useState<Record<string, "new-event">>({});
  const [plan, setPlan] = useState<DirectFilePlan | null>(null), [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState(""), [exceptions, setExceptions] = useState<{ ordinal: number; line: number; source: string; reason: string }[]>([]);
  const [busy, setBusy] = useState(false), [verified, setVerified] = useState(false);
  const generation = useRef(0), request = useRef<string | null>(null);
  const api = `/api/${client}-data-direct-import`;
  const settings: ParseSettings = format === "csv" ? { format: "csv" } : { format: "xlsx", sheet, headerRow, clientIdFormat: integerId ? "integer" : "text" };
  function invalidate() { generation.current++; setPlan(null); setVerified(false); setExceptions([]); }
  async function call(body: unknown) {
    const r = await fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
      if (r.status === 401 && j.code === "research-auth-required") setResearch(true);
    if (!r.ok) { const e = new Error(j.error || j.code || "Unavailable") as Error & { exceptions?: typeof exceptions }; e.exceptions = j.exceptions; throw e; }
    return j;
  }
  useEffect(() => {
    generation.current++; request.current = null; setPlan(null); setUpload(null); setHeaders([]); setMapping({}); setPending(null); setCaps(null); setResearch(false); setVerified(false);
    let active = true;
    const saved = localStorage.getItem(`direct-import-pending:${client}`);
    if (saved && /^[a-f0-9]{32}$/.test(saved)) { request.current = saved; setPending({ requestId: saved, uncertain: true }); }
    call({ op: "capabilities" }).then(c => { if (active) { setCaps(c); setTemplate(c.templates?.[0]?.template ?? ""); } }).catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; generation.current++; };
  }, [client]); // eslint-disable-line react-hooks/exhaustive-deps
  const locked = busy || !!pending;
  async function choose(file: File | undefined) {
    invalidate(); setUpload(null); setHeaders([]); setMapping({}); setVerify(null); setSheets([]); setSheet(""); setResolutions({}); request.current = null;
    if (!file) return;
    const id = generation.current;
    setBusy(true); setMessage("");
    try {
      if (file.size > 2_000_000 || !/\.(csv|xlsx)$/i.test(file.name)) throw new Error("Choose UTF-8 CSV or XLSX, at most 2,000,000 bytes.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
      const next = { fileName: file.name, bytes: btoa(binary) }, fmt = /\.xlsx$/i.test(file.name) ? "xlsx" : "csv";
      const info = await call({ op: "inspect", bytes: next.bytes, format: fmt, parseSettings: fmt === "csv" ? { format: "csv" } : null });
      if (id !== generation.current) return;
      setUpload(next); setFormat(fmt); setSheets(info.sheets); setSheet(info.sheets?.[0] ?? "");
      setHeaderRow(1); setIntegerId(false);
      if (fmt === "csv") applyHeaders(info.headers);
    } catch (e) { if (id === generation.current) setMessage((e as Error).message); }
    finally { if (id === generation.current) setBusy(false); }
  }
  function applyHeaders(h: string[]) {
    setHeaders(h); setMapping(Object.fromEntries(h.map(x => [x, suggested[x] ?? ""])));
    setVerify(h.includes("CPTID") ? "CPTID" : null);
  }
  async function inspectSheet() {
    if (!upload) return;
    invalidate(); setHeaders([]); setMapping({}); setVerify(null);
    const id = generation.current; setBusy(true); setMessage("");
    try { const info = await call({ op: "inspect", bytes: upload.bytes, format, parseSettings: settings }); if (id === generation.current) applyHeaders(info.headers); }
    catch (e) { if (id === generation.current) setMessage((e as Error).message); }
    finally { if (id === generation.current) setBusy(false); }
  }
  function fileBody() {
    if (!upload) throw new Error("Choose and inspect a file first.");
    request.current ??= crypto.randomUUID().replaceAll("-", "");
    return { ...upload, requestId: request.current, template, sourceDate, actor, parseSettings: settings,
      mapping: { ...mapping, ...(useSourceDate ? { "@source-date": "noteDate" } : {}) }, verifyCptidColumn: verify, noteResolutions: resolutions };
  }
  async function preview() {
    const id = generation.current; setBusy(true); setMessage(""); setExceptions([]);
    try { const j = await call({ op: "preview", file: fileBody() }); if (id === generation.current) { const p = confirmedDirectPreview(j); setPlan(p); setMessage("Review every cell and hold below. No SQL import has occurred."); } }
    catch (e) { if (id === generation.current) { setPlan(null); setExceptions((e as Error & { exceptions?: typeof exceptions }).exceptions ?? []); setMessage((e as Error).message); } }
    finally { if (id === generation.current) setBusy(false); }
  }
  async function commit() {
    if (!plan || !request.current) return;
    const file = fileBody(), original = file.requestId;
    localStorage.setItem(`direct-import-binding:${client}:${original}`, JSON.stringify({ payloadHash: plan.payloadHash, previewHash: plan.previewHash, cells: plan.decisions.length }));
    localStorage.setItem(`direct-import-pending:${client}`, original);
    setPending({ requestId: original, uncertain: true }); setBusy(true); setMessage("Submitting one whole-file transaction. If the reply is lost, check status; do not resend.");
    try {
      const raw = await call({ op: "commit", file, approval: { previewHash: plan.previewHash, expiresAt: plan.expiresAt, proof: plan.proof } });
      const receipt = confirmedDirectReceipt(raw, { client, requestId: original, payloadHash: plan.payloadHash, previewHash: plan.previewHash, cells: plan.decisions.length });
      setPending({ requestId: original, uncertain: false, receipt }); setMessage("Source SQL committed. Current dashboard view has NOT been verified.");
    } catch { setMessage("No success asserted. Keep the original request ID and check status. Do not resend this import."); }
    finally { setBusy(false); }
  }
  async function status() {
    if (!pending) return; setBusy(true);
    try {
      const j = await call({ op: "status", requestId: pending.requestId });
      if (j.status === "committed") {
        const stored = localStorage.getItem(`direct-import-binding:${client}:${pending.requestId}`);
        const expected = stored ? JSON.parse(stored) : {};
        const receipt = confirmedDirectReceipt(j, { ...expected, client, requestId: pending.requestId });
        setPending({ ...pending, uncertain: false, receipt }); setMessage("Original request committed to source SQL. View verification remains separate.");
      } else if (j.protocol === "direct-file-v1" && j.status === "not-found" && j.client === client && j.requestId === pending.requestId)
        setMessage("Not found is NOT rollback proof; request may be in flight. Do not resend.");
      else throw new Error("Invalid source status");
    } catch { setMessage("Status unavailable. Keep original request ID; no success or rollback asserted."); } finally { setBusy(false); }
  }
  async function verifyView() {
    if (!pending?.receipt) return; setBusy(true);
    try { const j = await call({ op: "verifyView", requestId: pending.requestId }); setVerified(j.viewVerified === true); setMessage(j.note); }
    catch { setVerified(false); setMessage("Source SQL receipt retained. Current view unavailable: retry verification only, not import."); } finally { setBusy(false); }
  }
  return <section className="rounded-lg border border-[rgb(var(--line))] bg-white p-5" aria-label="Direct notes and portfolio import">
    <h3 className="font-display text-lg text-[rgb(var(--navy))]">Direct notes + portfolio import</h3>
    <p className="mt-1 text-sm text-[rgb(var(--ink))]/65">One complete file, one preview and one approval. At most 50 mapped write cells including blanks, 500 rows and 2,000,000 bytes. Further audit-storage and safety limits can hold the entire file before writes. Exact client IDs only; no name matching, donor creation or gifts.</p>
    {research && <p role="alert" className="mt-3 text-sm">This source-import action requires the existing research login in addition to dashboard access. <a className="underline" href={`/research/login?next=${encodeURIComponent(`/${client}/data-dashboard?tab=Add%20%2B%20Upload`)}`}>Open research login, then return to this dashboard</a>.</p>}
    {caps && (caps.status !== "known" || !caps.applyEnabled || !caps.templates.length) && <p role="status" className="mt-3 bg-[rgb(var(--paper))] p-3 text-sm">OFF — no approved active template is available. You may inspect a file after research login, but cannot preview or commit an import. No production field ownership has been activated.</p>}
    <fieldset disabled={locked || research} className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">Source template<select className={input} value={template} onChange={e => { invalidate(); setTemplate(e.target.value); }}><option value="">No approved template</option>{caps?.templates.map(t => <option key={t.template}>{t.template}</option>)}</select></label>
        <label className="text-xs">Source date<input className={input} type="date" value={sourceDate} onChange={e => { invalidate(); setSourceDate(e.target.value); }} /></label>
        <label className="text-xs">Declared staff name<input className={input} value={actor} onChange={e => { invalidate(); setActor(e.target.value); }} /></label>
      </div>
      <input aria-label="Direct source file" type="file" accept=".csv,.xlsx" onChange={e => void choose(e.target.files?.[0])} />
      {upload && format === "xlsx" && <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">Worksheet<select className={input} value={sheet} onChange={e => { invalidate(); setHeaders([]); setMapping({}); setSheet(e.target.value); }}>{sheets.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="text-xs">Header row (1–100)<input className={input} type="number" min={1} max={100} value={headerRow} onChange={e => { invalidate(); setHeaders([]); setMapping({}); setHeaderRow(Number(e.target.value)); }} /></label>
        <label className="text-xs">Client-ID source format<select className={input} value={integerId ? "integer" : "text"} onChange={e => { invalidate(); setIntegerId(e.target.value === "integer"); }}><option value="text">Exact text, preserve zeros</option><option value="integer">Declared integer crosswalk (no zero inference)</option></select></label>
        <button type="button" className={button} onClick={inspectSheet}>Inspect chosen sheet + header</button>
      </div>}
      {!!headers.length && <div className="grid gap-2 sm:grid-cols-2">{headers.map(h => <label key={h} className="text-xs">{h || "(blank header — unsupported)"}<select className={input} aria-label={`Map ${h}`} value={mapping[h] ?? ""} onChange={e => { invalidate(); setMapping(m => ({ ...m, [h]: e.target.value })); }}>{targets.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>)}
        <label className="text-xs">Optional supplied CPTID verification<select className={input} value={verify ?? ""} onChange={e => { invalidate(); setVerify(e.target.value === "" ? null : e.target.value); }}><option value="">No supplied verification column</option>{headers.map(h => <option key={h} value={h}>{h}</option>)}</select></label>
      </div>}
      <label className="block text-sm"><input type="checkbox" checked={useSourceDate} onChange={e => { invalidate(); setUseSourceDate(e.target.checked); }} /> Use selected source date {sourceDate || "(choose date)"} as the date for new notes. This does not certify notes as new events.</label>
      <p className="text-xs text-[rgb(var(--ink))]/65">Historical Notes are never appended. Current history is tracking-only, not complete Access history. Each new-note event requires a separate reviewed resolution below. Solicitors without an approved exact alias stay held. This website adapter accepts nonnegative asks up to 9,999,999,999.99 with at most two exact decimal places; larger amounts are held, never rounded.</p>
      <button className={button} disabled={!upload || !headers.length || !template || !caps?.applyEnabled || !sourceDate || !actor} onClick={preview}>Preview complete file</button>
    </fieldset>
    {!!exceptions.length && <div className="mt-4 overflow-x-auto"><p className="text-sm font-semibold">Entire file held — complete gateway exception list</p><table className="w-full text-left text-xs"><tbody>{exceptions.map((e, i) => <tr key={i}><td className="p-2">Row {e.ordinal} (line {e.line})</td><td>{e.source}</td><td>{e.reason}</td></tr>)}</tbody></table></div>}
    {plan && <div className="mt-4 overflow-x-auto">
      <h4 className="font-semibold">Every resulting mapped cell ({plan.decisions.length})</h4>
      <table className="w-full text-left text-xs"><thead><tr>{["Row", "CPTID", "Field", "Before", "After", "Decision"].map(x => <th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{plan.decisions.map((d, i) => <tr key={i} className="border-b border-[rgb(var(--line))]"><td className="p-2">{d.ordinal}</td><td>{d.cptid}</td><td>{d.field}</td><td className="whitespace-pre-wrap p-2">{d.before ?? "(absent)"}</td><td className="whitespace-pre-wrap p-2">{d.after || "(blank: no change)"}</td><td>{d.action} {d.reason}
        {d.field === "note" && d.after && !pending && <label className="mt-2 block"><input type="checkbox" checked={resolutions[String(d.ordinal)] === "new-event"} onChange={e => { const checked = e.target.checked; invalidate(); setResolutions(old => { const next = { ...old }; if (checked) next[String(d.ordinal)] = "new-event"; else delete next[String(d.ordinal)]; return next; }); }} /> I reviewed row {d.ordinal} and confirm this is a distinct new note event. Re-preview required.</label>}
      </td></tr>)}</tbody></table>
      <button className={`${button} mt-3`} disabled={locked} onClick={commit}>Approve this whole-file preview and commit source SQL</button>
    </div>}
    {pending && <div className="mt-4 bg-[rgb(var(--paper))] p-3 text-sm"><p className="break-all">Original request: <strong>{pending.requestId}</strong></p><p>{pending.receipt ? "Source SQL: committed. " : "Source SQL: unknown. "}{verified ? "Current read verified (not a durable publication receipt)." : "Current view: not verified."}</p>
      <div className="mt-2 flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={status}>Check original request status</button>{pending.receipt && <button className={button} disabled={busy} onClick={verifyView}>Retry current-view verification only</button>}{pending.receipt && <button className={button} disabled={busy} onClick={() => { localStorage.setItem(`direct-import-last-reconciled:${client}`, pending.requestId); localStorage.removeItem(`direct-import-pending:${client}`); window.location.reload(); }}>Keep reconciled request ID + reload dashboard</button>}</div>
      <p className="mt-2 text-xs">No automatic resend. Keep this ID if status is unavailable or not found. After reconciliation, reload the dashboard before starting a different file.</p>
    </div>}
    {message && <p role="status" className="mt-3 text-sm whitespace-pre-wrap">{message}</p>}
  </section>;
}
