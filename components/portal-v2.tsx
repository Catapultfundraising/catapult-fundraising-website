"use client";

import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PORTAL_V2, campaignByLevel, type PortalClient, type PortalState } from "@/lib/portal-v2/clients";

// Portal v2 shared UI: campaign progress bar, Campaign Donors (gift-chart levels),
// Add Prospect, manual gift/pledge entry, bulk client-file upload with preview, audit log + undo.

type V2State = PortalState & { goal: number; configured: boolean; error?: string };
interface Ctx { client: PortalClient; state: V2State | null; reload: () => Promise<void> }
const V2 = createContext<Ctx | null>(null);
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
const card = "rounded-lg border border-[rgb(var(--line))] bg-white p-5";
const input = "w-full rounded border border-[rgb(var(--line))] px-3 py-2 text-sm";
const btn = "rounded bg-[rgb(var(--navy))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
const btn2 = "rounded border border-[rgb(var(--navy))] px-4 py-2 text-sm font-medium text-[rgb(var(--navy))] disabled:opacity-50";
const th = "px-3 py-2 text-left text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55";
const td = "px-3 py-2 text-sm";

export function PortalV2Provider({ client, children }: { client: PortalClient; children: React.ReactNode }) {
  const [state, setState] = useState<V2State | null>(null);
  const reload = useCallback(async () => {
    const r = await fetch(PORTAL_V2[client].api, { cache: "no-store" });
    setState(r.ok ? await r.json() : null);
  }, [client]);
  useEffect(() => { void reload(); }, [reload]);
  return <V2.Provider value={{ client, state, reload }}>{children}</V2.Provider>;
}
function useV2() { const c = useContext(V2); if (!c) throw new Error("PortalV2Provider missing"); return c; }
async function post(client: PortalClient, body: unknown) {
  const r = await fetch(PORTAL_V2[client].api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
function useBy() {
  const [by, setBy] = useState("");
  useEffect(() => { setBy(localStorage.getItem("portal-v2-by") ?? ""); }, []);
  return [by, (v: string) => { setBy(v); localStorage.setItem("portal-v2-by", v); }] as const;
}

/** Progress toward the campaign goal (gifts + pledges, no double counting of pledge payments). */
export function CampaignProgress() {
  const { client, state } = useV2();
  const cfg = PORTAL_V2[client];
  const goal = state?.goal ?? cfg.goal;
  const c = useMemo(() => campaignByLevel(cfg.chart(goal), state?.gifts ?? []), [cfg, goal, state]);
  if (!state) return null;
  const share = Math.min(1, c.raised / goal);
  return (
    <div className={`${card} mb-6`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Campaign progress</p>
          <p className="font-display text-2xl text-[rgb(var(--navy))]">{usd(c.raised)} <span className="text-base text-[rgb(var(--ink))]/60">of {usd(goal)} goal</span></p>
        </div>
        <p className="text-sm text-[rgb(var(--ink))]/70">{pct(c.raised / goal)} secured · {c.donors.length} donors · gifts {usd(c.totalGifts)} · pledges {usd(c.totalPledges)}</p>
      </div>
      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-[rgb(var(--paper))]" role="progressbar" aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[rgb(var(--brass))]" style={{ width: `${share * 100}%` }} />
      </div>
      {!state.configured && <p className="mt-2 text-xs text-red-700">Campaign entries are unavailable right now ({state.error}).</p>}
    </div>
  );
}

export function CampaignDonors() {
  const { client, state } = useV2();
  const cfg = PORTAL_V2[client];
  const [goalText, setGoalText] = useState(String(cfg.goal));
  const goal = Math.min(500_000_000, Math.max(100_000, Number(goalText.replace(/[^\d]/g, "")) || cfg.goal));
  const c = useMemo(() => campaignByLevel(cfg.chart(goal), state?.gifts ?? []), [cfg, goal, state]);
  const [open, setOpen] = useState<number | null>(null);
  if (!state) return <p className="text-sm">Loading…</p>;
  return (
    <div className="space-y-6">
      <CampaignProgress />
      <div className={card}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-[rgb(var(--navy))]">Campaign donors by gift-chart level</h2>
            <p className="text-sm text-[rgb(var(--ink))]/65">Gifts and pledges from client uploads and portal entries. Each donor sits at the highest level their commitment reaches (the larger of pledged or given, so pledge payments are not counted twice).</p>
          </div>
          <label className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Campaign goal
            <input className={`${input} mt-1 w-40`} value={goalText} onChange={(e) => setGoalText(e.target.value)} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[rgb(var(--line))]">
              <th className={th}>Gift level</th><th className={`${th} text-right`}>Gifts needed</th><th className={`${th} text-right`}>Secured</th><th className={`${th} text-right`}>Remaining</th>
              <th className={`${th} text-right`}>Level total</th><th className={`${th} text-right`}>Secured $</th><th className={`${th} text-right`}>Remaining $</th>
            </tr></thead>
            <tbody>
              {c.levels.map((l) => (
                <Fragment key={l.level}>
                  <tr className="cursor-pointer border-b border-[rgb(var(--line))] hover:bg-[rgb(var(--paper))]" onClick={() => setOpen(open === l.level ? null : l.level)}>
                    <td className={`${td} font-medium`}>{usd(l.level)} {l.donors.length > 0 && <span className="text-xs text-[rgb(var(--ink))]/50">{open === l.level ? "▾" : "▸"}</span>}</td>
                    <td className={`${td} text-right`}>{l.gifts}</td><td className={`${td} text-right`}>{l.secured}</td><td className={`${td} text-right`}>{l.remaining}</td>
                    <td className={`${td} text-right`}>{usd(l.value)}</td><td className={`${td} text-right`}>{usd(l.securedValue)}</td><td className={`${td} text-right`}>{usd(l.remainingValue)}</td>
                  </tr>
                  {open === l.level && l.donors.map((d) => (
                    <tr key={`${l.level}-${d.key}`} className="bg-[rgb(var(--paper))]/60 text-[rgb(var(--ink))]/80">
                      <td className={`${td} pl-8`} colSpan={3}>{d.name}{d.cptid ? <span className="text-xs text-[rgb(var(--ink))]/50"> · CPTID {d.cptid}</span> : null}</td>
                      <td className={td} colSpan={2}>Pledged {usd(d.pledges)} · Given {usd(d.gifts)}</td>
                      <td className={`${td} text-right`} colSpan={2}>{usd(d.credit)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr className="border-b border-[rgb(var(--line))]">
                <td className={td}>Below chart levels</td><td className={`${td} text-right`}>—</td><td className={`${td} text-right`}>{c.below.length}</td><td className={td} />
                <td className={td} /><td className={`${td} text-right`}>{usd(c.belowValue)}</td><td className={td} />
              </tr>
              <tr className="font-semibold">
                <td className={td}>Total</td><td className={td} /><td className={`${td} text-right`}>{c.donors.length}</td><td className={td} />
                <td className={`${td} text-right`}>{usd(goal)}</td><td className={`${td} text-right`}>{usd(c.raised)}</td><td className={`${td} text-right`}>{usd(Math.max(0, goal - c.raised))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <GiftForm />
      <div className={card}>
        <h3 className="font-display text-lg text-[rgb(var(--navy))]">All campaign gifts and pledges</h3>
        <div className="mt-3 max-h-[480px] overflow-auto">
          <table className="w-full"><thead><tr className="border-b border-[rgb(var(--line))]"><th className={th}>Date</th><th className={th}>Donor</th><th className={th}>Type</th><th className={`${th} text-right`}>Amount</th><th className={th}>Source</th><th className={th}>Note</th></tr></thead>
            <tbody>{[...state.gifts].reverse().map((g) => (
              <tr key={g.id} className="border-b border-[rgb(var(--line))]"><td className={td}>{g.gift_date ?? ""}</td><td className={td}>{g.donor_name}{g.cptid ? <span className="text-xs text-[rgb(var(--ink))]/50"> · {g.cptid}</span> : null}</td>
                <td className={td}>{g.kind === "pledge" ? "Pledge" : "Gift"}</td><td className={`${td} text-right`}>{usd(Number(g.amount))}</td><td className={td}>{g.source === "upload" ? "Client file" : "Portal entry"}</td><td className={td}>{g.note ?? ""}</td></tr>
            ))}</tbody></table>
          {!state.gifts.length && <p className="py-4 text-sm text-[rgb(var(--ink))]/60">No campaign gifts or pledges recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}

function GiftForm() {
  const { client, reload } = useV2();
  const [by, setBy] = useBy();
  const [f, setF] = useState({ donorName: "", cptid: "", kind: "pledge", amount: "", date: "", note: "" });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setMsg("");
    try { await post(client, { op: "addGift", by, gift: f }); setF({ donorName: "", cptid: "", kind: f.kind, amount: "", date: "", note: "" }); setMsg("Saved."); await reload(); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className={card}>
      <h3 className="font-display text-lg text-[rgb(var(--navy))]">Record a gift or pledge</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-6">
        <input className={`${input} md:col-span-2`} placeholder="Donor name *" value={f.donorName} onChange={(e) => setF({ ...f, donorName: e.target.value })} />
        <input className={input} placeholder="CPTID (if known)" value={f.cptid} onChange={(e) => setF({ ...f, cptid: e.target.value })} />
        <select className={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="pledge">Pledge</option><option value="gift">Gift</option></select>
        <input className={input} placeholder="Amount *" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <input className={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input className={`${input} md:col-span-4`} placeholder="Note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        <input className={input} placeholder="Your name" value={by} onChange={(e) => setBy(e.target.value)} />
        <button className={btn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

const EMPTY_P = { firstName: "", lastName: "", orgName: "", clientId: "", address1: "", city: "", state: "", zip: "", email: "", phone: "", note: "" };
export function AddProspect() {
  const { client, reload } = useV2();
  const [by, setBy] = useBy();
  const [p, setP] = useState(EMPTY_P);
  const [dups, setDups] = useState<{ cptid: number; name: string; address: string; clientId: string }[] | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const save = async (force = false) => {
    setBusy(true); setMsg("");
    try {
      const r = await post(client, { op: "addProspect", by, force, prospect: p });
      if (r.duplicates) { setDups(r.duplicates); return; }
      setDups(null); setP(EMPTY_P); setMsg(`Added with CPTID ${r.cptid}.`); await reload();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const fld = (k: keyof typeof EMPTY_P, ph: string, cls = "") => <input className={`${input} ${cls}`} placeholder={ph} value={p[k]} onChange={(e) => { setP({ ...p, [k]: e.target.value }); setDups(null); }} />;
  return (
    <div className={card}>
      <h3 className="font-display text-lg text-[rgb(var(--navy))]">Add prospect</h3>
      <p className="text-sm text-[rgb(var(--ink))]/65">Assigns the next unused CPTID for this client. You will be warned first if a record with the same name or address already exists.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        {fld("firstName", "First name")}{fld("lastName", "Last name")}{fld("orgName", "Organization (if not a person)", "md:col-span-2")}
        {fld("clientId", PORTAL_V2[client].clientIdLabel)}{fld("address1", "Street address", "md:col-span-3")}
        {fld("city", "City")}{fld("state", "State")}{fld("zip", "ZIP")}{fld("phone", "Phone")}
        {fld("email", "Email", "md:col-span-2")}{fld("note", "Note", "md:col-span-2")}
        <input className={input} placeholder="Your name" value={by} onChange={(e) => setBy(e.target.value)} />
        <button className={btn} disabled={busy} onClick={() => save(false)}>{busy ? "Saving…" : "Add prospect"}</button>
      </div>
      {dups && (
        <div className="mt-4 rounded border border-amber-400 bg-amber-50 p-4 text-sm">
          <p className="font-medium">Possible duplicate{dups.length > 1 ? "s" : ""} already on file:</p>
          <ul className="mt-2 list-disc pl-5">{dups.map((d) => <li key={d.cptid}>{d.name || "(no name)"} · CPTID {d.cptid}{d.clientId ? ` · ${PORTAL_V2[client].clientIdLabel} ${d.clientId}` : ""}{d.address ? ` · ${d.address}` : ""}</li>)}</ul>
          <div className="mt-3 flex gap-2"><button className={btn2} onClick={() => setDups(null)}>Cancel</button><button className={btn} disabled={busy} onClick={() => save(true)}>Add anyway</button></div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

interface Preview { fileName: string; rows: number; mapped: Record<string, string>; newRows: { line: number; prospect: Record<string, string>; possibleDuplicates: { cptid: number; name: string }[] }[];
  changed: { line: number; cptid: number; name: string; how: string; changes: { field: string; oldValue: string | null; newValue: string }[] }[]; unchanged: number;
  gifts: { line: number; donorName: string; kind: string; amount: number; date: string | null; cptid: number | null }[]; duplicateGifts: number; idsLoaded: boolean }
export function UploadClientFile() {
  const { client, reload } = useV2();
  const [by, setBy] = useBy();
  const [file, setFile] = useState<File | null>(null);
  const [pv, setPv] = useState<Preview | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const send = async (confirm: boolean) => {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const fd = new FormData(); fd.set("file", file); fd.set("by", by); if (confirm) fd.set("confirm", "1");
      const r = await fetch(PORTAL_V2[client].api, { method: "POST", body: fd });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
      if (confirm) { setPv(null); setFile(null); setMsg(j.applied ? `Applied: ${j.newRows} new, ${j.changed} changed, ${j.gifts} gifts/pledges (batch ${j.batchId}).` : j.message); await reload(); }
      else setPv(j);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className={card}>
      <h3 className="font-display text-lg text-[rgb(var(--navy))]">Upload client file</h3>
      <p className="text-sm text-[rgb(var(--ink))]/65">Excel or CSV from the client. Rows match on the client&apos;s {PORTAL_V2[client].clientIdLabel}, then on name + address. Nothing is saved until you review the preview and confirm. Gift and pledge columns (amount, pledge amount, type, date) are added to campaign donors.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPv(null); }} />
        <input className={`${input} w-48`} placeholder="Your name" value={by} onChange={(e) => setBy(e.target.value)} />
        <button className={btn2} disabled={!file || busy} onClick={() => send(false)}>{busy && !pv ? "Reading…" : "Preview"}</button>
      </div>
      {pv && (
        <div className="mt-4 space-y-4 text-sm">
          <p><strong>{pv.fileName}</strong>: {pv.rows} rows · <strong>{pv.newRows.length}</strong> new · <strong>{pv.changed.length}</strong> changed · {pv.unchanged} unchanged · <strong>{pv.gifts.length}</strong> gifts/pledges{pv.duplicateGifts ? ` (${pv.duplicateGifts} already recorded, skipped)` : ""}</p>
          <p className="text-xs text-[rgb(var(--ink))]/60">Columns used: {Object.entries(pv.mapped).map(([k, v]) => `${k} ← "${v}"`).join(" · ") || "none recognised"}{!pv.idsLoaded && " · client ID index not built yet, matching on name + address only"}</p>
          {pv.newRows.length > 0 && <details open><summary className="cursor-pointer font-medium">New records ({pv.newRows.length}) — each gets a new CPTID</summary>
            <table className="mt-2 w-full"><tbody>{pv.newRows.slice(0, 300).map((n) => (
              <tr key={n.line} className="border-b border-[rgb(var(--line))]"><td className={td}>Row {n.line}</td><td className={td}>{n.prospect.fullName}</td><td className={td}>{n.prospect.clientId}</td><td className={td}>{[n.prospect.address1, n.prospect.city, n.prospect.zip].filter(Boolean).join(", ")}</td>
                <td className={`${td} text-amber-700`}>{n.possibleDuplicates.length ? `Possible duplicate: ${n.possibleDuplicates.map((d) => `${d.name} (${d.cptid})`).join(", ")}` : ""}</td></tr>))}</tbody></table></details>}
          {pv.changed.length > 0 && <details><summary className="cursor-pointer font-medium">Changed records ({pv.changed.length})</summary>
            <table className="mt-2 w-full"><tbody>{pv.changed.slice(0, 300).map((c) => (
              <tr key={c.line} className="border-b border-[rgb(var(--line))]"><td className={td}>Row {c.line}</td><td className={td}>{c.name} · CPTID {c.cptid}<span className="text-xs text-[rgb(var(--ink))]/50"> ({c.how})</span></td>
                <td className={td}>{c.changes.map((x) => `${x.field}: ${x.oldValue ?? "(blank)"} → ${x.newValue}`).join("; ")}</td></tr>))}</tbody></table></details>}
          {pv.gifts.length > 0 && <details><summary className="cursor-pointer font-medium">Gifts and pledges ({pv.gifts.length})</summary>
            <table className="mt-2 w-full"><tbody>{pv.gifts.slice(0, 300).map((g, i) => (
              <tr key={i} className="border-b border-[rgb(var(--line))]"><td className={td}>Row {g.line}</td><td className={td}>{g.donorName}</td><td className={td}>{g.kind}</td><td className={`${td} text-right`}>{usd(g.amount)}</td><td className={td}>{g.date ?? ""}</td></tr>))}</tbody></table></details>}
          <div className="flex gap-2"><button className={btn2} onClick={() => setPv(null)}>Cancel</button><button className={btn} disabled={busy} onClick={() => send(true)}>{busy ? "Saving…" : "Confirm and save"}</button></div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

export function AuditLog() {
  const { client, state, reload } = useV2();
  const [by] = useBy();
  const [busy, setBusy] = useState<number | null>(null); const [msg, setMsg] = useState("");
  const undo = async (id: number) => {
    if (!confirm(`Undo batch ${id}? Every record, change and gift it added will be removed from the portal (kept in the audit log).`)) return;
    setBusy(id); setMsg("");
    try { await post(client, { op: "undo", batchId: id, by }); await reload(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  };
  if (!state) return null;
  return (
    <div className={card}>
      <h3 className="font-display text-lg text-[rgb(var(--navy))]">Change log</h3>
      <div className="mt-3 max-h-[420px] overflow-auto">
        <table className="w-full"><thead><tr className="border-b border-[rgb(var(--line))]"><th className={th}>When</th><th className={th}>What</th><th className={th}>By</th><th className={`${th} text-right`}>New</th><th className={`${th} text-right`}>Changed</th><th className={`${th} text-right`}>Gifts</th><th className={th} /></tr></thead>
          <tbody>{state.batches.map((b) => (
            <tr key={b.id} className={`border-b border-[rgb(var(--line))] ${b.undone_at ? "text-[rgb(var(--ink))]/40 line-through" : ""}`}>
              <td className={td}>{new Date(b.created_at).toLocaleString()}</td><td className={td}>{b.kind === "upload" ? `File: ${b.file_name}` : `Entry: ${b.file_name}`}</td><td className={td}>{b.created_by}</td>
              <td className={`${td} text-right`}>{b.new_rows}</td><td className={`${td} text-right`}>{b.changed_rows}</td><td className={`${td} text-right`}>{b.gift_rows}</td>
              <td className={td}>{b.undone_at ? <span className="no-underline">Undone {new Date(b.undone_at).toLocaleDateString()}</span> : <button className="text-sm text-[rgb(var(--navy))] underline" disabled={busy === b.id} onClick={() => undo(b.id)}>Undo</button>}</td>
            </tr>))}</tbody></table>
        {!state.batches.length && <p className="py-4 text-sm text-[rgb(var(--ink))]/60">No changes yet.</p>}
      </div>
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
    </div>
  );
}

export function AddAndUpload() {
  const { state } = useV2();
  return (
    <div className="space-y-6">
      <AddProspect />
      <UploadClientFile />
      <AuditLog />
      {state && state.prospects.length > 0 && (
        <div className={card}>
          <h3 className="font-display text-lg text-[rgb(var(--navy))]">Prospects added in the portal ({state.prospects.length})</h3>
          <div className="mt-3 max-h-[420px] overflow-auto"><table className="w-full"><tbody>{[...state.prospects].reverse().map((p) => (
            <tr key={p.id} className="border-b border-[rgb(var(--line))]"><td className={td}>CPTID {p.cptid}</td><td className={td}>{p.full_name}</td><td className={td}>{p.client_id ?? ""}</td><td className={td}>{[p.address1, p.city, p.state, p.zip].filter(Boolean).join(", ")}</td><td className={td}>{p.source === "upload" ? "Client file" : "Portal entry"}</td></tr>
          ))}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
