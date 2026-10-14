import sql from "mssql";

// Shared helpers for the Azure SQL -> portal blob builders (ports of the old
// Python build_snap*.py / build_records*.py scripts that read the Access file).

export type Row = Record<string, unknown>;

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function azurePool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    const { AZURE_SQL_SERVER, AZURE_SQL_DB, AZURE_SQL_USER, AZURE_SQL_PASSWORD } = process.env;
    if (!AZURE_SQL_SERVER || !AZURE_SQL_DB || !AZURE_SQL_USER || !AZURE_SQL_PASSWORD) {
      throw new Error("AZURE_SQL_SERVER / AZURE_SQL_DB / AZURE_SQL_USER / AZURE_SQL_PASSWORD not set");
    }
    const cfg: sql.config = {
      server: AZURE_SQL_SERVER,
      database: AZURE_SQL_DB,
      user: AZURE_SQL_USER,
      password: AZURE_SQL_PASSWORD,
      options: { encrypt: true, trustServerCertificate: false },
      connectionTimeout: 60_000,
      requestTimeout: 120_000,
      pool: { max: 4, min: 0, idleTimeoutMillis: 10_000 },
    };
    poolPromise = connectWithRetry(cfg).catch((e) => {
      poolPromise = null;
      throw e;
    });
  }
  return poolPromise;
}

// Serverless Azure SQL auto-pauses; the first login returns 40613 while it resumes.
async function connectWithRetry(cfg: sql.config): Promise<sql.ConnectionPool> {
  let last: unknown;
  for (let i = 0; i < 6; i++) {
    try {
      return await new sql.ConnectionPool(cfg).connect();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
  throw last;
}

export async function closePool() {
  if (poolPromise) {
    const p = await poolPromise;
    poolPromise = null;
    await p.close();
  }
}

export async function rows(query: string): Promise<Row[]> {
  const pool = await azurePool();
  const r = await pool.request().query(query);
  return r.recordset as Row[];
}

export const s = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().replace("T", " ").slice(0, 19);
  return String(v).trim();
};

export const cid = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : null;
};

// Azure stores currency as decimal dollars (the x10000 Access quirk is gone).
export const money = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Parse a SQL date or an "M/D/YYYY" / "YYYY-MM-DD" string to "YYYY-MM-DD". */
export const pdate = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

export const fy = (d: string): number => {
  const y = Number(d.slice(0, 4));
  return Number(d.slice(5, 7)) >= 7 ? y + 1 : y;
};

export const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export const capmin = (x: unknown): number => {
  const m = String(x ?? "").match(/\$([\d,]+)/);
  return m ? parseFloat(m[1].replace(/,/g, "")) : 0;
};

export const BANDS: [number, string][] = [
  [1e6, "$1M+"], [500000, "$500K-$999K"], [250000, "$250K-$499K"], [100000, "$100K-$249K"],
  [50000, "$50K-$99K"], [25000, "$25K-$49K"], [10000, "$10K-$24K"], [5000, "$5K-$9,999"],
  [1000, "$1K-$4,999"], [250, "$250-$999"], [0.01, "Under $250"],
];
export const band = (t: number) => BANDS.find(([lo]) => t >= lo)?.[1] ?? "No gifts";

export function counter<T extends string>(items: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const x of items) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}
/** Python Counter.most_common(): count desc, ties keep first-seen order. */
export const mostCommon = <T extends string>(m: Map<T, number>, n?: number): [T, number][] =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
export const sortedItems = <T extends string>(m: Map<T, number>): [T, number][] =>
  [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

export type Gift = { c: number | null; a: number; d: string | null; s: string; t: string; camp?: string; alloc?: string; tribute?: string };
export type Per = { total: number; n: number; first: string | null; last: string | null; max: number; fys: Set<number> };

export function perDonor(gifts: Gift[]): Map<number, Per> {
  const pd = new Map<number, Per>();
  for (const g of gifts) {
    if (g.c === null) continue;
    let p = pd.get(g.c);
    if (!p) pd.set(g.c, (p = { total: 0, n: 0, first: null, last: null, max: 0, fys: new Set() }));
    p.total += g.a; p.n += 1; p.max = Math.max(p.max, g.a);
    if (g.d) {
      if (!p.first || g.d < p.first) p.first = g.d;
      if (!p.last || g.d > p.last) p.last = g.d;
      p.fys.add(fy(g.d));
    }
  }
  return pd;
}

export function givingAggregates(gifts: Gift[], minFy = 0) {
  const bystage = new Map<string, [number, number]>();
  for (const g of gifts) {
    const x = bystage.get(g.s) ?? [0, 0];
    x[0] += 1; x[1] += g.a; bystage.set(g.s, x);
  }
  const byfy = new Map<number, { total: number; gifts: number; donors: Set<number | null> }>();
  for (const g of gifts) {
    if (!g.d) continue;
    const f = fy(g.d);
    const x = byfy.get(f) ?? { total: 0, gifts: 0, donors: new Set() };
    x.total += g.a; x.gifts += 1; x.donors.add(g.c); byfy.set(f, x);
  }
  const fys = [...byfy.entries()].sort((a, b) => a[0] - b[0]).filter(([f]) => f >= minFy)
    .map(([f, x]) => ({ fy: f, total: round2(x.total), gifts: x.gifts, donors: x.donors.size }));
  return { bystage, fys };
}

export function retention(gifts: Gift[], minFy = 0) {
  const dfy = new Map<number, Set<number>>();
  for (const g of gifts) {
    if (!g.d || g.c === null) continue;
    const f = fy(g.d);
    if (!dfy.has(f)) dfy.set(f, new Set());
    dfy.get(f)!.add(g.c);
  }
  const out: { fy: number; retained: number; prior: number; rate: number; new: number }[] = [];
  const years = [...dfy.keys()].sort((a, b) => a - b);
  for (const f of years) {
    const prev = dfy.get(f - 1);
    if (!prev || f < minFy) continue;
    const cur = dfy.get(f)!;
    const earlier = new Set<number>();
    for (const y of years) if (y < f) for (const c of dfy.get(y)!) earlier.add(c);
    const retained = [...prev].filter((c) => cur.has(c)).length;
    out.push({ fy: f, retained, prior: prev.size, rate: Math.round((retained / prev.size) * 1000) / 10, new: [...cur].filter((c) => !earlier.has(c)).length });
  }
  return out;
}

export function pyramid(pd: Map<number, Per>) {
  const pyr = new Map<string, [number, number]>(BANDS.map(([, l]) => [l, [0, 0]]));
  for (const p of pd.values()) {
    const b = BANDS.find(([lo]) => p.total >= lo);
    if (b) { const x = pyr.get(b[1])!; x[0] += 1; x[1] += p.total; }
  }
  return [...pyr.entries()].map(([k, v]) => ({ band: k, donors: v[0], total: round2(v[1]) }));
}

export const isoToday = () => new Date().toISOString().slice(0, 10);
export const yearsAgo = (n: number) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - n);
  return d.toISOString().slice(0, 10);
};
export const builtAt = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Los_Angeles", dateStyle: "short", timeStyle: "short" }).format(new Date());

/** Latest Access->Azure load date for a schema, used as the "Data as of" label. */
export async function loadedAsOf(schema: "csnf" | "jag" | "pvas"): Promise<string> {
  try {
    const r = await rows(`SELECT MAX(loaded_at) AS d FROM ${schema}._load_log`);
    return pdate(r[0]?.d) ?? isoToday();
  } catch {
    return isoToday(); // schema without a load log (pvas)
  }
}

export async function pirLinks(schema: "csnf" | "jag" | "pvas"): Promise<Record<string, { name: string; url: string }>> {
  const out: Record<string, { name: string; url: string }> = {};
  for (const r of await rows(`SELECT cptid, sharepoint_url, file_name FROM ${schema}.pir_links ORDER BY cptid`)) {
    const url = s(r.sharepoint_url);
    const name = s(r.file_name) || decodeURIComponent(url.split("/").pop() ?? "");
    out[String(r.cptid)] = { name, url };
  }
  return out;
}

/** DonorSearch money columns are decimals in Azure; the portal shows Access text like "$5,696,151.00". */
export const dsField = (col: string, v: unknown): string =>
  (col === "Real_Estate_Est" || col === "SEC_Stock_Value") && v !== null && v !== undefined && v !== ""
    ? "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : s(v);
