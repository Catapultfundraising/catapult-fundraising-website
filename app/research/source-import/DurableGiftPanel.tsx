"use client";

// REVIEW-ONLY durable Catapult Gift IDs. Renders NOTHING unless the server has a reviewed gift registration for this
// client/table (the production copy is EMPTY). Saving additionally needs the hard-false transport approval, so the save
// button reports "turned off". Every async reply is scope-fenced; one request in flight; an unconfirmed save is followed
// by a status check of the SAME batch (never a new job, never a blind resend). Reload recovery is NOT implemented.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createScopeFence } from "@/lib/portal-v2/scope-fence";

const label = "text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]";
const input = "mt-1 w-full rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm text-[rgb(var(--navy))] focus:border-[rgb(var(--brass))] focus:outline-none";
const navyBtn = "inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))] disabled:cursor-not-allowed disabled:opacity-50";
const linkBtn = "font-semibold text-[rgb(var(--brass))] underline disabled:opacity-50";
const MAX = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type Ctx = { available: boolean; configured?: boolean; saveAvailable?: boolean; columns?: string[]; required?: string[]; rowCap?: number; newAllowed?: boolean };
type Choice = { d: "held" | "new" | "adopt" | "correct"; target: string };
type Cell = { v: string | null; readable: true } | { readable: false };
type PRow = { locator: number; matches?: number; person?: number | null; personReadable?: boolean; values?: Record<string, Cell>; giftId?: string | null; identityConflict?: boolean; donorMismatch?: boolean; baseline?: Record<string, { present: boolean; provenance: string | null; equalsCurrent: boolean | null }> | null };
type Check = { ok: boolean; reasons: string[]; expected?: Record<string, string | null> };
type Plan = { token: string; jobId: string; manifest: { batches: unknown[] }; batches: unknown[][]; summary: { batches: number; decided: number; held: number; total: number } };
type BatchState = "pending" | "saved" | "unconfirmed" | "refused";

async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/research-source-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}
const errText = (j: Record<string, unknown>) => (typeof j.error === "string" ? j.error : "Request failed");
const save = (text: string, name: string) => { const url = URL.createObjectURL(new Blob([text], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0); };
/** minimal CSV split for header/donor/display (server re-parses with the strict parser before anything is planned) */
function parse(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); out.push(row); row = []; cell = ""; } else cell += c; }
  if (cell !== "" || row.length) { row.push(cell); out.push(row); }
  return out;
}
const exactInt = (s: string) => (/^[1-9]\d{0,9}$/.test(s) && Number(s) <= 2147483647 ? Number(s) : null);

export default function DurableGiftPanel({ client, table }: { client: string; table: string }) {
  const fence = useRef(createScopeFence()).current;
  const inflight = useRef(false);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [csv, setCsv] = useState<{ name: string; text: string; grid: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [actor, setActor] = useState(""); const [fileDate, setFileDate] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [batch, setBatch] = useState<BatchState[]>([]);
  const [proofs, setProofs] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [note, setNote] = useState("");

  /** any scope/input change: fence all pending async work and drop derived state */
  const invalidate = () => { fence.bump(); inflight.current = false; setChecks([]); setPlan(null); setConfirm(false); setBatch([]); setProofs({}); setErr(""); setNote(""); setBusy(false); };
  useEffect(() => {
    const tk = fence.token();
    call({ op: "durableGiftContext", client, table }).then((r) => tk.run(() => setCtx(r.ok ? (r.j as Ctx) : { available: false }))).catch(() => tk.run(() => setCtx({ available: false })));
    return () => fence.bump();
  }, [client, table, fence]);
  if (!ctx?.available) return null;
  const cols = ctx.columns ?? [];
  const headers = csv?.grid[0] ?? [];
  const rows = csv ? csv.grid.slice(1).filter((r) => !(r.length === 1 && r[0] === "")) : [];
  const personH = Object.keys(mapping).find((h) => mapping[h] === "@person");
  const scope = { client, table };

  /** single-flight + scope fence wrapper: returns undefined when stale or another request is running */
  const once = async <T,>(fn: (tk: ReturnType<typeof fence.token>) => Promise<T>): Promise<T | undefined> => {
    if (inflight.current) return undefined;
    inflight.current = true; const tk = fence.token(); setBusy(true); setErr("");
    try { return await fn(tk); } catch (e) { if (tk.live()) setErr((e as Error).message || "Request failed"); return undefined; }
    finally { if (tk.live()) { inflight.current = false; setBusy(false); } }
  };

  const onFile = async (el: HTMLInputElement) => {
    const fl = el.files?.[0]; el.value = "";
    invalidate(); setCsv(null); setMapping({}); setChoices([]);
    if (!fl) return;
    if (fl.size > MAX) { setErr("Choose a CSV file of 2 MB or smaller"); return; }
    const tk = fence.token();
    const text = await fl.text(); if (!tk.live()) return; // file read fenced: a newer selection wins
    const grid = parse(text);
    setCsv({ name: fl.name, text, grid }); setChoices(grid.slice(1).filter((r) => !(r.length === 1 && r[0] === "")).map(() => ({ d: "held", target: "" })));
  };

  /** advisory checks from read-only previews (sequential chunks of rowCap); the commit re-checks everything under lock */
  const runChecks = () => once(async (tk) => {
    if (!personH) throw new Error("Map the donor CPTID column first");
    const R = ctx.rowCap ?? 1; const pi = headers.indexOf(personH);
    const people = new Map<number, { masterMatches: number; portalOverlay: boolean; portalProspect: boolean }>();
    const byLoc = new Map<number, PRow>(), byGift = new Map<string, { found: boolean; locator?: number }>();
    let overrides = false;
    const chunks = async (kind: string, key: string, items: (number | string)[], take: (j: Record<string, unknown>) => void) => {
      for (let i = 0; i < items.length; i += R) {
        const r = await tk.guard(call({ op: "durableGiftPreview", ...scope, query: { kind, [key]: items.slice(i, i + R) } }));
        if (!r.ok) throw new Error(errText(r.j));
        overrides = overrides || r.j.giftOverridesActive === true; take(r.j);
      }
    };
    const donors = [...new Set(rows.map((r, i) => (choices[i]?.d !== "held" ? exactInt(r[pi]) : null)).filter((x): x is number => x !== null))];
    await chunks("persons", "persons", donors, (j) => { for (const p of (j.persons as { person: number; masterMatches: number; portalOverlay: boolean; portalProspect: boolean }[]) ?? []) people.set(p.person, p); });
    const locs = [...new Set(choices.filter((c) => c.d === "adopt" && exactInt(c.target) !== null).map((c) => exactInt(c.target)!))];
    await chunks("locators", "locators", locs, (j) => { for (const r of (j.rows as PRow[]) ?? []) byLoc.set(r.locator, r); });
    const gids = [...new Set(choices.filter((c) => c.d === "correct" && UUID.test(c.target)).map((c) => c.target))];
    await chunks("gifts", "giftIds", gids, (j) => { for (const g of (j.gifts as { giftId: string; found: boolean; locator?: number }[]) ?? []) byGift.set(g.giftId, g); for (const r of (j.rows as PRow[]) ?? []) byLoc.set(r.locator, r); });
    const out: Check[] = rows.map((r, i) => {
      const c = choices[i]; if (c.d === "held") return { ok: true, reasons: [] };
      const reasons: string[] = []; const donor = exactInt(r[pi]); const p = donor === null ? undefined : people.get(donor);
      if (donor === null) reasons.push("donor CPTID is not an exact whole number");
      if (!p || p.masterMatches !== 1) reasons.push("donor not found exactly once in the client master");
      if (c.d === "new") {
        if (!ctx.newAllowed) reasons.push("new gifts are not enabled for this registration");
        for (const col of ctx.required ?? []) { const h = Object.keys(mapping).find((k) => mapping[k] === col); if (!h || r[headers.indexOf(h)] === "") reasons.push(`required ${col} missing`); }
        if (p?.portalOverlay || p?.portalProspect) reasons.push("donor has portal edits");
        if (overrides) reasons.push("client has active portal gift edits");
        return { ok: !reasons.length, reasons };
      }
      let row: PRow | undefined;
      if (c.d === "adopt") { const l = exactInt(c.target); row = l === null ? undefined : byLoc.get(l); if (!row) reasons.push("enter an existing row locator"); }
      else { const g = UUID.test(c.target) ? byGift.get(c.target) : undefined; if (!g?.found) reasons.push("Catapult Gift ID not found for this registration"); else row = byLoc.get(g.locator!); }
      if (row) {
        if (row.matches !== undefined || !row.values) reasons.push("raw row is not unique");
        if (row.person !== donor || !row.personReadable) reasons.push("row donor differs from the file donor");
        if (row.identityConflict) reasons.push("conflicting identities for this row");
        if (row.donorMismatch) reasons.push("registered donor drift");
        if (row.values && Object.values(row.values).some((v) => !v.readable)) reasons.push("a current value is unreadable");
        if (c.d === "adopt" && row.giftId) reasons.push("row already has a Catapult Gift ID");
        if (c.d === "correct") {
          if (row.giftId !== c.target) reasons.push("Catapult Gift ID does not match the row");
          if (!row.baseline || Object.values(row.baseline).some((b) => !(b.present && b.provenance === "source" && b.equalsCurrent === true))) reasons.push("no source-owned baseline equal to current (manual or unknown provenance)");
          if (p?.portalOverlay || p?.portalProspect) reasons.push("donor has portal edits");
          if (overrides) reasons.push("client has active portal gift edits");
        }
      }
      const expected = row?.values && !reasons.length ? Object.fromEntries(Object.entries(row.values).map(([k, v]) => [k, v.readable ? v.v : null])) : undefined;
      return { ok: !reasons.length, reasons, expected };
    });
    tk.run(() => setChecks(out));
  });

  const decisions = () => rows.map((_, i) => { const c = choices[i], k = checks[i];
    if (c.d === "held" || !k?.ok) return { o: i, d: "held" };
    if (c.d === "new") return { o: i, d: "new" };
    if (c.d === "adopt") return { o: i, d: "adopt", locator: exactInt(c.target), expected: k.expected };
    return { o: i, d: "correct", giftId: c.target, expected: k.expected }; });

  const makePlan = () => once(async (tk) => {
    const r = await tk.guard(call({ op: "durableGiftPlan", ...scope, csv: csv!.text, mapping, decisions: decisions(), actor, fileName: csv!.name, fileDate: fileDate || null }));
    if (!r.ok) throw new Error(errText(r.j));
    tk.run(() => { const p = r.j as unknown as Plan; setPlan(p); setBatch(p.batches.map(() => "pending")); setConfirm(false); });
  });

  /** sequential batches; stops at the first unconfirmed/refused batch */
  const saveAll = () => once(async (tk) => {
    const st = [...batch];
    for (let i = 0; i < plan!.batches.length; i++) {
      if (st[i] === "saved") continue;
      if (st[i] === "unconfirmed") { setNote(`Batch ${i + 1} is unconfirmed: check its status first.`); return; }
      const r = await tk.guard(call({ op: "durableGiftCommit", ...scope, token: plan!.token, manifest: plan!.manifest, batchIndex: i, rows: plan!.batches[i] }));
      if (r.ok) { st[i] = "saved"; tk.run(() => setBatch([...st])); continue; }
      if (r.j.code === "disabled") throw new Error("Saving gift IDs is turned off.");
      st[i] = r.j.code === "unconfirmed" ? "unconfirmed" : "refused"; tk.run(() => setBatch([...st]));
      throw new Error(r.j.code === "unconfirmed" ? `Batch ${i + 1}: outcome unconfirmed. Check its status before anything else.` : errText(r.j));
    }
    tk.run(() => setNote("All batches committed."));
  }).catch(() => undefined);

  /** status of ONE batch via a signed proof; never resends */
  const checkBatch = (i: number) => once(async (tk) => {
    const r = await tk.guard(call({ op: "durableGiftProof", ...scope, token: plan!.token, manifest: plan!.manifest, batchIndex: i }));
    if (!r.ok) throw new Error(errText(r.j));
    tk.run(() => { if (r.j.confirmed === true && typeof r.j.proof === "string") { setProofs((p) => ({ ...p, [i]: r.j.proof as string })); setBatch((b) => b.map((x, k) => (k === i ? "saved" : x))); setNote(`Batch ${i + 1} confirmed saved.`); }
      else { setBatch((b) => b.map((x, k) => (k === i && x === "unconfirmed" ? "pending" : x))); setNote(`Batch ${i + 1}: no verified committed outcome yet. This does not prove nothing was saved. Save batches resends THIS batch with the same request id (Engage replays it if it was committed).`); } });
  });

  const exportCopy = () => once(async (tk) => {
    const r = await tk.guard(call({ op: "durableGiftExport", ...scope, csv: csv!.text, token: plan!.token, manifest: plan!.manifest, proofs: Object.values(proofs) }));
    if (!r.ok) throw new Error(errText(r.j));
    tk.run(() => { save(String(r.j.csv), String(r.j.fileName)); setNote(`Review copy downloaded: ${r.j.proven} verified IDs; held or unconfirmed rows left blank.`); });
  });

  const setChoice = (i: number, c: Choice) => { const n = [...choices]; n[i] = c; setChoices(n); invalidate(); };
  const states = batch.reduce((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {} as Record<string, number>);
  return (
    <details className="mt-8 rounded-2xl border border-[rgb(var(--line))] bg-white p-5" data-testid="durable-gift">
      <summary className="cursor-pointer font-serif text-lg text-[rgb(var(--navy))]">Catapult Gift IDs (review only)</summary>
      <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">Choose, row by row, whether a gift is new, an existing row to adopt, or a correction to an existing Catapult Gift ID. Everything starts held. Checks are advisory; each save re-checks under lock. {ctx.saveAvailable ? "" : "Saving is turned off."} A reload cannot resume a save; check status by job ID first.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="block md:col-span-1"><span className={label}>Gift export (CSV)</span><input type="file" accept=".csv,text/csv" aria-label="Durable gift export" className={input} disabled={busy} onChange={(e) => { void onFile(e.currentTarget); }} /></label>
        <label className="block"><span className={label}>Your name (as stated)</span><input className={input} aria-label="Your name" value={actor} disabled={busy} onChange={(e) => { setActor(e.target.value); invalidate(); }} /></label>
        <label className="block"><span className={label}>Source export date (optional)</span><input type="date" className={input} aria-label="Source export date" value={fileDate} disabled={busy} onChange={(e) => { setFileDate(e.target.value); invalidate(); }} /></label>
      </div>
      {headers.length > 0 && (
        <div className="mt-4"><span className={label}>Columns</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{headers.map((h) => (
            <label key={h} className="block text-sm"><span className="text-[rgb(var(--navy))]">{h}</span>
              <select className={input} aria-label={`Map ${h}`} disabled={busy} value={mapping[h] ?? ""} onChange={(e) => { const m = { ...mapping }; if (e.target.value) m[h] = e.target.value; else delete m[h]; setMapping(m); invalidate(); }}>
                <option value="">Not used</option><option value="@person" disabled={!!personH && personH !== h}>Donor CPTID</option>
                {cols.map((c) => <option key={c} value={c} disabled={Object.entries(mapping).some(([k, v]) => v === c && k !== h)}>{c}</option>)}</select></label>))}</div></div>)}
      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto" data-testid="durable-rows"><table className="w-full min-w-[880px] text-left text-sm"><thead><tr className="text-xs uppercase text-[rgb(var(--ink))]/60"><th className="px-3 py-2">Line</th><th className="px-3 py-2">Donor</th><th className="px-3 py-2">Decision</th><th className="px-3 py-2">Row locator / Catapult Gift ID</th><th className="px-3 py-2">Check</th></tr></thead>
          <tbody>{rows.slice(0, 50).map((r, i) => <tr key={i} className="border-t border-[rgb(var(--line))] align-top">
            <td className="px-3 py-2">{i + 2}</td><td className="px-3 py-2">{personH ? r[headers.indexOf(personH)] : "—"}</td>
            <td className="px-3 py-2"><select className={input} aria-label={`Decision line ${i + 2}`} disabled={busy} value={choices[i]?.d ?? "held"} onChange={(e) => setChoice(i, { d: e.target.value as Choice["d"], target: "" })}>
              <option value="held">Held</option><option value="new">New gift</option><option value="adopt">Adopt existing row</option><option value="correct">Correct existing ID</option></select></td>
            <td className="px-3 py-2">{(choices[i]?.d === "adopt" || choices[i]?.d === "correct") && <input className={input} aria-label={`Target line ${i + 2}`} disabled={busy} value={choices[i].target} onChange={(e) => setChoice(i, { ...choices[i], target: e.target.value.trim() })} />}</td>
            <td className="px-3 py-2 text-xs">{choices[i]?.d === "held" ? "held" : !checks[i] ? "not checked" : checks[i].ok ? "eligible (advisory)" : <span className="text-red-700">held: {checks[i].reasons.join("; ")}</span>}</td></tr>)}</tbody></table>
          {rows.length > 50 && <p className="mt-2 text-xs text-[rgb(var(--ink))]/60">Showing the first 50 of {rows.length} rows.</p>}</div>)}
      {rows.length > 0 && <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={navyBtn} disabled={busy || !personH} onClick={() => { void runChecks(); }}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Check decisions</button>
        <button type="button" className={navyBtn} disabled={busy || !checks.length || !actor.trim()} onClick={() => { void makePlan(); }}>Plan save</button></div>}
      {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
      {plan && (
        <div className="mt-4 text-sm text-[rgb(var(--navy))]" data-testid="durable-plan">
          <p><b>{plan.summary.decided}</b> rows to save in <b>{plan.summary.batches}</b> batch{plan.summary.batches === 1 ? "" : "es"}; <b>{plan.summary.held}</b> held (not saved). Job {plan.jobId.slice(0, 12)}…</p>
          <p className="mt-1">{!batch.length ? "" : states.saved === batch.length && plan.summary.held === 0 ? "Complete." : `Partial: ${states.saved ?? 0} of ${batch.length} batches saved; ${states.unconfirmed ?? 0} unconfirmed; ${plan.summary.held} rows held.`}</p>
          <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={confirm} disabled={busy} onChange={(e) => setConfirm(e.target.checked)} aria-label="Confirm whole-file save" />I reviewed the whole file: {plan.summary.decided} rows saved, {plan.summary.held} held.</label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={navyBtn} disabled={busy || !confirm || !ctx.saveAvailable} onClick={() => { void saveAll(); }}>Save batches</button>
            <button type="button" className={navyBtn} disabled={busy || !Object.keys(proofs).length} onClick={() => { void exportCopy(); }}>Download review copy</button></div>
          {!ctx.saveAvailable && <p className="mt-2 text-xs text-[rgb(var(--ink))]/60">Saving gift IDs is turned off.</p>}
          <ul className="mt-3 space-y-1" data-testid="durable-batches">{batch.map((s, i) => <li key={i}>Batch {i + 1}: {s === "saved" ? "saved" : s === "unconfirmed" ? "unconfirmed" : s === "refused" ? "refused (nothing saved)" : "not sent"} {s !== "pending" && s !== "refused" && !proofs[i] && <button type="button" className={linkBtn} disabled={busy} onClick={() => { void checkBatch(i); }}>Check status</button>}{proofs[i] && " (verified)"}</li>)}</ul>
          {note && <p role="status" className="mt-2">{note}</p>}
        </div>)}
    </details>
  );
}
