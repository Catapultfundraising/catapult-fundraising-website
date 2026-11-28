"use client";

// Slice 1 of the DIY campaign platform: upload -> map fields -> preview -> generated dashboard (gift chart + GC2P).
// Runs fully in the browser; the finished "tenant" is kept in this browser's localStorage only.
import { useEffect, useMemo, useState } from "react";
import { formatDollars } from "@/lib/gift-chart";
import {
  GIFT_FIELDS, PROSPECT_FIELDS, SAMPLE_GIFTS_CSV, SAMPLE_PROSPECTS_CSV, autoMap, buildDashboard, buildGifts, buildProspects, readTable,
  type FieldMap, type TenantRecord,
} from "@/lib/campaign-platform/tenant";

const NAVY = "#15212e"; const GOLD = "#b28c46";
const KEY = "catapult-campaign-platform-preview:v1";
type Table = { headers: string[]; rows: string[][] } | null;

function download(name: string, text: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; a.click();
}

function UploadStep<F extends { key: string; label: string; required: boolean; hints: readonly string[] }>({ title, fields, table, setTable, map, setMap, sample, sampleName }: {
  title: string; fields: readonly F[]; table: Table; setTable: (t: Table) => void; map: FieldMap; setMap: (m: FieldMap) => void; sample: string; sampleName: string;
}) {
  const [err, setErr] = useState("");
  async function load(text: string) {
    try { const t = readTable(text); setTable(t); setMap(autoMap(t.headers, fields)); setErr(""); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <section className="rounded-lg border bg-white p-5 space-y-3">
      <h2 className="text-lg font-semibold" style={{ color: NAVY }}>{title}</h2>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await load(await f.text()); }} />
        <button className="underline" style={{ color: GOLD }} onClick={() => load(sample)}>Use sample data</button>
        <button className="underline text-gray-500" onClick={() => download(sampleName, sample)}>Download sample file</button>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {table && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{table.rows.length} rows found. Check that each field matches the right column.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <label key={f.key} className="text-sm flex items-center gap-2">
                <span className="w-36">{f.label}{f.required && " *"}</span>
                <select className="border rounded px-2 py-1 flex-1" value={map[f.key] ?? -1} onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) })}>
                  <option value={-1}>{f.required ? "Choose a column" : "Not in my file"}</option>
                  {table.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function CampaignPlatformPreview() {
  const [name, setName] = useState("Sample Community Foundation");
  const [goal, setGoal] = useState(2_500_000);
  const [gt, setGt] = useState<Table>(null); const [gm, setGm] = useState<FieldMap>({});
  const [pt, setPt] = useState<Table>(null); const [pm, setPm] = useState<FieldMap>({});
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setTenant(JSON.parse(s)); } catch {} }, []);

  const giftsReady = !!gt && GIFT_FIELDS.every((f) => !f.required || gm[f.key] >= 0);
  const prospectsReady = !pt || PROSPECT_FIELDS.every((f) => !f.required || pm[f.key] >= 0);
  const goalOk = goal >= 100_000 && goal <= 500_000_000;

  function create() {
    if (!gt) return;
    const g = buildGifts(gt.rows, gm); const p = pt ? buildProspects(pt.rows, pm) : { prospects: [], problems: [] };
    setProblems([...g.problems, ...p.problems].slice(0, 8));
    if (!g.gifts.length) return;
    const t: TenantRecord = { id: `t-${Date.now()}`, name: name.trim() || "My campaign", goal, createdAt: new Date().toISOString(), gifts: g.gifts, prospects: p.prospects };
    localStorage.setItem(KEY, JSON.stringify(t)); setTenant(t);
  }
  function reset() { localStorage.removeItem(KEY); setTenant(null); setGt(null); setPt(null); setProblems([]); }

  const dash = useMemo(() => (tenant ? buildDashboard(tenant) : null), [tenant]);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6" style={{ color: NAVY }}>
      <header>
        <p className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>Internal preview · sample data only</p>
        <h1 className="text-3xl font-semibold">Campaign platform: upload to dashboard</h1>
        <p className="text-gray-600 text-sm">Upload a giving file and a prospect list. The platform builds the campaign dashboard, gift chart and Gift Chart to Prospects. Nothing leaves this browser.</p>
      </header>

      {!tenant || !dash ? (
        <>
          <section className="rounded-lg border bg-white p-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Organization<input className="mt-1 w-full border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="text-sm">Campaign goal ($100,000 to $500,000,000)<input type="number" className="mt-1 w-full border rounded px-2 py-1" value={goal} onChange={(e) => setGoal(Number(e.target.value))} /></label>
          </section>
          <UploadStep title="1. Giving file (gifts and pledges)" fields={GIFT_FIELDS} table={gt} setTable={setGt} map={gm} setMap={setGm} sample={SAMPLE_GIFTS_CSV} sampleName="sample-gifts.csv" />
          <UploadStep title="2. Prospect list (optional, used for Gift Chart to Prospects)" fields={PROSPECT_FIELDS} table={pt} setTable={setPt} map={pm} setMap={setPm} sample={SAMPLE_PROSPECTS_CSV} sampleName="sample-prospects.csv" />
          {problems.length > 0 && <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3"><p className="font-medium">Some rows were skipped:</p><ul className="list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul></div>}
          <button disabled={!giftsReady || !prospectsReady || !goalOk} onClick={create} className="rounded px-5 py-2 text-white disabled:opacity-40" style={{ background: NAVY }}>Create my dashboard</button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{tenant.name}</h2>
            <button onClick={reset} className="text-sm underline text-gray-500">Start over</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[["Goal", formatDollars(tenant.goal)], ["Campaign credit", formatDollars(dash.raised)], ["Of goal", `${(dash.pctOfGoal * 100).toFixed(1)}%`], ["Donors", String(dash.donors)]].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-white p-4"><p className="text-xs text-gray-500">{k}</p><p className="text-xl font-semibold">{v}</p></div>
            ))}
          </div>
          <div className="h-3 rounded bg-gray-200 overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, dash.pctOfGoal * 100)}%`, background: GOLD }} /></div>

          <section className="rounded-lg border bg-white p-5">
            <h3 className="font-semibold mb-2">Gift chart progress</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th>Level</th><th>Needed</th><th>Secured</th><th>Open</th><th className="text-right">Still to raise</th></tr></thead>
              <tbody>{dash.levels.map((l) => (
                <tr key={l.level} className="border-t"><td>{formatDollars(l.level)}</td><td>{l.gifts}</td><td>{l.secured}</td><td>{l.remaining}</td><td className="text-right">{formatDollars(l.remainingValue)}</td></tr>
              ))}</tbody>
            </table>
          </section>

          <section className="rounded-lg border bg-white p-5">
            <h3 className="font-semibold mb-2">Gift Chart to Prospects</h3>
            {tenant.prospects.length === 0 ? <p className="text-sm text-gray-500">Upload a prospect list to see prospects seated at open gift levels.</p> : (
              <>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500"><th>Seat at level</th><th>Prospect</th><th className="text-right">Capacity</th></tr></thead>
                  <tbody>{dash.seats.map((s, i) => <tr key={i} className="border-t"><td>{formatDollars(s.level)}</td><td>{s.prospect.name}</td><td className="text-right">{formatDollars(s.prospect.capacity)}</td></tr>)}</tbody>
                </table>
                {dash.unseated.length > 0 && <p className="text-xs text-gray-500 mt-2">No open level fits: {dash.unseated.map((p) => p.name).join(", ")}</p>}
              </>
            )}
            <p className="text-xs text-gray-500 mt-3">Prospects who already gave are left out. PIR ordering from this screen comes in a later step.</p>
          </section>
        </>
      )}
    </main>
  );
}
