"use client";

// REVIEW-ONLY provisional gift-ID preview for JAG gift history (no Transaction column in the latest export).
// Local staging only: nothing is looked up, recorded, reserved or saved. Every row stays HELD. Provisional IDs are
// not identities. A new preview invalidates the previous state in THIS browser only.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createScopeFence } from "@/lib/portal-v2/scope-fence";

const label = "text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]";
const input = "mt-1 w-full rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm text-[rgb(var(--navy))] focus:border-[rgb(var(--brass))] focus:outline-none";
const navyBtn = "inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))] disabled:cursor-not-allowed disabled:opacity-50";
const MAX = 2 * 1024 * 1024;
type Decision = "held" | "proposed-new" | "proposed-existing";
type Row = { ordinal: number; line: number; pid: string; cptid: string; cptidStatus: string; values: Record<string, string>; reasons: string[] };
type Stage = { token: string; fileSha256: string; expiresAt: string; rows: Row[]; counts: { rows: number; held: number; proposedNew: number; reasons: Record<string, number> } };

async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/research-source-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Request failed");
  return j;
}
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const save = (text: string, name: string, type: string) => { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0); };

export default function GiftPreview({ client, table }: { client: string; table: string }) {
  const fence = useRef(createScopeFence()).current;
  const [cols, setCols] = useState<string[]>([]);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [stage, setStage] = useState<Stage | null>(null);
  const [dec, setDec] = useState<Decision[]>([]);
  const [page, setPage] = useState(0); const [size, setSize] = useState(25);
  const [note, setNote] = useState("");
  /** any scope/input change: fence old async work and drop the preview (it no longer describes the inputs) */
  const invalidate = () => { fence.bump(); setStage(null); setDec([]); setErr(""); setNote(""); setBusy(false); setPage(0); };

  useEffect(() => {
    const tk = fence.token();
    call({ op: "giftContext", client, table }).then((j) => tk.run(() => setCols(j.columns))).catch((e) => tk.run(() => setErr((e as Error).message)));
    return () => fence.bump();
  }, [client, table, fence]);

  const onFile = async (el: HTMLInputElement) => {
    const fl = el.files?.[0]; el.value = "";
    invalidate(); setFile(null); setHeaders([]); setMapping({});
    if (!fl) return;
    if (fl.size > MAX) { setErr("Choose a CSV file of 2 MB or smaller"); return; }
    const tk = fence.token(); setBusy(true);
    try {
      const buf = new Uint8Array(await fl.arrayBuffer()); if (!tk.live()) return;
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
      const j = await call({ op: "inspect", client, table, csv: text }); if (!tk.live()) return;
      setFile({ name: fl.name, bytes: buf }); setHeaders(j.headers);
      const m: Record<string, string> = {}; for (const h of j.headers as string[]) if ((j.headers as string[]).length && cols.includes(h)) m[h] = h; setMapping(m);
    } catch (e) { if (tk.live()) setErr(e instanceof TypeError ? "File must be UTF-8 text" : (e as Error).message); }
    finally { if (tk.live()) setBusy(false); }
  };

  const preview = async () => {
    if (!file || busy) return;
    invalidate(); const tk = fence.token(); setBusy(true);
    try {
      const j = await call({ op: "giftStage", client, table, fileB64: b64(file.bytes), mapping }) as Stage; if (!tk.live()) return;
      setStage(j); setDec(j.rows.map(() => "held"));
    } catch (e) { if (tk.live()) setErr((e as Error).message); }
    finally { if (tk.live()) setBusy(false); }
  };

  const exportCopy = async () => {
    if (!file || !stage || busy) return;
    const tk = fence.token(); setBusy(true); setNote("");
    try {
      const j = await call({ op: "giftExport", client, table, fileB64: b64(file.bytes), mapping, decisions: dec, token: stage.token, fileName: file.name }); if (!tk.live()) return;
      save(j.csv, j.fileName, "text/csv"); save(j.sidecar, j.sidecarName, "application/json");
      setNote(`Review copy downloaded (${j.escapedCells} formula-like cells prefixed with an apostrophe). Not exact, not reimport-safe; nothing recorded.`);
    } catch (e) { if (tk.live()) setErr((e as Error).message); }
    finally { if (tk.live()) setBusy(false); }
  };

  const mapped = Object.values(mapping).filter(Boolean);
  const rows = stage ? stage.rows.slice(page * size, page * size + size) : [];
  const pages = stage ? Math.max(1, Math.ceil(stage.rows.length / size)) : 1;
  const proposals = dec.reduce((a, d) => ({ ...a, [d]: (a[d] ?? 0) + 1 }), {} as Record<string, number>);
  return (
    <details className="mt-8 rounded-2xl border border-[rgb(var(--line))] bg-white p-5" data-testid="gift-preview">
      <summary className="cursor-pointer font-serif text-lg text-[rgb(var(--navy))]">Provisional gift IDs (preview only)</summary>
      <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">For JAG gift history exports without a Transaction column. Stages the file in this browser session only. Donors, gift history and ownership are <b>not checked</b>; every row stays held pending reconciliation. Provisional preview IDs are not gift identities: a new preview gives new IDs, and they must not be stored, sent back or reused. Nothing is recorded or saved.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block"><span className={label}>Gift history export (CSV)</span><input type="file" accept=".csv,text/csv" aria-label="Gift history export" className={input} disabled={busy} onChange={(e) => { void onFile(e.currentTarget); }} /></label>
        {headers.length > 0 && (
          <div className="md:col-span-2">
            <span className={label}>Columns (CPTID required; checked for format only)</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h) => (
                <label key={h} className="block text-sm"><span className="text-[rgb(var(--navy))]">{h}</span>
                  <select className={input} aria-label={`Map ${h}`} disabled={busy} value={mapping[h] ?? ""} onChange={(e) => { setMapping({ ...mapping, [h]: e.target.value }); invalidate(); }}>
                    <option value="">Not used</option>{cols.map((c) => <option key={c} value={c} disabled={c !== mapping[h] && mapped.includes(c)}>{c}</option>)}
                  </select></label>))}
            </div>
          </div>)}
        {file && <div className="md:col-span-2"><button type="button" className={navyBtn} disabled={busy || !mapped.includes("CPTID")} onClick={() => { void preview(); }}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Preview provisional IDs</button></div>}
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
      {stage && (
        <div className="mt-4 text-sm text-[rgb(var(--navy))]" data-testid="gift-stage">
          <p><b>{stage.counts.rows}</b> rows, <b>{stage.counts.held}</b> held pending reconciliation. Proposals (not recorded): {proposals["proposed-new"] ?? 0} new, {proposals["proposed-existing"] ?? 0} existing.</p>
          <ul className="mt-2 list-disc pl-5">{Object.entries(stage.counts.reasons).map(([r, n]) => <li key={r}>{r}: {n}</li>)}</ul>
          <p className="mt-2 break-all text-xs text-[rgb(var(--ink))]/60">File SHA-256 {stage.fileSha256}. Session expires {stage.expiresAt}; a new preview replaces it in this browser.</p>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead><tr className="text-xs uppercase text-[rgb(var(--ink))]/60"><th className="px-3 py-2">Line</th><th className="px-3 py-2">Provisional preview ID</th><th className="px-3 py-2">CPTID (format only)</th><th className="px-3 py-2">Values</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Proposal (not recorded)</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.ordinal} className="border-t border-[rgb(var(--line))] align-top">
              <td className="px-3 py-2">{r.line}</td><td className="px-3 py-2 font-mono text-xs">{r.pid}</td><td className="px-3 py-2">{r.cptid || "—"}<span className="block text-xs text-[rgb(var(--ink))]/60">{r.cptidStatus}</span></td>
              <td className="px-3 py-2 text-xs">{Object.entries(r.values).filter(([c]) => c !== "CPTID").map(([c, v]) => <div key={c}><b>{c}</b>: {v || "∅"}</div>)}</td>
              <td className="px-3 py-2 font-semibold">HELD<span className="block text-xs font-normal text-[rgb(var(--ink))]/60">{r.reasons.join("; ")}</span></td>
              <td className="px-3 py-2"><select className={input} aria-label={`Proposal line ${r.line}`} disabled={busy} value={dec[r.ordinal]} onChange={(e) => { const d = [...dec]; d[r.ordinal] = e.target.value as Decision; setDec(d); setNote(""); }}>
                <option value="held">Held</option><option value="proposed-new">Proposed new (unverified)</option><option value="proposed-existing">Proposed existing (unverified)</option></select></td></tr>)}</tbody></table></div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className="font-semibold text-[rgb(var(--brass))] underline disabled:opacity-50" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page + 1} of {pages}</span>
            <button type="button" className="font-semibold text-[rgb(var(--brass))] underline disabled:opacity-50" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
            <label className="text-sm">Rows per page <select aria-label="Rows per page" className="rounded border border-[rgb(var(--line))] px-2 py-1" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}><option>25</option><option>50</option></select></label>
          </div>
          <button type="button" className={`${navyBtn} mt-4`} disabled={busy} onClick={() => { void exportCopy(); }}>Download review copy + metadata</button>
          <p className="mt-2 text-xs text-[rgb(var(--ink))]/60">The original file is unchanged. The review copy adds provisional columns and escapes formula-like cells, so it is not exact and must not be re-imported.</p>
          {note && <p role="status" className="mt-2">{note}</p>}
        </div>)}
    </details>
  );
}
