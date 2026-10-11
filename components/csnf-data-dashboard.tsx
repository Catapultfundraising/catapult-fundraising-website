"use client";

import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import type { CsnfSnapshot, Person } from "@/lib/csnf-data-store";
import { buildGiftChart, formatDollars } from "@/lib/gift-chart";

const NAVY = "#15212e";
const GOLD = "#b28c46";

const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const short = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`;
const num = (n: number) => n.toLocaleString("en-US");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "0%");

const TABS = ["Overview", "Gift Pyramid", "Gift Chart + GC2P", "Prospects", "Board", "Calling", "Database Health", "Alumni"] as const;
type Tab = (typeof TABS)[number];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[rgb(var(--line))] bg-white p-5 ${className}`}>{children}</div>;
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

function toCsv(rows: Record<string, unknown>[], file: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = file;
  a.click();
}

function Table<T extends Record<string, unknown>>({
  rows, cols, csvName,
}: {
  rows: T[];
  cols: { key: keyof T; label: string; fmt?: (v: T[keyof T], r: T) => string; right?: boolean }[];
  csvName?: string;
}) {
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
      <div className="mb-2 flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="w-64 rounded-md border border-[rgb(var(--line))] px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-[rgb(var(--ink))]/55">{num(shown.length)} rows</span>
        {csvName && (
          <button
            onClick={() => toCsv(shown as Record<string, unknown>[], csvName)}
            className="ml-auto rounded-md bg-[rgb(var(--navy))] px-3 py-1.5 text-xs font-medium text-white"
          >
            Export CSV
          </button>
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
              <tr key={i} className={i % 2 ? "bg-[rgb(var(--paper))]" : "bg-white"}>
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

function Overview({ d }: { d: CsnfSnapshot }) {
  const recent = d.fys.slice(-10);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lifetime giving" value={short(d.kpi.total)} note={`${short(d.kpi.cash)} cash, ${short(d.kpi.inkind)} in-kind`} />
        <Stat label="Gifts" value={num(d.kpi.gifts)} note={`Avg ${usd(d.kpi.avg)}`} />
        <Stat label="Donors with gifts" value={num(d.kpi.donors)} />
        <Stat label="Screened (DonorSearch)" value={num(d.health.dsScreened)} />
      </div>
      <Card>
        <H sub="Fiscal year July to June. Bars = dollars, line = donors.">Giving by fiscal year</H>
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
          <H sub="Donors per fiscal year">Donor count</H>
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
        <H>Recent fiscal years</H>
        <Table
          rows={[...recent].reverse().map((f) => {
            const r = d.retention.find((x) => x.fy === f.fy);
            return { ...f, retention: r ? r.rate : 0, newDonors: r ? r.new : 0 };
          })}
          cols={[
            { key: "fy", label: "FY" },
            { key: "total", label: "Dollars", fmt: (v) => usd(v as number), right: true },
            { key: "gifts", label: "Gifts", right: true },
            { key: "donors", label: "Donors", right: true },
            { key: "newDonors", label: "New donors", right: true },
            { key: "retention", label: "Retention", fmt: (v) => `${v}%`, right: true },
          ]}
        />
      </Card>
      <Card>
        <H sub="Gift file stages">Gifts by stage</H>
        <Table
          rows={d.stages}
          cols={[
            { key: "stage", label: "Stage" },
            { key: "gifts", label: "Gifts", right: true, fmt: (v) => num(v as number) },
            { key: "total", label: "Dollars", right: true, fmt: (v) => usd(v as number) },
          ]}
        />
      </Card>
    </div>
  );
}

function Pyramid({ d }: { d: CsnfSnapshot }) {
  const max = Math.max(...d.pyramid.map((p) => p.donors));
  return (
    <div className="space-y-6">
      <Card>
        <H sub="Donors grouped by lifetime giving. This is the starting point for a campaign gift chart.">Lifetime giving pyramid</H>
        <div className="space-y-1.5">
          {d.pyramid.map((p) => (
            <div key={p.band} className="grid grid-cols-[120px_1fr_90px_110px_60px] items-center gap-3 text-sm">
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
          <H sub="DonorSearch wealth-based capacity">Capacity distribution</H>
          <Table rows={d.capacity.map(([c, n]) => ({ capacity: c, count: n }))} cols={[{ key: "capacity", label: "Capacity" }, { key: "count", label: "Donors", right: true }]} />
        </Card>
        <Card>
          <H sub="DS1 = proven philanthropist, 1 is strongest">DS rating distribution</H>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={d.dsRating.map(([r, n]) => ({ r, n }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="r" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="n" fill={GOLD} name="Donors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <H sub="Top 250 donors by lifetime giving">Top donors</H>
        <Table rows={d.top as never} cols={personCols as never} csvName="CSNF Top Donors.csv" />
      </Card>
    </div>
  );
}


function GiftChartTab({ d }: { d: CsnfSnapshot }) {
  const [goalText, setGoalText] = useState("10000000");
  const goal = Math.min(500_000_000, Math.max(100_000, Number(goalText.replace(/[^\d]/g, "")) || 0));
  const chart = useMemo(() => buildGiftChart(goal), [goal]);
  const seated = useMemo(() => {
    const used = new Set<number>();
    return chart.rows
      .filter((r) => r.level !== null && r.gifts !== null && (r.level as number) >= 50_000)
      .map((r) => {
        const need = (r.gifts as number) * 3;
        const cands = d.pool
          .filter((p) => !used.has(p.cptid) && p.rating >= (r.level as number))
          .sort((a, b) => b.lifetime - a.lifetime || b.rating - a.rating)
          .slice(0, need);
        cands.forEach((p) => used.add(p.cptid));
        return { row: r, need, people: cands };
      });
  }, [chart, d.pool]);
  const shownValue = seated.reduce((s, x) => s + x.row.value, 0);
  const exportRows = seated.flatMap((x) =>
    x.people.map((p) => ({
      level: x.row.level, name: p.name, cptid: p.cptid, ratedAt: p.rating, basis: p.basis, capacity: p.capacity, ds: p.ds,
      lifetime: p.lifetime, largest: p.largest, lastGift: p.last,
    })),
  );
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Campaign goal</label>
            <input value={goalText} onChange={(e) => setGoalText(e.target.value)} className="mt-1 block w-48 rounded-md border border-[rgb(var(--line))] px-3 py-2 font-display text-xl" />
          </div>
          <p className="text-sm text-[rgb(var(--ink))]/60">{formatDollars(goal)} · Catapult house shape (round levels, about 20% lead gift, top 10 gifts carry 60%+, 3 prospects per gift)</p>
        </div>
      </Card>
      <Card>
        <H sub="Suggested gift chart">Gift chart</H>
        <Table
          rows={chart.rows.map((r) => ({
            gifts: r.gifts ?? "Many", level: r.level === null ? `Under ${formatDollars(r.under ?? 0)}` : formatDollars(r.level),
            value: r.value, cumulative: r.cumulative, prospects: r.prospects ?? "", share: Math.round(r.shareOfGoal * 1000) / 10,
          }))}
          csvName={`CSNF Gift Chart ${goal}.csv`}
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
        <H sub={`GC2P house rules: levels of $50,000 and up only (${formatDollars(goal - shownValue)} in smaller levels not shown), 3 prospects per gift. Individuals are rated at the low end of their DonorSearch capacity band; unscreened records fall back to their largest gift. When a level has more candidates than it needs, the strongest giving history stays and the rest move down. Committed gifts and solicitor assignments are not in this data yet, so review before sharing.`}>
          Gift chart to prospects
        </H>
        <div className="mb-4 space-y-1.5">
          {seated.map((x) => (
            <div key={x.row.level} className="grid grid-cols-[110px_1fr_140px] items-center gap-3 text-sm">
              <span className="font-medium">{formatDollars(x.row.level as number)}</span>
              <div className="h-5 rounded bg-[rgb(var(--paper))]">
                <div className="h-5 rounded" style={{ width: `${Math.min(100, (x.people.length / x.need) * 100)}%`, background: x.people.length >= x.need ? NAVY : GOLD }} />
              </div>
              <span className="text-right tabular-nums">{x.people.length} of {x.need} identified</span>
            </div>
          ))}
        </div>
        <button onClick={() => toCsv(exportRows, `CSNF GC2P ${goal}.csv`)} className="mb-4 rounded-md bg-[rgb(var(--navy))] px-3 py-1.5 text-xs font-medium text-white">Export GC2P CSV</button>
        <div className="space-y-5">
          {seated.map((x) => (
            <div key={x.row.level}>
              <p className="mb-1 font-display text-lg text-[rgb(var(--navy))]">
                {formatDollars(x.row.level as number)} level · {x.row.gifts} gift{x.row.gifts === 1 ? "" : "s"} · {x.people.length} of {x.need} prospects
              </p>
              {x.people.length > 0 && (
                <Table
                  rows={x.people as never}
                  cols={[
                    { key: "name", label: "Prospect" },
                    { key: "rating", label: "Rated At", fmt: (v: unknown) => usd(v as number), right: true },
                    { key: "basis", label: "Basis" },
                    { key: "ds", label: "DS" },
                    { key: "lifetime", label: "Lifetime", fmt: (v: unknown) => usd(v as number), right: true },
                    { key: "largest", label: "Largest Gift", fmt: (v: unknown) => usd(v as number), right: true },
                    { key: "last", label: "Last Gift" },
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

function Prospects({ d }: { d: CsnfSnapshot }) {
  const pools = [
    { k: "High Wealth", rows: d.highWealth, n: d.highWealthCount, desc: "DonorSearch capacity of $25K or more, sorted by capacity. Major gift and campaign prospects." },
    { k: "Mid-Level", rows: d.midLevel, n: d.midLevelCount, desc: "Lifetime $250 to $4,999 with a gift in the last 3 years. Mid-Level program pool." },
    { k: "Legacy", rows: d.legacy, n: d.legacyCount, desc: "Gave in 10 or more fiscal years, lifetime under $25K. Legacy Call pool." },
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
        <Table rows={p.rows as never} cols={personCols as never} csvName={`CSNF ${p.k} Prospects.csv`} />
      </Card>
    </div>
  );
}

function Board({ d }: { d: CsnfSnapshot }) {
  const active = d.board.filter((b) => b.active);
  const ask = active.reduce((s, b) => s + b.ask, 0);
  const got = active.reduce((s, b) => s + b.get, 0);
  const giving = active.filter((b) => b.lifetime > 0).length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active board members" value={num(active.length)} />
        <Stat label="Campaign ask total" value={usd(ask)} />
        <Stat label="Committed so far" value={usd(got)} note={pct(got, ask) + " of ask"} />
        <Stat label="Members who have given" value={`${giving} of ${active.length}`} />
      </div>
      <Card>
        <H sub="Board campaign ask vs. get, with giving history and DonorSearch">Board report</H>
        <Table
          rows={d.board}
          csvName="CSNF Board Report.csv"
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

function Calling({ d }: { d: CsnfSnapshot }) {
  const all = d.batches.flatMap((b) => b.people.map((p) => ({ batch: b.batch, ...p })));
  const tiers = Array.from(new Set(d.batches.flatMap((b) => Object.keys(b.tiers)))).sort();
  return (
    <div className="space-y-6">
      <Card>
        <H sub="Records sent to VanillaSoft each week, by feasibility study tier">Weekly calling batches</H>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={d.batches.map((b) => ({ batch: b.batch, ...b.tiers }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="batch" />
              <YAxis />
              <Tooltip />
              <Legend />
              {tiers.map((t, i) => (
                <Bar key={t} dataKey={t} stackId="a" fill={[NAVY, GOLD, "#5a6675", "#cdaa6e", "#0c131c"][i % 5]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <H sub="Live call outcomes are on the CSNF Study Dashboard">Everyone sent to calling</H>
        <Table
          rows={all}
          csvName="CSNF Calling Batches.csv"
          cols={[
            { key: "batch", label: "Batch" },
            { key: "name", label: "Name" },
            { key: "tier", label: "Tier" },
            { key: "interviewer", label: "Interviewer" },
            { key: "lifetime", label: "Lifetime", fmt: (v) => usd(v as number), right: true },
            { key: "ds", label: "DS" },
          ]}
        />
      </Card>
    </div>
  );
}

function Health({ d }: { d: CsnfSnapshot }) {
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
          <Table rows={d.donorType.map(([k, n]) => ({ type: k, count: n }))} cols={[{ key: "type", label: "Donor Type" }, { key: "count", label: "Records", right: true }]} />
        </Card>
        <Card>
          <H>Affiliation flags</H>
          <Table rows={Object.entries(d.flags).map(([k, n]) => ({ flag: k, count: n }))} cols={[{ key: "flag", label: "Flag" }, { key: "count", label: "Records", right: true }]} />
        </Card>
        <Card>
          <H>Organization types</H>
          <Table rows={d.orgTypes.map(([k, n]) => ({ type: k, count: n }))} cols={[{ key: "type", label: "Type" }, { key: "count", label: "Orgs", right: true }]} />
        </Card>
      </div>
    </div>
  );
}

function Alumni({ d }: { d: CsnfSnapshot }) {
  const a = d.alumni;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Alumni records" value={num(a.total)} />
        <Stat label="In Southern Nevada zips" value={pct(a.snv, a.total)} note={num(a.snv)} />
        <Stat label="Matched to a donor record" value={num(a.donors)} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <H>By school</H>
          <Table rows={a.bySchool.map(([k, n]) => ({ school: k, count: n }))} cols={[{ key: "school", label: "School" }, { key: "count", label: "Alumni", right: true }]} />
        </Card>
        <Card>
          <H>Top zip codes</H>
          <Table rows={a.topZips.map(([k, n]) => ({ zip: k, count: n }))} cols={[{ key: "zip", label: "Zip" }, { key: "count", label: "Alumni", right: true }]} />
        </Card>
      </div>
    </div>
  );
}

export function CsnfDataDashboard({ data }: { data: CsnfSnapshot }) {
  const [tab, setTab] = useState<Tab>("Overview");
  return (
    <main className="min-h-screen bg-[rgb(var(--paper))]">
      <header className="bg-[rgb(var(--navy))] px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[rgb(var(--brass-light))]">Catapult Fundraising · Internal</p>
          <h1 className="font-display mt-1 text-3xl">{data.client}</h1>
          <p className="mt-1 text-sm text-white/70">Donor data dashboard · Data as of {data.asOf} · Source: {data.source}</p>
        </div>
      </header>
      <nav className="sticky top-0 z-10 border-b border-[rgb(var(--line))] bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {TABS.map((t) => (
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
        {tab === "Overview" && <Overview d={data} />}
        {tab === "Gift Pyramid" && <Pyramid d={data} />}
        {tab === "Gift Chart + GC2P" && <GiftChartTab d={data} />}
        {tab === "Prospects" && <Prospects d={data} />}
        {tab === "Board" && <Board d={data} />}
        {tab === "Calling" && <Calling d={data} />}
        {tab === "Database Health" && <Health d={data} />}
        {tab === "Alumni" && <Alumni d={data} />}
        <p className="mt-10 text-xs text-[rgb(var(--ink))]/50">
          Built {data.builtAt}. Lifetime totals come from the gift file. Giving History Overview shows {usd(data.kpi.gho)}, which still needs to be reconciled.
        </p>
      </div>
    </main>
  );
}
