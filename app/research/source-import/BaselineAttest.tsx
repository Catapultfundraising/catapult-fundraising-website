"use client";

// REVIEW-ONLY baseline attestation packet review. Read-only: it previews how an explicitly attested PRIOR export would
// classify against current data and lets staff download a metadata-only proposal. It cannot save or approve anything.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createScopeFence } from "@/lib/portal-v2/scope-fence";

const label = "text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]";
const input = "mt-1 w-full rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm text-[rgb(var(--navy))] focus:border-[rgb(var(--brass))] focus:outline-none";
const navyBtn = "inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))] disabled:cursor-not-allowed disabled:opacity-50";
const MAX = 2 * 1024 * 1024;
type Ctx = { available: true; configured: boolean; key: string; columns: string[]; personRequired: boolean; linkRequired: boolean } | { available: false; reason: string };
type Plan = { planDigest: string; eligible: number; held: number; reasons: { reason: string; count: number }[] };

async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/research-source-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Request failed");
  return j;
}
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

export default function BaselineAttest({ client, table }: { client: string; table: string }) {
  const fence = useRef(createScopeFence()).current;
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [f, setF] = useState({ personHeader: "", linkHeader: "", sourceDate: "", attestedBy: "", attestedAt: "", reference: "", provenanceStatement: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ plan: Plan; priorRows: number; fileSha256: string; export: string } | null>(null);
  const ridSeq = useRef(0); const [rid, setRid] = useState(""); const [statusMsg, setStatusMsg] = useState(""); const [stBusy, setStBusy] = useState(false);
  /** any scope/input change: bump the fence and drop the previous plan (it no longer describes the inputs) */
  const invalidate = () => { fence.bump(); setRes(null); setErr(""); setBusy(false); };

  useEffect(() => {
    if (!table) return;
    const tk = fence.token();
    call({ op: "baselineContext", client, table }).then((j) => tk.run(() => setCtx(j as Ctx))).catch((e) => tk.run(() => setErr((e as Error).message)));
    return () => fence.bump();
  }, [client, table, fence]);

  const onFile = async (el: HTMLInputElement) => {
    const fl = el.files?.[0]; el.value = "";
    invalidate(); setFile(null); setHeaders([]); setMapping({}); setF((x) => ({ ...x, personHeader: "", linkHeader: "" }));
    if (!fl) return;
    if (fl.size > MAX) { setErr("Choose a CSV file of 2 MB or smaller"); return; }
    const tk = fence.token(); setBusy(true);
    try {
      const buf = new Uint8Array(await fl.arrayBuffer()); if (!tk.live()) return;
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
      const j = await call({ op: "inspect", client, table, csv: text }); if (!tk.live()) return;
      setFile({ name: fl.name, bytes: buf }); setHeaders(j.headers);
    } catch (e) { if (tk.live()) setErr(e instanceof TypeError ? "File must be UTF-8 text" : (e as Error).message); }
    finally { if (tk.live()) setBusy(false); }
  };

  const preview = async () => {
    if (!file || busy) return;
    const tk = fence.token(); setBusy(true); setErr(""); setRes(null);
    try {
      const draft = { client, table, fileName: file.name, mapping: Object.fromEntries(Object.entries(mapping).filter(([, v]) => v)), confirmed, ...f };
      const j = await call({ op: "baselinePreview", client, table, fileB64: b64(file.bytes), draft }); if (!tk.live()) return;
      setRes(j);
    } catch (e) { if (tk.live()) setErr((e as Error).message); }
    finally { if (tk.live()) setBusy(false); }
  };

  const download = () => {
    if (!res) return;
    const url = URL.createObjectURL(new Blob([res.export], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `baseline-proposal-${client}-${table}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const checkStatus = async () => {
    const tk = fence.token(); const seq = ridSeq.current; const live = () => tk.live() && seq === ridSeq.current; setStBusy(true); setStatusMsg("");
    try { const j = await call({ op: "baselineStatus", client, table, requestId: rid.trim() }); if (live()) setStatusMsg(j.message); }
    catch (e) { if (live()) setStatusMsg(`Status unavailable (${(e as Error).message}); still unconfirmed.`); }
    finally { if (tk.live()) setStBusy(false); }
  };

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); invalidate(); };
  const ready = ctx?.available && file && confirmed;
  return (
    <details className="mt-8 rounded-2xl border border-[rgb(var(--line))] bg-white p-5" data-testid="baseline-attest">
      <summary className="cursor-pointer font-serif text-lg text-[rgb(var(--navy))]">Baseline attestation (review only)</summary>
      <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">For existing clients with no saved baseline. Upload the prior source export that was originally loaded into this table to see which values could be recorded as source-owned. Values count only where the prior export exactly matches current data. This is a proposal: nothing is saved or approved here.</p>
      {!table ? <p className="mt-3 text-sm">Choose a client and table above.</p> : ctx && !ctx.available ? <p className="mt-3 text-sm text-[rgb(var(--navy))]">Not available for this table: {ctx.reason}</p> : ctx?.available ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {!ctx.configured && <p className="text-sm text-[rgb(var(--navy))] md:col-span-2">Live comparison is not configured, so preview will be refused. Packet checks still run.</p>}
          <label className="block"><span className={label}>Prior source export (CSV)</span><input type="file" accept=".csv,text/csv" aria-label="Prior source export" className={input} disabled={busy} onChange={(e) => { void onFile(e.currentTarget); }} /></label>
          <label className="block"><span className={label}>Source export date</span><input className={input} placeholder="YYYY-MM-DD" value={f.sourceDate} disabled={busy} onChange={set("sourceDate")} /></label>
          {headers.length > 0 && (
            <div className="md:col-span-2">
              <span className={label}>Columns ({ctx.key} key required)</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {headers.map((h) => (
                  <label key={h} className="block text-sm"><span className="text-[rgb(var(--navy))]">{h}</span>
                    <select className={input} aria-label={`Map ${h}`} disabled={busy || h === f.personHeader || h === f.linkHeader} value={mapping[h] ?? ""} onChange={(e) => { setMapping({ ...mapping, [h]: e.target.value }); invalidate(); }}>
                      <option value="">Not used</option>{ctx.columns.map((c) => <option key={c} value={c}>{c}{c === ctx.key ? " (key)" : ""}</option>)}
                    </select></label>))}
              </div>
            </div>)}
          {headers.length > 0 && ctx.personRequired && <label className="block"><span className={label}>Person CPTID column</span><select className={input} aria-label="Person CPTID column" disabled={busy} value={f.personHeader} onChange={set("personHeader")}><option value="">Choose</option>{headers.filter((h) => !mapping[h]).map((h) => <option key={h}>{h}</option>)}</select></label>}
          {headers.length > 0 && ctx.linkRequired && <label className="block"><span className={label}>Source link column</span><select className={input} aria-label="Source link column" disabled={busy} value={f.linkHeader} onChange={set("linkHeader")}><option value="">Choose</option>{headers.filter((h) => !mapping[h]).map((h) => <option key={h}>{h}</option>)}</select></label>}
          <label className="block md:col-span-2"><span className={label}>Provenance statement</span><textarea className={input} rows={2} disabled={busy} value={f.provenanceStatement} onChange={set("provenanceStatement")} placeholder="Must state that this prior source export is the file originally loaded into this table" /></label>
          <label className="block"><span className={label}>Attested by (as stated)</span><input className={input} disabled={busy} value={f.attestedBy} onChange={set("attestedBy")} /></label>
          <label className="block"><span className={label}>Attestation time (UTC)</span><input className={input} placeholder="YYYY-MM-DDTHH:MM:SSZ" disabled={busy} value={f.attestedAt} onChange={set("attestedAt")} /></label>
          <label className="block"><span className={label}>Reference</span><input className={input} placeholder="ticket or document id" disabled={busy} value={f.reference} onChange={set("reference")} /></label>
          <label className="flex items-start gap-2 text-sm text-[rgb(var(--navy))] md:col-span-2"><input type="checkbox" className="mt-1" disabled={busy} checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); invalidate(); }} />I confirm this exact file is the prior export originally loaded into this table. Unknown provenance must not be attested.</label>
          <div className="md:col-span-2"><button type="button" className={navyBtn} disabled={busy || !ready} onClick={() => { void preview(); }}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Preview attestation</button></div>
        </div>) : null}
      {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
      {res && (
        <div className="mt-4 text-sm text-[rgb(var(--navy))]" data-testid="baseline-plan">
          <p>{res.priorRows} prior rows. <b>{res.plan.eligible}</b> values eligible, <b>{res.plan.held}</b> held. Proposed only; nothing saved.</p>
          {res.plan.reasons.length > 0 && <ul className="mt-2 list-disc pl-5">{res.plan.reasons.map((r) => <li key={r.reason}>{r.reason}: {r.count}</li>)}</ul>}
          <p className="mt-2 break-all text-xs text-[rgb(var(--ink))]/60">File SHA-256 {res.fileSha256}. Plan digest {res.plan.planDigest}.</p>
          <button type="button" className="mt-2 font-semibold text-[rgb(var(--brass))] underline" onClick={download}>Download proposal (metadata only)</button>
        </div>)}
      {table && ctx?.available && (
        <div className="mt-5 flex flex-wrap items-end gap-2 text-sm">
          <label className="block"><span className={label}>Attestation request id</span><input className={input} aria-label="Attestation request id" value={rid} onChange={(e) => { ridSeq.current++; setRid(e.target.value); setStatusMsg(""); }} /></label>
          <button type="button" className="font-semibold text-[rgb(var(--brass))] underline disabled:opacity-50" disabled={stBusy || !/^[a-f0-9]{32}$/.test(rid.trim())} onClick={() => { void checkStatus(); }}>Check status</button>
          {statusMsg && <p role="status" className="w-full text-[rgb(var(--navy))]">{statusMsg}</p>}
        </div>)}
    </details>
  );
}
