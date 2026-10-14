import { get as blobGet } from "@vercel/blob";

// Local QA only: BAQ_LOCAL_DIR points at a folder holding snapshot.json and
// records.json so the portal can run without the blob store.
async function get(path: string, opts: Parameters<typeof blobGet>[1]) {
  const dir = process.env.BAQ_LOCAL_DIR;
  if (dir) {
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(`${dir}/${path.split("/").pop()}`, "utf8");
    return { stream: new Response(text).body } as Awaited<ReturnType<typeof blobGet>>;
  }
  return blobGet(path, opts);
}

// Internal BAQ donor-data dashboard snapshot. Built from the BAQ database
// (Azure SQL schema `baq`) by Viktor and written
// as one private JSON blob. Never commit donor data to the repo.
export const BAQ_DATA_PATH = "baq-data/snapshot.json";

export interface Person {
  cptid: number; name: string; lifetime: number; gifts: number; first: string; last: string;
  largest: number; years: number; ds: string; capacity: string; capMin: number; qs: string;
}
export interface BaqSnapshot {
  client: string; asOf: string; builtAt: string; source: string;
  kpi: { total: number; gifts: number; donors: number; avg: number; gho: number; cash: number; inkind: number; campaign?: number; campaignGifts?: number; campaignDonors?: number };
  stages: { stage: string; gifts: number; total: number }[];
  fys: { fy: number; total: number; gifts: number; donors: number }[];
  retention: { fy: number; retained: number; prior: number; rate: number; new: number }[];
  pyramid: { band: string; donors: number; total: number }[];
  dsRating: [string, number][]; capacity: [string, number][];
  pool: (Person & { rating: number; basis: string; ask: number; solicitor: string; donorType: string; status?: string; capText?: string; wealth?: string; history?: string; note?: string; committedAmt?: number })[];
  unrated?: { name: string; type: string; note: string }[]; notSeated?: { name: string; reason: string }[];
  highWealth: Person[]; highWealthCount: number; midLevel: Person[]; midLevelCount: number;
  legacy: Person[]; legacyCount: number; lapsed: Person[]; lapsedCount: number; top: Person[];
  board: { cptid?: number; name: string; title: string; board: string; term: string; active: boolean; ask: number; get: number; lifetime: number; last: string; ds: string; capacity: string }[];
  committee: { cptid: number | null; name: string; title: string }[];
  portfolio: { cptid: number; name: string; solicitor: string; ask: number; type: string; donorType: string; priority: string; task: string; lifetime: number; prevAsk: number; capacity: string; ds: string }[];
  committed: BaqSnapshot["portfolio"];
  givebutter: {
    from: string; to: string; txCount: number; txTotal: number; txDonors: number; matched: number; pledgeCount: number; pledgeTotal: number;
    byCampaign: { campaign: string; gifts: number; total: number }[];
    transactions: { cptid: number | null; name: string; date: string; amount: number; campaign: string; fund: string; status: string; dedication: string }[];
    pledges: { cptid: number | null; name: string; pledged: string; amount: number; fulfilled: number; remaining: number; campaign: string; status: string; frequency: string; expected: string }[];
  };
  health: Record<string, number>; donorType: [string, number][]; flags: Record<string, number>; orgTypes: [string, number][];
  batches: { batch: string; count: number; tiers: Record<string, number>; people: { cptid?: number; name: string; tier: string; interviewer: string; lifetime: number; ds: string; ask?: number }[] }[];
  feasibility: { total: number; completed: number; declined: number; consider: number; multiYear: number; leadership: number; introduce: number; byTier: { tier: string; prospects: number; completed: number; consider: number }[]; people: { cptid?: number; name: string; tier: string; company: string; result: string; date: string; consider: boolean; multiYear: boolean; leadership: boolean; introduce: boolean }[] };
}

export async function getBaqSnapshot(): Promise<BaqSnapshot | null> {
  try {
    const r = await get(BAQ_DATA_PATH, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text()) as BaqSnapshot;
  } catch {
    return null;
  }
}

// Per-constituent records (CRM lookup and chart drilldowns). Separate blob
// because it is ~9MB; only read server-side and cached briefly per instance.
export const BAQ_RECORDS_PATH = "baq-data/records.json";

export interface IndexRow {
  cptid: number; name: string; kind?: string; city?: string; lifetime: number; gifts: number; largest: number;
  last: string; years: number; band: string; ds?: string; capacity?: string; capMin: number;
}
export interface DonorRecord {
  cptid: number; name: string; kind?: string;
  contact?: Record<string, string>; flags?: string[]; ds?: Record<string, string>;
  softCredits?: Record<string, string>;
  gifts?: { date?: string; amount: number; stage?: string; type?: string; campaign?: string; allocation?: string; tribute?: string }[];
  board?: { board?: string; title?: string; term?: string; active?: boolean; ask?: number; get?: number }[];
  committees?: string[];
  calling?: { batch: string; tier?: string; interviewer?: string; appt?: string }[];
  calls?: { date?: string; result?: string; reason?: string; comments?: string }[];
  notes?: string[];
  feasibility?: { tier?: string; date?: string; completed?: boolean; declined?: boolean; consider?: boolean; multiYear?: boolean; leadership?: boolean; introduce?: boolean; result?: string; company?: string; title?: string };
  years?: { year: number; amount: number }[];
  givebutter?: { type: string; date: string; amount: number; campaign: string; status: string }[];
  portfolio?: { solicitor: string; secondary?: string; ask: number; prevAsk?: number; priority?: string; task?: string; due?: string; relationship?: string; naming?: string; donorType?: string };
  summary: { lifetime: number; gifts: number; first?: string; last?: string; largest: number; years: number; band: string; ghoTotal?: number };
}
export interface BaqRecords { asOf: string; index: IndexRow[]; records: Record<string, DonorRecord> }

let cache: { at: number; data: BaqRecords } | null = null;
export async function getBaqRecords(): Promise<BaqRecords | null> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.data;
  try {
    const r = await get(BAQ_RECORDS_PATH, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    const data = JSON.parse(await new Response(r.stream).text()) as BaqRecords;
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return null;
  }
}
