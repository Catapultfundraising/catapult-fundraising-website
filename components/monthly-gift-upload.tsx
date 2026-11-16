"use client";
import { useEffect, useRef, useState } from "react";
import { confirmedMonthlyPlan, confirmedMonthlyReceipt, monthlyId, type MonthlyPlan, type MonthlyReceipt } from "@/lib/portal-v2/monthly-wire";
import type { MonthlyFile } from "@/lib/portal-v2/monthly-file.server";
import type { ParseSettings } from "@/lib/portal-v2/source-file-preview";
const input = "rounded border border-[rgb(var(--line))] px-3 py-2 text-sm";
const button = "rounded bg-[rgb(var(--navy))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
const options = ["clientId", "transactionId", "amount", "date", "donorName", "note", "cptid", "kind", "status", "currency"];
const labels: Record<string, string> = { clientId: "Exact client ID", transactionId: "Source transaction ID", amount: "Received amount (USD)", date: "Transaction date", donorName: "Donor name", note: "Note", cptid: "CPTID verification", kind: "Gift/type", status: "Payment status", currency: "Currency" };
const aliases: Record<string, string> = { clientid: "clientId", constituentid: "clientId", donorid: "clientId", transactionid: "transactionId", receiptid: "transactionId", amount: "amount", giftamount: "amount", date: "date", giftdate: "date", transactiondate: "date", donorname: "donorName", name: "donorName", note: "note", cptid: "cptid", type: "kind", kind: "kind", gifttype: "kind", transactiontype: "kind", status: "status", transactionstatus: "status", currency: "currency", currencycode: "currency" };
type Pending = { requestId: string; payloadHash: string; rows: number };
/** Small shared card inside all five existing employee dashboards. */
export function MonthlyGiftUpload({ client, refresh }: { client: string; refresh(): Promise<void> }) {
  const [upload, setUpload] = useState<{ bytes: string; fileName: string } | null>(null), [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [headers, setHeaders] = useState<string[]>([]), [sheets, setSheets] = useState<string[]>([]), [sheet, setSheet] = useState(""), [headerRow, setHeaderRow] = useState(1);
  const [mapping, setMapping] = useState<Record<string, string>>({}), [integerId, setIntegerId] = useState(false), [dateSystem, setDateSystem] = useState<MonthlyFile["dateSystem"]>("iso");
  const [source, setSource] = useState(""), [sourceDate, setSourceDate] = useState(""), [period, setPeriod] = useState(""), [actor, setActor] = useState("");
  const [campaignOnly, setCampaignOnly] = useState(false), [cash, setCash] = useState(false), [approve, setApprove] = useState(false);
  const [plan, setPlan] = useState<MonthlyPlan | null>(null), [review, setReview] = useState<Record<string, unknown> | null>(null), [pending, setPending] = useState<Pending | null>(null), [receipt, setReceipt] = useState<MonthlyReceipt | null>(null);
  const [message, setMessage] = useState(""), [exceptions, setExceptions] = useState<{ row: number; reason: string }[]>([]), [busy, setBusy] = useState(false), [login, setLogin] = useState(false);
  const generation = useRef(0), requestId = useRef<string | null>(null), api = `/api/${client}-data-monthly-import`;
  const locked = busy || !!pending;
  const settings: ParseSettings = format === "csv" ? { format: "csv" } : { format: "xlsx", sheet, headerRow, clientIdFormat: integerId ? "integer" : "text" };
  const storage = `monthly-campaign-pending:${client}`;
  function invalidate() { generation.current++; requestId.current = null; setPlan(null); setReview(null); setApprove(false); setExceptions([]); }
  async function call(body: unknown) {
    const response = await fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (response.status === 401) setLogin(true);
    if (!response.ok) {
      const error = new Error(data.error || "Monthly import unavailable") as Error & { exceptions?: typeof exceptions; unsentId?: string };
      error.exceptions = data.exceptions;
      if (data.stage === "website-before-submission" && data.unconfirmed === false && monthlyId(data.requestId)) error.unsentId = data.requestId;
      throw error;
    }
    return data;
  }
  useEffect(() => {
    const saved = localStorage.getItem(storage);
    if (saved) try { const p = JSON.parse(saved); if (monthlyId(p.requestId) && /^[a-f0-9]{64}$/.test(p.payloadHash) && Number.isInteger(p.rows) && p.rows > 0 && p.rows <= 1000) { setPending(p); requestId.current = p.requestId; } } catch { /* malformed browser state never grants approval */ }
    return () => { generation.current++; };
  }, [storage]);
  function applyHeaders(h: string[]) {
    const used = new Set<string>();
    setHeaders(h); setMapping(Object.fromEntries(h.map(header => { const target = aliases[header.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? ""; const unique = !used.has(target) ? target : ""; used.add(target); return [header, unique]; })));
  }
  async function choose(file?: File) {
    invalidate(); setUpload(null); setHeaders([]); setMapping({}); setSheets([]); setSheet(""); setHeaderRow(1); setIntegerId(false); setDateSystem("iso");
    if (!file) return; const token = generation.current; setBusy(true); setMessage("");
    try {
      if (!/\.(csv|xlsx)$/i.test(file.name) || file.size > 2_000_000) throw new Error("Choose CSV/XLSX up to2,000,000 original bytes.");
      let binary = ""; for (const byte of new Uint8Array(await file.arrayBuffer())) binary += String.fromCharCode(byte);
      const next = { bytes: btoa(binary), fileName: file.name }, f = /\.xlsx$/i.test(file.name) ? "xlsx" : "csv";
      const info = await call({ op: "inspect", bytes: next.bytes, format: f, parseSettings: f === "csv" ? { format: "csv" } : null });
      if (token !== generation.current) return;
      setUpload(next); setFormat(f); setSheets(info.sheets ?? []); setSheet(info.sheets?.[0] ?? ""); if (f === "csv") applyHeaders(info.headers);
    } catch (e) { if (token === generation.current) setMessage((e as Error).message); }
    finally { if (token === generation.current) setBusy(false); }
  }
  async function inspect() {
    if (!upload) return; invalidate(); setHeaders([]); setMapping({}); const token = generation.current; setBusy(true);
    try { const info = await call({ op: "inspect", bytes: upload.bytes, format, parseSettings: settings }); if (token === generation.current) applyHeaders(info.headers); }
    catch (e) { if (token === generation.current) setMessage((e as Error).message); } finally { if (token === generation.current) setBusy(false); }
  }
  function file(): MonthlyFile {
    if (!upload || !campaignOnly || !cash) throw new Error("Select a file and confirm both whole-file attestations.");
    requestId.current ??= crypto.randomUUID().replaceAll("-", "");
    return { ...upload, requestId: requestId.current, source, sourceDate, period, actor, campaignOnly: true, receivedUsdCash: true, parseSettings: settings, dateSystem, mapping };
  }
  async function preview() {
    const token = generation.current; setBusy(true); setMessage(""); setExceptions([]);
    try {
      const f = file(), result = await call({ op: "preview", file: f });
      if (token !== generation.current) return;
      if (result.receipt) {
        const r = confirmedMonthlyReceipt(result.receipt, client, f.requestId), p = { requestId: f.requestId, payloadHash: r.payloadHash, rows: r.counts.new + r.counts.held + r.counts.unchanged };
        localStorage.setItem(storage, JSON.stringify(p)); setPending(p); setPlan(null); await accepted(r, p); return;
      }
      const p = confirmedMonthlyPlan(result.plan, f.requestId); setPlan(p); setReview(result.review); setApprove(false);
    }
    catch (e) { if (token === generation.current) { setPlan(null); setMessage((e as Error).message); setExceptions((e as Error & { exceptions?: typeof exceptions }).exceptions ?? []); } } finally { if (token === generation.current) setBusy(false); }
  }
  async function accepted(raw: unknown, p: Pending) {
    const result = confirmedMonthlyReceipt(raw, client, p.requestId, p.payloadHash, p.rows); setReceipt(result);
    setMessage("Campaign cash transactions committed. Receipt retained; refreshing the existing campaign view. This is not a lifetime/history refresh.");
    try { await refresh(); } catch { setMessage("SQL receipt confirmed; campaign view refresh unavailable. Keep receipt and refresh the dashboard, not the import."); }
  }
  async function commit() {
    if (!plan || !approve) return;
    const f = file(), p = { requestId: f.requestId, payloadHash: plan.payloadHash, rows: plan.rows.length };
    localStorage.setItem(storage, JSON.stringify(p)); setPending(p); setBusy(true); setMessage("Submitting once. If uncertain, check this request's status; never resend.");
    try { await accepted(await call({ op: "commit", file: f, approval: { planHash: plan.planHash, expiresAt: plan.expiresAt, proof: plan.proof, confirm: true } }), p); }
    catch (e) {
      if ((e as Error & { unsentId?: string }).unsentId === p.requestId) {
        localStorage.removeItem(storage); setPending(null); invalidate(); setMessage(`Not submitted to SQL: ${(e as Error).message} Correct the file/context and preview again.`);
      } else setMessage("UNCONFIRMED. Keep this original request ID and check status. Do not resend or create another request.");
    }
    finally { setBusy(false); }
  }
  async function status() {
    if (!pending) return; setBusy(true);
    try { const value = await call({ op: "status", requestId: pending.requestId }); if (value.status === "committed") await accepted(value, pending); else if (value.status === "not-found" && value.v === 1 && value.client === client && value.requestId === pending.requestId) setMessage("Not found yet does not prove an uncertain transaction has drained. Keep the original ID; do not resend."); else throw new Error("Unconfirmed status"); }
    catch { setMessage("Status unavailable/unconfirmed. Keep original request ID; no automatic retry."); } finally { setBusy(false); }
  }
  function download() {
    if (!receipt) return; const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" })), a = document.createElement("a"); a.href = url; a.download = `${client}-campaign-cash-${receipt.requestId}.json`; a.click(); URL.revokeObjectURL(url);
  }
  return <section className="rounded-xl border border-[rgb(var(--line))] bg-white p-5 space-y-4" aria-label="Monthly campaign cash imports">
    <div><h3 className="font-display text-lg text-[rgb(var(--navy))]">Import monthly gifts</h3><p className="text-sm text-[rgb(var(--ink))]/70">Received USD cash transactions for the current campaign only. Up to1,000 rows /2MB. Not pledges, refunds, YTD/annual totals or full lifetime giving history. No donor creation or name-only matching.</p></div>
    {login && <p role="alert">Use the existing <a className="underline" href={`/${client}/data-dashboard/login`}>employee dashboard sign-in</a>.</p>}
    <fieldset disabled={locked} className="space-y-3 disabled:opacity-60">
      <input aria-label="Monthly gift file" type="file" accept=".csv,.xlsx" onChange={e => void choose(e.target.files?.[0])} />
      {format === "xlsx" && upload && <div className="flex flex-wrap gap-2"><select aria-label="Monthly worksheet" className={input} value={sheet} onChange={e => { invalidate(); setHeaders([]); setMapping({}); setSheet(e.target.value); }}>{sheets.map(s => <option key={s}>{s}</option>)}</select><label>Header row <input className={`${input} w-24`} type="number" min={1} max={100} value={headerRow} onChange={e => { invalidate(); setHeaders([]); setMapping({}); setHeaderRow(Number(e.target.value)); }} /></label><button className={button} onClick={() => void inspect()}>Read selected sheet</button><label className="text-sm"><input type="checkbox" checked={integerId} onChange={e => { invalidate(); setIntegerId(e.target.checked); }} /> Client IDs are declared integers (never infer leading zeros)</label></div>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Stable source-system name<input className={`${input} w-full`} value={source} onChange={e => { invalidate(); setSource(e.target.value); }} placeholder="e.g. approved CRM export name" /></label>
        <label className="text-sm">Your name (declared attribution)<input className={`${input} w-full`} value={actor} onChange={e => { invalidate(); setActor(e.target.value); }} /></label>
        <label className="text-sm">Verified source-file date<input className={`${input} w-full`} type="date" value={sourceDate} onChange={e => { invalidate(); setSourceDate(e.target.value); }} /></label>
        <label className="text-sm">Transaction calendar month<input className={`${input} w-full`} type="month" value={period} onChange={e => { invalidate(); setPeriod(e.target.value); }} /></label>
      </div>
      {format === "xlsx" && <label className="block text-sm">Transaction date representation <select className={input} value={dateSystem} onChange={e => { invalidate(); setDateSystem(e.target.value as MonthlyFile["dateSystem"]); }}><option value="iso">ISO text YYYY-MM-DD</option><option value="excel1900">Excel serials, declared1900 system</option><option value="excel1904">Excel serials, declared1904 system</option></select></label>}
      {headers.length > 0 && <details open><summary className="text-sm font-semibold">Map this file — exact IDs, individual cash transactions</summary><div className="grid gap-2 mt-2 md:grid-cols-2">{headers.map((h, i) => <label key={`${i}:${h}`} className="text-sm">{h || "(blank header)"}<select className={`${input} w-full`} value={mapping[h] ?? ""} onChange={e => { invalidate(); setMapping({ ...mapping, [h]: e.target.value }); }}><option value="">Do not import</option>{options.map(t => <option key={t} value={t}>{labels[t]}</option>)}</select></label>)}</div></details>}
      <label className="block text-sm"><input type="checkbox" checked={campaignOnly} onChange={e => { invalidate(); setCampaignOnly(e.target.checked); }} /> I verified every row is for this client&apos;s current campaign, not general giving or annual/YTD summaries.</label>
      <label className="block text-sm"><input type="checkbox" checked={cash} onChange={e => { invalidate(); setCash(e.target.checked); }} /> I verified every row is received USD cash, not a pledge, refund, failed/pending payment or other currency. Unmapped kind/status/currency rely on this whole-file attestation.</label>
      <button className={button} disabled={!upload || !headers.length || !campaignOnly || !cash} onClick={() => void preview()}>Preview campaign cash transactions</button>
    </fieldset>
    {plan && <div className="space-y-3 border-t border-[rgb(var(--line))] pt-3"><p className="text-sm">New {plan.counts.new} (${plan.totals.new}) · Unchanged {plan.counts.unchanged} (${plan.totals.unchanged}) · Held {plan.counts.held} (${plan.totals.held}). Held rows will not be inserted.</p><details><summary className="text-sm">File, mappings and exact review binding</summary><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(review, null, 2)}</pre></details><div className="max-h-60 overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">File row</th><th className="text-left">Decision</th><th className="text-left">Reason</th></tr></thead><tbody>{plan.rows.map(r => <tr key={r.row}><td>{r.row}</td><td>{r.action}</td><td>{r.reason ?? "None"}</td></tr>)}</tbody></table></div><label className="block text-sm"><input type="checkbox" disabled={locked} checked={approve} onChange={e => setApprove(e.target.checked)} /> I reviewed these exact totals and exceptions and approve this campaign-cash import.</label><button className={button} disabled={locked || !approve} onClick={() => void commit()}>Confirm reviewed import once</button></div>}
    {exceptions.length > 0 && <ul className="max-h-52 overflow-auto text-sm">{exceptions.map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}</ul>}
    {pending && <div className="text-sm space-y-2"><p className="break-all">Original request: {pending.requestId}</p><button className={button} disabled={busy} onClick={() => void status()}>Check original request status</button>{receipt && <><button className={`${button} ml-2`} onClick={download}>Download receipt</button><button className={`${input} ml-2`} disabled={busy} onClick={() => { localStorage.removeItem(storage); setPending(null); setReceipt(null); setUpload(null); setHeaders([]); setMapping({}); invalidate(); }}>Start a different file after confirmed result</button></>}</div>}
    {message && <p className="text-sm" role="status">{message}</p>}
  </section>;
}
