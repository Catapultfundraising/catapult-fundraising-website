"use client";

import { useMemo, useState } from "react";
import { useUrlState } from "@/lib/use-url-state";
import { SafeBoundary, NameLink, useRecordNav, cmpValues } from "@/components/dashboard-shared";
import { PortalV2Provider, CampaignProgress, CampaignDonors, AddAndUpload } from "@/components/portal-v2";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import type { PvasSnapshot, Person } from "@/lib/pvas-data-store";
import { formatDollars } from "@/lib/gift-chart";
import { extrasFromIndex, seatGc2p } from "@/lib/pvas-gc2p";
import { BoardReviewAdmin } from "@/components/board-review/admin";
import { useBoardReviewStaff, StaffSignIn } from "@/components/board-review/staff-tab";
import { CrmProvider, DonorSearch, DownloadButtons, PeopleTable, downloadUrl, useCrm, type ExportKind } from "@/components/pvas-data-crm";
import type { IndexRow } from "@/lib/pvas-data-store";

const NAVY = "#15212e";
const GOLD = "#b28c46";

const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const short = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`;
const num = (n: number) => n.toLocaleString("en-US");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");

const TABS = ["Donor Lookup", "Overview", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Board", "Portfolio", "Recent Givebutter Activity", "Database Health", "Campaign Donors", "Add + Upload"] as const;
type Tab = (typeof TABS)[number];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`min-w-0 max-w-full rounded-xl border border-[rgb(var(--line))] bg-white p-4 sm:p-5 ${className}`}>{children}</div>;
}
function Stat({ label, value, note, onClick }: { label: string; value: string; note?: string; onClick?: () => void }) {
  if (onClick) return (
    <button type="button" onClick={onClick} className="min-w-0 max-w-full rounded-xl border border-[rgb(var(--line))] bg-white p-4 py-4 text-left hover:border-[rgb(var(--brass))] hover:bg-[rgb(var(--brass))]/5 sm:p-5" title="Click to see the list">
      <p className="font-display text-2xl text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>
      {note && <p className="mt-1 text-[11px] text-[rgb(var(--ink))]/50">{note}</p>}
    </button>
  );
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
  rows, cols, csvName, exportSub, rowClick,
}: {
  rows: T[];
  /** Aggregate rows (year, type, level, solicitor...): click opens the list of people behind the row. */
  rowClick?: (r: T) => void;
  cols: { key: keyof T; label: string; fmt?: (v: T[keyof T], r: T) => string; right?: boolean }[];
  /** Report title for the branded PDF/Excel download. */
  csvName?: string;
  exportSub?: string;
}) {
  const { open } = useCrm();
  const nav = useRecordNav();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: keyof T; dir: 1 | -1 } | null>(null);
  const NAME_KEYS = ["name", "donor", "prospect", "donor_name", "full_name"];
  const nameOf = (r: T) => { for (const k of NAME_KEYS) if (typeof r[k] === "string" && r[k]) return r[k] as string; return ""; };
  const clickOf = (r: T): (() => void) | undefined => {
    if (rowClick) return () => rowClick(r);
    const id = Number(r.cptid);
    if (Number.isInteger(id) && id > 0) return () => open(id);
    const n = nameOf(r);
    return n && nav ? () => nav.openName(n, null) : undefined;
  };
  const shown = useMemo(() => {
    let r = rows;
    if (q) r = r.filter((x) => JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
    if (sort) r = [...r].sort((a, b) => cmpValues(a[sort.k], b[sort.k]) * sort.dir);
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
              title: csvName.replace(/\.csv$/i, "").replace(/^PVAS /, ""),
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
                  onClick={() => setSort({ k: c.key, dir: sort?.k === c.key ? (sort.dir === 1 ? -1 : 1) : 1 })}
                  title="Click to sort"
                  className={`cursor-pointer whitespace-nowrap px-3 py-2 ${c.right ? "text-right" : ""}`}
                >
                  {c.label}{sort?.k === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr
                key={i}
                onClick={clickOf(r)}
                className={`${i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"} ${clickOf(r) ? "cursor-pointer hover:bg-[rgb(var(--brass))]/10" : ""}`}
              >
                {cols.map((c, ci) => (
                  <td key={String(c.key)} className={`whitespace-nowrap px-3 py-1.5 ${c.right ? "text-right tabular-nums" : ""} ${(NAME_KEYS.includes(String(c.key)) || (rowClick && ci === 0)) && clickOf(r) ? "font-medium text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40" : ""}`}>
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

function Overview({ d }: { d: PvasSnapshot }) {
  const nav = useRecordNav();
  const go = useDrill();
  const yr = (v: unknown) => nav?.drillQuery(`Donors who gave in ${v}`, "Every donor with a gift in this year", "year", String(v));
  const recent = d.fys.slice(-10);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lifetime giving" value={short(d.kpi.total)} note="Giving history file. Givebutter activity is shown separately." />
        <Stat label="Gifts" value={num(d.kpi.gifts)} note={`Avg ${usd(d.kpi.avg)}`} onClick={() => go("Donors with gifts", "Every donor with at least one gift", (r) => r.gifts > 0)} />
        <Stat label="Donors with gifts" value={num(d.kpi.donors)} onClick={() => go("Donors with gifts", "Every donor with lifetime giving", (r) => r.lifetime > 0)} />
        <Stat label="Screened (DonorSearch)" value={num(d.health.dsScreened)} onClick={() => go("Screened (DonorSearch)", "Records with a DonorSearch rating or capacity", (r) => !!(r.ds || r.capacity))} />
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
              <Bar dataKey="total" fill={NAVY} name="Dollars" cursor="pointer" onClick={(e: { fy?: unknown; payload?: { fy: unknown } }) => yr(e.payload?.fy ?? e.fy)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <H sub="Donors per calendar year">Donor count</H>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={recent} onClick={(st: { activeLabel?: unknown } | null) => st?.activeLabel !== undefined && yr(st.activeLabel)} style={{ cursor: "pointer" }}>
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
              <BarChart data={d.retention.slice(-10)} onClick={(st: { activeLabel?: unknown } | null) => st?.activeLabel !== undefined && nav?.drillQuery(`Retained donors, ${st.activeLabel}`, "Gave this year and the year before", "retained", String(st.activeLabel))} style={{ cursor: "pointer" }}>
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
          rowClick={(r: { fy: unknown }) => yr(r.fy)}
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
          rowClick={(r: { stage: unknown }) => nav?.drillQuery(String(r.stage), "Donors with gifts of this type", "stage", String(r.stage))}
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

/** List the people behind an aggregate (rows with a CPTID). */
function useIds() {
  const nav = useRecordNav();
  return (title: string, sub: string, rows: { cptid?: number | null }[]) => nav?.drillIds(title, sub, rows.map((r) => Number(r.cptid)).filter((n) => n > 0));
}
function useDrill() {
  const { index, drill, loading } = useCrm();
  return (title: string, sub: string, f: (r: IndexRow) => boolean) => {
    if (!index) { alert(loading ? "Donor records are still loading, try again in a moment." : "Donor records are not available."); return; }
    drill(title, sub, index.filter(f));
  };
}

function Pyramid({ d }: { d: PvasSnapshot }) {
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


function GiftChartTab({ d }: { d: PvasSnapshot }) {
  const [goalText, setGoalText] = useState("9000000");
  const [busy, setBusy] = useState<string | null>(null);
  const goal = Math.min(500_000_000, Math.max(100_000, Number(goalText.replace(/[^\d]/g, "")) || 0));
  const { index, tracking } = useCrm();
  const { chart, seated, notShown, removed, below, belowLevel } = useMemo(() => seatGc2p(goal, d.pool, tracking, extrasFromIndex(index, tracking, d.pool)), [goal, d.pool, index, tracking]);
  const nav = useRecordNav();
  const seatList = (level: number | null) => {
    if (level === null) { nav?.drillIds(`Below ${formatDollars(belowLevel)}`, "Prospects whose amount is under the lowest level shown", below.map((p) => p.cptid)); return; }
    const x = seated.find((y) => y.level === level);
    if (x) nav?.drillIds(`${formatDollars(level)} level`, `${x.people.length} prospects seated at this level`, x.people.map((p) => p.cptid));
    else {
      // Level not seated on the GC2P (under the lowest level shown): list the prospects whose amount falls in this band.
      const higher = chart.rows.map((r) => r.level).filter((l): l is number => l !== null && l > level).sort((p, q) => p - q)[0] ?? Infinity;
      nav?.drillIds(`${formatDollars(level)} level`, "Prospects whose amount falls in this band", below.filter((p) => (p.ask || p.rating || 0) >= level && (p.ask || p.rating || 0) < higher).map((p) => p.cptid));
    }
  };
  const stOf = (id: number) => tracking.prospects[String(id)];
  const shownValue = goal - notShown;
  const reportDownload = async (report: "gc" | "gc2p", format: "pdf" | "docx" | "xlsx") => {
    setBusy(report + format);
    const names = { gc: "PVAS Gift Chart", gc2p: "PVAS Gift Chart to Prospects" };
    try { await downloadUrl(`/api/pvas-data-reports?report=${report}&goal=${goal}&format=${format}`, `${names[report]}.${format}`); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Campaign goal</label>
            <input value={goalText} onChange={(e) => setGoalText(e.target.value)} className="mt-1 block w-full max-w-[12rem] rounded-md border border-[rgb(var(--line))] px-3 py-2 font-display text-xl" />
          </div>
          <p className="text-sm text-[rgb(var(--ink))]/60">{goal === 9_000_000 ? `${formatDollars(goal)} · The approved PVAS $9M gift chart (September 18, 2026)` : `${formatDollars(goal)} · Catapult house shape for comparison (the approved chart is $9,000,000)`}</p>
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
        <H sub={goal === 9_000_000 ? "Approved $9M campaign gift chart" : "Suggested gift chart"}>Gift chart</H>
        <Table
          rows={chart.rows.map((r) => ({
            lvl: r.level, gifts: r.gifts ?? "Many", level: r.level === null ? `Under ${formatDollars(r.under ?? 0)}` : formatDollars(r.level),
            value: r.value, cumulative: r.cumulative, prospects: r.prospects ?? "", share: Math.round(r.shareOfGoal * 1000) / 10,
          }))}
          csvName={`Gift Chart ${formatDollars(goal)}`}
          rowClick={(r: { lvl: number | null }) => seatList(r.lvl)}
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
        <H sub={`Top 10 gifts only: levels of $250,000 and up (${formatDollars(goal - shownValue)} in smaller levels not shown). Each portfolio prospect is seated by their Campaign Ask, rounded down to the nearest gift level (a $400,000 ask sits at $250,000), largest ask first. Primary Solicitor shown; prospects without one stay on the chart as Unassigned. Committed (Stewardship) gifts are off the chart. Committee updates: ${removed.disqualified} disqualified and ${removed.committed} committed prospects are off the chart, and anyone placed at a gift level is seated there.`}>
          Gift chart to prospects
        </H>
        <div className="mb-4 space-y-1.5">
          {seated.map((x) => (
            <div key={x.level} onClick={() => seatList(x.level)} title="Click to list the prospects" className="grid cursor-pointer grid-cols-[110px_1fr_140px] items-center gap-3 rounded text-sm hover:bg-[rgb(var(--brass))]/10">
              <span className="font-medium">{formatDollars(x.level)}</span>
              <div className="h-5 rounded bg-[rgb(var(--paper))]">
                <div className="h-5 rounded" style={{ width: `${Math.min(100, (x.people.length / x.need) * 100)}%`, background: x.people.length >= x.need ? NAVY : GOLD }} />
              </div>
              <span className="text-right tabular-nums">{x.people.length} of {x.need} identified</span>
            </div>
          ))}
          {below.length > 0 && (
            <div onClick={() => seatList(null)} title="Click to list the prospects" className="grid cursor-pointer grid-cols-[110px_1fr_140px] items-center gap-3 rounded border-t border-[rgb(var(--line))] pt-1.5 text-sm hover:bg-[rgb(var(--brass))]/10">
              <span className="font-medium">Below {formatDollars(belowLevel)}</span>
              <span className="text-xs text-[rgb(var(--ink))]/60">{usd(below.reduce((a, p) => a + (p.ask || p.rating || 0), 0))} total</span>
              <span className="text-right tabular-nums">{below.length} prospect{below.length === 1 ? "" : "s"}</span>
            </div>
          )}
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
                  rows={x.people.map((p) => ({ ...p, solicitor2: stOf(p.cptid)?.solicitor2 ?? "", status: stOf(p.cptid)?.status ?? "Unassigned", solicitor: stOf(p.cptid)?.solicitor || p.solicitor, pir: tracking.pirs[String(p.cptid)] ? "Yes" : "" })) as never}
                  cols={[
                    { key: "name", label: "Prospect" },
                    { key: "solicitor", label: "Primary Solicitor" }, { key: "solicitor2", label: "Secondary Solicitor" },
                    { key: "pir", label: "PIR" },
                    { key: "ask", label: "Ask Amount", fmt: (v: unknown) => usd(v as number), right: true },
                    { key: "donorType", label: "Donor Type" },
                    { key: "ds", label: "DS" },
                    { key: "lifetime", label: "Lifetime", fmt: (v: unknown) => usd(v as number), right: true },
                    { key: "largest", label: "Largest Gift", fmt: (v: unknown) => usd(v as number), right: true },
                    { key: "last", label: "Last Gift" },
                  ] as never}
                />
              )}
            </div>
          ))}
          {below.length > 0 && (
            <div>
              <p className="mb-1 font-display text-lg text-[rgb(var(--navy))]">Below {formatDollars(belowLevel)} · {below.length} prospect{below.length === 1 ? "" : "s"} · {usd(below.reduce((a, p) => a + (p.ask || p.rating || 0), 0))}</p>
              <Table
                csvName={`GC2P Below ${formatDollars(belowLevel)}`}
                exportSub={`${formatDollars(goal)} goal`}
                rows={below.map((p) => ({ ...p, amount: p.ask || p.rating || 0 })) as never}
                cols={[
                  { key: "name", label: "Prospect" },
                  { key: "amount", label: "Ask / Rating", fmt: (v: unknown) => usd(v as number), right: true },
                  { key: "ds", label: "DS" },
                  { key: "lifetime", label: "Lifetime", fmt: (v: unknown) => usd(v as number), right: true },
                  { key: "largest", label: "Largest Gift", fmt: (v: unknown) => usd(v as number), right: true },
                  { key: "last", label: "Last Gift" },
                ] as never}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Lookup({ d }: { d: PvasSnapshot }) {
  const { index, loading } = useCrm();
  return (
    <div className="space-y-6">
      <Card>
        <H sub="Search any constituent by name, city or CPTID, then click to open the full record: contact details, every gift, giving by year, wealth screening, board, campaign portfolio and notes.">Donor lookup</H>
        <DonorSearch />
      </Card>
      <Card>
        <H sub={`All ${index ? num(index.length) : ""} constituents, largest lifetime giving first. Sort or filter, then click any name.`}>All records</H>
        {index ? <PeopleTable rows={index} /> : <p className="text-sm">{loading ? "Loading donor records..." : "Donor records are not available yet."}</p>}
      </Card>
    </div>
  );
}

function Prospects({ d }: { d: PvasSnapshot }) {
  const pools = [
    { k: "High Wealth", rows: d.highWealth, n: d.highWealthCount, desc: "DonorSearch capacity of $25K or more, sorted by capacity. Major gift and campaign prospects." },
    { k: "Mid-Level", rows: d.midLevel, n: d.midLevelCount, desc: "Lifetime $250 to $4,999 with a gift in the last 3 years. Mid-Level program pool." },
    { k: "Legacy", rows: d.legacy, n: d.legacyCount, desc: "Gave in 4 or more calendar years, lifetime under $25K. Legacy Call pool." },
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

function Board({ d }: { d: PvasSnapshot }) {
  // Stewardship (Committed) amounts win over the database Get field (Anthony, 2026-10-19).
  const stew = new Map(((d as unknown as { committed?: { cptid: number; ask: number }[] }).committed ?? []).filter((p) => p.ask > 0).map((p) => [p.cptid, p.ask] as const));
  const active = d.board.filter((b) => b.active).map((b) => (stew.has(b.cptid ?? -1) ? { ...b, get: stew.get(b.cptid ?? -1)! } : b));
  const ask = active.reduce((s, b) => s + b.ask, 0);
  const got = active.reduce((s, b) => s + b.get, 0);
  const giving = active.filter((b) => b.lifetime > 0).length;
  const ids = useIds();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active board members" value={num(active.length)} onClick={() => ids('Active board members', "", active)} />
        <Stat label="Campaign ask total" value={usd(ask)} onClick={() => ids('Members with an ask or pledge', "", active.filter((b) => b.ask > 0))} />
        <Stat label="Committed so far" value={usd(got)} note={pct(got, ask) + " of ask"} onClick={() => ids('Members with gifts', "", active.filter((b) => b.get > 0))} />
        <Stat label="Members who have given" value={`${giving} of ${active.length}`} onClick={() => ids('Members who have given', "", active.filter((b) => b.lifetime > 0 || b.ask > 0 || b.get > 0))} />
      </div>
      <Card>
        <H sub="Board campaign ask vs. get, with giving history and DonorSearch">Board report</H>
        <Table
          rows={d.board.map((b) => (stew.has(b.cptid ?? -1) ? { ...b, get: stew.get(b.cptid ?? -1)! } : b))}
          csvName="Board Report"
          cols={[
            { key: "name", label: "Name" },
            { key: "title", label: "Title" },
            { key: "term", label: "Term" },
            { key: "active", label: "Active", fmt: (v) => (v ? "Yes" : "No") },
            { key: "ask", label: "Ask", fmt: (v) => usd(v as number), right: true },
            { key: "get", label: "Get", fmt: (v) => usd(v as number), right: true },
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

function Health({ d }: { d: PvasSnapshot }) {
  const h = d.health;
  const nav = useRecordNav();
  const go = useDrill();
  const has = (k: string) => () => nav?.drillQuery(`Records with ${k}`, `Constituents with a ${k} on file`, "has", k);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Individual records" value={num(h.records)} onClick={() => go("Individual records", "Individual constituents", (r) => !/org|foundation|corp|business|church|trust/i.test(r.kind ?? ""))} />
        <Stat label="With address" value={pct(h.address, h.records)} note={num(h.address)} onClick={has("address")} />
        <Stat label="With phone" value={pct(h.phone, h.records)} note={num(h.phone)} onClick={has("phone")} />
        <Stat label="With email" value={pct(h.email, h.records)} note={num(h.email)} onClick={has("email")} />
        <Stat label="Organizations" value={num(h.orgs)} onClick={() => go("Organizations", "Organization records", (r) => /org|foundation|corp|business|church|trust/i.test(r.kind ?? ""))} />
        <Stat label="Flagged duplicates" value={num(h.duplicates)} />
        <Stat label="Accounts with 2+ CPTIDs" value={num(h.multiCptAccounts)} />
        <Stat label="DonorSearch screened" value={pct(h.dsScreened, h.constituents)} note={`${num(h.dsScreened)} of ${num(h.constituents)}`} onClick={() => go("DonorSearch screened", "Records with a DonorSearch rating or capacity", (r) => !!(r.ds || r.capacity))} />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <H>Donor type</H>
          <Table rowClick={(r: { type: unknown }) => nav?.drillQuery(String(r.type), "Donor Types", "attr", String(r.type))} csvName="Donor Types" rows={d.donorType.map(([k, n]) => ({ type: k, count: n }))} cols={[{ key: "type", label: "Donor Type" }, { key: "count", label: "Records", right: true }]} />
        </Card>
        <Card>
          <H>Affiliation flags</H>
          <Table rowClick={(r: { flag: unknown }) => nav?.drillQuery(String(r.flag), "Affiliation Flags", "attr", String(r.flag))} csvName="Affiliation Flags" rows={Object.entries(d.flags).map(([k, n]) => ({ flag: k, count: n }))} cols={[{ key: "flag", label: "Flag" }, { key: "count", label: "Records", right: true }]} />
        </Card>
        <Card>
          <H>Organization types</H>
          <Table rowClick={(r: { type: unknown }) => nav?.drillQuery(String(r.type), "Organization Types", "attr", String(r.type))} csvName="Organization Types" rows={d.orgTypes.map(([k, n]) => ({ type: k, count: n }))} cols={[{ key: "type", label: "Type" }, { key: "count", label: "Orgs", right: true }]} />
        </Card>
      </div>
    </div>
  );
}

function Portfolio({ d }: { d: PvasSnapshot }) {
  const withAsk = d.portfolio.filter((p) => p.ask > 0);
  const bySol = Array.from(new Set(d.portfolio.map((p) => p.solicitor))).sort().map((s) => {
    const ps = d.portfolio.filter((p) => p.solicitor === s);
    return { solicitor: s, prospects: ps.length, asks: ps.filter((p) => p.ask > 0).length, ask: ps.reduce((a, p) => a + p.ask, 0) };
  }).sort((a, b) => b.ask - a.ask);
  const cols = [
    { key: "name", label: "Prospect" }, { key: "solicitor", label: "Primary Solicitor" }, { key: "solicitor2", label: "Secondary Solicitor" },
    { key: "ask", label: "Campaign Ask", fmt: (v: unknown) => (v ? usd(v as number) : ""), right: true },
    { key: "priority", label: "2026 Priority" }, { key: "type", label: "Type" }, { key: "donorType", label: "Donor Type" },
    { key: "lifetime", label: "Lifetime", fmt: (v: unknown) => usd(v as number), right: true },
    { key: "ds", label: "DS" }, { key: "capacity", label: "Capacity" }, { key: "task", label: "Task" },
  ];
  const ids = useIds();
  const { tracking } = useCrm();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Portfolio prospects" value={num(d.portfolio.length)} onClick={() => ids('Campaign prospects', "", d.portfolio)} />
        <Stat label="With a Campaign Ask" value={num(withAsk.length)} onClick={() => ids('Prospects with a Campaign Ask', "", withAsk)} />
        <Stat label="Total Campaign Asks" value={short(withAsk.reduce((a, p) => a + p.ask, 0))} onClick={() => ids('Prospects with a Campaign Ask', "", withAsk)} />
        <Stat label="Committed (Stewardship)" value={num(d.committed.length)} note={short(d.committed.reduce((a, p) => a + p.ask, 0))} onClick={() => ids('Committed', "", d.committed)} />
      </div>
      <Card>
        <H sub="Campaign portfolio by Primary Solicitor">Solicitor assignments</H>
        <Table rowClick={(r: { solicitor: string }) => ids(`Solicitor: ${r.solicitor}`, "Prospects assigned to this solicitor", d.portfolio.filter((p) => p.solicitor === r.solicitor))} csvName="Portfolio by Solicitor" rows={bySol} cols={[
          { key: "solicitor", label: "Primary Solicitor" }, { key: "prospects", label: "Prospects", right: true },
          { key: "asks", label: "With Ask", right: true }, { key: "ask", label: "Total Ask", fmt: (v) => usd(v as number), right: true },
        ]} />
      </Card>
      <Card>
        <H sub="Every prospect in the campaign portfolio, largest Campaign Ask first. Click a name to open the record.">Campaign portfolio</H>
        <Table csvName="Campaign Portfolio" rows={d.portfolio.map((p) => ({ ...p, solicitor2: tracking.prospects[String(p.cptid)]?.solicitor2 ?? "" })) as never} cols={cols as never} />
      </Card>
    </div>
  );
}

function Givebutter({ d }: { d: PvasSnapshot }) {
  const g = d.givebutter;
  const ids = useIds();
  return (
    <div className="space-y-6">
      <Card className="border-[rgb(var(--brass))]/50 bg-[rgb(var(--brass))]/5">
        <p className="text-sm text-[rgb(var(--ink))]/75">
          Online gifts and pledges recorded in Givebutter{g.from ? ` from ${g.from} to ${g.to}` : ""}. This activity is shown on its own and is not included in the campaign or lifetime giving totals elsewhere in the portal.
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Online gifts" value={num(g.txCount)} note={`${num(g.matched)} matched to a donor record`} onClick={() => ids('Gift donors', "", g.transactions as { cptid?: number | null }[])} />
        <Stat label="Online gift dollars" value={usd(g.txTotal)} onClick={() => ids('Gift donors', "", g.transactions as { cptid?: number | null }[])} />
        <Stat label="Givebutter pledges" value={num(g.pledgeCount)} onClick={() => ids('Pledges', "", g.pledges as { cptid?: number | null }[])} />
        <Stat label="Pledged" value={usd(g.pledgeTotal)} onClick={() => ids('Pledges', "", g.pledges as { cptid?: number | null }[])} />
      </div>
      <Card>
        <H sub="Successful online gifts by Givebutter campaign">Gifts by campaign</H>
        <Table rowClick={(r: { campaign: string }) => ids(r.campaign, "Donors with gifts in this group", (g.transactions as { cptid?: number | null; campaign?: string }[]).filter((t) => (t.campaign || "General") === r.campaign))} csvName="Givebutter Gifts by Campaign" rows={g.byCampaign} cols={[
          { key: "campaign", label: "Campaign" }, { key: "gifts", label: "Gifts", right: true },
          { key: "total", label: "Dollars", fmt: (v) => usd(v as number), right: true },
        ]} />
      </Card>
      <Card>
        <H sub="Pledges recorded in Givebutter, largest first">Pledges</H>
        <Table csvName="Givebutter Pledges" rows={g.pledges as never} cols={[
          { key: "name", label: "Name" }, { key: "pledged", label: "Pledged On" },
          { key: "amount", label: "Amount", fmt: (v: unknown) => usd(v as number), right: true },
          { key: "remaining", label: "Remaining", fmt: (v: unknown) => usd(v as number), right: true },
          { key: "frequency", label: "Installments" }, { key: "expected", label: "Expected By" },
          { key: "campaign", label: "Campaign" }, { key: "status", label: "Status" },
        ] as never} />
      </Card>
      <Card>
        <H sub="Every Givebutter transaction, newest first">Transactions</H>
        <Table csvName="Givebutter Transactions" rows={g.transactions as never} cols={[
          { key: "date", label: "Date" }, { key: "name", label: "Name" },
          { key: "amount", label: "Amount", fmt: (v: unknown) => usd(v as number, 2), right: true },
          { key: "campaign", label: "Campaign" }, { key: "fund", label: "Fund" }, { key: "status", label: "Status" },
          { key: "dedication", label: "Dedication" },
        ] as never} />
      </Card>
    </div>
  );
}

export function PvasDataDashboard({ data }: { data: PvasSnapshot }) {
  const [tab, setTab] = useUrlState<Tab | "Prospect Ratings">("tab", "Overview", [...TABS, "Prospect Ratings"]);
  const staff = useBoardReviewStaff("pvas");
  return (
    <CrmProvider>
    <PortalV2Provider client="pvas">
    <main className="min-h-screen bg-[rgb(var(--paper))]">
      <header className="bg-[rgb(var(--navy))] px-6 py-8 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--brass-light))]">Prepared by Catapult Fundraising</p>
            <h1 className="font-display mt-1 text-3xl">{data.client}</h1>
            <p className="mt-1 text-sm text-white/70">Source data as of {data.asOf}</p>
            <p className="text-xs text-white/60">Snapshot refreshed {data.builtAt}</p>
          </div>
          <DonorSearch dark />
        </div>
      </header>
      <nav className="sticky top-0 z-10 border-b border-[rgb(var(--line))] bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {([...TABS, "Prospect Ratings"] as (Tab | "Prospect Ratings")[]).map((t) => (
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
        <SafeBoundary key={tab} label={`The ${tab} tab`}>
        {tab === "Donor Lookup" && <Lookup d={data} />}
        {tab === "Prospect Ratings" && (staff ? <BoardReviewAdmin client="pvas" /> : <StaffSignIn client="pvas" />)}
        {tab === "Overview" && <><CampaignProgress /><Overview d={data} /></>}
        {tab === "Campaign Donors" && <CampaignDonors />}
        {tab === "Add + Upload" && <AddAndUpload />}
        {tab === "Gift Pyramid" && <Pyramid d={data} />}
        {tab === "Gift Chart + GC2P" && <GiftChartTab d={data} />}
        {tab === "Prospects" && <Prospects d={data} />}
        {tab === "Board" && <Board d={data} />}
        {tab === "Portfolio" && <Portfolio d={data} />}
        {tab === "Database Health" && <Health d={data} />}
        {tab === "Recent Givebutter Activity" && <Givebutter d={data} />}
        </SafeBoundary>
        <p className="mt-10 text-xs text-[rgb(var(--ink))]/50">
          Built {data.builtAt}. Lifetime totals come from the giving history file and do not include Givebutter activity.
        </p>
      </div>
    </main>
    </PortalV2Provider>
    </CrmProvider>
  );
}
