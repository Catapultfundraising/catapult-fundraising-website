"use client";

import { useMemo, useState } from "react";
import { PortalV2Provider, CampaignProgress, CampaignDonors, AddAndUpload } from "@/components/portal-v2";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import type { WcbhcSnapshot, Person } from "@/lib/wcbhc-data-store";
import { formatDollars } from "@/lib/gift-chart";
import { extrasFromIndex, seatGc2p } from "@/lib/wcbhc-gc2p";
import { BoardReviewAdmin } from "@/components/board-review/admin";
import { useBoardReviewStaff } from "@/components/board-review/staff-tab";
import { CrmProvider, DonorSearch, DownloadButtons, PeopleTable, downloadUrl, useCrm, type ExportKind } from "@/components/wcbhc-data-crm";
import type { IndexRow } from "@/lib/wcbhc-data-store";

const NAVY = "#15212e";
const GOLD = "#b28c46";

const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const short = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`;
const num = (n: number) => n.toLocaleString("en-US");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");

const TABS = ["Donor Lookup", "Overview", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Committee", "Campaign Prospects", "Campaign Gifts", "Database Health", "Campaign Donors", "Add + Upload"] as const;
type Tab = (typeof TABS)[number];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`min-w-0 max-w-full rounded-xl border border-[rgb(var(--line))] bg-white p-4 sm:p-5 ${className}`}>{children}</div>;
}
function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="py-4">
      <p className="font-display text-2xl text-[rgb(var(--navy))]">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>
      {note && <p className="mt-1 text-[11px] text-[rgb(var(--ink))]/50">{note}</p>}
    </Card>
  );
}
function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-display text-xl text-[rgb(var(--navy))]">{children}</h2>
      {sub && <p className="text-sm text-[rgb(var(--ink))]/60">{sub}</p>}
    </div>
  );
}

function Table<T extends Record<string, unknown>>({
  rows, cols, csvName, exportSub,
}: {
  rows: T[];
  cols: { key: keyof T; label: string; fmt?: (v: T[keyof T], r: T) => string; right?: boolean }[];
  /** Report title for the branded PDF/Excel download. */
  csvName?: string;
  exportSub?: string;
}) {
  const { open } = useCrm();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: keyof T; dir: 1 | -1 } | null>(null);
  const shown = useMemo(() => {
    let r = rows;
    if (q) r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
    if (sort) r = [...r].sort((a, b) => (a[sort.k] > b[sort.k] ? 1 : a[sort.k] < b[sort.k] ? -1 : 0) * sort.dir);
    return r;
  }, [rows, q, sort]);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="w-full min-w-0 rounded-md sm:w-64 border border-[rgb(var(--line))] px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-[rgb(var(--ink))]/55">{num(shown.length)} rows</span>
        {csvName && (
          <DownloadButtons
            get={() => ({
              title: csvName.replace(/\.csv$/i, "").replace(/^WCBHC /, ""),
              subtitle: [exportSub, q ? `Filtered: "${q}"` : ""].filter(Boolean).join(" · ") || undefined,
              cols: cols.map((c) => ({ label: c.label, kind: kindOf(c, shown[0]) })),
              sections: [{ rows: shown.map((r) => cols.map((c) => cellOut(c, r))) }],
            })}
          />
        )}
      </div>
      <div className="max-h-[560px] overflow-auto rounded-lg border border-[rgb(var(--line))]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[rgb(var(--navy))] text-left text-xs uppercase tracking-wider text-white">
            <tr>
              {cols.map((c) => (
                <th
                  key={String(c.key)}
                  onClick={() => setSort({ k: c.key, dir: sort?.k === c.key && sort.dir === -1 ? 1 : -1 })}
                  className={`cursor-pointer whitespace-nowrap px-3 py-2 ${c.right ? "text-right" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr
                key={i}
                onClick={typeof r.cptid === "number" ? () => open(r.cptid as number) : undefined}
                className={`${i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"} ${typeof r.cptid === "number" ? "cursor-pointer hover:bg-[rgb(var(--brass))]/10" : ""}`}
              >
                {cols.map((c) => (
                  <td key={String(c.key)} className={`whitespace-nowrap px-3 py-1.5 ${c.right ? "text-right tabular-nums" : ""}`}>
                    {c.fmt ? c.fmt(r[c.key], r) : String(r[c.key] ?? "")}
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

type AnyCol = { key: unknown; label: string; fmt?: (v: never, r: never) => string; right?: boolean };
// Money columns export as numbers with currency format; other formatted
// columns export as the text shown on screen.
function kindOf(c: AnyCol, sample?: Record<string, unknown>): ExportKind {
  if (!sample) return "text";
  const v = sample[c.key as string];
  if (typeof v !== "number") return "text";
  if (!c.fmt) return c.right ? "num" : "text";
  return (c.fmt as (v: unknown, r: unknown) => string)(v, sample).startsWith("$") ? "usd" : "text";
}
function cellOut(c: AnyCol, r: Record<string, unknown>): string | number {
  const v = r[c.key as string];
  const k = kindOf(c, r);
  if (k === "usd" || k === "num") return typeof v === "number" ? v : String(v ?? "");
  return c.fmt ? (c.fmt as (v: unknown, r: unknown) => string)(v, r) : String(v ?? "");
}

const personCols: { key: keyof Person; label: string; fmt?: (v: never) => string; right?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "lifetime", label: "Lifetime", fmt: (v: number) => usd(v), right: true },
  { key: "gifts", label: "# Gifts", right: true },
  { key: "largest", label: "Largest", fmt: (v: number) => usd(v), right: true },
  { key: "years", label: "Yrs Giving", right: true },
  { key: "first", label: "First Gift" },
  { key: "last", label: "Last Gift" },
  { key: "ds", label: "DS Rating" },
  { key: "capacity", label: "Capacity" },
];

function Overview({ d }: { d: WcbhcSnapshot }) {
  const recent = d.fys.slice(-10);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lifetime giving" value={short(d.kpi.total)} note={`$12M campaign ${short(d.kpi.campaign ?? 0)} plus Nevada Cares Campus giving`} />
        <Stat label="Gifts" value={num(d.kpi.gifts)} note={`Avg ${usd(d.kpi.avg)}`} />
        <Stat label="Donors with gifts" value={num(d.kpi.donors)} />
        <Stat label="Screened (DonorSearch)" value={num(d.health.dsScreened)} />
      </div>
      <Card>
        <H sub="Calendar years. Bars = dollars.">Giving by year</H>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={d.fys}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="fy" />
              <YAxis tickFormatter={short} />
              <Tooltip formatter={(v: number) => usd(v)} />
              <Bar dataKey="total" fill={NAVY} name="Dollars" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <H sub="Donors per calendar year">Donor count</H>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={recent}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fy" />
                <YAxis />
                <Tooltip />
                <Line dataKey="donors" stroke={GOLD} strokeWidth={3} name="Donors" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <H sub="Share of last year's donors who gave again">Donor retention</H>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={d.retention.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fy" />
                <YAxis unit="%" />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill={GOLD} name="Retention %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <H>Recent years</H>
        <Table
          csvName="Giving by Year"
          rows={[...recent].reverse().map((f) => {
            const r = d.retention.find((x) => x.fy === f.fy);
            return { ...f, retention: r ? r.rate : 0, newDonors: r ? r.new : 0 };
          })}
          cols={[
            { key: "fy", label: "Year" },
            { key: "total", label: "Dollars", fmt: (v) => usd(v as number), right: true },
            { key: "donors", label: "Donors", right: true },
            { key: "newDonors", label: "New donors", right: true },
            { key: "retention", label: "Retention", fmt: (v) => `${v}%`, right: true },
          ]}
        />
      </Card>
      <Card>
        <H sub="Lifetime giving by donor type">Giving by donor type</H>
        <Table
          csvName="Giving by Donor Type"
          rows={d.stages}
          cols={[
            { key: "stage", label: "Donor Type" },
            { key: "gifts", label: "Gifts", right: true, fmt: (v) => num(v as number) },
            { key: "total", label: "Dollars", right: true, fmt: (v) => usd(v as number) },
          ]}
        />
      </Card>
    </div>
  );
}

function useDrill() {
  const { index, drill, loading } = useCrm();
  return (title: string, sub: string, f: (r: IndexRow) => boolean) => {
    if (!index) { alert(loading ? "Donor records are still loading, try again in a moment." : "Donor records are not available."); return; }
    drill(title, sub, index.filter(f));
  };
}

function Pyramid({ d }: { d: WcbhcSnapshot }) {
  const max = Math.max(...d.pyramid.map((p) => p.donors));
  const go = useDrill();
  return (
    <div className="space-y-6">
      <Card>
        <H sub="Donors grouped by lifetime giving. Click any band to see the donors in it.">Lifetime giving pyramid</H>
        <div className="space-y-1.5">
          {d.pyramid.map((p) => (
            <div
              key={p.band}
              onClick={() => go(`Lifetime giving ${p.band}`, "Donors in this lifetime giving band", (r) => r.band === p.band)}
              className="grid cursor-pointer grid-cols-[120px_1fr_90px_110px_60px] items-center gap-3 rounded text-sm hover:bg-[rgb(var(--brass))]/10"
            >
              <span className="font-medium">{p.band}</span>
              <div className="h-6 rounded bg-[rgb(var(--paper))]">
                <div className="h-6 rounded" style={{ width: `${Math.max(2, (p.donors / max) * 100)}%`, background: NAVY }} />
              </div>
              <span className="text-right tabular-nums">{num(p.donors)} donors</span>
              <span className="text-right tabular-nums">{short(p.total)}</span>
              <span className="text-right text-xs text-[rgb(var(--ink))]/55">{pct(p.total, d.kpi.total)}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <H sub="DonorSearch wealth-based capacity. Click a row to see the prospects.">Capacity distribution</H>
          <div className="max-h-[300px] overflow-auto rounded-lg border border-[rgb(var(--line))]">
            {d.capacity.map(([c, n], i) => (
              <button
                key={c}
                onClick={() => go(`Capacity ${c}`, "DonorSearch wealth-based capacity", (r) => r.capacity === c)}
                className={`flex w-full justify-between px-3 py-1.5 text-left text-sm hover:bg-[rgb(var(--brass))]/10 ${i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"}`}
              >
                <span className="text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40">{c}</span>
                <span className="tabular-nums">{num(n)}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <H sub="DS1 = proven philanthropist, 1 is strongest. Click a bar to see the prospects.">DS rating distribution</H>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={d.dsRating.map(([r, n]) => ({ r, n }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="r" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="n"
                  fill={GOLD}
                  name="Donors"
                  cursor="pointer"
                  onClick={(e: { r?: string; payload?: { r: string } }) => {
                    const r = e.payload?.r ?? e.r ?? "";
                    go(`DS Rating ${r}`, "DonorSearch DS rating", (x) => x.ds === r);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <H sub="Top 250 donors by lifetime giving">Top donors</H>
        <Table rows={d.top as never} cols={personCols as never} csvName="Top 250 Donors" />
      </Card>
    </div>
  );
}


function GiftChartTab({ d }: { d: WcbhcSnapshot }) {
  const [goalText, setGoalText] = useState("12000000");
  const [busy, setBusy] = useState<string | null>(null);
  const goal = Math.min(500_000_000, Math.max(100_000, Number(goalText.replace(/[^\d]/g, "")) || 0));
  const { index, tracking } = useCrm();
  const { chart, seated, removed } = useMemo(() => seatGc2p(goal, d.pool, tracking, extrasFromIndex(index, tracking, d.pool)), [goal, d.pool, index, tracking]);
  const stOf = (id: number) => tracking.prospects[String(id)];
  const reportDownload = async (report: "gc" | "gc2p", format: "pdf" | "docx" | "xlsx") => {
    setBusy(report + format);
    const names = { gc: "WCBHC Gift Chart", gc2p: "WCBHC Gift Chart to Prospects" };
    try { await downloadUrl(`/api/wcbhc-data-reports?report=${report}&goal=${goal}&format=${format}`, `${names[report]}.${format}`); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Campaign goal</label>
            <input value={goalText} onChange={(e) => setGoalText(e.target.value)} className="mt-1 block w-full max-w-[12rem] rounded-md border border-[rgb(var(--line))] px-3 py-2 font-display text-xl" />
          </div>
          <p className="text-sm text-[rgb(var(--ink))]/60">{goal === 12_000_000 ? `${formatDollars(goal)} · The approved WCBHC $12M gift chart (May 18, 2026)` : `${formatDollars(goal)} · Catapult house shape for comparison (the approved chart is $12,000,000)`}</p>
          <div className="flex flex-col gap-2 sm:ml-auto">
            <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => reportDownload("gc", "pdf")} disabled={!!busy} className="rounded-md bg-[rgb(var(--navy))] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {busy === "gcpdf" ? "Building..." : "Gift Chart PDF"}
            </button>
            <button onClick={() => reportDownload("gc", "docx")} disabled={!!busy} className="rounded-md border border-[rgb(var(--brass))] px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] disabled:opacity-60">
              {busy === "gcdocx" ? "Building..." : "Word"}
            </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => reportDownload("gc2p", "pdf")} disabled={!!busy} className="rounded-md bg-[rgb(var(--navy))] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {busy === "gc2ppdf" ? "Building..." : "GC2P PDF"}
            </button>
            <button onClick={() => reportDownload("gc2p", "xlsx")} disabled={!!busy} className="rounded-md border border-[rgb(var(--brass))] px-3 py-2 text-sm font-medium text-[rgb(var(--navy))] disabled:opacity-60">
              {busy === "gc2pxlsx" ? "Building..." : "Excel"}
            </button>
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <H sub={goal === 12_000_000 ? "Approved $12M campaign gift chart" : "Suggested gift chart"}>Gift chart</H>
        <Table
          rows={chart.rows.map((r) => ({
            gifts: r.gifts ?? "Many", level: r.level === null ? `Under ${formatDollars(r.under ?? 0)}` : formatDollars(r.level),
            value: r.value, cumulative: r.cumulative, prospects: r.prospects ?? "", share: Math.round(r.shareOfGoal * 1000) / 10,
          }))}
          csvName={`Gift Chart ${formatDollars(goal)}`}
          cols={[
            { key: "gifts", label: "Gifts" }, { key: "level", label: "Gift Level" },
            { key: "value", label: "Value", fmt: (v) => usd(v as number), right: true },
            { key: "cumulative", label: "Cumulative", fmt: (v) => usd(v as number), right: true },
            { key: "prospects", label: "Prospects Needed", right: true },
            { key: "share", label: "% of Goal", fmt: (v) => `${v}%`, right: true },
          ]}
        />
      </Card>
      <Card>
        <H sub={`Every level of the approved chart is shown. Prospects are seated where the campaign committee and Catapult placed them: individuals at the low end of their wealth-screening capacity, foundations and corporations at their published grant range or largest known gift, and new referrals one level below capacity until cultivated. Within a level, prospects are ordered by readiness. Gifts received, pledged or committed stay in their seats. Committee updates: ${removed.disqualified} disqualified and ${removed.committed} committed prospects are off the chart, and anyone placed at a gift level is seated there.`}>
          Gift chart to prospects
        </H>
        <div className="mb-4 space-y-1.5">
          {seated.map((x) => (
            <div key={x.level} className="grid grid-cols-[110px_1fr_140px] items-center gap-3 text-sm">
              <span className="font-medium">{formatDollars(x.level)}</span>
              <div className="h-5 rounded bg-[rgb(var(--paper))]">
                <div className="h-5 rounded" style={{ width: `${Math.min(100, (x.people.length / x.need) * 100)}%`, background: x.people.length >= x.need ? NAVY : GOLD }} />
              </div>
              <span className="text-right tabular-nums">{x.people.length} of {x.need} identified</span>
            </div>
          ))}
        </div>
        <p className="mb-4 text-xs text-[rgb(var(--ink))]/55">Click any prospect to open the full donor record. Use the download buttons at the top for the complete branded PDF with every section.</p>
        <div className="space-y-5">
          {seated.map((x) => (
            <div key={x.level}>
              <p className="mb-1 font-display text-lg text-[rgb(var(--navy))]">
                {formatDollars(x.level)} level · {x.row.gifts} gift{x.row.gifts === 1 ? "" : "s"} · {x.people.length} prospect{x.people.length === 1 ? "" : "s"} ({x.need} needed at 3:1)
              </p>
              {x.people.length > 0 && (
                <Table
                  csvName={`GC2P ${formatDollars(x.level)} Level`}
                  exportSub={`${formatDollars(goal)} goal`}
                  rows={x.people.map((p) => ({ ...p, solicitor: stOf(p.cptid)?.solicitor || p.solicitor, status: stOf(p.cptid)?.status ?? p.status ?? "", pir: tracking.pirs[String(p.cptid)] ? "Yes" : "" })) as never}
                  cols={[
                    { key: "name", label: "Prospect" },
                    { key: "solicitor", label: "Committee Solicitor / Connection" },
                    { key: "status", label: "Status" },
                    { key: "pir", label: "PIR" },
                    { key: "donorType", label: "Type" },
                    { key: "wealth", label: "Wealth Rating" },
                    { key: "capText", label: "Capacity / Grant Range" },
                    { key: "history", label: "Giving History" },
                    { key: "note", label: "Notes" },
                  ] as never}
                />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Lookup({ d }: { d: WcbhcSnapshot }) {
  const { index, loading } = useCrm();
  return (
    <div className="space-y-6">
      <Card>
        <H sub="Search any constituent by name, city or CPTID, then click to open the full record: contact details, every gift, giving by year, wealth screening, committee, gift chart seat and notes.">Donor lookup</H>
        <DonorSearch />
      </Card>
      <Card>
        <H sub={`All ${index ? num(index.length) : ""} constituents, largest lifetime giving first. Sort or filter, then click any name.`}>All records</H>
        {index ? <PeopleTable rows={index} /> : <p className="text-sm">{loading ? "Loading donor records..." : "Donor records are not available yet."}</p>}
      </Card>
      <p className="text-xs text-[rgb(var(--ink))]/50">Data as of {d.asOf}.</p>
    </div>
  );
}

function Prospects({ d }: { d: WcbhcSnapshot }) {
  const pools = [
    { k: "High Wealth", rows: d.highWealth, n: d.highWealthCount, desc: "DonorSearch capacity of $25K or more, sorted by capacity. Major gift and campaign prospects." },
    { k: "Mid-Level", rows: d.midLevel, n: d.midLevelCount, desc: "Lifetime $250 to $4,999 with a gift in the last 3 years. Mid-Level program pool." },
    { k: "Legacy", rows: d.legacy, n: d.legacyCount, desc: "Gave in 3 or more calendar years, lifetime under $25K. Legacy Call pool." },
    { k: "Lapsed $1K+", rows: d.lapsed, n: d.lapsedCount, desc: "Lifetime $1K or more, no gift in the last 3 years. Reactivation pool." },
  ];
  const [sel, setSel] = useState(0);
  const p = pools[sel];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {pools.map((x, i) => (
          <button key={x.k} onClick={() => setSel(i)} className={`rounded-xl border p-4 text-left ${i === sel ? "border-[rgb(var(--brass))] bg-white ring-2 ring-[rgb(var(--brass))]" : "border-[rgb(var(--line))] bg-white"}`}>
            <p className="font-display text-2xl text-[rgb(var(--navy))]">{num(x.n)}</p>
            <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{x.k}</p>
          </button>
        ))}
      </div>
      <Card>
        <H sub={`${p.desc}${p.n > p.rows.length ? ` Showing top ${p.rows.length} of ${num(p.n)}.` : ""}`}>{p.k} prospects</H>
        <Table rows={p.rows as never} cols={personCols as never} csvName={`${p.k} Prospects`} />
      </Card>
    </div>
  );
}

function Board({ d }: { d: WcbhcSnapshot }) {
  const active = d.board.filter((b) => b.active);
  const ask = active.reduce((s, b) => s + b.ask, 0);
  const got = active.reduce((s, b) => s + b.get, 0);
  const giving = active.filter((b) => b.lifetime > 0).length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Committee members" value={num(active.length)} />
        <Stat label="Pledged (incl. verbal)" value={usd(ask)} />
        <Stat label="Gifts received" value={usd(got)} />
        <Stat label="Members who have given or pledged" value={`${active.filter((b) => b.ask > 0 || b.get > 0).length} of ${active.length}`} note={`${giving} with gifts on file`} />
      </div>
      <Card>
        <H sub="Campaign committee giving and pledges (committee giving sheet, September 10, 2026)">Committee giving</H>
        <Table
          rows={d.board}
          csvName="Committee Giving"
          cols={[
            { key: "name", label: "Name" },
            { key: "title", label: "Status" },
            { key: "term", label: "Date" },
            { key: "ask", label: "Pledge", fmt: (v) => usd(v as number), right: true },
            { key: "get", label: "Gift", fmt: (v) => usd(v as number), right: true },
            { key: "lifetime", label: "Lifetime", fmt: (v) => usd(v as number), right: true },
            { key: "last", label: "Last Gift" },
            { key: "ds", label: "DS" },
            { key: "capacity", label: "Capacity" },
          ]}
        />
      </Card>
    </div>
  );
}

function Health({ d }: { d: WcbhcSnapshot }) {
  const h = d.health;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Individual records" value={num(h.records)} />
        <Stat label="With address" value={pct(h.address, h.records)} note={num(h.address)} />
        <Stat label="With phone" value={pct(h.phone, h.records)} note={num(h.phone)} />
        <Stat label="With email" value={pct(h.email, h.records)} note={num(h.email)} />
        <Stat label="Organizations" value={num(h.orgs)} />
        <Stat label="Flagged duplicates" value={num(h.duplicates)} />
        <Stat label="Accounts with 2+ CPTIDs" value={num(h.multiCptAccounts)} />
        <Stat label="DonorSearch screened" value={pct(h.dsScreened, h.constituents)} note={`${num(h.dsScreened)} of ${num(h.constituents)}`} />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <H>Donor type</H>
          <Table csvName="Donor Types" rows={d.donorType.map(([k, n]) => ({ type: k, count: n }))} cols={[{ key: "type", label: "Donor Type" }, { key: "count", label: "Records", right: true }]} />
        </Card>
        <Card>
          <H>Affiliation flags</H>
          <Table csvName="Affiliation Flags" rows={Object.entries(d.flags).map(([k, n]) => ({ flag: k, count: n }))} cols={[{ key: "flag", label: "Flag" }, { key: "count", label: "Records", right: true }]} />
        </Card>
        <Card>
          <H>Organization types</H>
          <Table csvName="Organization Types" rows={d.orgTypes.map(([k, n]) => ({ type: k, count: n }))} cols={[{ key: "type", label: "Type" }, { key: "count", label: "Orgs", right: true }]} />
        </Card>
      </div>
    </div>
  );
}

function Portfolio({ d }: { d: WcbhcSnapshot }) {
  const withAsk = d.portfolio.filter((p) => p.ask > 0);
  const bySol = Array.from(new Set(d.portfolio.map((p) => p.solicitor))).sort().map((s) => {
    const ps = d.portfolio.filter((p) => p.solicitor === s);
    return { solicitor: s, prospects: ps.length, asks: ps.filter((p) => p.ask > 0).length, ask: ps.reduce((a, p) => a + p.ask, 0) };
  }).sort((a, b) => b.ask - a.ask);
  const cols = [
    { key: "name", label: "Prospect" }, { key: "solicitor", label: "Committee Solicitor / Connection" },
    { key: "ask", label: "Gift Level", fmt: (v: unknown) => (v ? usd(v as number) : ""), right: true },
    { key: "priority", label: "Status" }, { key: "type", label: "Type" },
    { key: "lifetime", label: "Lifetime", fmt: (v: unknown) => usd(v as number), right: true },
    { key: "ds", label: "Wealth Rating" }, { key: "capacity", label: "Capacity / Grant Range" }, { key: "task", label: "Notes" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Seated prospects" value={num(d.portfolio.length)} />
        <Stat label="With a solicitor or connection" value={num(d.portfolio.filter((p) => p.solicitor !== "Unassigned").length)} />
        <Stat label="Identified, not yet rated" value={num(d.unrated?.length ?? 0)} />
        <Stat label="Received, pledged or committed" value={num(d.committed.length)} note={short(d.committed.reduce((a, p) => a + p.ask, 0)) + " with amounts"} />
      </div>
      <Card>
        <H sub="Seated prospects by committee solicitor or connection">Solicitor assignments</H>
        <Table csvName="Prospects by Solicitor" rows={bySol} cols={[
          { key: "solicitor", label: "Solicitor / Connection" }, { key: "prospects", label: "Prospects", right: true },
          { key: "asks", label: "Seated", right: true }, { key: "ask", label: "Total of Gift Levels", fmt: (v) => usd(v as number), right: true },
        ]} />
      </Card>
      <Card>
        <H sub="Every prospect seated on the $12M gift chart, largest gift level first. Click a name to open the record.">Campaign prospects</H>
        <Table csvName="Campaign Prospects" rows={d.portfolio as never} cols={cols as never} />
      </Card>
      {!!d.unrated?.length && (
        <Card>
          <H sub="Identified but not yet rated: no capacity data or giving history to seat on yet">Pipeline, not yet seated</H>
          <Table csvName="Pipeline Not Yet Seated" rows={d.unrated as never} cols={[{ key: "name", label: "Prospect" }, { key: "type", label: "Type" }, { key: "note", label: "Notes" }] as never} />
        </Card>
      )}
      {!!d.notSeated?.length && (
        <Card>
          <H sub="Named on the committee list but not seated, with the reason">Not seated</H>
          <Table csvName="Not Seated" rows={d.notSeated as never} cols={[{ key: "name", label: "Prospect" }, { key: "reason", label: "Reason" }] as never} />
        </Card>
      )}
    </div>
  );
}

function Givebutter({ d }: { d: WcbhcSnapshot }) {
  const g = d.givebutter;
  return (
    <div className="space-y-6">
      <Card className="border-[rgb(var(--brass))]/50 bg-[rgb(var(--brass))]/5">
        <p className="text-sm text-[rgb(var(--ink))]/75">
          Gifts recorded to the $12M Capital Campaign{g.from ? ` from ${g.from} to ${g.to}` : ""}, plus committee pledges and verbal commitments. Pledges are not counted in the giving totals until they are paid.
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Campaign gifts" value={num(g.txCount)} note={`${num(g.txDonors)} donors`} />
        <Stat label="Campaign gift dollars" value={usd(g.txTotal)} />
        <Stat label="Committee pledges" value={num(g.pledgeCount)} />
        <Stat label="Pledged" value={usd(g.pledgeTotal)} />
      </div>
      <Card>
        <H sub="Campaign gifts by payment type">Gifts by type</H>
        <Table csvName="Campaign Gifts by Type" rows={g.byCampaign} cols={[
          { key: "campaign", label: "Type" }, { key: "gifts", label: "Gifts", right: true },
          { key: "total", label: "Dollars", fmt: (v) => usd(v as number), right: true },
        ]} />
      </Card>
      <Card>
        <H sub="Committee pledges and verbal commitments, largest first">Pledges</H>
        <Table csvName="Campaign Pledges" rows={g.pledges as never} cols={[
          { key: "name", label: "Name" }, { key: "pledged", label: "Pledged On" },
          { key: "amount", label: "Amount", fmt: (v: unknown) => usd(v as number), right: true },
          { key: "remaining", label: "Remaining", fmt: (v: unknown) => usd(v as number), right: true },
                    { key: "campaign", label: "Campaign" }, { key: "status", label: "Status" },
        ] as never} />
      </Card>
      <Card>
        <H sub="Every campaign gift, newest first">Gifts</H>
        <Table csvName="Campaign Gifts" rows={g.transactions as never} cols={[
          { key: "date", label: "Date" }, { key: "name", label: "Name" },
          { key: "amount", label: "Amount", fmt: (v: unknown) => usd(v as number, 2), right: true },
          { key: "dedication", label: "Type" }, { key: "fund", label: "Description" }, { key: "status", label: "Status" },
        ] as never} />
      </Card>
    </div>
  );
}

export function WcbhcDataDashboard({ data }: { data: WcbhcSnapshot }) {
  const [tab, setTab] = useState<Tab | "Board Review">("Overview");
  const staff = useBoardReviewStaff("wcbhc");
  return (
    <CrmProvider>
    <PortalV2Provider client="wcbhc">
    <main className="min-h-screen bg-[rgb(var(--paper))]">
      <header className="bg-[rgb(var(--navy))] px-6 py-8 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--brass-light))]">Prepared by Catapult Fundraising</p>
            <h1 className="font-display mt-1 text-3xl">{data.client}</h1>
            <p className="mt-1 text-sm text-white/70">Data as of {data.asOf}</p>
          </div>
          <DonorSearch dark />
        </div>
      </header>
      <nav className="sticky top-0 z-10 border-b border-[rgb(var(--line))] bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {([...TABS, ...(staff ? (["Board Review"] as const) : [])] as (Tab | "Board Review")[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${t === tab ? "border-[rgb(var(--brass))] text-[rgb(var(--navy))]" : "border-transparent text-[rgb(var(--ink))]/60"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {tab === "Donor Lookup" && <Lookup d={data} />}
        {staff && tab === "Board Review" && <BoardReviewAdmin client="wcbhc" />}
        {tab === "Overview" && <><CampaignProgress /><Overview d={data} /></>}
        {tab === "Campaign Donors" && <CampaignDonors />}
        {tab === "Add + Upload" && <AddAndUpload />}
        {tab === "Gift Pyramid" && <Pyramid d={data} />}
        {tab === "Gift Chart + GC2P" && <GiftChartTab d={data} />}
        {tab === "Prospects" && <Prospects d={data} />}
        {tab === "Committee" && <Board d={data} />}
        {tab === "Campaign Prospects" && <Portfolio d={data} />}
        {tab === "Database Health" && <Health d={data} />}
        {tab === "Campaign Gifts" && <Givebutter d={data} />}
        <p className="mt-10 text-xs text-[rgb(var(--ink))]/50">
          Built {data.builtAt}. Lifetime totals include $12M campaign gifts and gifts to the Nevada Cares Campus.
        </p>
      </div>
    </main>
    </PortalV2Provider>
    </CrmProvider>
  );
}
