"use client";

// REVIEW-ONLY durable Catapult Gift IDs. Renders NOTHING unless the server has a reviewed gift registration for this
// client/table (the production copy is EMPTY). Saving additionally needs the hard-false transport approval, so the save
// button reports "turned off". Every async reply is scope-fenced; one request in flight; an unconfirmed save is followed
// by a status check of the SAME batch (never a new job, never a blind resend). Reload recovery is NOT implemented.
// A dispatched batch is marked unconfirmed BEFORE the request is awaited; only a reply validated against the expected
// job/batch/request id and outcome counts as saved, and only a definitive refusal code counts as "nothing saved".
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createScopeFence } from "@/lib/portal-v2/scope-fence";
import { parseCsv } from "@/lib/portal-v2/csv-parse";
import { normalize, type NormDest } from "@/lib/portal-v2/source-normalize";
import { verifyRecoveryFile } from "@/lib/portal-v2/gift-hash-browser";

const label = "text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]";
const input = "mt-1 w-full rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm text-[rgb(var(--navy))] focus:border-[rgb(var(--brass))] focus:outline-none";
const navyBtn = "inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))] disabled:cursor-not-allowed disabled:opacity-50";
const linkBtn = "font-semibold text-[rgb(var(--brass))] underline disabled:opacity-50";
const MAX = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type Ctx = { available: boolean; lookupAvailable?: boolean; configured?: boolean; saveAvailable?: boolean; registrationId?: string; columns?: string[]; colDefs?: (NormDest & { col: string })[]; required?: string[]; rowCap?: number; newAllowed?: boolean };
type Choice = { d: "held" | "new" | "adopt" | "correct"; target: string };
type Cell = { v: string | null; readable: true } | { readable: false };
type PRow = { locator: number; matches?: number; person?: number | null; personReadable?: boolean; values?: Record<string, Cell>; giftId?: string | null; identityConflict?: boolean; donorMismatch?: boolean; baseline?: Record<string, { present: boolean; provenance: string | null; equalsCurrent: boolean | null }> | null };
type Check = { ok: boolean; reasons: string[]; expected?: Record<string, string | null> };
type Plan = { token: string; jobId: string; recovery?: { header: Record<string, unknown>; headerMac: string }; manifest: { batches: unknown[] }; batches: { ordinal: number; action: string; giftId?: string; locator?: number }[][]; summary: { batches: number; decided: number; held: number; total: number } };
type BatchState = "unknown" | "pending" | "saved" | "unconfirmed" | "refused";
const REC_MAX = 8_000_000;
/** exact bytes -> text: strict UTF-8, BOM KEPT (so sha256(text) equals sha256(original bytes)); invalid UTF-8 refused */
async function readExact(fl: File) { const buf = await fl.arrayBuffer(); const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buf); const d = await crypto.subtle.digest("SHA-256", buf); return { text, digest: Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("") }; }
const downloadJson = (obj: unknown, name: string) => { const url = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0); };
type Hist = { o: number; rows: PRow[]; next: number | null; hasMore: boolean };
type JobLook = { jobId: string; client: string; state: string; note: string; committedBatches?: number[]; missingBatches?: number[] };
const PAGE = 25;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
async function sha32(s: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32); }
/** committed only if the reply is bound to this job batch: request id, client, registration and the exact ordinals/actions */
function committedFor(j: Record<string, unknown>, want: { requestId: string; client: string; registrationId?: string; rows: Plan["batches"][number] }) {
  // mirrors backend validOutcome: exact request/client/registration, unique ordinals + UUIDv4 ids, positive locators,
  // counts equal to the actions, and every expected ordinal/action/target present
  const o = j.outcome;
  if (j.committed !== true || j.requestId !== want.requestId || !isObj(o) || o.committed !== true || o.requestId !== want.requestId || o.client !== want.client || typeof want.registrationId !== "string" || o.registrationId !== want.registrationId || !Array.isArray(o.rows) || o.rows.length !== want.rows.length || !isObj(o.counts)) return false;
  const m = new Map<unknown, Record<string, unknown>>(); const ids = new Set<unknown>(); const c: Record<string, number> = { new: 0, adopt: 0, correct: 0 };
  for (const x of o.rows) {
    if (!isObj(x) || m.has(x.ordinal) || !Number.isSafeInteger(x.ordinal) || !["new", "adopt", "correct"].includes(x.action as string) || typeof x.giftId !== "string" || !UUID.test(x.giftId) || ids.has(x.giftId) || !(Number.isSafeInteger(x.locator) && (x.locator as number) >= 1 && (x.locator as number) <= 2147483647)) return false;
    m.set(x.ordinal, x); ids.add(x.giftId); c[x.action as string]++;
  }
  const k = o.counts as Record<string, unknown>;
  if (Object.keys(k).length !== 3 || k.new !== c.new || k.adopt !== c.adopt || k.correct !== c.correct) return false;
  return want.rows.every((w) => { const x = m.get(w.ordinal); return !!x && x.action === w.action && (w.action !== "correct" || x.giftId === w.giftId) && (w.action !== "adopt" || x.locator === w.locator); });
}

async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/research-source-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}
const errText = (j: Record<string, unknown>) => (typeof j.error === "string" ? j.error : "Request failed");
const save = (text: string, name: string) => { const url = URL.createObjectURL(new Blob([text], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0); };
const exactInt = (s: string) => (/^[1-9]\d{0,9}$/.test(s) && Number(s) <= 2147483647 ? Number(s) : null);

export default function DurableGiftPanel({ client, table, onLockChange }: { client: string; table: string; onLockChange?: (locked: boolean) => void }) {
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
  const [page, setPage] = useState(0);
  const [hist, setHist] = useState<Hist | null>(null);
  const [lookId, setLookId] = useState(""); const [look, setLook] = useState<JobLook | null>(null);
  const [restored, setRestored] = useState<Record<string, unknown> | null>(null); const [drift, setDrift] = useState(false);
  const [downloadedFor, setDownloadedFor] = useState(""); const [orig, setOrig] = useState<{ text: string; digest: string } | null>(null);
  const [busy, setBusy] = useState(false); const [writing, setWriting] = useState(false); const [err, setErr] = useState(""); const [note, setNote] = useState("");

  // scope lock: a dispatched save/status or any unconfirmed batch keeps the parent client/table selectors locked
  const locked = writing || batch.some((s) => s === "unconfirmed" || s === "unknown");
  useEffect(() => { onLockChange?.(locked); }, [locked, onLockChange]);
  useEffect(() => () => onLockChange?.(false), [onLockChange]);

  /** any scope/input change: fence all pending async work and drop derived state */
  const invalidate = () => { fence.bump(); setRestored(null); setDrift(false); setOrig(null); inflight.current = false; setChecks([]); setPlan(null); setConfirm(false); setBatch([]); setProofs({}); setHist(null); setErr(""); setNote(""); setBusy(false); };
  useEffect(() => {
    const tk = fence.token();
    call({ op: "durableGiftContext", client, table }).then((r) => tk.run(() => setCtx(r.ok ? (r.j as Ctx) : { available: false }))).catch(() => tk.run(() => setCtx({ available: false })));
    return () => fence.bump();
  }, [client, table, fence]);
  const C: Ctx = ctx ?? { available: false };
  const cols = C.columns ?? [];
  const headers = csv?.grid[0] ?? [];
  const rows = csv ? csv.grid.slice(1) : []; // ordinal = index, exactly as the server's strict parser numbers rows
  const personH = Object.keys(mapping).find((h) => mapping[h] === "@person");
  const scope = { client, table };
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  /** single-flight + scope fence wrapper: returns undefined when stale or another request is running */
  const once = async <T,>(fn: (tk: ReturnType<typeof fence.token>) => Promise<T>, write = false): Promise<T | undefined> => {
    if (inflight.current) return undefined;
    inflight.current = true; const tk = fence.token(); setBusy(true); setErr(""); if (write) setWriting(true);
    try { return await fn(tk); } catch (e) { if (tk.live()) setErr((e as Error).message || "Request failed"); return undefined; }
    finally { if (write) setWriting(false); if (tk.live()) { inflight.current = false; setBusy(false); } }
  };

  const onFile = async (el: HTMLInputElement) => {
    const fl = el.files?.[0]; el.value = "";
    invalidate(); setCsv(null); setMapping({}); setChoices([]); setPage(0);
    if (!fl) return;
    if (fl.size > MAX) { setErr("Choose a CSV file of 2 MB or smaller"); return; }
    const tk = fence.token();
    let text: string;
    try { text = (await readExact(fl)).text; } catch { if (tk.live()) setErr("File is not valid UTF-8 text"); return; }
    if (!tk.live()) return; // file read fenced: a newer selection wins
    let grid: string[][];
    try { grid = parseCsv(text); } catch (e) { setErr((e as Error).message); return; } // same strict parser as the server
    if (grid.length < 2) { setErr("CSV needs a header and at least one row"); return; }
    if (grid.slice(1).some((r) => r.length !== grid[0].length)) { setErr("Every row must have exactly as many cells as the header"); return; }
    if (new Set(grid[0]).size !== grid[0].length) { setErr("Column headers must be unique"); return; }
    setCsv({ name: fl.name, text, grid }); setChoices(grid.slice(1).map(() => ({ d: "held", target: "" })));
  };

  /** exact-donor history (read-only, cursor pages); the operator picks a row explicitly. No fuzzy or automatic match. */
  const loadHistory = (o: number, after?: number) => once(async (tk) => {
    const pi = personH ? headers.indexOf(personH) : -1; const donor = pi < 0 ? null : exactInt(rows[o][pi]);
    if (donor === null) throw new Error("Map the donor CPTID column; this row's donor must be an exact whole number");
    const r = await tk.guard(call({ op: "durableGiftPreview", ...scope, query: after === undefined ? { kind: "history", person: donor } : { kind: "history", person: donor, after } }));
    if (!r.ok) throw new Error(errText(r.j));
    tk.run(() => setHist((h) => ({ o, rows: [...(after !== undefined && h?.o === o ? h.rows : []), ...((r.j.rows as PRow[]) ?? [])], next: (r.j.next as number | null) ?? null, hasMore: r.j.hasMore === true })));
  });

  /** advisory checks from read-only previews (sequential chunks of rowCap); the commit re-checks everything under lock */
  const runChecks = () => once(async (tk) => {
    if (!personH) throw new Error("Map the donor CPTID column first");
    const R = C.rowCap ?? 1; const pi = headers.indexOf(personH);
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
    const defs = new Map((C.colDefs ?? []).map((d) => [d.col, d]));
    const out: Check[] = rows.map((r, i) => {
      const c = choices[i]; if (c.d === "held") return { ok: true, reasons: [] };
      const reasons: string[] = []; const donor = exactInt(r[pi]); const p = donor === null ? undefined : people.get(donor);
      if (donor === null) reasons.push("donor CPTID is not an exact whole number");
      if (!p || p.masterMatches !== 1) reasons.push("donor not found exactly once in the client master");
      if (c.d === "new") {
        if (!C.newAllowed) reasons.push("new gifts are not enabled for this registration");
        for (const col of C.required ?? []) { const h = Object.keys(mapping).find((k) => mapping[k] === col); if (!h || r[headers.indexOf(h)] === "") reasons.push(`required ${col} missing`); }
        if (p?.portalOverlay || p?.portalProspect) reasons.push("donor has portal edits");
        if (overrides) reasons.push("client has active portal gift edits");
        return { ok: !reasons.length, reasons };
      }
      let row: PRow | undefined;
      if (c.d === "adopt") { const l = exactInt(c.target); row = l === null ? undefined : byLoc.get(l); if (!row) reasons.push("pick an existing row from the donor's history"); }
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
          // ownership is required only for MAPPED columns whose normalized file value differs from current (blank = unchanged)
          for (const [h, col] of Object.entries(mapping)) {
            if (col === "@person") continue;
            const d = defs.get(col); if (!d) { reasons.push(`${col}: no registered type`); continue; }
            const n = normalize(d, r[headers.indexOf(h)]); if (n.err) { reasons.push(`${col}: ${n.err}`); continue; }
            if (n.v === null) continue;
            const cur = row.values?.[col]; if (!cur || !cur.readable || cur.v === n.v) continue;
            const b = row.baseline?.[col];
            if (!(b && b.present && b.provenance === "source" && b.equalsCurrent === true)) reasons.push(`${col} changes but has no source-owned baseline equal to current (manual or unknown provenance)`);
          }
          if (p?.portalOverlay || p?.portalProspect) reasons.push("donor has portal edits");
          if (overrides) reasons.push("client has active portal gift edits");
        }
      }
      // the expected snapshot is the FULL exact readable current row, never normalized
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

  /** sequential batches; a batch is unconfirmed from the moment it is dispatched until a validated reply arrives */
  const saveAll = () => once(async (tk) => {
    const st = [...batch];
    if (st.includes("unconfirmed") || st.includes("unknown")) { setNote("A batch is unconfirmed or unchecked: check its status first."); return; }
    if (downloadedFor !== plan!.jobId) { setNote("Download the recovery file first."); return; }
    for (let i = 0; i < plan!.batches.length; i++) {
      if (st[i] === "saved") continue;
      const requestId = await sha32(`${plan!.jobId}:${i}`); if (!tk.live()) return;
      st[i] = "unconfirmed"; setBatch([...st]); // BEFORE awaiting: a lost reply can never look like "not sent"
      let status = 0, j: Record<string, unknown> | null = null;
      try {
        const res = await fetch("/api/research-source-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "durableGiftCommit", ...scope, token: plan!.token, manifest: plan!.manifest, batchIndex: i, rows: plan!.batches[i] }) });
        status = res.status; const t = await res.text(); try { const x = JSON.parse(t); j = isObj(x) ? x : null; } catch { j = null; }
      } catch { j = null; }
      if (!tk.live()) return;
      if (status === 200 && j && committedFor(j, { requestId, client, registrationId: C.registrationId, rows: plan!.batches[i] })) { st[i] = "saved"; setBatch([...st]); continue; }
      if (j && ((status === 400 && j.code === "refused") || (status === 503 && (j.code === "refused" || j.code === "disabled")))) {
        st[i] = "refused"; setBatch([...st]);
        throw new Error(j.code === "disabled" ? "Saving gift IDs is turned off. Nothing in this batch was saved." : `Batch ${i + 1}: Engage refused this batch; nothing in it was saved.`);
      }
      throw new Error(`Batch ${i + 1}: outcome unconfirmed (it may or may not have been saved). Check its status before anything else.`);
    }
    tk.run(() => setNote("All batches committed (verified replies)."));
  }, true);

  /** saved = signed proof bound to the derived request id; pending = ONLY the route's canonical 200 pending state with the
   *  same id (resend of the same request permitted; never means "not saved"); anything else = unconfirmed */
  const classify = (r: Awaited<ReturnType<typeof call>>, want: string): "saved" | "pending" | "unconfirmed" =>
    r.ok && r.j.requestId === want && r.j.confirmed === true && typeof r.j.proof === "string" && r.j.proof ? "saved"
      : r.status === 200 && r.j.requestId === want && r.j.confirmed === false && r.j.state === "pending" ? "pending" : "unconfirmed";

  /** restore from an explicitly chosen recovery file: local checks, renew (same job), then status for EVERY batch before any send */
  /** restore from an explicitly chosen recovery file. The WHOLE flow (exact read, local checks, renew, status barrier) runs
   *  inside ONE single-flight write slot, so a save/status cannot start meanwhile, and it is refused outright while any
   *  sent batch is uncertain: an uncertain job is never replaced or forgotten. */
  const onRecovery = (el: HTMLInputElement, lookupOnly = false) => {
    const fl = el.files?.[0]; el.value = ""; if (!fl) return;
    if (inflight.current || locked) { setErr("Finish or check the current job before loading a recovery file."); return; }
    void once(async (t2) => {
      if (fl.size > REC_MAX) throw new Error("Recovery file is larger than 8 MB");
      let f: Record<string, unknown>;
      try { const x: unknown = JSON.parse((await t2.guard(readExact(fl))).text); if (!isObj(x)) throw 0; f = x; } catch (e) { if (!t2.live()) throw e; throw new Error("Not a readable recovery file"); }
      const v = await t2.guard(verifyRecoveryFile(f));
      if (!v.ok) throw new Error(`Recovery file refused: ${v.reason}`);
      const h = f.header as Record<string, unknown>;
      if (h.client !== client || h.table !== table) throw new Error(`This recovery file is for ${String(h.client).toUpperCase()} / ${String(h.table)}`);
      if (lookupOnly) { t2.run(() => { setLookId(String(h.jobId)); setLook(null); setNote("Job ID filled from the recovery file (read-only lookup)."); }); return; }
      // no uncertain job can exist here (checked before entering; save/status cannot start while this slot is held)
      t2.run(() => { setChecks([]); setPlan(null); setConfirm(false); setBatch([]); setProofs({}); setHist(null); setRestored(null); setDrift(false); setOrig(null); setCsv(null); setMapping({}); setChoices([]); setNote(""); });
      const rn = await t2.guard(call({ op: "durableGiftRenew", client, table, header: h, headerMac: f.headerMac, jobToken: f.jobToken }));
      if (rn.status === 409 || rn.status === 404) { t2.run(() => { setDrift(true); setLookId(String(h.jobId)); }); return; }
      if (!rn.ok || typeof rn.j.token !== "string" || !rn.j.token || rn.j.jobId !== h.jobId) throw new Error("Not restored: the renewal reply was not valid for this job.");
      const m = h.manifest as { decided: unknown[]; held: unknown[]; totalOrdinals: number; batchCount: number; batches: unknown[] };
      const p: Plan = { token: rn.j.token as string, jobId: String(h.jobId), manifest: m, batches: (f.parts as { rows: Plan["batches"][number] }[]).map((x) => x.rows), summary: { batches: m.batchCount, decided: m.decided.length, held: m.held.length, total: m.totalOrdinals } };
      const st: BatchState[] = p.batches.map(() => "unknown"); const pr: Record<number, string> = {};
      t2.run(() => { setPlan(p); setRestored(h); setDownloadedFor(p.jobId); setBatch([...st]); });
      for (let i = 0; i < p.batches.length; i++) {
        const want = await sha32(`${p.jobId}:${i}`);
        let r: Awaited<ReturnType<typeof call>> | null = null;
        try { r = await t2.guard(call({ op: "durableGiftProof", client, table, token: p.token, manifest: p.manifest, batchIndex: i })); } catch (e) { if (!t2.live()) throw e; }
        const c = r ? classify(r, want) : "unconfirmed";
        st[i] = c; if (c === "saved") pr[i] = r!.j.proof as string;
        t2.run(() => { setBatch([...st]); setProofs({ ...pr }); });
      }
      t2.run(() => setNote(st.includes("unconfirmed") ? "Restored. Some batches are unconfirmed: check their status again before saving." : "Restored. Every batch status was checked; pending batches can be resent with the same request ids."));
    }, !lookupOnly);
  };

  /** leave a restored job: only when nothing is unknown, unconfirmed or in flight */
  const leaveRestored = () => { if (inflight.current || locked) return; invalidate(); setDownloadedFor(""); setLookId(""); setLook(null); };

  const downloadRecovery = () => { if (!plan?.recovery) return; downloadJson({ header: plan.recovery.header, headerMac: plan.recovery.headerMac, jobToken: plan.token, parts: plan.batches.map((rows, index) => ({ index, rows })) }, `${(csv?.name ?? "gifts").replace(/\.csv$/i, "")}-recovery-${plan.jobId.slice(0, 12)}.json`); setDownloadedFor(plan.jobId); };

  const onOrig = (el: HTMLInputElement) => {
    const fl = el.files?.[0]; el.value = ""; if (!fl) return;
    void once(async (tk) => {
      let x: { text: string; digest: string };
      try { x = await tk.guard(readExact(fl)); } catch (e) { if (!tk.live()) throw e; throw new Error("File is not valid UTF-8 text"); }
      if (x.digest !== restored?.fileDigest) { tk.run(() => setOrig(null)); throw new Error("This is not the planned original file (byte digest differs)"); }
      tk.run(() => setOrig(x));
    });
  };

  /** status of ONE batch via a signed proof; never resends */
  const checkBatch = (i: number) => once(async (tk) => {
    const want = await sha32(`${plan!.jobId}:${i}`);
    let r: Awaited<ReturnType<typeof call>>;
    try { r = await tk.guard(call({ op: "durableGiftProof", ...scope, token: plan!.token, manifest: plan!.manifest, batchIndex: i })); }
    catch (e) { if (tk.live()) throw new Error(`Batch ${i + 1}: status unavailable; still unconfirmed.`); throw e; }
    tk.run(() => { const c = classify(r, want);
      if (c === "saved") { setProofs((p) => ({ ...p, [i]: r.j.proof as string })); setBatch((b) => b.map((x, k) => (k === i ? "saved" : x))); setNote(`Batch ${i + 1} confirmed saved.`); }
      else if (c === "pending") { setBatch((b) => b.map((x, k) => (k === i && (x === "unconfirmed" || x === "unknown") ? "pending" : x))); setNote(`Batch ${i + 1}: no verified committed outcome yet. This does not prove nothing was saved. Save batches resends THIS batch with the same request id (Engage replays it if it was committed).`); }
      else { setBatch((b) => b.map((x, k) => (k === i && x === "unknown" ? "unconfirmed" : x))); setErr(`Batch ${i + 1}: status unavailable or not for this batch; still unconfirmed.`); } });
  }, true);

  const lookupJob = () => once(async (tk) => {
    const id = lookId.trim(); if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("Enter the full 64-character job ID");
    const r = await tk.guard(call({ op: "durableGiftJobLookup", client, jobId: id }));
    tk.run(() => setLook(r.ok && r.j.jobId === id && r.j.client === client && typeof r.j.state === "string" && typeof r.j.note === "string" ? (r.j as unknown as JobLook) : { jobId: id, client, state: "unavailable", note: "Job status unavailable; outcome unconfirmed." }));
  });

  const exportCopy = () => once(async (tk) => {
    const text = restored ? orig?.text : csv?.text; if (text === undefined) throw new Error("Choose the original CSV file first");
    const r = await tk.guard(call({ op: "durableGiftExport", ...scope, csv: text, token: plan!.token, manifest: plan!.manifest, proofs: Object.values(proofs) }));
    if (!r.ok) throw new Error(errText(r.j));
    tk.run(() => { save(String(r.j.csv), String(r.j.fileName)); setNote(`Review copy downloaded: ${r.j.proven} verified IDs; held or unconfirmed rows left blank.`); });
  });

  const setChoice = (i: number, c: Choice) => { const n = [...choices]; n[i] = c; setChoices(n); invalidate(); };
  const states = batch.reduce((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {} as Record<string, number>);
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE).map((r, k) => ({ r, o: page * PAGE + k }));
  const lockedNote = locked ? " Client and table are locked until every sent batch is confirmed or checked." : "";
  const lookupJsx = (
    <div className="mt-4 text-sm" data-testid="durable-lookup"><span className={label}>Look up a job (read-only)</span>
      <span className="mt-1 flex flex-wrap gap-2"><input className={`${input} font-mono text-xs sm:max-w-xl`} aria-label="Job ID to look up" value={lookId} disabled={busy} onChange={(e) => { setLookId(e.target.value); setLook(null); }} placeholder="64-character job ID" />
        <button type="button" className={linkBtn} disabled={busy} onClick={() => { void lookupJob(); }}>Look up job status</button></span>
      {look && <p className="mt-1" role="status" data-testid="durable-lookup-result">Job {look.jobId} ({look.client.toUpperCase()}): {look.state}: {look.note}</p>}</div>);
  if (!C.available) {
    if (!C.lookupAvailable) return null;
    // no reviewed registration for this client/table (or it changed): read-only whole-job lookup only; no proofs, no saves
    return (
      <details className="mt-8 rounded-2xl border border-[rgb(var(--line))] bg-white p-5" data-testid="durable-lookup-only">
        <summary className="cursor-pointer font-serif text-lg text-[rgb(var(--navy))]">Catapult Gift ID job lookup (read-only)</summary>
        <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">No reviewed gift registration matches this client and table, so saving and per-batch proofs are unavailable. You can still look up an earlier job by its full ID.</p>
        <label className="mt-3 block text-sm"><span className={label}>Fill the job ID from a recovery file (read locally only)</span><input type="file" accept=".json,application/json" aria-label="Recovery file for lookup" className={input} disabled={busy} onChange={(e) => onRecovery(e.currentTarget, true)} /></label>
        {lookupJsx}
        {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}{note && <p role="status" className="mt-2 text-sm">{note}</p>}
      </details>);
  }
  return (
    <details className="mt-8 rounded-2xl border border-[rgb(var(--line))] bg-white p-5" data-testid="durable-gift">
      <summary className="cursor-pointer font-serif text-lg text-[rgb(var(--navy))]">Catapult Gift IDs (review only)</summary>
      <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--ink))]/70">Choose, row by row, whether a gift is new, an existing row to adopt, or a correction to an existing Catapult Gift ID. Everything starts held. Checks are advisory; each save re-checks under lock. {C.saveAvailable ? "" : "Saving is turned off."} After a reload, restore the job from its downloaded recovery file: every batch status is checked before anything is resent. The job ID lookup below is read-only.{lockedNote}</p>
      <label className="mt-4 block text-sm md:max-w-md"><span className={label}>Restore from recovery file (.json)</span><input type="file" accept=".json,application/json" aria-label="Restore from recovery file" className={input} disabled={busy || locked} onChange={(e) => onRecovery(e.currentTarget)} /></label>
      {drift && <p role="alert" className="mt-3 max-w-3xl text-sm text-red-700" data-testid="durable-drift">Gift registration changed or was removed since planning. Saving and per-batch proofs are unavailable. Only the read-only job lookup below is available until the registration is reviewed and restored or migrated. Do not plan the file again to repeat these writes.</p>}
      {!restored && !drift && <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="block md:col-span-1"><span className={label}>Gift export (CSV)</span><input type="file" accept=".csv,text/csv" aria-label="Durable gift export" className={input} disabled={busy || locked} onChange={(e) => { void onFile(e.currentTarget); }} /></label>
        <label className="block"><span className={label}>Your name (as stated)</span><input className={input} aria-label="Your name" value={actor} disabled={busy || locked} onChange={(e) => { setActor(e.target.value); invalidate(); }} /></label>
        <label className="block"><span className={label}>Source export date (optional)</span><input type="date" className={input} aria-label="Source export date" value={fileDate} disabled={busy || locked} onChange={(e) => { setFileDate(e.target.value); invalidate(); }} /></label>
      </div>}
      {headers.length > 0 && (
        <div className="mt-4"><span className={label}>Columns</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{headers.map((h) => (
            <label key={h} className="block text-sm"><span className="text-[rgb(var(--navy))]">{h}</span>
              <select className={input} aria-label={`Map ${h}`} disabled={busy || locked} value={mapping[h] ?? ""} onChange={(e) => { const m = { ...mapping }; if (e.target.value) m[h] = e.target.value; else delete m[h]; setMapping(m); invalidate(); }}>
                <option value="">Not used</option><option value="@person" disabled={!!personH && personH !== h}>Donor CPTID</option>
                {cols.map((c) => <option key={c} value={c} disabled={Object.entries(mapping).some(([k, v]) => v === c && k !== h)}>{c}</option>)}</select></label>))}</div></div>)}
      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto" data-testid="durable-rows"><table className="w-full min-w-[880px] text-left text-sm"><thead><tr className="text-xs uppercase text-[rgb(var(--ink))]/60"><th className="px-3 py-2">Row</th><th className="px-3 py-2">Donor</th><th className="px-3 py-2">Decision</th><th className="px-3 py-2">Existing row / Catapult Gift ID</th><th className="px-3 py-2">Check</th></tr></thead>
          <tbody>{shown.map(({ r, o }) => <tr key={o} className="border-t border-[rgb(var(--line))] align-top">
            <td className="px-3 py-2">{o + 1}</td><td className="px-3 py-2">{personH ? r[headers.indexOf(personH)] : "—"}</td>
            <td className="px-3 py-2"><select className={input} aria-label={`Decision row ${o + 1}`} disabled={busy || locked} value={choices[o]?.d ?? "held"} onChange={(e) => setChoice(o, { d: e.target.value as Choice["d"], target: "" })}>
              <option value="held">Held</option><option value="new">New gift</option><option value="adopt">Adopt existing row</option><option value="correct">Correct existing ID</option></select></td>
            <td className="px-3 py-2">{(choices[o]?.d === "adopt" || choices[o]?.d === "correct") && <div>
              <input className={input} aria-label={`Target row ${o + 1}`} disabled={busy || locked} value={choices[o].target} onChange={(e) => setChoice(o, { ...choices[o], target: e.target.value.trim() })} />
              <button type="button" className={`${linkBtn} mt-1 text-xs`} disabled={busy || locked || !personH} onClick={() => { void loadHistory(o); }}>Show this donor&apos;s gifts</button></div>}</td>
            <td className="px-3 py-2 text-xs">{choices[o]?.d === "held" ? "held" : !checks[o] ? "not checked" : checks[o].ok ? "eligible (advisory)" : <span className="text-red-700">held: {checks[o].reasons.join("; ")}</span>}</td></tr>)}</tbody></table>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[rgb(var(--ink))]/70" data-testid="durable-pager">
            <button type="button" className={linkBtn} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous rows</button>
            <span>Rows {page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length} (page {page + 1} of {pages})</span>
            <button type="button" className={linkBtn} disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next rows</button></div></div>)}
      {hist && choices[hist.o] && (choices[hist.o].d === "adopt" || choices[hist.o].d === "correct") && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[rgb(var(--line))] p-3" data-testid="durable-history">
          <p className="text-sm text-[rgb(var(--navy))]">Existing gifts for the donor on row {hist.o + 1} (exact donor CPTID; pick one explicitly, nothing is matched automatically).</p>
          <table className="mt-2 w-full min-w-[720px] text-left text-xs"><thead><tr className="uppercase text-[rgb(var(--ink))]/60"><th className="px-2 py-1">Row locator</th>{cols.map((c) => <th key={c} className="px-2 py-1">{c}</th>)}<th className="px-2 py-1">Catapult Gift ID</th><th className="px-2 py-1">Notes</th><th className="px-2 py-1" /></tr></thead>
            <tbody>{hist.rows.map((h) => { const adopt = choices[hist.o].d === "adopt"; const can = adopt ? !h.giftId : !!h.giftId;
              return <tr key={h.locator} className="border-t border-[rgb(var(--line))]"><td className="px-2 py-1">{h.locator}</td>{cols.map((c) => { const v = h.values?.[c]; return <td key={c} className="px-2 py-1">{!v ? "—" : v.readable ? (v.v ?? "(blank)") : "unreadable"}</td>; })}
                <td className="px-2 py-1 font-mono">{h.giftId ?? "none"}</td>
                <td className="px-2 py-1">{[h.matches !== undefined && "not unique", h.identityConflict && "identity conflict", h.donorMismatch && "donor drift"].filter(Boolean).join("; ")}</td>
                <td className="px-2 py-1"><button type="button" className={linkBtn} aria-label={`Pick locator ${h.locator}`} disabled={busy || locked || !can} onClick={() => setChoice(hist.o, { ...choices[hist.o], target: adopt ? String(h.locator) : h.giftId! })}>{adopt ? "Adopt this row" : "Correct this ID"}</button></td></tr>; })}</tbody></table>
          {!hist.rows.length && <p className="mt-2 text-xs">No existing gifts for this donor.</p>}
          {hist.hasMore && hist.next !== null && <button type="button" className={`${linkBtn} mt-2 text-xs`} disabled={busy} onClick={() => { void loadHistory(hist.o, hist.next!); }}>More gifts</button>}
        </div>)}
      {rows.length > 0 && <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={navyBtn} disabled={busy || locked || !personH} onClick={() => { void runChecks(); }}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Check decisions</button>
        <button type="button" className={navyBtn} disabled={busy || locked || !checks.length || !actor.trim()} onClick={() => { void makePlan(); }}>Plan save</button></div>}
      {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
      {plan && (
        <div className="mt-4 text-sm text-[rgb(var(--navy))]" data-testid="durable-plan">
          {restored && <button type="button" className={`${linkBtn} mb-2 block`} disabled={busy || locked} onClick={leaveRestored}>Leave restored job</button>}
          {restored && <p className="mb-2" data-testid="durable-restored">Restored job (read-only): {String(restored.fileName)}, entered by {String(restored.actor)} (as stated), source date {restored.fileDate ? String(restored.fileDate) : "unknown"}. Decisions come from the recovery file and cannot be edited here.</p>}
          <p><b>{plan.summary.decided}</b> rows will be saved in <b>{plan.summary.batches}</b> batch{plan.summary.batches === 1 ? "" : "es"}; <b>{plan.summary.held}</b> will stay held (not saved).</p>
          <label className="mt-2 block"><span className={label}>Job ID (copy it to look the job up later)</span>
            <span className="mt-1 flex gap-2"><input readOnly className={`${input} font-mono text-xs`} aria-label="Job ID" value={plan.jobId} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className={linkBtn} onClick={() => { void navigator.clipboard?.writeText(plan.jobId).catch(() => undefined); }}>Copy</button></span></label>
          <p className="mt-1" data-testid="durable-progress">{!batch.length ? "" : states.saved === batch.length && plan.summary.held === 0 ? "Complete." : `Partial: ${states.saved ?? 0} of ${batch.length} batches saved; ${states.unconfirmed ?? 0} unconfirmed; ${plan.summary.held} rows held.`}</p>
          <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={confirm} disabled={busy || locked} onChange={(e) => setConfirm(e.target.checked)} aria-label="Confirm whole-file save" />I reviewed the whole file: {plan.summary.decided} rows will be saved and {plan.summary.held} will stay held.</label>
          {!restored && <div className="mt-2"><button type="button" className={linkBtn} disabled={busy || !plan.recovery} onClick={downloadRecovery}>Download recovery file</button>
            <span className="ml-2 text-xs text-[rgb(var(--ink))]/70">Contains donor gift rows and original snapshots. Store it like the source export. It is not saved in this browser. Required before saving.</span></div>}
          {restored && <label className="mt-2 block"><span className={label}>Original CSV (for the review copy)</span><input type="file" accept=".csv,text/csv" aria-label="Original CSV" className={input} disabled={busy || locked} onChange={(e) => onOrig(e.currentTarget)} /></label>}
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={navyBtn} disabled={busy || !confirm || !C.saveAvailable || batch.includes("unconfirmed") || batch.includes("unknown") || !batch.includes("pending") || downloadedFor !== plan.jobId} onClick={() => { void saveAll(); }}>Save batches</button>
            <button type="button" className={navyBtn} disabled={busy || !Object.keys(proofs).length || (!!restored && !orig)} onClick={() => { void exportCopy(); }}>Download review copy</button></div>
          {!C.saveAvailable && <p className="mt-2 text-xs text-[rgb(var(--ink))]/60">Saving gift IDs is turned off.</p>}
          <ul className="mt-3 space-y-1" data-testid="durable-batches">{batch.map((s, i) => <li key={i} data-state={s}>Batch {i + 1}: {s === "saved" ? "saved" : s === "unconfirmed" ? "unconfirmed (may or may not be saved)" : s === "unknown" ? "status not checked yet" : s === "refused" ? "refused by Engage (nothing saved)" : "not sent yet"} {s !== "pending" && s !== "refused" && !proofs[i] && <button type="button" className={linkBtn} disabled={busy} onClick={() => { void checkBatch(i); }}>Check status</button>}{proofs[i] && " (verified)"}</li>)}</ul>
          {note && <p role="status" className="mt-2">{note}</p>}
        </div>)}
      {lookupJsx}
    </details>
  );
}
