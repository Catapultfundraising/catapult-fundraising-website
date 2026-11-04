"use client";

// REVIEW-ONLY gift baseline attestation preview (D). Read-only: previews which values of the ORIGINAL source export could be
// recorded as source-owned baselines for already-registered gift IDs, and offers a metadata-only proposal download.
// There is NO save/apply here. A status lookup stays available whenever the transport is configured, even if the
// registration is later removed. Nothing is stored in the browser.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createScopeFence } from "@/lib/portal-v2/scope-fence";
import { parseCsv } from "@/lib/portal-v2/csv-parse";
import { validateAttestContext, validateAttestPlan, validateAttestStatusOut, validateAttestExport, STATUS_TEXT, type AttestContext, type ValidPlan } from "@/lib/portal-v2/gift-attest";

const label = "text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]";
const input = "mt-1 w-full rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm text-[rgb(var(--navy))] focus:border-[rgb(var(--brass))] focus:outline-none";
const navyBtn = "inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))] disabled:cursor-not-allowed disabled:opacity-50";
const PAGE = 25;
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/research-source-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: (j && typeof j === "object" ? j : {}) as Record<string, unknown> };
}

export default function GiftAttest({ client, table, locked }: { client: string; table: string; locked: boolean }) {
  const fence = useRef(createScopeFence()).current;
  const [ctx, setCtx] = useState<AttestContext | null>(null);
  const [file, setFile] = useState<{ bytes: Uint8Array; headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [f, setF] = useState({ from: "", to: "", sourceDate: "", statement: "", approvedBy: "", approvedAt: "", approvalRef: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ plan: ValidPlan; fileSha256: string; export: string } | null>(null);
  const [page, setPage] = useState(0);
  const stSeq = useRef(0); const [rid, setRid] = useState(""); const [stMsg, setStMsg] = useState(""); const [stBusy, setStBusy] = useState(false);
  const invalidate = () => { fence.bump(); setRes(null); setErr(""); setBusy(false); setPage(0); };

  useEffect(() => {
    if (!client || !table) return;
    const tk = fence.token();
    setCtx(null); setFile(null); setMapping({}); setRes(null);
    call({ op: "durableGiftAttestContext", client, table }).then((r) => tk.run(() => setCtx(r.ok ? validateAttestContext(r.j) : { available: false, lookupAvailable: false }))).catch(() => tk.run(() => setCtx({ available: false, lookupAvailable: false })));
    return () => { fence.bump(); stSeq.current++; };
  }, [client, table, fence]);

  const onFile = async (el: HTMLInputElement) => {
    const fl = el.files?.[0]; el.value = "";
    invalidate(); setFile(null); setMapping({});
    if (!fl || !ctx?.available) return;
    if (fl.size > ctx.maxFileBytes) { setErr("Choose the original CSV export (2.8 MB or smaller)"); return; }
    const tk = fence.token(); setBusy(true);
    try {
      const buf = new Uint8Array(await tk.guard(fl.arrayBuffer()));
      const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buf);
      const grid = parseCsv(text); if (grid.length < 2) throw new Error("CSV needs a header and at least one row");
      tk.run(() => setFile({ bytes: buf, headers: grid[0], rows: grid.slice(1) }));
    } catch (e) { if (tk.live()) setErr(e instanceof TypeError ? "File must be UTF-8 text" : (e as Error).message || "Unreadable file"); }
    finally { if (tk.live()) setBusy(false); }
  };

  const mappedCols = Object.values(mapping).filter((v) => v && v !== "@person");
  const cap = ctx?.available ? ctx.capsByMappedCount[mappedCols.length - 1] ?? 0 : 0;
  const preview = async () => {
    if (!file || busy || locked || !ctx?.available) return;
    const tk = fence.token(); setBusy(true); setErr(""); setRes(null);
    try {
      const from = Number(f.from) - 1, to = Number(f.to) - 1;
      const mp = Object.fromEntries(Object.entries(mapping).filter(([, v]) => v));
      const draft = { mapping: mp, ordinalFrom: from, ordinalTo: to, sourceDate: f.sourceDate, statement: f.statement, approvedBy: f.approvedBy, approvedAt: f.approvedAt, approvalRef: f.approvalRef, confirmed };
      const r = await tk.guard(call({ op: "durableGiftAttestPreview", client, table, fileB64: b64(file.bytes), draft }));
      if (!r.ok) throw new Error(typeof r.j.error === "string" ? r.j.error : "Preview failed; nothing was saved.");
      const hIdx = new Map(Object.entries(mp).filter(([, c]) => c !== "@person").map(([h, c]) => [c, file.headers.indexOf(h)]));
      const pi = file.headers.indexOf(Object.entries(mp).find(([, c]) => c === "@person")?.[0] ?? "");
      const plan = validateAttestPlan(r.j.plan, { from, to, mapped: mappedCols, cell: (o, c) => file.rows[o][hIdx.get(c)!], donor: (o) => (pi < 0 ? "" : file.rows[o][pi]) });
      const d = await tk.guard(crypto.subtle.digest("SHA-256", file.bytes as unknown as ArrayBuffer));
      const localSha = Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
      if (r.j.fileSha256 !== localSha || !validateAttestExport(r.j.export, { client, table, registrationId: ctx.registrationId, registrationVersion: ctx.registrationVersion, mapping: mp, fileSha256: localSha, sourceDate: f.sourceDate, statement: f.statement, approvedBy: f.approvedBy, approvedAt: f.approvedAt, approvalRef: f.approvalRef, ordinalFrom: from, ordinalTo: to, plan }))
        throw new Error("Engage returned a preview that failed validation; nothing was saved. Try again or report it.");
      tk.run(() => setRes({ plan, fileSha256: r.j.fileSha256 as string, export: r.j.export as string }));
    } catch (e) { if (tk.live()) setErr((e as Error).message || "Preview failed; nothing was saved."); }
    finally { if (tk.live()) setBusy(false); }
  };
  const download = () => {
    if (!res) return;
    const url = URL.createObjectURL(new Blob([res.export], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `gift-attest-proposal-${client}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const checkStatus = async () => {
    const id = rid.trim(); const my = ++stSeq.current; const live = () => my === stSeq.current; setStBusy(true); setStMsg("");
    try {
      const r = await call({ op: "durableGiftAttestStatus", client, table, requestId: id }); if (!live()) return;
      const v = r.ok ? validateAttestStatusOut(r.j, id, client, table) : null;
      setStMsg(!v ? STATUS_TEXT.unavailable : v.state === "committed" ? `${STATUS_TEXT.committed} ${v.result.counts.values} values for ${v.result.counts.records} gifts; plan ${v.result.planDigest.slice(0, 12)}…, reference ${v.result.approvalRef}, source export ${v.result.priorSourceDate}.` : STATUS_TEXT[v.state]);
    } catch { if (live()) setStMsg(STATUS_TEXT.unavailable); }
    finally { if (live()) setStBusy(false); }
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); invalidate(); };

  if (!table || !ctx || (!ctx.available && !ctx.lookupAvailable)) return null;
  const dis = busy || locked;
  const shown = res ? res.plan.byOrdinal.slice(page * PAGE, page * PAGE + PAGE) : [];
  return (
    <details className="mt-8 rounded-2xl border border-[rgb(var(--line))] bg-white p-5" data-testid="gift-attest">
      <summary className="cursor-pointer font-serif text-lg text-[rgb(var(--navy))]">Gift baseline attestation (review only)</summary>
      {ctx.available ? (<>
        <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">For gifts that already have a Catapult Gift ID. Upload the source export that was originally loaded into the raw gift table to see which values could be recorded as source-owned. Preview only: applying needs a separate reviewed approval and is not available here.</p>
        {locked && <p className="mt-2 text-sm text-[rgb(var(--navy))]">Finish or check the gift ID job above first.</p>}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2"><span className={label}>Original source export (CSV)</span><input type="file" accept=".csv,text/csv" aria-label="Original source export" className={input} disabled={dis} onChange={(e) => { void onFile(e.currentTarget); }} /></label>
          {file && (<div className="md:col-span-2"><span className={label}>Columns</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{file.headers.map((h) => (
              <label key={h} className="block text-sm"><span className="text-[rgb(var(--navy))]">{h || "(blank header)"}</span>
                <select className={input} aria-label={`Attest map ${h}`} disabled={dis || h.trim() === ""} value={mapping[h] ?? ""} onChange={(e) => { setMapping({ ...mapping, [h]: e.target.value }); invalidate(); }}>
                  <option value="">Not used</option><option value="@person">Donor CPTID</option>{ctx.columns.map((c) => <option key={c.col} value={c.col}>{c.col}</option>)}
                </select></label>))}</div></div>)}
          <label className="block"><span className={label}>From row</span><input className={input} inputMode="numeric" aria-label="From row" disabled={dis} value={f.from} onChange={set("from")} /></label>
          <label className="block"><span className={label}>To row {cap ? `(at most ${cap} rows)` : ""}</span><input className={input} inputMode="numeric" aria-label="To row" disabled={dis} value={f.to} onChange={set("to")} /></label>
          <label className="block"><span className={label}>Source export date</span><input className={input} placeholder="YYYY-MM-DD" aria-label="Source export date" disabled={dis} value={f.sourceDate} onChange={set("sourceDate")} /></label>
          <label className="block"><span className={label}>Reference</span><input className={input} aria-label="Reference" placeholder="ticket or document id" disabled={dis} value={f.approvalRef} onChange={set("approvalRef")} /></label>
          <label className="block md:col-span-2"><span className={label}>Provenance statement</span><textarea className={input} rows={2} aria-label="Provenance statement" disabled={dis} value={f.statement} onChange={set("statement")} placeholder="Must say this prior source export is the file originally loaded into the raw gift table" /></label>
          <label className="block"><span className={label}>Attested by (as stated)</span><input className={input} aria-label="Attested by" disabled={dis} value={f.approvedBy} onChange={set("approvedBy")} /></label>
          <label className="block"><span className={label}>Attestation time (UTC)</span><input className={input} aria-label="Attestation time" placeholder="YYYY-MM-DDTHH:MM:SSZ" disabled={dis} value={f.approvedAt} onChange={set("approvedAt")} /></label>
          <label className="flex items-start gap-2 text-sm text-[rgb(var(--navy))] md:col-span-2"><input type="checkbox" className="mt-1" aria-label="Confirm original export" disabled={dis} checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); invalidate(); }} />This exact file is the export originally loaded into the raw gift table.</label>
          <div className="md:col-span-2"><button type="button" className={navyBtn} disabled={dis || !file || !confirmed} onClick={() => { void preview(); }}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Preview attestation</button></div>
        </div>
        {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
        {res && (
          <div className="mt-4 text-sm text-[rgb(var(--navy))]" data-testid="gift-attest-plan">
            <p>{res.plan.byOrdinal.length} rows checked. <b>{res.plan.counts.eligible}</b> values eligible, <b>{res.plan.counts.held}</b> held, {res.plan.counts.outOfScopeAssociated} associated rows outside this range. Proposed only; nothing saved.</p>
            <div className="mt-3 overflow-x-auto" data-testid="gift-attest-rows"><table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="text-xs uppercase text-[rgb(var(--ink))]/60"><th className="px-3 py-2">Row</th><th className="px-3 py-2">Catapult Gift ID</th><th className="px-3 py-2">Eligible columns</th><th className="px-3 py-2">Held</th></tr></thead>
              <tbody>{shown.map((x) => (<tr key={x.o} className="border-t border-[rgb(var(--line))] align-top">
                <td className="px-3 py-2">{x.o + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">{x.kind === "covered" ? x.giftId : "—"}</td>
                <td className="px-3 py-2">{x.kind === "covered" && x.eligible.length ? x.eligible.join(", ") : "—"}</td>
                <td className="px-3 py-2 text-red-700">{x.kind === "held" ? `held: ${x.reason}` : x.colHolds.map((h) => `${h.col}: ${h.reason}`).join("; ")}</td>
              </tr>))}</tbody></table></div>
            <div className="mt-2 flex gap-3 text-xs"><button type="button" className="font-semibold text-[rgb(var(--brass))] underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous rows</button><span>Page {page + 1} of {Math.max(1, Math.ceil(res.plan.byOrdinal.length / PAGE))}</span><button type="button" className="font-semibold text-[rgb(var(--brass))] underline disabled:opacity-40" disabled={(page + 1) * PAGE >= res.plan.byOrdinal.length} onClick={() => setPage(page + 1)}>Next rows</button></div>
            <p className="mt-2 break-all text-xs text-[rgb(var(--ink))]/60">File SHA-256 {res.fileSha256}. Plan digest {res.plan.planDigest}.</p>
            <button type="button" className="mt-2 font-semibold text-[rgb(var(--brass))] underline" onClick={download}>Download proposal (metadata only)</button>
          </div>)}
      </>) : <p className="mt-2 text-sm text-[rgb(var(--ink))]/70" data-testid="gift-attest-lookup-only">Preview is not available for this table. You can still look up an attestation request.</p>}
      {ctx.lookupAvailable && (
        <div className="mt-5 flex flex-wrap items-end gap-2 text-sm">
          <label className="block"><span className={label}>Attestation request id</span><input className={input} aria-label="Gift attestation request id" value={rid} onChange={(e) => { stSeq.current++; setStBusy(false); setStMsg(""); setRid(e.target.value); }} /></label>
          <button type="button" className="font-semibold text-[rgb(var(--brass))] underline disabled:opacity-50" disabled={stBusy || !/^[a-f0-9]{32}$/.test(rid.trim())} onClick={() => { void checkStatus(); }}>Check status</button>
          {stMsg && <p role="status" className="w-full text-[rgb(var(--navy))]">{stMsg}</p>}
        </div>)}
    </details>
  );
}
