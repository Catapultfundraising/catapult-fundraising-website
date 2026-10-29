"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { RecordNav, SafeBoundary, cmpValues, DateInput, HistoryList, parseUsDateClient, todayUs, normName, type RecordNavCtx } from "@/components/dashboard-shared";
import { useUrlId } from "@/lib/use-url-state";
import { ProspectDocuments } from "@/components/prospect-documents";
import { AskAmountPanel } from "@/components/ask-amount-panel";
import { ContactSection, GiftsByYear, MergeDeleteButtons, RecordBanners, WealthSection } from "@/components/record-tools";
import { Search, X, Download, FileSpreadsheet, FileText } from "lucide-react";
import type { DonorRecord, IndexRow } from "@/lib/jag-data-store";
import { ACTIVITY_KINDS, EMPTY_TRACKING, PROSPECT_STATUSES, type JagTracking } from "@/lib/jag-tracking-types";

export const usd = (n: number, d = 0) =>
  (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });

// ---------- branded downloads ----------
export type ExportKind = "text" | "usd" | "num" | "pct";
export interface ExportPayload {
  title: string; subtitle?: string; cols: { label: string; kind?: ExportKind }[];
  sections: { heading?: string; rows: (string | number | null)[][] }[]; notes?: string[];
}
async function saveResponse(res: Response, fallback: string) {
  if (!res.ok) { alert("Download failed. Please try again."); return; }
  const cd = res.headers.get("content-disposition") || "";
  const name = /filename="([^"]+)"/.exec(cd)?.[1] || fallback;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await res.blob());
  a.download = name;
  a.click();
}
export async function downloadExport(p: ExportPayload, format: "pdf" | "xlsx") {
  const res = await fetch("/api/jag-data-export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, format }) });
  await saveResponse(res, `JAG ${p.title}.${format}`);
}
export async function downloadUrl(url: string, fallback: string) {
  await saveResponse(await fetch(url), fallback);
}
export function DownloadButtons({ get, small, label }: { get: () => ExportPayload; small?: boolean; label?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (f: "pdf" | "xlsx") => {
    setBusy(f);
    try { await downloadExport(get(), f); } finally { setBusy(null); }
  };
  const cls = `inline-flex items-center gap-1.5 rounded-md px-3 ${small ? "py-1" : "py-1.5"} text-xs font-medium disabled:opacity-60`;
  return (
    <span className="flex max-w-full flex-wrap gap-2 sm:ml-auto">
      <button onClick={() => run("pdf")} disabled={!!busy} className={`${cls} bg-[rgb(var(--navy))] text-white`}>
        <Download className="h-3.5 w-3.5" />{busy === "pdf" ? "Building..." : `${label ?? ""}PDF`}
      </button>
      <button onClick={() => run("xlsx")} disabled={!!busy} className={`${cls} border border-[rgb(var(--brass))] text-[rgb(var(--navy))]`}>
        <FileSpreadsheet className="h-3.5 w-3.5" />{busy === "xlsx" ? "Building..." : `${label ?? ""}Excel`}
      </button>
    </span>
  );
}

// ---------- index + record context ----------
interface Ctx { index: IndexRow[] | null; loading: boolean; open: (cptid: number) => void; drill: (title: string, sub: string, rows: IndexRow[]) => void; tracking: JagTracking; setTracking: (t: JagTracking) => void }
const CrmCtx = createContext<Ctx>({ index: null, loading: true, open: () => {}, drill: () => {}, tracking: EMPTY_TRACKING, setTracking: () => {} });
export const useCrm = () => useContext(CrmCtx);

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState<IndexRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [recId, setRecId] = useUrlId("rec");
  const [drillState, setDrill] = useState<{ title: string; sub: string; rows: IndexRow[] } | null>(null);
  const [tracking, setTracking] = useState<JagTracking>(EMPTY_TRACKING);
  useEffect(() => {
    fetch("/api/jag-data-tracking", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((t) => t && setTracking(t));
    fetch("/api/jag-data-records").then((r) => (r.ok ? r.json() : null)).then((d) => setIndex(d?.index ?? null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const f = () => { fetch("/api/jag-data-records", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d?.index && setIndex(d.index)).catch(() => {}); };
    window.addEventListener("crm-index-refresh", f);
    return () => window.removeEventListener("crm-index-refresh", f);
  }, []);
  const ctx = useMemo<Ctx>(() => ({ index, loading, open: setRecId, drill: (title, sub, rows) => setDrill({ title, sub, rows }), tracking, setTracking }), [index, loading, tracking, setRecId]);
  const [pick, setPick] = useState<{ name: string; rows: IndexRow[] } | null>(null);
  const openName = useCallback((name: string, cptid?: number | null) => {
    if (cptid && cptid > 0) { setRecId(cptid); return; }
    const k = normName(name);
    const hits = (index ?? []).filter((r) => normName(r.name) === k);
    if (hits.length === 1) { setRecId(hits[0].cptid); return; }
    const words = name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && w !== "and");
    const loose = hits.length ? hits : (index ?? []).filter((r) => words.length > 0 && words.every((w) => r.name.toLowerCase().includes(w)));
    setPick({ name, rows: loose });
  }, [index, setRecId]);
  const nav = useMemo<RecordNavCtx>(() => ({
    open: setRecId, openName,
    drillIds: (title, sub, ids) => { const set = new Set(ids); setDrill({ title, sub, rows: (index ?? []).filter((r) => set.has(r.cptid)) }); },
    drillQuery: (title, sub, kind, value) => {
      fetch(`/api/jag-data-records?drill=${encodeURIComponent(kind)}&v=${encodeURIComponent(String(value))}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject())).then((j: { cptids: number[] }) => { const set = new Set(j.cptids); setDrill({ title, sub, rows: (index ?? []).filter((r) => set.has(r.cptid)) }); })
        .catch(() => alert("Could not load that list. Please try again."));
    },
  }), [index, openName, setRecId]);
  return (
    <CrmCtx.Provider value={ctx}>
    <RecordNav.Provider value={nav}>
      {children}
      {drillState && <DrillModal {...drillState} onClose={() => setDrill(null)} />}
      {pick && (
        <Modal title={pick.rows.length ? `Which ${pick.name}?` : "No matching record"} sub={pick.rows.length ? "Several records match this name. Pick one to open it." : undefined} onClose={() => setPick(null)}>
          {pick.rows.length ? <div onClick={() => setPick(null)}><PeopleTable rows={pick.rows} /></div> : <p className="text-sm">No donor record matches &ldquo;{pick.name}&rdquo; yet. It may be a new name entered on the dashboard; add it on the Add + Upload tab or attach a CPTID.</p>}
        </Modal>
      )}
      {recId !== null && (
        <SafeBoundary label="This record" onReset={() => setRecId(recId)}>
          <RecordModal cptid={recId} onClose={() => setRecId(null)} />
        </SafeBoundary>
      )}
    </RecordNav.Provider>
    </CrmCtx.Provider>
  );
}

function Modal({ title, sub, onClose, children, wide }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:p-10" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-6xl" : "max-w-4xl"} rounded-2xl bg-white shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 rounded-t-2xl bg-[rgb(var(--navy))] px-6 py-5 text-white">
          <div className="flex-1">
            <h3 className="font-display text-2xl">{title}</h3>
            {sub && <p className="mt-1 text-sm text-white/70">{sub}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export const indexCols: { key: keyof IndexRow; label: string; kind?: ExportKind }[] = [
  { key: "name", label: "Name" }, { key: "kind", label: "Type" }, { key: "city", label: "City" },
  { key: "lifetime", label: "Lifetime", kind: "usd" }, { key: "gifts", label: "# Gifts", kind: "num" },
  { key: "largest", label: "Largest", kind: "usd" }, { key: "last", label: "Last Gift" },
  { key: "ds", label: "DS Rating" }, { key: "capacity", label: "Capacity" },
];
export function indexPayload(title: string, sub: string, rows: IndexRow[]): ExportPayload {
  return {
    title, subtitle: sub, cols: [{ label: "CPTID" }, ...indexCols.map((c) => ({ label: c.label, kind: c.kind }))],
    sections: [{ rows: rows.map((r) => [r.cptid, ...indexCols.map((c) => (r[c.key] ?? "") as string | number)]) }],
  };
}

export function PeopleTable({ rows, max = 500 }: { rows: IndexRow[]; max?: number }) {
  const { open } = useCrm();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: keyof IndexRow; dir: 1 | -1 }>({ k: "lifetime", dir: -1 });
  const shown = useMemo(() => {
    const ql = q.toLowerCase();
    const r = q ? rows.filter((x) => `${x.name} ${x.city ?? ""} ${x.cptid}`.toLowerCase().includes(ql)) : rows;
    return [...r].sort((a, b) => cmpValues(a[sort.k], b[sort.k]) * sort.dir);
  }, [rows, q, sort]);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter this list..." className="w-full min-w-0 sm:w-64 rounded-md border border-[rgb(var(--line))] px-3 py-1.5 text-sm" />
        <span className="text-xs text-[rgb(var(--ink))]/55">{shown.length.toLocaleString()} records{shown.length > max ? `, showing ${max}` : ""} · click a name to open the record</span>
      </div>
      <div className="max-h-[520px] overflow-auto rounded-lg border border-[rgb(var(--line))]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[rgb(var(--navy))] text-left text-xs uppercase tracking-wider text-white">
            <tr>
              {indexCols.map((c) => (
                <th key={c.key} onClick={() => setSort({ k: c.key, dir: sort.k === c.key ? (sort.dir === 1 ? -1 : 1) : (c.kind ? -1 : 1) })} title="Click to sort" className={`cursor-pointer whitespace-nowrap px-3 py-2 ${c.kind ? "text-right" : ""}`}>{c.label}{sort.k === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, max).map((r, i) => (
              <tr key={r.cptid} onClick={() => open(r.cptid)} className={`cursor-pointer hover:bg-[rgb(var(--brass))]/10 ${i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"}`}>
                {indexCols.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-1.5 ${c.kind ? "text-right tabular-nums" : ""} ${c.key === "name" ? "font-medium text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40" : ""}`}>
                    {c.kind === "usd" ? usd(r[c.key] as number) : String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DrillModal({ title, sub, rows, onClose }: { title: string; sub: string; rows: IndexRow[]; onClose: () => void }) {
  return (
    <Modal title={title} sub={`${rows.length.toLocaleString()} records · ${sub}`} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap"><DownloadButtons get={() => indexPayload(title, sub, rows)} /></div>
      <PeopleTable rows={rows} />
    </Modal>
  );
}

// ---------- global search ----------
export function DonorSearch({ dark }: { dark?: boolean }) {
  const { index, loading, open } = useCrm();
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    if (!index || q.trim().length < 2) return [];
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return index.filter((r) => { const h = `${r.name} ${r.city ?? ""} ${r.cptid}`.toLowerCase(); return terms.every((t) => h.includes(t)); }).slice(0, 12);
  }, [index, q]);
  return (
    <div className="relative w-full max-w-md">
      <Search className={`pointer-events-none absolute left-3 top-2.5 h-4 w-4 ${dark ? "text-white/60" : "text-[rgb(var(--ink))]/40"}`} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={loading ? "Loading donor records..." : "Look up a donor by name, city or CPTID"}
        className={`w-full rounded-lg py-2 pl-9 pr-3 text-sm outline-none ${dark ? "border border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:border-[rgb(var(--brass))]" : "border border-[rgb(var(--line))] bg-white"}`}
      />
      {hits.length > 0 && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-[rgb(var(--line))] bg-white text-[rgb(var(--ink))] shadow-lg">
          {hits.map((h) => (
            <button key={h.cptid} onClick={() => { open(h.cptid); setQ(""); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[rgb(var(--paper))]">
              <span>
                <span className="font-medium text-[rgb(var(--navy))]">{h.name}</span>
                <span className="ml-2 text-xs text-[rgb(var(--ink))]/55">{[h.kind, h.city, `CPTID ${h.cptid}`].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="tabular-nums text-xs">{usd(h.lifetime)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- full donor record ----------
function Field({ k, v }: { k: string; v?: string | number | null }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="flex gap-3 border-b border-[rgb(var(--line))]/60 py-1.5 text-sm">
      <span className="w-40 shrink-0 text-[rgb(var(--ink))]/55">{k}</span>
      <span className="text-[rgb(var(--navy))]">{v}</span>
    </div>
  );
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--line))] p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--brass))]">{title}</h4>
      {children}
    </div>
  );
}

export function recordPayload(r: DonorRecord, t?: JagTracking): ExportPayload {
  const st = t?.prospects[String(r.cptid)];
  const acts = (t?.activity ?? []).filter((a) => a.cptid === r.cptid).sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
  const c = r.contact ?? {};
  const prof: (string | number | null)[][] = [
    ["CPTID", String(r.cptid), "", "", "", ""], ["Type", r.kind ?? "", "", "", "", ""],
    ["Address", [c.street, c.city, c.state, c.zip].filter(Boolean).join(", "), "", "", "", ""],
    ["Phone", [c.phone, c.mobile].filter(Boolean).join(" / "), "", "", "", ""], ["Email", [c.email, c.workEmail].filter(Boolean).join(" / "), "", "", "", ""],
    ["Lifetime giving", usd(r.summary.lifetime), "", "", "", ""], ["Gifts", String(r.summary.gifts), "", "", "", ""],
    ["Largest gift", usd(r.summary.largest), "", "", "", ""], ["First / last gift", `${r.summary.first ?? ""} / ${r.summary.last ?? ""}`, "", "", "", ""],
    ["DS rating / capacity", `${r.ds?.["DS Rating"] ?? ""} / ${r.ds?.["Wealth-Based Capacity"] ?? ""}`, "", "", "", ""],
    ["Affiliations", (r.flags ?? []).join(", "), "", "", "", ""],
  ];
  return {
    title: `Donor Record, ${r.name}`, subtitle: `CPTID ${r.cptid}`,
    cols: [{ label: "Date" }, { label: "Amount", kind: "usd" }, { label: "Stage" }, { label: "Type" }, { label: "Campaign" }, { label: "Allocation" }],
    sections: [
      { heading: "Profile", rows: prof.filter((x) => x[1]) },
      ...(st || acts.length ? [{ heading: `Campaign tracking${st ? `: ${st.status}${st.level ? `, $${st.level.toLocaleString("en-US")} level` : ""}${st.solicitor ? `, solicitor ${st.solicitor}` : ""}${st.solicitor2 ? `, secondary solicitor ${st.solicitor2}` : ""}` : ""}`, rows: acts.map((a) => [a.date, null, a.kind, a.by, a.note, ""] as (string | number | null)[]) }] : []),
      { heading: `Gift history (${r.gifts?.length ?? 0})`, rows: (r.gifts ?? []).map((g) => [g.date ?? "", g.amount, g.stage ?? "", g.type ?? "", g.campaign ?? "", g.allocation ?? ""]) },
    ],
    notes: [...(r.calls ?? []).map((x) => `Call ${x.date}: ${x.result}${x.reason ? ` (${x.reason})` : ""}. ${x.comments ?? ""}`), ...(r.notes ?? []).map((n) => `Interest: ${n}`)],
  };
}

function RecordModal({ cptid, onClose }: { cptid: number; onClose: () => void }) {
  const { tracking, index } = useCrm();
  const [r, setR] = useState<DonorRecord | null>(null);
  const [err, setErr] = useState(false);
  const [ver, setVer] = useState(0);
  const reload = () => setVer((v) => v + 1);
  const lastId = useRef<number | null>(null);
  useEffect(() => {
    if (lastId.current !== cptid) { setR(null); lastId.current = cptid; }
    setErr(false);
    fetch(`/api/jag-data-records?id=${cptid}`, { cache: "no-store" }).then((x) => (x.ok ? x.json() : Promise.reject())).then(setR).catch(() => setErr(true));
  }, [cptid, ver]);
  if (err) return <Modal title="Record not found" onClose={onClose}><p>No record for CPTID {cptid}.</p></Modal>;
  if (!r) return <Modal title="Loading record..." onClose={onClose}><p className="text-sm">One moment.</p></Modal>;
  const c = r.contact ?? {};
  const s = r.summary;
  const byYear = new Map<string, number>();
  for (const g of r.gifts ?? []) { const y = (g.date ?? "").slice(0, 4) || "Undated"; byYear.set(y, (byYear.get(y) ?? 0) + g.amount); }
  return (
    <Modal title={r.name} sub={[r.kind, c.city && `${c.city}${c.state ? ", " + c.state : ""}`, `CPTID ${r.cptid}`].filter(Boolean).join(" · ")} onClose={onClose} wide>
      <RecordBanners client="jag" r={r as never} onChanged={reload} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(r.flags ?? []).map((f) => <span key={f} className="rounded-full bg-[rgb(var(--brass))]/15 px-2.5 py-0.5 text-xs text-[rgb(var(--navy))]">{f}</span>)}
        {(r.board ?? []).some((b) => b.active) && <span className="rounded-full bg-[rgb(var(--navy))] px-2.5 py-0.5 text-xs text-white">Board member</span>}
        {(r.calling ?? []).length > 0 && <span className="rounded-full bg-[rgb(var(--navy))]/10 px-2.5 py-0.5 text-xs">Sent to calling</span>}
        {tracking.pirs[String(r.cptid)] && (
          <a href={tracking.pirs[String(r.cptid)].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-[rgb(var(--brass))] px-3 py-1 text-xs font-medium text-[rgb(var(--navy))]">
            <FileText className="h-3.5 w-3.5" />View PIR
          </a>
        )}
        {tracking.prospects[String(r.cptid)]?.solicitor2 && <span className="rounded-full bg-[rgb(var(--paper))] px-2.5 py-0.5 text-xs">Secondary solicitor: {tracking.prospects[String(r.cptid)].solicitor2}</span>}
        {tracking.prospects[String(r.cptid)] && <span className="rounded-full border border-[rgb(var(--navy))] px-2.5 py-0.5 text-xs font-medium">{tracking.prospects[String(r.cptid)].status}</span>}
        <MergeDeleteButtons client="jag" r={r as never} index={index} onChanged={reload} />
        <DownloadButtons get={() => recordPayload(r, tracking)} small />
      </div>
      <TrackingPanel cptid={r.cptid} />
      <ProspectDocuments key={`jag-${r.cptid}`} client="jag" cptid={r.cptid} />
      <AskAmountPanel client="jag" cptid={r.cptid} base={((r as { portfolio?: { ask?: number } }).portfolio?.ask) || (r.board ?? []).find((b) => b.active && b.ask)?.ask || 0} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Lifetime giving", usd(s.lifetime)], ["Gifts", String(s.gifts)], ["Largest gift", usd(s.largest)], ["Years giving", String(s.years)], ["Last gift", s.last || "None"]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-[rgb(var(--line))] p-3">
            <p className="font-display text-xl text-[rgb(var(--navy))]">{v}</p>
            <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{k}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ContactSection client="jag" r={r as never} onSaved={reload} />
        <WealthSection client="jag" r={r as never} pirName={tracking.pirs[String(r.cptid)]?.name} onSaved={reload} />
        <Sec title="Giving summary">
          <Field k="First gift" v={s.first} /><Field k="Last gift" v={s.last} /><Field k="Lifetime band" v={s.band} />
          {s.ghoTotal !== undefined && s.ghoTotal !== null && Math.abs((s.ghoTotal ?? 0) - s.lifetime) > 1 && <Field k="Giving History Overview" v={`${usd(s.ghoTotal)} (differs from gift file)`} />}
          {r.softCredits && <><Field k="Soft credits" v={r.softCredits.count} /><Field k="Largest soft credit" v={r.softCredits.largest} /></>}
          {byYear.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...byYear.entries()].sort().reverse().slice(0, 12).map(([y, v]) => <span key={y} className="rounded bg-[rgb(var(--paper))] px-2 py-0.5 text-xs tabular-nums">{y}: {usd(v)}</span>)}
            </div>
          )}
        </Sec>
        <Sec title="Board, committees and calling">
          {(r.board ?? []).map((b, i) => <Field key={i} k={b.board || "Board"} v={`${b.title ?? ""} ${b.term ?? ""}${b.active ? "" : " (former)"}${b.ask ? ` · Ask ${usd(b.ask)} · Get ${usd(b.get ?? 0)}` : ""}`} />)}
          {(r.committees ?? []).map((x, i) => <Field key={i} k="Committee" v={x} />)}
          {(r.calling ?? []).map((x, i) => <Field key={i} k={`Calling ${x.batch}`} v={[x.tier, x.interviewer && `Interviewer: ${x.interviewer}`, x.appt && `Appt ${x.appt}`].filter(Boolean).join(" · ")} />)}
          {(r.calls ?? []).map((x, i) => <Field key={i} k={`Call ${x.date}`} v={`${x.result}${x.reason ? ` (${x.reason})` : ""}${x.comments ? `: ${x.comments}` : ""}`} />)}
          {(r.notes ?? []).map((x, i) => <Field key={i} k="Interest" v={x} />)}
          {!r.board?.length && !r.committees?.length && !r.calling?.length && !r.calls?.length && !r.notes?.length && <p className="text-sm text-[rgb(var(--ink))]/55">None on file.</p>}
        </Sec>
      </div>
      <SurveyPanel cptid={r.cptid} name={r.name} />
      <div className="mt-4">
        <GiftsByYear gifts={(r.gifts ?? []) as never} />
      </div>
    </Modal>
  );
}

// ---------- committee tracking + activity history ----------
const inputCls = "w-full rounded-md border border-[rgb(var(--line))] px-2.5 py-1.5 text-sm";
function useByName() {
  const [by, setBy] = useState("");
  useEffect(() => { setBy(localStorage.getItem("jag-by") ?? ""); }, []);
  return [by, (v: string) => { setBy(v); localStorage.setItem("jag-by", v); }] as const;
}
function TrackingPanel({ cptid }: { cptid: number }) {
  const { tracking, setTracking } = useCrm();
  const cur = tracking.prospects[String(cptid)];
  const acts = tracking.activity.filter((a) => a.cptid === cptid).sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
  const [by, setBy] = useByName();
  const [status, setStatus] = useState<string>(cur?.status ?? "Active");
  const [level, setLevel] = useState(cur?.level ? String(cur.level) : "");
  const [solicitor, setSolicitor] = useState(cur?.solicitor ?? "");
  const [solicitor2, setSolicitor2] = useState(cur?.solicitor2 ?? "");
  const [reason, setReason] = useState(cur?.reason ?? "");
  const [kind, setKind] = useState<string>("Visit");
  const [date, setDate] = useState(todayUs());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const post = async (body: Record<string, unknown>, which: string) => {
    setBusy(which); setMsg("");
    try {
      const res = await fetch("/api/jag-data-tracking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, cptid, by }) });
      const j = await res.json().catch(() => ({ error: `Could not save (error ${res.status})` }));
      if (!res.ok) { setMsg(j.error ?? "Could not save"); return false; }
      setTracking(j); setMsg("Saved"); return true;
    } catch { setMsg("Could not save. Check your connection and try again."); return false; } finally { setBusy(null); }
  };
  return (
    <div className="mb-4 rounded-xl border-2 border-[rgb(var(--brass))]/50 bg-[rgb(var(--paper))] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--brass))]">Campaign tracking</h4>
        {cur && <span className="text-xs text-[rgb(var(--ink))]/60">Last updated {cur.updatedAt.slice(0, 10)} by {cur.by}</span>}
        <label className="ml-auto flex items-center gap-2 text-xs">Your name
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Required to save" className="w-44 rounded-md border border-[rgb(var(--line))] px-2 py-1 text-sm" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg bg-white p-3">
          <p className="text-sm font-semibold text-[rgb(var(--navy))]">Committee update</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">Status
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>{PROSPECT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="text-xs">Gift level (GC2P)
              <input value={level} onChange={(e) => setLevel(e.target.value.replace(/[^\d]/g, ""))} placeholder="Auto from capacity" className={inputCls} />
            </label>
            <label className="col-span-2 text-xs">Primary solicitor / connection
              <input value={solicitor} onChange={(e) => setSolicitor(e.target.value)} className={inputCls} />
            </label>
            <label className="col-span-2 text-xs">Secondary solicitor
              <input value={solicitor2} onChange={(e) => setSolicitor2(e.target.value)} className={inputCls} />
            </label>
            <label className="col-span-2 text-xs">{status === "Disqualified" ? "Reason (e.g. said no)" : "Reason / note"}
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
            </label>
          </div>
          <button disabled={!!busy} onClick={() => post({ type: "status", status, level, solicitor, solicitor2, reason }, "status")} className="rounded-md bg-[rgb(var(--navy))] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">{busy === "status" ? "Saving..." : "Save update"}</button>
          <p className="text-[11px] text-[rgb(var(--ink))]/55">Disqualified and Committed prospects drop off the GC2P. A gift level places the prospect at that level on the GC2P, even if they were not in the screened pool.</p>
        </div>
        <div className="space-y-2 rounded-lg bg-white p-3">
          <p className="text-sm font-semibold text-[rgb(var(--navy))]">Log a contact or visit</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">Type<select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>{ACTIVITY_KINDS.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="text-xs">Date<DateInput value={date} onChange={setDate} className={inputCls} required /></label>
            <label className="col-span-2 text-xs">Notes<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls} /></label>
          </div>
          <button disabled={!!busy} onClick={async () => { if (!parseUsDateClient(date)) { setMsg("Use MM/DD/YYYY for the date"); return; } if (await post({ type: "activity", kind, date, note }, "act")) setNote(""); }} className="rounded-md bg-[rgb(var(--navy))] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">{busy === "act" ? "Saving..." : "Add to history"}</button>
        </div>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg === "Saved" ? "text-green-700" : "text-red-700"}`}>{msg}</p>}
      <div className="mt-3 rounded-lg bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-[rgb(var(--navy))]">History ({acts.length})</p>
        <HistoryList items={acts} kinds={ACTIVITY_KINDS} post={post} busy={busy} />
      </div>
    </div>
  );
}

type Interview = { name: string; tier: string; interviewee: string; interviewType: string; updated: string; answers: { q: string; question: string; answer: string; comments: string }[] };
function SurveyPanel({ cptid, name }: { cptid: number; name: string }) {
  const [list, setList] = useState<Interview[] | null>(null);
  useEffect(() => {
    fetch(`/api/jag-data-survey?id=${cptid}&name=${encodeURIComponent(name)}`).then((x) => (x.ok ? x.json() : { interviews: [] })).then((d) => setList(d.interviews ?? [])).catch(() => setList([]));
  }, [cptid, name]);
  if (!list || !list.length) return null;
  return (
    <div className="mt-4">
      {list.map((iv, i) => (
        <Sec key={i} title={`Feasibility study interview${list.length > 1 ? ` (${iv.name})` : ""}`}>
          <p className="mb-2 text-xs text-[rgb(var(--ink))]/55">{[iv.interviewee && `Interviewee: ${iv.interviewee}`, iv.interviewType, iv.tier && `Tier ${iv.tier}`, iv.updated && `Updated ${iv.updated.slice(0, 10)}`].filter(Boolean).join(" · ")}</p>
          <div className="divide-y divide-[rgb(var(--line))]/60">
            {iv.answers.map((a) => (
              <div key={a.q} className="py-2 text-sm">
                <p className="text-[rgb(var(--ink))]/60"><span className="font-semibold">Q{a.q}.</span> {a.question}</p>
                {a.answer && <p className="mt-0.5 font-medium text-[rgb(var(--navy))]">{a.answer}</p>}
                {a.comments && <p className="mt-0.5 break-words text-[rgb(var(--navy))]/80">{a.comments}</p>}
              </div>
            ))}
          </div>
        </Sec>
      ))}
    </div>
  );
}
