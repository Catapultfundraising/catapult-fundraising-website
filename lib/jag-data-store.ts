import { get as blobGet } from "@vercel/blob";
import { directData } from "./portal-v2/direct-source-state.server";
import { liveBuild, liveLocalDir } from "./client-live-data.server";

// Local QA only (dashboards otherwise read live SQL, see client-live-data.server.ts): JAG_LOCAL_DIR points at a folder holding snapshot.json and
// records.json so the portal can run without the blob store.
async function get(path: string, opts: Parameters<typeof blobGet>[1]) {
  const dir = process.env.JAG_LOCAL_DIR;
  if (dir) {
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(`${dir}/${path.split("/").pop()}`, "utf8");
    return { stream: new Response(text).body } as Awaited<ReturnType<typeof blobGet>>;
  }
  return blobGet(path, opts);
}

// Internal JAG donor-data dashboard snapshot. Built from the JAG database
// (Azure SQL schema `jag`, originally the Access file) by Viktor and written
// as one private JSON blob. Never commit donor data to the repo.
export const JAG_DATA_PATH = "jag-data/snapshot.json";

export interface Person {
  solicitor?: string; solicitor2?: string; assignmentConflict?: boolean;
  cptid: number; name: string; lifetime: number; gifts: number; first: string; last: string;
  largest: number; years: number; ds: string; capacity: string; capMin: number; qs: string;
}
export interface JagSnapshot {
  client: string; asOf: string; builtAt: string; source: string;
  kpi: { total: number; gifts: number; donors: number; avg: number; gho: number; cash: number; inkind: number };
  stages: { stage: string; gifts: number; total: number }[];
  fys: { fy: number; total: number; gifts: number; donors: number }[];
  retention: { fy: number; retained: number; prior: number; rate: number; new: number }[];
  pyramid: { band: string; donors: number; total: number }[];
  dsRating: [string, number][]; capacity: [string, number][];
  pool: (Person & { rating: number; basis: string })[];
  highWealth: Person[]; highWealthCount: number; midLevel: Person[]; midLevelCount: number;
  legacy: Person[]; legacyCount: number; lapsed: Person[]; lapsedCount: number; top: Person[];
  board: { cptid?: number; name: string; title: string; board: string; term: string; active: boolean; ask: number; get: number; lifetime: number; last: string; ds: string; capacity: string }[];
  health: Record<string, number>; donorType: [string, number][]; flags: Record<string, number>; orgTypes: [string, number][];
  batches: { batch: string; count: number; tiers: Record<string, number>; people: { cptid?: number; name: string; tier: string; interviewer: string; lifetime: number; ds: string }[] }[];
  feasibility: { total: number; completed: number; declined: number; consider: number; multiYear: number; leadership: number; introduce: number; byTier: { tier: string; prospects: number; completed: number; consider: number }[]; people: { cptid?: number; name: string; tier: string; company: string; result: string; date: string; consider: boolean; multiYear: boolean; leadership: boolean; introduce: boolean }[] };
}

export async function getJagSnapshot(): Promise<JagSnapshot | null> {
  // Live SQL (2-minute shared build). The old weekly snapshot file is only used for local QA.
  if (!liveLocalDir("jag")) {
    try { return structuredClone((await liveBuild("jag")).snapshot) as unknown as JagSnapshot; }
    catch (e) { console.error(`jag live SQL snapshot unavailable: ${String(e)}`); return null; }
  }
  try {
    const r = await get(JAG_DATA_PATH, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text()) as JagSnapshot;
  } catch {
    return null;
  }
}

// Per-constituent records (CRM lookup and chart drilldowns). Separate blob
// because it is ~9MB; only read server-side and cached briefly per instance.
export const JAG_RECORDS_PATH = "jag-data/records.json";

export interface IndexRow {
  solicitor?: string; solicitor2?: string; assignmentConflict?: boolean;
  cptid: number; name: string; kind?: string; city?: string; lifetime: number; gifts: number; largest: number;
  last: string; years: number; band: string; ds?: string; capacity?: string; capMin: number;
}
export interface DonorRecord {
  assignment?: { solicitor: string; solicitor2: string; assignmentConflict?: boolean };
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
  summary: { lifetime: number; gifts: number; first?: string; last?: string; largest: number; years: number; band: string; ghoTotal?: number };
}
export interface JagRecords { asOf: string; index: IndexRow[]; records: Record<string, DonorRecord> }

let cache: { at: number; data: JagRecords } | null = null;
async function getJagRawRecords(): Promise<JagRecords | null> {
  if (!liveLocalDir("jag")) {
    try { return (await liveBuild("jag")).records as unknown as JagRecords; }
    catch (e) { console.error(`jag live SQL records unavailable: ${String(e)}`); return null; }
  }
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.data;
  try {
    const r = await get(JAG_RECORDS_PATH, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    const data = JSON.parse(await new Response(r.stream).text()) as JagRecords;
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return null;
  }
}
export async function getJagRecords(): Promise<JagRecords | null> {
  const raw = await getJagRawRecords();
  if (!raw) return null;
  try { return await directData("jag", raw, "records"); } catch { return null; }
}
