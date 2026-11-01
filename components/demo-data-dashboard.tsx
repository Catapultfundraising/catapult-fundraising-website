"use client";

// Client-facing SAMPLE dashboard. Fully fictional, self-contained data (lib/demo-dashboard/data.ts).
// No fetch, no API routes, no client stores: everything runs in the browser. Edits live in sessionStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import Image from "next/image";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RecordNav, NameLink, SafeBoundary, HistoryList, cmpValues, isoToUs, parseUsDateClient, todayUs, DateInput, type HistoryItem } from "@/components/dashboard-shared";
import { DashboardHelp } from "@/components/dashboard-help";
import { useUrlState } from "@/lib/use-url-state";
import {
  DEMO_DONORS, DEMO_ORG_LABEL, DEMO_AS_OF, DEMO_CAMPAIGN, STAGES, SOLICITORS, PYRAMID_BANDS,
  campaignTotals, givingByYear, lifetime, paid, outstanding, lastGift, lifetimeWithCampaign, bandOf, sum,
  type Donor, type Note,
} from "@/lib/demo-dashboard/data";
import { DEMO_TABS, DEMO_HELP_TOPICS, demoSearch, demoTopicForTab, type DemoTab } from "@/lib/demo-dashboard/help";
import { downloadTable, type Cell } from "@/lib/demo-dashboard/export";
import { exampleRatings, RATING_DONE, RATING_MEMBERS } from "@/lib/demo-dashboard/ratings";
import { FIELDS, DEFAULT_SETUP, runReport, seatGiftChart, type FieldKey, type ReportSetup } from "@/lib/demo-dashboard/logic";

const NAVY = "#15212e";
const GOLD = "#b28c46";
const STORE_KEY = "catapult-sample-dashboard:v1";
export const SETUPS_KEY = `${STORE_KEY}:report-setups`;
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const short = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 2 : 0)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
const num = (n: number) => n.toLocaleString("en-US");
const BY_ID = new Map(DEMO_DONORS.map((d) => [d.cptid, d]));

// ---------- session-only edits ----------
interface DemoCtx { notesOf: (d: Donor) => Note[]; post: (cptid: number, body: Record<string, unknown>) => boolean; reset: () => void; edited: boolean; open: (id: number) => void }
const Demo = createContext<DemoCtx | null>(null);
const useDemo = () => useContext(Demo)!;

function useSessionNotes() {
  const [overlay, setOverlay] = useState<Record<string, Note[]>>({});
  useEffect(() => { try { const s = sessionStorage.getItem(STORE_KEY); if (s) setOverlay(JSON.parse(s)); } catch { /* ignore */ } }, []);
  const save = (o: Record<string, Note[]>) => { setOverlay(o); try { sessionStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch { /* ignore */ } };
  return { overlay, save, reset: () => { setOverlay({}); try { sessionStorage.removeItem(STORE_KEY); } catch { /* ignore */ } } };
}

// ---------- building blocks (same look as the client dashboards) ----------
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 max-w-full rounded-xl border border-[rgb(var(--line))] bg-white p-4 sm:p-5 ${className}`}>{children}</div>;
}
function Stat({ label, value, note, onClick }: { label: string; value: string; note?: string; onClick?: () => void }) {
  const inner = (<><p className={`font-display text-2xl text-[rgb(var(--navy))] ${onClick ? "underline decoration-[rgb(var(--brass))]/40" : ""}`}>{value}</p>
    <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>{note && <p className="mt-1 text-[11px] text-[rgb(var(--ink))]/50">{note}</p>}</>);
  if (onClick) return <button type="button" onClick={onClick} title="Click to see the list" className="min-w-0 max-w-full rounded-xl border border-[rgb(var(--line))] bg-white p-4 text-left hover:border-[rgb(var(--brass))] hover:bg-[rgb(var(--brass))]/5 sm:p-5">{inner}</button>;
  return <Card className="py-4">{inner}</Card>;
}
function H({ children, sub }: { children: ReactNode; sub?: string }) {
  return <div className="mb-3"><h2 className="font-display text-xl text-[rgb(var(--navy))]">{children}</h2>{sub && <p className="text-sm text-[rgb(var(--ink))]/60">{sub}</p>}</div>;
}
function PreviewNote({ children }: { children: ReactNode }) {
  return <p role="note" className="mb-4 rounded-lg border border-[rgb(var(--brass))] bg-[rgb(var(--brass))]/10 px-4 py-3 text-sm text-[rgb(var(--navy))]"><strong>Demo preview:</strong> {children}</p>;
}

type Col<T> = { key: string; label: string; get: (r: T) => Cell; money?: boolean; name?: boolean };
function Downloads({ title, cols, rows, subtitle }: { title: string; cols: { label: string; money?: boolean }[]; rows: Cell[][]; subtitle?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (f: "xlsx" | "pdf") => { setBusy(f); try { await downloadTable({ title, subtitle, cols, rows }, f); } finally { setBusy(null); } };
  return (
    <span className="flex gap-1.5">
      {(["xlsx", "pdf"] as const).map((f) => (
        <button key={f} type="button" disabled={!!busy || !rows.length || !cols.length} onClick={() => go(f)} className="rounded-md border border-[rgb(var(--navy))] px-2.5 py-1 text-xs font-medium text-[rgb(var(--navy))] hover:bg-[rgb(var(--navy))] hover:text-white disabled:opacity-50">
          {busy === f ? "Preparing..." : f === "xlsx" ? "Excel" : "PDF"}
        </button>
      ))}
    </span>
  );
}
function Table<T>({ rows, cols, title, rowClick, id }: { rows: T[]; cols: Col<T>[]; title: string; rowClick?: (r: T) => void; id?: (r: T) => number | undefined }) {
  const demo = useDemo();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null);
  const shown = useMemo(() => {
    let r = rows;
    if (q) { const l = q.toLowerCase(); r = r.filter((x) => cols.some((c) => String(c.get(x)).toLowerCase().includes(l))); }
    if (sort) { const c = cols.find((x) => x.key === sort.k)!; r = [...r].sort((a, b) => cmpValues(c.get(a), c.get(b)) * sort.dir); }
    return r;
  }, [rows, q, sort, cols]);
  const click = (r: T) => (rowClick ? () => rowClick(r) : id?.(r) ? () => demo.open(id(r)!) : undefined);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." aria-label={`Search ${title}`} className="w-full min-w-0 rounded-md border border-[rgb(var(--line))] px-3 py-1.5 text-sm sm:w-64" />
        <span className="text-xs text-[rgb(var(--ink))]/55">{num(shown.length)} rows</span>
        <Downloads title={title} subtitle={q ? `Filtered: "${q}"` : undefined} cols={cols} rows={shown.map((r) => cols.map((c) => c.get(r)))} />
      </div>
      <div className="max-h-[560px] overflow-auto rounded-lg border border-[rgb(var(--line))]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[rgb(var(--navy))] text-left text-xs uppercase tracking-wider text-white">
            <tr>{cols.map((c) => (
              <th key={c.key} title="Click to sort" onClick={() => setSort({ k: c.key, dir: sort?.k === c.key ? (sort.dir === 1 ? -1 : 1) : 1 })} className={`cursor-pointer whitespace-nowrap px-3 py-2 ${c.money ? "text-right" : ""}`}>
                {c.label}{sort?.k === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
              </th>))}</tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const f = click(r);
              return (
                <tr key={i} onClick={f} className={`${i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"} ${f ? "cursor-pointer hover:bg-[rgb(var(--brass))]/10" : ""}`}>
                  {cols.map((c, ci) => {
                    const v = c.get(r);
                    return <td key={c.key} className={`whitespace-nowrap px-3 py-1.5 ${c.money ? "text-right tabular-nums" : ""} ${(c.name || (rowClick && ci === 0)) && f ? "font-medium text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40" : ""}`}>{c.money && typeof v === "number" ? usd(v) : typeof v === "number" ? num(v) : v}</td>;
                  })}
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-[rgb(var(--ink))]/55">No rows match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const nameCol: Col<Donor> = { key: "name", label: "Name", get: (d) => d.name, name: true };
const donorCols: Col<Donor>[] = [
  nameCol,
  { key: "type", label: "Type", get: (d) => d.type },
  { key: "stage", label: "Stage", get: (d) => d.stage },
  { key: "lifetime", label: "Historical giving", get: lifetime, money: true },
  { key: "pledge", label: "Campaign pledge", get: (d) => d.pledge?.amount ?? 0, money: true },
  { key: "capacity", label: "Capacity", get: (d) => d.capacityLabel },
  { key: "solicitor", label: "Solicitor", get: (d) => d.solicitor },
];
const byId = (d: Donor) => d.cptid;

// ---------- tabs ----------
function CampaignBar() {
  const t = campaignTotals();
  const pct = Math.round(t.pct * 100);
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--brass))]">{DEMO_CAMPAIGN}</p>
          <p className="font-display text-3xl text-[rgb(var(--navy))]">{usd(t.committed)} <span className="text-lg text-[rgb(var(--ink))]/60">committed of {usd(t.goal)}</span></p>
        </div>
        <p className="font-display text-4xl text-[rgb(var(--brass))]" data-testid="campaign-pct">{pct}%</p>
      </div>
      <div className="mt-3 h-5 overflow-hidden rounded-full bg-[rgb(var(--paper))]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Campaign progress">
        <div className="flex h-full">
          <div style={{ width: `${(t.received / t.goal) * 100}%`, background: NAVY }} title="Received" />
          <div style={{ width: `${(t.outstanding / t.goal) * 100}%`, background: GOLD }} title="Pledged, not yet received" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[rgb(var(--ink))]/70">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NAVY }} />Received {usd(t.received)}</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: GOLD }} />Pledged, not yet received {usd(t.outstanding)}</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--paper))]" />Remaining to raise {usd(t.remaining)}</span>
      </div>
    </Card>
  );
}

function Overview() {
  const nav = useContext(RecordNav)!;
  const t = campaignTotals();
  const years = givingByYear();
  const recent = years.slice(-10);
  const pledged = DEMO_DONORS.filter((d) => d.pledge);
  const yr = (y: unknown) => nav.drillQuery(`Donors who gave in ${y}`, "Historical giving in this year", "year", String(y));
  return (
    <div className="space-y-6">
      <CampaignBar />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Committed to campaign" value={short(t.committed)} note={`${t.commitments} commitments`} onClick={() => nav.drillIds("Campaign commitments", "Every pledge or gift to the campaign", pledged.map(byId))} />
        <Stat label="Received (paid)" value={short(t.received)} note="Pledge payments and outright gifts received" />
        <Stat label="Outstanding pledges" value={short(t.outstanding)} note="Pledged, not yet paid" onClick={() => nav.drillIds("Outstanding pledge balances", "Commitments with a balance still due", pledged.filter((d) => outstanding(d) > 0).map(byId))} />
        <Stat label="Remaining to raise" value={short(t.remaining)} note={`Open asks in progress: ${short(t.openAsks)}`} onClick={() => nav.drillIds("Open campaign asks", "Prospects with a proposed ask and no commitment yet", DEMO_DONORS.filter((d) => !d.pledge && d.ask && d.stage !== "Declined").map(byId))} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Historical giving" value={short(sum(DEMO_DONORS.map(lifetime)))} note="Annual fund, galas and events. Not counted in the campaign." />
        <Stat label="Constituents" value={num(DEMO_DONORS.length)} onClick={() => nav.drillIds("All constituents", "Every fictional record", DEMO_DONORS.map(byId))} />
        <Stat label="Gifts on file" value={num(sum(DEMO_DONORS.map((d) => d.gifts.length)))} />
        <Stat label="Committee members" value={num(DEMO_DONORS.filter((d) => d.committee).length)} onClick={() => nav.drillIds("Campaign committee", "Volunteer leadership", DEMO_DONORS.filter((d) => d.committee).map(byId))} />
      </div>
      <Card>
        <H sub="Historical giving by calendar year. Click a bar to list the donors.">Giving by year</H>
        <div className="h-72"><ResponsiveContainer>
          <BarChart data={years}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis tickFormatter={short} /><Tooltip formatter={(v: number) => usd(v)} />
            <Bar dataKey="total" fill={NAVY} name="Dollars" cursor="pointer" onClick={(e: { year?: unknown; payload?: { year: unknown } }) => yr(e.payload?.year ?? e.year)} /></BarChart>
        </ResponsiveContainer></div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><H sub="Donors per year">Donor count</H><div className="h-64"><ResponsiveContainer>
          <LineChart data={recent}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis /><Tooltip /><Line dataKey="donors" stroke={GOLD} strokeWidth={3} name="Donors" /></LineChart>
        </ResponsiveContainer></div></Card>
        <Card><H sub="Share of last year's donors who gave again">Donor retention</H><div className="h-64"><ResponsiveContainer>
          <BarChart data={recent}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" /><YAxis unit="%" /><Tooltip /><Bar dataKey="retention" fill={GOLD} name="Retention %" /></BarChart>
        </ResponsiveContainer></div></Card>
      </div>
      <Card><H>Recent years</H>
        <Table title="Giving by Year" rows={[...recent].reverse()} rowClick={(r) => yr(r.year)} cols={[
          { key: "year", label: "Year", get: (r) => String(r.year) }, { key: "total", label: "Dollars", get: (r) => r.total, money: true },
          { key: "donors", label: "Donors", get: (r) => r.donors }, { key: "ret", label: "Retention", get: (r) => `${r.retention}%` }]} />
      </Card>
    </div>
  );
}

function Lookup() {
  const [q, setQ] = useState("");
  const rows = q ? DEMO_DONORS.filter((d) => `${d.name} ${d.city} ${d.cptid}`.toLowerCase().includes(q.toLowerCase())) : DEMO_DONORS;
  return (
    <Card>
      <H sub="Search by name, city or ID. Click a name to open the record.">Donor lookup</H>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fictional records..." aria-label="Search donors" className="mb-3 w-full rounded-md border border-[rgb(var(--line))] px-3 py-2 text-sm" />
      <Table title="Donor Lookup" rows={rows} id={byId} cols={[{ key: "id", label: "ID", get: (d) => String(d.cptid) }, nameCol, { key: "city", label: "City", get: (d) => d.city }, ...donorCols.slice(1, 5)]} />
    </Card>
  );
}

function Pyramid() {
  const nav = useContext(RecordNav)!;
  const bands = PYRAMID_BANDS.map((b) => ({ ...b, rows: DEMO_DONORS.filter((d) => bandOf(lifetimeWithCampaign(d)) === b.band) }));
  const max = Math.max(...bands.map((b) => b.rows.length));
  const ratings = [...new Set(DEMO_DONORS.map((d) => d.rating))].sort();
  return (
    <div className="space-y-6">
      <Card>
        <H sub="Historical giving plus campaign commitment per record (pledged, not necessarily paid). Click a band to see the donors.">Historical giving + campaign commitments</H>
        <div className="space-y-1.5">
          {bands.map((b) => (
            <button type="button" key={b.band} onClick={() => nav.drillIds(`Historical giving + commitments ${b.band}`, "Donors in this band", b.rows.map(byId))} className="grid w-full grid-cols-[88px_1fr_40px] items-center gap-3 rounded text-left text-sm hover:bg-[rgb(var(--brass))]/10 sm:grid-cols-[120px_1fr_60px_110px]">
              <span className="font-medium">{b.band}</span>
              <span className="block h-6 rounded bg-[rgb(var(--paper))]"><span className="block h-6 rounded" style={{ width: `${Math.max(2, (b.rows.length / max) * 100)}%`, background: NAVY }} /></span>
              <span className="text-right tabular-nums">{b.rows.length}</span>
              <span className="hidden text-right tabular-nums sm:block">{short(sum(b.rows.map(lifetimeWithCampaign)))}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card><H sub="Fictional capacity ratings (sample, not a real screening).">By capacity rating</H>
        <Table title="Capacity Ratings" rows={ratings.map((r) => ({ r, rows: DEMO_DONORS.filter((d) => d.rating === r) }))} rowClick={(x) => nav.drillIds(`Rating ${x.r}`, "Records with this rating", x.rows.map(byId))}
          cols={[{ key: "r", label: "Rating", get: (x) => x.r }, { key: "n", label: "Records", get: (x) => x.rows.length }, { key: "c", label: "Committed", get: (x) => sum(x.rows.map((d) => d.pledge?.amount ?? 0)), money: true }]} />
      </Card>
    </div>
  );
}

function GiftChartTab() {
  const nav = useContext(RecordNav)!;
  const seated = seatGiftChart(5_000_000);
  return (
    <Card>
      <H sub="Standard Catapult gift chart for a $5,000,000 goal. Commitments are seated at the highest level they meet; prospects by proposed ask.">Gift chart + GC2P</H>
      <Table title="Gift Chart and Prospects" rows={seated} cols={[
        { key: "lvl", label: "Gift level", get: (s) => (s.row.level ? usd(s.row.level) : `Under ${usd(s.row.under ?? 0)}`) },
        { key: "need", label: "Gifts needed", get: (s) => s.row.gifts ?? "Many" },
        { key: "val", label: "Level total", get: (s) => s.row.value, money: true },
        { key: "com", label: "Committed (#)", get: (s) => s.committed.length },
        { key: "comv", label: "Committed ($)", get: (s) => sum(s.committed.map((d) => d.pledge!.amount)), money: true },
        { key: "pro", label: "Open prospects", get: (s) => s.prospects.length },
      ]} rowClick={(s) => nav.drillIds(s.row.level ? `Gift level ${usd(s.row.level)}` : "Smaller gifts", "Committed donors, then open prospects", [...s.committed, ...s.prospects].map(byId))} />
    </Card>
  );
}

function Prospects() {
  const [stage, setStage] = useState<string>("All open");
  const open = DEMO_DONORS.filter((d) => !d.pledge && d.ask);
  const rows = stage === "All open" ? open.filter((d) => d.stage !== "Declined") : open.filter((d) => d.stage === stage);
  return (
    <Card>
      <H sub="Campaign prospects without a commitment yet. Asks are proposals, not money raised.">Prospects</H>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["All open", "Identified", "Qualified", "Cultivation", "Solicitation", "Declined"].map((s) => (
          <button key={s} type="button" onClick={() => setStage(s)} aria-pressed={stage === s} className={`rounded-full border px-3 py-1 text-xs ${stage === s ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white" : "border-[rgb(var(--line))] bg-white"}`}>{s}</button>
        ))}
      </div>
      <Table title={`Prospects - ${stage}`} rows={rows} id={byId} cols={[nameCol, { key: "stage", label: "Stage", get: (d) => d.stage }, { key: "ask", label: "Proposed ask", get: (d) => d.ask, money: true }, { key: "cap", label: "Capacity", get: (d) => d.capacityLabel }, { key: "sol", label: "Solicitor", get: (d) => d.solicitor }, { key: "life", label: "Historical giving", get: lifetime, money: true }]} />
    </Card>
  );
}

// ---------- Reports (local report builder) ----------

function Reports() {
  const [s, setS] = useState<ReportSetup>(DEFAULT_SETUP);
  const [saved, setSaved] = useState<Record<string, ReportSetup>>({});
  const [name, setName] = useState("");
  useEffect(() => { try { setSaved(JSON.parse(sessionStorage.getItem(SETUPS_KEY) || "{}")); } catch { /* ignore */ } }, []);
  const persist = (o: Record<string, ReportSetup>) => { setSaved(o); try { sessionStorage.setItem(SETUPS_KEY, JSON.stringify(o)); } catch { /* ignore */ } };
  const rows = useMemo(() => runReport(s), [s]);
  const set = <K extends keyof ReportSetup>(k: K, v: ReportSetup[K]) => setS((x) => ({ ...x, [k]: v }));
  const move = (i: number, d: -1 | 1) => setS((x) => { const f = [...x.fields]; const j = i + d; if (j < 0 || j >= f.length) return x; [f[i], f[j]] = [f[j], f[i]]; return { ...x, fields: f }; });
  const toggle = (k: FieldKey) => setS((x) => ({ ...x, fields: x.fields.includes(k) ? x.fields.filter((f) => f !== k) : [...x.fields, k] }));
  const cols = s.fields.map((k) => ({ key: k, ...FIELDS[k] }));
  const sel = "w-full rounded-md border border-[rgb(var(--line))] px-2 py-1.5 text-sm";
  const totals = cols.filter((c) => c.money).map((c) => `${c.label}: ${usd(sum(rows.map((d) => c.get(d) as number)))}`);
  return (
    <div className="space-y-6">
      <Card>
        <H sub="Build a list from the fictional records. Pick and order fields, filter, sort, limit, then download.">Reports</H>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/55">Fields</p>
            <ul className="space-y-1" aria-label="Selected fields in order">
              {s.fields.map((k, i) => (
                <li key={k} className="flex items-center gap-1 rounded-md border border-[rgb(var(--line))] bg-[rgb(var(--paper))] px-2 py-1 text-sm">
                  <span className="min-w-0 flex-1 truncate">{FIELDS[k].label}</span>
                  <button type="button" aria-label={`Move ${FIELDS[k].label} up`} onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={`Move ${FIELDS[k].label} down`} onClick={() => move(i, 1)} disabled={i === s.fields.length - 1} className="rounded p-0.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={`Remove ${FIELDS[k].label}`} onClick={() => toggle(k)} className="rounded p-0.5"><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1">
              {(Object.keys(FIELDS) as FieldKey[]).filter((k) => !s.fields.includes(k)).map((k) => (
                <button key={k} type="button" onClick={() => toggle(k)} className="rounded-full border border-dashed border-[rgb(var(--line))] px-2 py-0.5 text-xs hover:border-[rgb(var(--brass))]">+ {FIELDS[k].label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="text-xs">Campaign status<select className={sel} value={s.status} onChange={(e) => set("status", e.target.value as ReportSetup["status"])}>
              <option value="all">All records</option><option value="committed">Committed</option><option value="outstanding">Outstanding balance</option><option value="open">Open asks</option></select></label>
            <label className="text-xs">Stage<select className={sel} value={s.stage} onChange={(e) => set("stage", e.target.value)}><option value="">Any</option>{STAGES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="text-xs">Donor type<select className={sel} value={s.type} onChange={(e) => set("type", e.target.value)}><option value="">Any</option>{["Individual", "Household", "Foundation", "Corporation"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="text-xs">Solicitor<select className={sel} value={s.solicitor} onChange={(e) => set("solicitor", e.target.value)}><option value="">Any</option>{SOLICITORS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="text-xs">Min capacity<select className={sel} value={s.minCapacity} onChange={(e) => set("minCapacity", +e.target.value)}>{[0, 50_000, 100_000, 250_000, 500_000, 1_000_000].map((x) => <option key={x} value={x}>{x ? short(x) + "+" : "Any"}</option>)}</select></label>
            <label className="text-xs">Sort by<select className={sel} value={s.sortBy} onChange={(e) => set("sortBy", e.target.value as FieldKey)}>{(Object.keys(FIELDS) as FieldKey[]).map((k) => <option key={k} value={k}>{FIELDS[k].label}</option>)}</select></label>
            <label className="text-xs">Direction<select className={sel} value={s.dir} onChange={(e) => set("dir", +e.target.value as 1 | -1)}><option value={-1}>High to low / Z-A</option><option value={1}>Low to high / A-Z</option></select></label>
            <label className="text-xs">Top N<select className={sel} value={s.top} onChange={(e) => set("top", +e.target.value)}>{[0, 5, 10, 25].map((x) => <option key={x} value={x}>{x ? `Top ${x}` : "All rows"}</option>)}</select></label>
            <div className="col-span-2 flex flex-wrap items-end gap-2 md:col-span-4">
              <label className="min-w-0 flex-1 text-xs">Setup name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Outstanding balances" className={sel} /></label>
              <button type="button" disabled={!name.trim()} onClick={() => { persist({ ...saved, [name.trim()]: s }); setName(""); }} className="rounded-md bg-[rgb(var(--navy))] px-3 py-1.5 text-sm text-white disabled:opacity-50">Save setup</button>
              <label className="text-xs">Saved setups<select className={sel} value="" onChange={(e) => e.target.value && setS(saved[e.target.value])}><option value="">{Object.keys(saved).length ? "Choose..." : "None yet"}</option>{Object.keys(saved).map((k) => <option key={k}>{k}</option>)}</select></label>
              <button type="button" onClick={() => setS(DEFAULT_SETUP)} className="rounded-md border border-[rgb(var(--navy))] px-3 py-1.5 text-sm">Reset filters</button>
            </div>
            <p className="col-span-2 text-[11px] text-[rgb(var(--ink))]/55 md:col-span-4">Saved setups stay in this browser tab only (demo). In client dashboards, saved lists are shared with your team.</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-[rgb(var(--navy))]" data-testid="report-count">{num(rows.length)} records</p>
          <p className="text-xs text-[rgb(var(--ink))]/60">{totals.join(" · ")}</p>
          <span className="ml-auto"><Downloads title="Custom Report" subtitle={`${rows.length} records`} cols={cols} rows={rows.map((d) => cols.map((c) => c.get(d)))} /></span>
        </div>
        {cols.length ? (
          <div className="max-h-[560px] overflow-auto rounded-lg border border-[rgb(var(--line))]">
            <table className="w-full text-sm" data-testid="report-table">
              <thead className="sticky top-0 bg-[rgb(var(--navy))] text-left text-xs uppercase tracking-wider text-white">
                <tr>{cols.map((c) => <th key={c.key} className={`cursor-pointer whitespace-nowrap px-3 py-2 ${c.money ? "text-right" : ""}`} onClick={() => setS((x) => ({ ...x, sortBy: c.key, dir: x.sortBy === c.key ? (x.dir === 1 ? -1 : 1) : -1 }))}>{c.label}{s.sortBy === c.key ? (s.dir === 1 ? " ▲" : " ▼") : ""}</th>)}</tr>
              </thead>
              <tbody>{rows.map((d, i) => (
                <tr key={d.cptid} className={i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"}>
                  {cols.map((c) => { const v = c.get(d); return <td key={c.key} className={`whitespace-nowrap px-3 py-1.5 ${c.money ? "text-right tabular-nums" : ""}`}>{c.key === "name" ? <NameLink name={d.name} cptid={d.cptid} /> : c.money ? usd(v as number) : v}</td>; })}
                </tr>))}</tbody>
            </table>
          </div>
        ) : <p className="text-sm text-[rgb(var(--ink))]/60">Add at least one field.</p>}
      </Card>
    </div>
  );
}

function Committee() {
  const nav = useContext(RecordNav)!;
  const rows = SOLICITORS.map((s) => { const r = DEMO_DONORS.filter((d) => d.solicitor === s); return { s, r }; });
  return (
    <Card><H sub="Fictional volunteer and staff portfolios. Click a row for the assigned records.">Committee portfolios</H>
      <Table title="Committee Portfolios" rows={rows} rowClick={(x) => nav.drillIds(x.s, "Assigned records", x.r.map(byId))} cols={[
        { key: "s", label: "Solicitor", get: (x) => x.s }, { key: "n", label: "Assigned", get: (x) => x.r.length },
        { key: "c", label: "Committed", get: (x) => sum(x.r.map((d) => d.pledge?.amount ?? 0)), money: true },
        { key: "o", label: "Open asks", get: (x) => sum(x.r.filter((d) => !d.pledge && d.stage !== "Declined").map((d) => d.ask)), money: true }]} />
    </Card>
  );
}

function CampaignGifts() {
  const t = campaignTotals();
  const rows = DEMO_DONORS.filter((d) => d.pledge).sort((a, b) => b.pledge!.amount - a.pledge!.amount);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Committed" value={usd(t.committed)} /><Stat label="Received" value={usd(t.received)} /><Stat label="Outstanding" value={usd(t.outstanding)} /><Stat label="Commitments" value={num(t.commitments)} />
      </div>
      <Card><H sub="Every campaign commitment. Received + Outstanding = Committed.">Campaign gifts and pledges</H>
        <Table title="Campaign Gifts" rows={rows} id={byId} cols={[nameCol, { key: "date", label: "Pledge date", get: (d) => isoToUs(d.pledge!.date) }, { key: "yrs", label: "Years", get: (d) => d.pledge!.years },
          { key: "amt", label: "Pledged", get: (d) => d.pledge!.amount, money: true }, { key: "paid", label: "Received", get: paid, money: true }, { key: "out", label: "Outstanding", get: outstanding, money: true }, { key: "sol", label: "Solicitor", get: (d) => d.solicitor }]} />
      </Card>
    </div>
  );
}

function Health() {
  const nav = useContext(RecordNav)!;
  const checks = [
    { label: "Missing email", f: (d: Donor) => !d.email }, { label: "Possible duplicate", f: (d: Donor) => d.flags.includes("Possible duplicate") },
    { label: "Lapsed donor", f: (d: Donor) => d.flags.includes("Lapsed donor") }, { label: "No contact logged", f: (d: Donor) => !d.notes.length },
    { label: "Pledge payment behind schedule", f: (d: Donor) => !!d.pledge && d.pledge.payments.length < Math.min(d.pledge.years, 2026 - +d.pledge.date.slice(0, 4) + 1) },
  ];
  return (
    <Card><H sub="Example data-quality checks on the fictional records. Click a check to list them.">Database health</H>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {checks.map((c) => { const r = DEMO_DONORS.filter(c.f); return <Stat key={c.label} label={c.label} value={num(r.length)} onClick={() => nav.drillIds(c.label, "Records flagged by this check", r.map(byId))} />; })}
      </div>
    </Card>
  );
}

function AddUpload() {
  const log = [
    ["10/28/2026", "Added prospect", "Hollis Varga", "Priya Ostrander"], ["10/21/2026", "Uploaded file", "Event attendee list (sample).xlsx", "Staff"],
    ["10/14/2026", "Logged contact", "Kingfisher Family Foundation", "Dana Whitlock"], ["10/02/2026", "Updated stage", "Simone Achterberg -> Solicitation", "Marcus Ellery"],
  ];
  return (
    <div className="space-y-6">
      <PreviewNote>no uploads or invitations are sent, and these controls are disabled. In a client dashboard your team adds prospects and uploads files here.</PreviewNote>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><H>Add a prospect</H><fieldset disabled className="space-y-2 opacity-60">
          <input placeholder="Name" className="w-full rounded-md border border-[rgb(var(--line))] px-3 py-1.5 text-sm" /><input placeholder="Email" className="w-full rounded-md border border-[rgb(var(--line))] px-3 py-1.5 text-sm" />
          <button className="rounded-md bg-[rgb(var(--navy))] px-3 py-1.5 text-sm text-white">Add prospect (disabled in demo)</button></fieldset></Card>
        <Card><H>Upload a file</H><fieldset disabled className="space-y-2 opacity-60"><input type="file" className="text-sm" /><button className="rounded-md bg-[rgb(var(--navy))] px-3 py-1.5 text-sm text-white">Upload (disabled in demo)</button></fieldset></Card>
      </div>
      <Card><H sub="Example entries, fictional.">Activity log</H>
        <Table title="Activity Log (example)" rows={log} cols={["Date", "Action", "Item", "By"].map((l, i) => ({ key: l, label: l, get: (r: string[]) => r[i] }))} /></Card>
    </div>
  );
}

function Ratings() {
  const rows = exampleRatings();
  return (
    <div className="space-y-6">
      <PreviewNote>example committee ratings from fictional members. No reviewer invitations are sent from the demo and the rating form is not available here.</PreviewNote>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Members completed" value={`${RATING_DONE} of ${RATING_MEMBERS.length}`} note="Sample committee" />
        <Stat label="Prospects reviewed" value={num(rows.length)} />
      </div>
      <Card><H sub="Each member answers for each prospect. A = I could be the primary solicitor; B = I could be a secondary solicitor; C = I can open the door; D = I don't know them. Members can add a comment.">Prospect ratings (example)</H>
        <Table title="Prospect Ratings (example)" rows={rows} id={(r) => r.d.cptid} cols={[{ key: "n", label: "Name", get: (r) => r.d.name, name: true },
          { key: "a", label: "A - Primary", get: (r) => r.a }, { key: "b", label: "B - Secondary", get: (r) => r.b }, { key: "c", label: "C - Open door", get: (r) => r.c }, { key: "d", label: "D - Don't know", get: (r) => r.dk },
          { key: "cm", label: "Comments", get: (r) => r.comments }]} />
      </Card>
      <Card><H sub="Sample completion status.">Committee members</H>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">{RATING_MEMBERS.map((m, i) => <li key={m} className="flex justify-between border-b border-[rgb(var(--line))] py-1"><span>{m}</span><span className={i < RATING_DONE ? "text-[rgb(var(--navy))]" : "text-[rgb(var(--ink))]/50"}>{i < RATING_DONE ? "Completed" : "Not started"}</span></li>)}</ul>
      </Card>
    </div>
  );
}

// ---------- record + drill modals ----------
function Modal({ open, onClose, title, children, testid }: { open: boolean; onClose: () => void; title: string; children: ReactNode; testid?: string }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--navy))]/40" />
        <DialogPrimitive.Content data-testid={testid} aria-describedby={undefined} className="fixed inset-0 z-50 flex flex-col bg-[rgb(var(--paper))] shadow-2xl focus:outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(760px,100vw)]">
          <header className="flex items-center gap-3 bg-[rgb(var(--navy))] px-5 py-4 text-white">
            <DialogPrimitive.Title className="font-display min-w-0 flex-1 truncate text-xl">{title}</DialogPrimitive.Title>
            <span className="rounded bg-[rgb(var(--brass))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--navy))]">Fictional</span>
            <DialogPrimitive.Close aria-label="Close" className="rounded-md p-1.5 hover:bg-white/10"><X className="h-5 w-5" /></DialogPrimitive.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const NOTE_KINDS = ["Visit", "Call", "Email", "Event", "Proposal", "Note"] as const;
function RecordView({ d }: { d: Donor }) {
  const demo = useDemo();
  const notes = demo.notesOf(d);
  const [f, setF] = useState({ date: todayUs(), kind: "Note", note: "" });
  const post = async (body: Record<string, unknown>) => demo.post(d.cptid, body);
  const row = (k: string, v: ReactNode) => <div className="flex justify-between gap-3 border-b border-[rgb(var(--line))] py-1.5 text-sm"><span className="text-[rgb(var(--ink))]/60">{k}</span><span className="text-right font-medium">{v}</span></div>;
  return (
    <div className="space-y-5">
      <Card><H>Contact</H>
        {row("ID", d.cptid)}{row("Type", d.type)}{row("City", d.city)}{row("Email (fictional)", d.email || "Missing")}{row("Phone (fictional)", d.phone)}
        {row("Stage", d.stage)}{row("Solicitor", d.solicitor)}{d.committee && row("Committee role", d.committee)}{row("Capacity (sample)", `${d.capacityLabel} · ${d.rating}`)}
      </Card>
      <Card><H sub="Campaign commitment, separate from historical giving.">Campaign</H>
        {d.pledge ? (<>
          {row("Pledged", usd(d.pledge.amount))}{row("Received", usd(paid(d)))}{row("Outstanding", usd(outstanding(d)))}{row("Pledge date / term", `${isoToUs(d.pledge.date)} · ${d.pledge.years} yr`)}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/55">Payments received</p>
          <ul className="text-sm">{d.pledge.payments.map((p, i) => <li key={i} className="flex justify-between py-0.5"><span>{isoToUs(p.date)}</span><span className="tabular-nums">{usd(p.amount)}</span></li>)}{!d.pledge.payments.length && <li className="text-[rgb(var(--ink))]/55">None yet</li>}</ul>
        </>) : <p className="text-sm">{d.ask && d.stage !== "Declined" ? `No commitment yet. Proposed ask ${usd(d.ask)}.` : d.stage === "Declined" ? "Declined this campaign." : "Not a campaign prospect."}</p>}
      </Card>
      <Card><H sub={`Historical giving ${usd(lifetime(d))} across ${d.gifts.length} gifts`}>Giving history</H>
        <ul className="max-h-56 overflow-auto text-sm">{[...d.gifts].reverse().map((g, i) => <li key={i} className="flex justify-between gap-3 border-b border-[rgb(var(--line))] py-1"><span>{isoToUs(g.date)} · {g.kind}</span><span className="tabular-nums">{usd(g.amount)}</span></li>)}</ul>
      </Card>
      <Card><H sub="In client dashboards your team uploads PDF notes here. In the demo, uploads are disabled; you can download a generated sample notes PDF.">PDF notes</H>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => downloadTable({ title: `Meeting notes - ${d.name}`, subtitle: "Generated sample notes", cols: [{ label: "Date" }, { label: "Type" }, { label: "Note" }, { label: "By" }], rows: notes.map((n) => [isoToUs(n.date), n.kind, n.note, n.by]) }, "pdf")} disabled={!notes.length} className="rounded-md border border-[rgb(var(--navy))] px-3 py-1 text-xs font-medium text-[rgb(var(--navy))] disabled:opacity-50">Download sample notes PDF</button>
          <button type="button" disabled className="rounded-md bg-[rgb(var(--navy))] px-3 py-1 text-xs text-white opacity-50">Upload PDF (disabled in demo)</button>
        </div>
        {!notes.length && <p className="mt-2 text-xs text-[rgb(var(--ink))]/55">Add a history note first to generate a sample PDF.</p>}
      </Card>
      <Card><H sub="Notes you add stay in this browser tab only.">History notes</H>
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-md bg-[rgb(var(--paper))] p-2">
          <label className="text-xs">Type<select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className="w-full rounded-md border border-[rgb(var(--line))] px-2 py-1.5 text-sm">{NOTE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="text-xs">Date<DateInput value={f.date} onChange={(v) => setF({ ...f, date: v })} className="w-full rounded-md border border-[rgb(var(--line))] px-2 py-1.5 text-sm" required /></label>
          <textarea aria-label="New note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={2} placeholder="Add a note (demo)" className="col-span-2 w-full rounded-md border border-[rgb(var(--line))] px-2 py-1.5 text-sm" />
          <button type="button" disabled={!f.note.trim() || !parseUsDateClient(f.date)} onClick={() => { if (demo.post(d.cptid, { type: "addActivity", ...f })) setF({ ...f, note: "" }); }} className="col-span-2 justify-self-start rounded-md bg-[rgb(var(--navy))] px-3 py-1 text-xs font-medium text-white disabled:opacity-50">Add note</button>
        </div>
        <HistoryList items={notes as HistoryItem[]} kinds={NOTE_KINDS} post={post} busy={null} />
      </Card>
    </div>
  );
}

// ---------- page ----------
export function DemoDataDashboard() {
  const [tab, setTab] = useUrlState<DemoTab>("tab", "Overview", DEMO_TABS);
  const [rec, setRec] = useState<number | null>(null);
  const [drill, setDrill] = useState<{ title: string; sub: string; ids: number[] } | null>(null);
  const [pick, setPick] = useState<number[] | null>(null);
  const [q, setQ] = useState("");
  const [rev, setRev] = useState(0);
  const { overlay, save, reset } = useSessionNotes();

  const notesOf = useCallback((d: Donor) => overlay[d.cptid] ?? d.notes, [overlay]);
  const postNote = (cptid: number, body: Record<string, unknown>) => {
    const d = BY_ID.get(cptid); if (!d) return false;
    const cur = [...(overlay[cptid] ?? d.notes)];
    const at = new Date().toISOString();
    if (body.type === "addActivity" || body.type === "editActivity") {
      const date = parseUsDateClient(String(body.date)); if (!date) return false;
      if (body.type === "addActivity") cur.unshift({ id: `local-${Date.now()}`, cptid, date, kind: String(body.kind), note: String(body.note), by: "You (demo)", at });
      else { const i = cur.findIndex((n) => n.id === body.id); if (i < 0) return false; cur[i] = { ...cur[i], date, kind: String(body.kind), note: String(body.note), editedBy: "You (demo)", editedAt: at }; }
    } else if (body.type === "deleteActivity") { const i = cur.findIndex((n) => n.id === body.id); if (i < 0) return false; cur.splice(i, 1); } else return false;
    cur.sort((a, b) => b.date.localeCompare(a.date));
    save({ ...overlay, [cptid]: cur });
    return true;
  };
  const nav = useMemo(() => ({
    open: (id: number) => { if (BY_ID.has(id)) { setPick(null); setRec(id); } },
    openName: (name: string, id?: number | null) => {
      if (id && BY_ID.has(id)) { setRec(id); return; }
      const m = DEMO_DONORS.filter((d) => d.name.toLowerCase() === name.toLowerCase());
      if (m.length === 1) setRec(m[0].cptid); else if (m.length) setPick(m.map(byId));
    },
    drillIds: (title: string, sub: string, ids: number[]) => setDrill({ title, sub, ids }),
    drillQuery: (title: string, sub: string, kind: string, value: string | number) => {
      const ids = DEMO_DONORS.filter((d) => (kind === "year" ? d.gifts.some((g) => g.date.startsWith(String(value))) : kind === "stage" ? d.stage === value : false)).map(byId);
      setDrill({ title, sub, ids });
    },
  }), []);
  const ctx: DemoCtx = { notesOf, post: postNote, reset: () => { reset(); try { sessionStorage.removeItem(SETUPS_KEY); } catch { /* ignore */ } setRec(null); setDrill(null); setPick(null); setQ(""); setRev((r) => r + 1); }, edited: Object.keys(overlay).length > 0, open: nav.open };
  const hits = q.trim() ? DEMO_DONORS.filter((d) => `${d.name} ${d.city} ${d.cptid}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  const recDonor = rec ? BY_ID.get(rec) : undefined;
  const helpCatalog = useMemo(() => ({
    sections: DEMO_HELP_TOPICS.filter((t) => t.kind === "section"), tasks: DEMO_HELP_TOPICS.filter((t) => t.kind === "task"),
    search: demoSearch, topicForTab: demoTopicForTab, searchPlaceholder: "Search help (e.g. pledge, Excel, notes)",
  }), []);

  return (
    <Demo.Provider value={ctx}>
    <RecordNav.Provider value={nav}>
    <main className="min-h-screen overflow-x-hidden bg-[rgb(var(--paper))]">
      <div role="status" data-testid="demo-banner" className="bg-[rgb(var(--brass))] px-4 py-2 text-center text-xs font-medium text-[rgb(var(--navy))] sm:text-sm">
        <strong>SAMPLE DASHBOARD · FICTIONAL DATA.</strong> {DEMO_ORG_LABEL} is invented; no real donors or organizations. Changes stay in this browser tab only.
        <button type="button" onClick={ctx.reset} className="ml-2 rounded border border-[rgb(var(--navy))] px-2 py-0.5 text-xs font-semibold hover:bg-[rgb(var(--navy))] hover:text-white">Reset demo</button>
      </div>
      <header className="bg-[rgb(var(--navy))] px-4 py-5 text-white sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="mb-3 inline-flex h-14 items-center overflow-hidden rounded-md bg-[rgb(var(--paper))] px-1"><Image src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ccdcb7df-f854-4cf8-a390-1d9eb56ecd9d.png" alt="Catapult Fundraising" width={768} height={512} className="h-32 w-auto max-w-none object-contain" priority /></span>
            <p className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--brass-light))]">Prepared by Catapult Fundraising · Sample</p>
            <h1 className="font-display mt-1 text-3xl">{DEMO_ORG_LABEL}</h1>
            <p className="mt-1 text-sm text-white/70">Fictional source data as of {DEMO_AS_OF}</p>
          </div>
          <div className="relative w-full sm:w-80">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fictional donors..." aria-label="Search all donors" className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50" />
            {!!hits.length && (
              <ul className="absolute right-0 z-30 mt-1 w-full overflow-hidden rounded-md bg-white text-sm text-[rgb(var(--ink))] shadow-lg">
                {hits.map((d) => <li key={d.cptid}><button type="button" onClick={() => { setRec(d.cptid); setQ(""); }} className="block w-full px-3 py-2 text-left hover:bg-[rgb(var(--brass))]/10">{d.name} <span className="text-xs text-[rgb(var(--ink))]/50">{d.city}</span></button></li>)}
              </ul>
            )}
          </div>
        </div>
      </header>
      <nav className="sticky top-0 z-10 border-b border-[rgb(var(--line))] bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {DEMO_TABS.map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${t === tab ? "border-[rgb(var(--brass))] text-[rgb(var(--navy))]" : "border-transparent text-[rgb(var(--ink))]/60"}`}>{t}</button>)}
          </div>
          <DashboardHelp catalog={helpCatalog} currentTab={tab} />
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SafeBoundary key={`${tab}-${rev}`} label={`The ${tab} tab`}>
          {tab === "Overview" && <Overview />}
          {tab === "Donor Lookup" && <Lookup />}
          {tab === "Gift Pyramid" && <Pyramid />}
          {tab === "Gift Chart + GC2P" && <GiftChartTab />}
          {tab === "Prospects" && <Prospects />}
          {tab === "Reports" && <Reports />}
          {tab === "Committee" && <Committee />}
          {tab === "Campaign Gifts" && <CampaignGifts />}
          {tab === "Database Health" && <Health />}
          {tab === "Add + Upload" && <AddUpload />}
          {tab === "Prospect Ratings" && <Ratings />}
        </SafeBoundary>
        <p className="mt-10 text-xs text-[rgb(var(--ink))]/50">Sample dashboard for demonstration. All names, figures, emails and phone numbers are fictional. Campaign commitments are shown separately from historical giving.</p>
      </div>
      <Modal open={!!drill} onClose={() => setDrill(null)} title={drill?.title ?? ""} testid="demo-drill">
        {drill && <><p className="mb-3 text-sm text-[rgb(var(--ink))]/60">{drill.sub}</p><Table title={drill.title} rows={drill.ids.map((i) => BY_ID.get(i)!).filter(Boolean)} id={byId} cols={donorCols} /></>}
      </Modal>
      <Modal open={!!pick} onClose={() => setPick(null)} title="Several records match">
        <ul className="space-y-1">{pick?.map((i) => <li key={i}><NameLink name={BY_ID.get(i)!.name} cptid={i} /></li>)}</ul>
      </Modal>
      <Modal open={!!recDonor} onClose={() => setRec(null)} title={recDonor?.name ?? ""} testid="demo-record">
        {recDonor && <SafeBoundary label="This record"><RecordView d={recDonor} /></SafeBoundary>}
      </Modal>
    </main>
    </RecordNav.Provider>
    </Demo.Provider>
  );
}
