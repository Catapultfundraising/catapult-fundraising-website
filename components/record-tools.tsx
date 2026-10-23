"use client";

// Shared record tools for every client data dashboard (JAG, CSNF, PVAS, WCBHC, BAQ):
// editable contact info with old-contact history, wealth screening (DonorSearch + PIR + staff edits),
// giving grouped by year with each gift in a dropdown, and duplicate merge / delete.
// Every change is saved in Azure SQL through /api/{client}-data-v2 (Engage portal_updates); the Monday refresh never overwrites it.

import { useEffect, useMemo, useState } from "react";
import { useRecordNav } from "@/components/dashboard-shared";
import { ChevronDown, ChevronRight, GitMerge, Pencil, RotateCcw, Search, Trash2, X } from "lucide-react";

type AnyRec = {
  cptid: number; name: string; kind?: string; contact?: Record<string, string | undefined>; ds?: Record<string, string> | null;
  summary?: { lifetime?: number }; gifts?: GiftRow[];
  contactHistory?: { key: string; label: string; from: string; to: string; by: string; at: string }[];
  wealth?: { edits?: { capacity?: Edit; rating?: Edit }; screening?: Screening | null; pending?: boolean; requested?: { at: string; by: string } | null; original?: Record<string, string> | null };
  mergedFrom?: { cptid: number; name: string; contact: Record<string, string>; lifetime: number }[];
  redirectedFrom?: { cptid: number; name: string };
  deleted?: { reason: string; by: string; at: string };
  dsFromScreening?: boolean; dsFromCptid?: number;
};
type Edit = { value: string; from: string; by: string; at: string };
type Screening = { status: "matched" | "no_match" | "error"; fields?: Record<string, string>; quality?: number; message?: string; note?: string; by: string; at: string };
export type GiftRow = { date?: string; amount: number; stage?: string; type?: string; campaign?: string; allocation?: string; status?: string; fund?: string; fromCptid?: number };
type IdxRow = { cptid: number; name: string; city?: string; lifetime?: number; kind?: string };

const usd = (n: number, d = 0) => (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const day = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(+d) ? String(iso).slice(0, 10) : d.toLocaleDateString("en-US"); };
const usDate = (d?: string) => { const x = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? ""); return x ? `${x[2]}/${x[3]}/${x[1]}` : d || "Undated"; };
const inputCls = "w-full rounded-md border border-[rgb(var(--line))] px-2.5 py-1.5 text-sm";
const btn = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50";
const navyBtn = `${btn} bg-[rgb(var(--navy))] text-white`;
const lineBtn = `${btn} border border-[rgb(var(--navy))] text-[rgb(var(--navy))]`;

/** Same "Your name" the tracking panel keeps per client. */
function useBy(client: string) {
  const [by, setBy] = useState("");
  useEffect(() => { setBy(localStorage.getItem(`${client}-by`) ?? ""); }, [client]);
  return [by, (v: string) => { setBy(v); localStorage.setItem(`${client}-by`, v); }] as const;
}
async function v2(client: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/${client}-data-v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Could not save (error ${r.status})`);
  return j;
}
/** Tell the dashboard's record index to reload (after a merge, delete or restore). */
export const refreshCrmIndex = () => window.dispatchEvent(new Event("crm-index-refresh"));

function Sec({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--line))] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--brass))]">{title}</h4>
        {right && <span className="ml-auto flex flex-wrap gap-2">{right}</span>}
      </div>
      {children}
    </div>
  );
}
function Field({ k, v, note }: { k: string; v?: string | number | null; note?: React.ReactNode }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="flex gap-3 border-b border-[rgb(var(--line))]/60 py-1.5 text-sm">
      <span className="w-40 shrink-0 text-[rgb(var(--ink))]/55">{k}</span>
      <span className="text-[rgb(var(--navy))]">{v}{note && <span className="ml-2 text-[11px] text-[rgb(var(--ink))]/55">{note}</span>}</span>
    </div>
  );
}
function NameBox({ by, setBy }: { by: string; setBy: (v: string) => void }) {
  return (
    <label className="text-xs">Your name
      <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Required to save" className={inputCls} />
    </label>
  );
}

// ---------------------------------------------------------------- Contact
const EDIT_FIELDS: { key: string; label: string; wide?: boolean }[] = [
  { key: "street", label: "Street address", wide: true }, { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "zip", label: "ZIP" },
  { key: "phone", label: "Phone" }, { key: "mobile", label: "Mobile" }, { key: "phone2", label: "Phone 2" },
  { key: "email", label: "Email" }, { key: "email2", label: "Email 2" }, { key: "workEmail", label: "Work email" },
];
export function ContactSection({ client, r, onSaved }: { client: string; r: AnyRec; onSaved: () => void }) {
  const c = r.contact ?? {};
  const [editing, setEditing] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [by, setBy] = useBy(client);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showOld, setShowOld] = useState(false);
  const street = c.street || c.address || "";
  const start = () => { setVals(Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, String((f.key === "street" ? street : c[f.key]) ?? "")]))); setErr(""); setEditing(true); };
  async function save() {
    if (!by.trim()) { setErr("Enter your name so the change is credited to you"); return; }
    setBusy(true); setErr("");
    try {
      const current = Object.fromEntries(EDIT_FIELDS.map((f) => [f.key, String((f.key === "street" ? street : c[f.key]) ?? "")]));
      await v2(client, { op: "setContact", cptid: r.cptid, changes: vals, current, by });
      setEditing(false); onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const hist = r.contactHistory ?? [];
  return (
    <Sec title="Contact" right={!editing && <button onClick={start} className={lineBtn}><Pencil className="h-3.5 w-3.5" />Edit contact</button>}>
      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {EDIT_FIELDS.map((f) => (
              <label key={f.key} className={`text-xs ${f.wide ? "col-span-2 md:col-span-3" : ""}`}>{f.label}
                <input value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className={inputCls} />
              </label>
            ))}
            <div className="col-span-2 md:col-span-1"><NameBox by={by} setBy={setBy} /></div>
          </div>
          <p className="text-[11px] text-[rgb(var(--ink))]/55">The values you replace are kept under Old contact information. The Monday refresh never overwrites these changes.</p>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className={navyBtn}>{busy ? "Saving..." : "Save contact"}</button>
            <button onClick={() => setEditing(false)} className="text-xs underline">Cancel</button>
          </div>
          {err && <p className="text-xs text-red-700">{err}</p>}
        </div>
      ) : (
        <>
          <Field k="Formal greeting" v={c.greeting} /><Field k="Salutation" v={c.salutation} /><Field k="Primary contact" v={c.primaryContact} />
          <Field k="Title" v={c.title} /><Field k="Affiliation" v={c.affiliation} /><Field k="Organization" v={c.org} />
          <Field k="Address" v={[street, c.city, c.state, c.zip].filter(Boolean).join(", ")} />
          <Field k="Phone" v={c.phone} /><Field k="Mobile" v={c.mobile} /><Field k="Phone 2" v={c.phone2} />
          <Field k="Email" v={c.email} /><Field k="Email 2" v={c.email2} /><Field k="Work email" v={c.workEmail} />
          <Field k="Spouse" v={c.spouse} /><Field k="Marital status" v={c.marital} /><Field k="Birthdate" v={c.birthdate} />
          {!Object.values(c).some(Boolean) && <p className="text-sm text-[rgb(var(--ink))]/55">No contact details on file. Use Edit contact to add them.</p>}
        </>
      )}
      {(r.mergedFrom ?? []).some((m) => Object.values(m.contact).some(Boolean)) && (
        <div className="mt-3 rounded-lg bg-[rgb(var(--paper))] p-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/60">Contact info from merged records</p>
          {(r.mergedFrom ?? []).map((m) => (
            <p key={m.cptid} className="text-xs">{m.name} (CPTID {m.cptid}): {[m.contact.street || m.contact.address, m.contact.city, m.contact.state, m.contact.zip].filter(Boolean).join(", ")}{[m.contact.phone, m.contact.mobile, m.contact.email].filter(Boolean).length ? ` · ${[m.contact.phone, m.contact.mobile, m.contact.email].filter(Boolean).join(" · ")}` : ""}</p>
          ))}
        </div>
      )}
      {hist.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowOld(!showOld)} className="inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--navy))]">
            {showOld ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}Old contact information ({hist.length})
          </button>
          {showOld && (
            <div className="mt-1 max-h-56 overflow-auto rounded-lg border border-[rgb(var(--line))]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[rgb(var(--paper))] text-left"><tr><th className="px-2 py-1">Field</th><th className="px-2 py-1">Old value</th><th className="px-2 py-1">Changed to</th><th className="px-2 py-1">By</th><th className="px-2 py-1">Date</th></tr></thead>
                <tbody>
                  {hist.map((h, i) => (
                    <tr key={i} className="border-t border-[rgb(var(--line))]/60">
                      <td className="px-2 py-1">{h.label}</td><td className="px-2 py-1 text-[rgb(var(--ink))]/70 line-through decoration-[rgb(var(--ink))]/30">{h.from || "(blank)"}</td>
                      <td className="px-2 py-1">{h.to || "(blank)"}</td><td className="px-2 py-1">{h.by}</td><td className="px-2 py-1">{day(h.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Sec>
  );
}

// ---------------------------------------------------------------- Wealth
const CAP_KEYS = ["Wealth-Based Capacity", "Capacity", "Estimated Capacity", "Wealth Capacity"];
const RATING_KEYS = ["DS Rating", "DS_Rating", "Rating"];
const pick = (o: Record<string, string> | null | undefined, keys: string[]) => { for (const k of keys) if (o?.[k]) return String(o[k]); return ""; };

export function WealthSection({ client, r, pirName, onSaved }: { client: string; r: AnyRec; pirName?: string; onSaved: () => void }) {
  const w = r.wealth ?? {};
  const ds = r.ds && Object.keys(r.ds).length ? r.ds : null;
  const dsCap = pick(ds, CAP_KEYS), dsRating = pick(ds, RATING_KEYS);
  const [pir, setPir] = useState<{ found: boolean; capacity?: string; rating?: string; profile?: string; updatedAt?: string; status?: string } | null>(null);
  const [edit, setEdit] = useState<"capacity" | "rating" | null>(null);
  const [val, setVal] = useState("");
  const [by, setBy] = useBy(client);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [screenForm, setScreenForm] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    setPir(null);
    if (!pirName) return;
    v2(client, { op: "pirWealth", pirName, name: r.name }).then(setPir).catch(() => setPir({ found: false }));
  }, [client, pirName, r.name]);
  const pirCap = pir?.found ? pir.capacity ?? "" : "", pirRating = pir?.found ? pir.rating ?? "" : "";
  const capEdit = w.edits?.capacity, ratingEdit = w.edits?.rating;
  // What the dashboard uses: staff edit, then the PIR, then DonorSearch.
  const capacity = capEdit?.value || pirCap || dsCap, capSrc = capEdit ? "Edited" : pirCap ? "From PIR" : dsCap ? "DonorSearch" : "";
  const rating = ratingEdit?.value || pirRating || dsRating, ratingSrc = ratingEdit ? "Edited" : pirRating ? "From PIR" : dsRating ? "DonorSearch" : "";

  async function saveEdit() {
    if (!by.trim()) { setErr("Enter your name so the change is credited to you"); return; }
    setBusy(true); setErr("");
    try {
      await v2(client, { op: "setWealth", cptid: r.cptid, field: edit, value: val, current: edit === "capacity" ? capacity : rating, by });
      setEdit(null); onSaved();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  function openScreen() {
    const parts = r.name.replace(/\s+(and|&)\s+.*$/i, "").trim().split(/\s+/);
    const c = r.contact ?? {};
    setScreenForm({ first: parts.length > 1 ? parts.slice(0, -1).join(" ") : "", last: parts.length > 1 ? parts[parts.length - 1] : (parts[0] ?? ""),
      street: String(c.street || c.address || ""), city: String(c.city ?? ""), state: String(c.state ?? ""), zip: String(c.zip ?? "") });
    setErr("");
  }
  async function runScreen() {
    if (!by.trim()) { setErr("Enter your name so the request is credited to you"); return; }
    if (!screenForm?.first || !screenForm.last || !screenForm.state) { setErr("DonorSearch needs a first name, last name and state"); return; }
    setBusy(true); setErr("");
    try { await v2(client, { op: "requestScreening", cptid: r.cptid, inputs: screenForm, by }); setScreenForm(null); onSaved(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const scr = w.screening;
  const org = (r.kind ?? "").toLowerCase().includes("org") || (r.kind ?? "").toLowerCase().includes("found") || (r.kind ?? "").toLowerCase().includes("corp") || (r.kind ?? "").toLowerCase().includes("business");
  return (
    <Sec title="Wealth screening" right={!edit && !screenForm && !w.pending && !org && <button onClick={openScreen} className={lineBtn}><Search className="h-3.5 w-3.5" />{ds || scr ? "Re-run screening" : "Run wealth screening"}</button>}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {([["capacity", "Wealth capacity", capacity, capSrc, capEdit], ["rating", "Wealth rating", rating, ratingSrc, ratingEdit]] as const).map(([k, label, v, src, ed]) => (
          <div key={k} className="rounded-lg border border-[rgb(var(--brass))]/50 bg-[rgb(var(--brass))]/5 p-2.5">
            <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>
            {edit === k ? (
              <div className="mt-1 space-y-1.5">
                <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEdit(null); }}
                  placeholder={k === "capacity" ? "e.g. $250,000 - $499,999" : "e.g. DS1-2"} className={inputCls} />
                <NameBox by={by} setBy={setBy} />
                <div className="flex gap-2"><button onClick={saveEdit} disabled={busy} className={navyBtn}>{busy ? "Saving..." : "Save"}</button><button onClick={() => setEdit(null)} className="text-xs underline">Cancel</button></div>
              </div>
            ) : (
              <>
                <p className="mt-0.5 font-display text-lg text-[rgb(var(--navy))]">{v || "Not screened"}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[rgb(var(--ink))]/60">
                  {src && <span className="rounded-full bg-white px-2 py-0.5">{src}</span>}
                  {ed && <span>by {ed.by} · {day(ed.at)}{ed.from ? ` · was ${ed.from}` : ""}</span>}
                  <button onClick={() => { setVal(v); setEdit(k); setErr(""); }} className="underline">Edit</button>
                  {ed && <button onClick={async () => { setBusy(true); try { await v2(client, { op: "setWealth", cptid: r.cptid, field: k, value: "", current: ed.value, by: by || "dashboard" }); onSaved(); } finally { setBusy(false); } }} className="underline">Undo edit</button>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {pir?.found && (
        <p className="mb-2 rounded-md bg-[rgb(var(--paper))] px-2.5 py-1.5 text-xs">PIR ({pir.profile}{pir.updatedAt ? `, updated ${day(pir.updatedAt)}` : ""}): capacity {pir.capacity || "not stated"}, rating {pir.rating || "not stated"}. The PIR wins over DonorSearch unless someone edits the value.</p>
      )}
      {w.pending && <p className="mb-2 rounded-md bg-[rgb(var(--brass))]/15 px-2.5 py-1.5 text-xs text-[rgb(var(--navy))]">DonorSearch screening requested{w.requested ? ` by ${w.requested.by} on ${day(w.requested.at)}` : ""}. Results usually land here within 15 minutes.</p>}
      {scr && !w.pending && scr.status !== "matched" && (
        <p className="mb-2 rounded-md bg-[rgb(var(--paper))] px-2.5 py-1.5 text-xs">Last DonorSearch screening ({day(scr.at)}): {scr.status === "no_match" ? "no confident match. Check the name, city and state, then re-run." : `could not run (${scr.message ?? "error"}).`}</p>
      )}
      {screenForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-[rgb(var(--line))] bg-white p-3">
          <p className="text-sm font-semibold text-[rgb(var(--navy))]">Run a DonorSearch wealth screening</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {[["first", "First name"], ["last", "Last name"], ["street", "Street"], ["city", "City"], ["state", "State (2 letters)"], ["zip", "ZIP"]].map(([k, l]) => (
              <label key={k} className="text-xs">{l}<input value={screenForm[k] ?? ""} onChange={(e) => setScreenForm({ ...screenForm, [k]: e.target.value })} className={inputCls} /></label>
            ))}
            <NameBox by={by} setBy={setBy} />
          </div>
          <p className="text-[11px] text-[rgb(var(--ink))]/55">Only a confident DonorSearch match (quality score 17 or higher) is saved to the record.</p>
          <div className="flex gap-2"><button onClick={runScreen} disabled={busy} className={navyBtn}>{busy ? "Requesting..." : "Run screening"}</button><button onClick={() => setScreenForm(null)} className="text-xs underline">Cancel</button></div>
        </div>
      )}
      {err && <p className="mb-2 text-xs text-red-700">{err}</p>}
      {ds ? (
        <>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/60">
            DonorSearch{r.dsFromScreening && scr ? ` (screened ${day(scr.at)} from the dashboard${scr.note ? `, ${scr.note}` : ""})` : r.dsFromCptid ? ` (from merged CPTID ${r.dsFromCptid})` : ""}
          </p>
          {Object.entries(ds).map(([k, v]) => <Field key={k} k={k} v={v} />)}
        </>
      ) : !w.pending && <p className="text-sm text-[rgb(var(--ink))]/55">{org ? "Organizations are not wealth screened. Enter a capacity with Edit if you have one." : "Not screened yet."}</p>}
    </Sec>
  );
}

// ---------------------------------------------------------------- Giving by year
const NOT_COUNTED = /^(pledge|refunded|disputed|pending|failed|cancel)/i;
export function GiftsByYear({ gifts, title = "Giving by calendar year", showDetail = true }: { gifts: GiftRow[]; title?: string; showDetail?: boolean }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const years = useMemo(() => {
    const m = new Map<string, GiftRow[]>();
    for (const g of gifts) { const y = /^\d{4}/.exec(g.date ?? "")?.[0] ?? "Undated"; (m.get(y) ?? m.set(y, []).get(y)!).push(g); }
    return [...m.entries()].sort((a, b) => (a[0] === "Undated" ? 1 : b[0] === "Undated" ? -1 : b[0].localeCompare(a[0])))
      .map(([y, list]) => ({ y, list: list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")), total: list.filter((g) => !NOT_COUNTED.test(g.status ?? "")).reduce((s, g) => s + g.amount, 0),
        totalsOnly: list.every((g) => /^\d{4}$/.test(g.date ?? "")) }));
  }, [gifts]);
  const giftCount = years.reduce((s, y) => s + (y.totalsOnly ? 0 : y.list.length), 0);
  const toggle = (y: string) => setOpen((s) => { const n = new Set(s); if (n.has(y)) n.delete(y); else n.add(y); return n; });
  const allOpen = years.length > 0 && years.every((y) => open.has(y.y) || y.totalsOnly);
  return (
    <Sec title={`${title} (${years.length} year${years.length === 1 ? "" : "s"}${giftCount ? `, ${giftCount.toLocaleString()} gifts` : ""})`}
      right={years.some((y) => !y.totalsOnly) && <button onClick={() => setOpen(allOpen ? new Set() : new Set(years.map((y) => y.y)))} className="text-xs underline">{allOpen ? "Collapse all" : "Expand all"}</button>}>
      {!years.length ? <p className="text-sm text-[rgb(var(--ink))]/55">No gifts on file.</p> : (
        <div className="max-h-[480px] overflow-auto rounded-lg border border-[rgb(var(--line))]">
          {years.map(({ y, list, total, totalsOnly }, i) => (
            <div key={y} className={i ? "border-t border-[rgb(var(--line))]" : ""}>
              <button onClick={() => !totalsOnly && toggle(y)} className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${totalsOnly ? "cursor-default" : "hover:bg-[rgb(var(--brass))]/10"} ${open.has(y) ? "bg-[rgb(var(--navy))] text-white" : ""}`}>
                {totalsOnly ? <span className="w-4" /> : open.has(y) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-semibold">{y}</span>
                <span className={`text-xs ${open.has(y) ? "text-white/70" : "text-[rgb(var(--ink))]/55"}`}>{totalsOnly ? "Yearly total" : `${list.length} gift${list.length === 1 ? "" : "s"}`}</span>
                <span className="ml-auto font-medium tabular-nums">{usd(total, 2)}</span>
              </button>
              {open.has(y) && !totalsOnly && (
                <table className="w-full table-fixed text-xs">
                  <colgroup><col className="w-32" />{showDetail && <col />}<col className="w-56" /><col className="w-32" /></colgroup>
                  <tbody>
                    {list.map((g, j) => (
                      <tr key={j} className={j % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"}>
                        <td className="py-1.5 pl-10 pr-2">{usDate(g.date)}</td>
                        {showDetail && <td className="truncate px-2 py-1.5">{[g.campaign, g.stage && g.stage !== g.campaign ? g.stage : "", g.fund, g.allocation].filter(Boolean).join(" · ")}</td>}
                        <td className="px-2 py-1.5 text-[rgb(var(--ink))]/60">{[g.type, g.status && g.status !== "Succeeded" ? g.status : "", g.fromCptid ? `from CPTID ${g.fromCptid}` : ""].filter(Boolean).join(" · ")}</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${NOT_COUNTED.test(g.status ?? "") ? "text-[rgb(var(--ink))]/45" : ""}`}>{usd(g.amount, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
      {years.some((y) => y.list.some((g) => NOT_COUNTED.test(g.status ?? ""))) && <p className="mt-1 text-[11px] text-[rgb(var(--ink))]/55">Grey amounts (pledges, refunds, pending) are listed but not in the year total.</p>}
    </Sec>
  );
}

// ---------------------------------------------------------------- Merge / delete
export function RecordBanners({ client, r, onChanged, openRecord }: { client: string; r: AnyRec; onChanged: () => void; openRecord?: (c: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [by] = useBy(client);
  const act = async (body: Record<string, unknown>) => { setBusy(true); try { await v2(client, { ...body, by: by || "dashboard" }); refreshCrmIndex(); onChanged(); } catch (e) { alert((e as Error).message); } finally { setBusy(false); } };
  return (
    <>
      {r.deleted && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-sm">
          <Trash2 className="h-4 w-4 text-red-700" /><span>Deleted by {r.deleted.by} on {day(r.deleted.at)}: {r.deleted.reason}. It no longer shows in searches or lists.</span>
          <button disabled={busy} onClick={() => act({ op: "restoreRecord", cptid: r.cptid })} className={`${lineBtn} ml-auto`}><RotateCcw className="h-3.5 w-3.5" />Restore record</button>
        </div>
      )}
      {r.redirectedFrom && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-[rgb(var(--brass))] bg-[rgb(var(--brass))]/10 px-3 py-2 text-sm">
          <GitMerge className="h-4 w-4" /><span>{r.redirectedFrom.name} (CPTID {r.redirectedFrom.cptid}) was merged into this record.</span>
        </div>
      )}
      {(r.mergedFrom ?? []).length > 0 && (
        <div className="mb-3 rounded-lg bg-[rgb(var(--paper))] px-3 py-2 text-xs">
          <span className="font-semibold">Merged into this record: </span>
          {(r.mergedFrom ?? []).map((m, i) => (
            <span key={m.cptid}>{i ? "; " : ""}{m.name} (CPTID {m.cptid}{m.lifetime ? `, ${usd(m.lifetime)}` : ""}) <button disabled={busy} onClick={() => { if (confirm(`Unmerge ${m.name} (CPTID ${m.cptid})? It becomes its own record again.`)) act({ op: "unmerge", cptid: m.cptid }); }} className="underline">Unmerge</button>
              {openRecord && <> </>}</span>
          ))}
          <span className="text-[rgb(var(--ink))]/55"> · Giving, notes and contacts from these records are combined here.</span>
        </div>
      )}
    </>
  );
}

export function MergeDeleteButtons({ client, r, index, onChanged }: { client: string; r: AnyRec; index: IdxRow[] | null; onChanged: () => void }) {
  const [mode, setMode] = useState<"merge" | "delete" | null>(null);
  if (r.deleted) return null;
  return (
    <>
      <button onClick={() => setMode("merge")} className={lineBtn} title="Merge a duplicate record into this one"><GitMerge className="h-3.5 w-3.5" />Merge duplicate</button>
      <button onClick={() => setMode("delete")} className={`${btn} border border-red-300 text-red-700`} title="Delete this record from the dashboard"><Trash2 className="h-3.5 w-3.5" />Delete</button>
      {mode === "merge" && <MergeModal client={client} keep={r} index={index} onClose={() => setMode(null)} onDone={() => { setMode(null); refreshCrmIndex(); onChanged(); }} />}
      {mode === "delete" && <DeleteModal client={client} r={r} onClose={() => setMode(null)} onDone={() => { setMode(null); refreshCrmIndex(); onChanged(); }} />}
    </>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:p-12" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 rounded-t-2xl bg-[rgb(var(--navy))] px-5 py-4 text-white">
          <h3 className="flex-1 font-display text-xl">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-5">{children}</div>
      </div>
    </div>
  );
}

function MergeModal({ client, keep, index, onClose, onDone, preselect = [] }: { client: string; keep: AnyRec | IdxRow; index: IdxRow[] | null; onClose: () => void; onDone: () => void; preselect?: IdxRow[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<IdxRow[]>(preselect);
  const [by, setBy] = useBy(client);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const last = keep.name.toLowerCase().replace(/[^a-z ]/g, " ").trim().split(/\s+/).pop() ?? "";
  const hits = useMemo(() => {
    if (!index) return [];
    const terms = (q.trim() || last).toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index.filter((x) => x.cptid !== keep.cptid && !sel.some((s) => s.cptid === x.cptid) && terms.every((t) => `${x.name} ${x.city ?? ""} ${x.cptid}`.toLowerCase().includes(t))).slice(0, 25);
  }, [index, q, last, keep.cptid, sel]);
  async function go() {
    if (!by.trim()) { setErr("Enter your name so the merge is credited to you"); return; }
    if (!sel.length) { setErr("Pick at least one duplicate to merge"); return; }
    setBusy(true); setErr("");
    try { await v2(client, { op: "mergeRecords", keep: keep.cptid, merge: sel.map((s) => s.cptid), by }); onDone(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Overlay title={`Merge duplicates into ${keep.name}`} onClose={onClose}>
      <p className="text-sm">The record you keep is <b>{keep.name}</b> (CPTID {keep.cptid}). Each duplicate you pick is folded into it: giving, notes, contact info and screening move here, and the duplicate disappears from searches and lists. You can unmerge at any time.</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[rgb(var(--ink))]/40" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search by name, city or CPTID (showing "${last}")`} className={`${inputCls} pl-9`} />
      </div>
      <div className="max-h-60 overflow-auto rounded-lg border border-[rgb(var(--line))]">
        {!index ? <p className="p-3 text-sm">Loading records...</p> : !hits.length ? <p className="p-3 text-sm text-[rgb(var(--ink))]/55">No other records match.</p> : hits.map((h) => (
          <button key={h.cptid} onClick={() => setSel([...sel, h])} className="flex w-full items-center gap-3 border-b border-[rgb(var(--line))]/60 px-3 py-2 text-left text-sm hover:bg-[rgb(var(--paper))]">
            <span className="font-medium text-[rgb(var(--navy))]">{h.name}</span><span className="text-xs text-[rgb(var(--ink))]/55">{[h.kind, h.city, `CPTID ${h.cptid}`].filter(Boolean).join(" · ")}</span>
            <span className="ml-auto text-xs tabular-nums">{usd(h.lifetime ?? 0)}</span>
          </button>
        ))}
      </div>
      {sel.length > 0 && (
        <div className="rounded-lg bg-[rgb(var(--paper))] p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider">Merging into {keep.name}</p>
          {sel.map((s) => <p key={s.cptid} className="flex items-center gap-2 text-sm">{s.name} <span className="text-xs text-[rgb(var(--ink))]/55">CPTID {s.cptid} · {usd(s.lifetime ?? 0)}</span><button onClick={() => setSel(sel.filter((x) => x.cptid !== s.cptid))} className="ml-auto text-xs underline">Remove</button></p>)}
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2"><NameBox by={by} setBy={setBy} /></div>
      {err && <p className="text-xs text-red-700">{err}</p>}
      <div className="flex gap-2"><button onClick={go} disabled={busy || !sel.length} className={navyBtn}><GitMerge className="h-3.5 w-3.5" />{busy ? "Merging..." : `Merge ${sel.length || ""} into this record`}</button><button onClick={onClose} className="text-xs underline">Cancel</button></div>
    </Overlay>
  );
}

function DeleteModal({ client, r, onClose, onDone }: { client: string; r: AnyRec; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [by, setBy] = useBy(client);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const life = r.summary?.lifetime ?? 0;
  async function go() {
    if (!by.trim()) { setErr("Enter your name so the delete is credited to you"); return; }
    if (!reason.trim()) { setErr("Enter a reason"); return; }
    setBusy(true); setErr("");
    try { await v2(client, { op: "deleteRecord", cptid: r.cptid, reason, by }); onDone(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Overlay title={`Delete ${r.name}?`} onClose={onClose}>
      <p className="text-sm">This removes CPTID {r.cptid} from dashboard searches, lists and the merge tool. Nothing is erased: the record can be restored from its page or from Duplicates on the Add + Upload tab.</p>
      {life > 0 && <p className="rounded-md bg-[rgb(var(--brass))]/15 px-3 py-2 text-sm">This record has {usd(life)} in giving. If it is a duplicate of another donor, use <b>Merge duplicate</b> instead so the giving moves to the right record.</p>}
      <label className="block text-xs">Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Test record, deceased, not a real constituent" className={inputCls} /></label>
      <div className="grid gap-2 md:grid-cols-2"><NameBox by={by} setBy={setBy} /></div>
      {err && <p className="text-xs text-red-700">{err}</p>}
      <div className="flex gap-2"><button onClick={go} disabled={busy} className={`${btn} bg-red-700 text-white`}><Trash2 className="h-3.5 w-3.5" />{busy ? "Deleting..." : "Delete record"}</button><button onClick={onClose} className="text-xs underline">Cancel</button></div>
    </Overlay>
  );
}

// ---------------------------------------------------------------- Duplicates manager (Add + Upload tab)
type DupGroup = { key: string; reason: string; strength: number; members: IdxRow[] & { street?: string }[] };
type LogRow = { cptid: number; name: string; action: string; target?: number; targetName?: string; reason?: string; by: string; at: string; current: boolean };
export function DuplicatesPanel({ client, openRecord: openProp }: { client: string; openRecord?: (c: number) => void }) {
  const nav = useRecordNav();
  const openRecord = openProp ?? nav?.open;
  const [data, setData] = useState<{ total: number; groups: DupGroup[]; log: LogRow[] } | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [minStrength, setMin] = useState(60);
  const [keepFor, setKeepFor] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [by, setBy] = useBy(client);
  const [show, setShow] = useState(25);
  const [qd, setQd] = useState("");
  useEffect(() => { const t = setTimeout(() => setQd(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  const load = () => { setErr(""); v2(client, { op: "duplicates", minStrength, q: qd, limit: 300 }).then(setData).catch((e) => setErr((e as Error).message)); };
  useEffect(load, [client, minStrength, qd]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = data?.groups ?? [];
  async function act(key: string, body: Record<string, unknown>) {
    if (!by.trim()) { setErr("Enter your name first"); return; }
    setBusy(key); setErr("");
    try { await v2(client, { ...body, by }); refreshCrmIndex(); load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h3 className="font-display text-xl text-[rgb(var(--navy))]">Duplicate records</h3>
          <p className="text-xs text-[rgb(var(--ink))]/60">Likely duplicates by name, nickname, address and city. Pick the record to keep, then merge. Merges and deletes can be undone below.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, city or CPTID" className="w-56 rounded-md border border-[rgb(var(--line))] px-3 py-1.5 text-sm" />
          <select value={minStrength} onChange={(e) => setMin(Number(e.target.value))} className="rounded-md border border-[rgb(var(--line))] px-2 py-1.5 text-sm">
            <option value={85}>Strongest matches</option><option value={60}>Likely matches</option><option value={0}>All possible matches</option>
          </select>
          <label className="text-xs">Your name<input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Required" className="block w-40 rounded-md border border-[rgb(var(--line))] px-2 py-1.5 text-sm" /></label>
        </div>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {!data ? <p className="text-sm">Looking for duplicates...</p> : (
        <>
          <p className="text-xs text-[rgb(var(--ink))]/60">{data.total.toLocaleString()} possible duplicate group{data.total === 1 ? "" : "s"}{data.total > data.groups.length ? `, showing the strongest ${data.groups.length}` : ""}. Use the filter to find a name.</p>
          {groups.slice(0, show).map((g) => {
            const keep = keepFor[g.key] ?? g.members[0].cptid;
            return (
              <div key={g.key} className="rounded-xl border border-[rgb(var(--line))] p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[rgb(var(--brass))]/15 px-2 py-0.5 text-[rgb(var(--navy))]">{g.reason}</span>
                  <span className="ml-auto flex gap-2">
                    <button disabled={!!busy} onClick={() => act(g.key, { op: "mergeRecords", keep, merge: g.members.map((m) => m.cptid).filter((c) => c !== keep) })} className={navyBtn}><GitMerge className="h-3.5 w-3.5" />{busy === g.key ? "Merging..." : "Merge into the kept record"}</button>
                    <button disabled={!!busy} onClick={() => act(g.key, { op: "notDuplicate", key: g.key })} className={lineBtn}>Not duplicates</button>
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55"><tr><th className="py-1">Keep</th><th>Name</th><th>CPTID</th><th>Address</th><th className="text-right">Lifetime</th><th /></tr></thead>
                  <tbody>
                    {g.members.map((m) => (
                      <tr key={m.cptid} className="border-t border-[rgb(var(--line))]/60">
                        <td className="py-1.5"><input type="radio" name={g.key} checked={keep === m.cptid} onChange={() => setKeepFor({ ...keepFor, [g.key]: m.cptid })} /></td>
                        <td>{openRecord ? <button onClick={() => openRecord(m.cptid)} className="font-medium text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40">{m.name}</button> : m.name}</td>
                        <td className="tabular-nums">{m.cptid}</td>
                        <td className="text-xs">{[(m as { street?: string }).street, m.city].filter(Boolean).join(", ")}</td>
                        <td className="text-right tabular-nums">{usd(m.lifetime ?? 0)}</td>
                        <td className="pl-2 text-right"><button disabled={!!busy} onClick={() => { const reason = prompt(`Reason for deleting ${m.name} (CPTID ${m.cptid})?`); if (reason) act(g.key, { op: "deleteRecord", cptid: m.cptid, reason }); }} className="text-xs text-red-700 underline">Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {groups.length > show && <button onClick={() => setShow(show + 50)} className={lineBtn}>Show more</button>}
          <div className="rounded-xl border border-[rgb(var(--line))] p-3">
            <p className="mb-2 text-sm font-semibold text-[rgb(var(--navy))]">Merge and delete history</p>
            {!data.log.length ? <p className="text-sm text-[rgb(var(--ink))]/55">Nothing merged or deleted yet.</p> : (
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {data.log.map((l, i) => (
                      <tr key={i} className="border-t border-[rgb(var(--line))]/60">
                        <td className="py-1.5 pr-2">{day(l.at)}</td>
                        <td className="pr-2">{l.action === "merged" ? <>Merged <b>{l.name}</b> ({l.cptid}) into <b>{l.targetName}</b> ({l.target})</> : l.action === "deleted" ? <>Deleted <b>{l.name}</b> ({l.cptid}): {l.reason}</> : l.action === "unmerged" ? <>Unmerged <b>{l.name}</b> ({l.cptid})</> : <>Restored <b>{l.name}</b> ({l.cptid})</>}</td>
                        <td className="pr-2 text-[rgb(var(--ink))]/60">{l.by}</td>
                        <td className="text-right">{l.current && <button disabled={!!busy} onClick={() => act(`log${i}`, { op: l.action === "merged" ? "unmerge" : "restoreRecord", cptid: l.cptid })} className="underline">{l.action === "merged" ? "Unmerge" : "Restore"}</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
