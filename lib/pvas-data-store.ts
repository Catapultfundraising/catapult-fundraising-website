import "server-only";
import { buildPvas } from "./portal-refresh/pvas";
import { get, put } from "@vercel/blob";
import { after } from "next/server";
import { createPvasSharedCache, type CacheBlobStore } from "./pvas-shared-cache.server";
import { pvasCanonicalEnabled } from "./portal-v2/pvas-canonical";
import * as legacy from "./pvas-data-store.legacy";
import type{PvasGiftMetadata}from"./portal-v2/pvas-gift-wire";
import type{PvasContactProfile}from"./portal-v2/pvas-contact-wire";
import type { NativeDonorHistory } from "./portal-v2/pvas-native-consumer";

// Legacy refresh/upload destinations only. Dashboard readers never read these blobs.
export const PVAS_DATA_PATH = "pvas-data/snapshot.json";

export interface Person {
  solicitor?: string; solicitor2?: string; assignmentConflict?: boolean;
  cptid: number; name: string; lifetime: number; gifts: number; first: string; last: string;
  largest: number; years: number; ds: string; capacity: string; capMin: number; qs: string;
}
export interface PvasSnapshot {
  client: string; asOf: string; builtAt: string; source: string;
  kpi: { total: number; gifts: number; donors: number; avg: number; gho: number; cash: number; inkind: number };
  stages: { stage: string; gifts: number; total: number }[];
  fys: { fy: number; total: number; gifts: number; donors: number }[];
  retention: { fy: number; retained: number; prior: number; rate: number; new: number }[];
  pyramid: { band: string; donors: number; total: number }[];
  dsRating: [string, number][]; capacity: [string, number][];
  pool: (Person & { rating: number; basis: string; ask: number; solicitor: string; solicitor2?: string; donorType: string })[];
  highWealth: Person[]; highWealthCount: number; midLevel: Person[]; midLevelCount: number;
  legacy: Person[]; legacyCount: number; lapsed: Person[]; lapsedCount: number; top: Person[];
  board: { cptid?: number; name: string; title: string; board: string; term: string; active: boolean; ask: number; get: number; lifetime: number; last: string; ds: string; capacity: string }[];
  committee: { cptid: number | null; name: string; title: string }[];
  portfolio: { cptid: number; name: string; solicitor: string; solicitor2?: string; ask: number; type: string; donorType: string; priority: string; task: string; lifetime: number; prevAsk: number; capacity: string; ds: string }[];
  committed: PvasSnapshot["portfolio"];
  givebutter: {
    from: string; to: string; txCount: number; txTotal: number; txDonors: number; matched: number; pledgeCount: number; pledgeTotal: number;
    byCampaign: { campaign: string; gifts: number; total: number }[];
    transactions: { cptid: number | null; name: string; date: string; amount: number; campaign: string; fund: string; status: string; dedication: string }[];
    pledges: { cptid: number | null; name: string; pledged: string; amount: number; fulfilled: number; remaining: number; campaign: string; status: string; frequency: string; expected: string }[];
  };
  health: Record<string, number>; donorType: [string, number][]; flags: Record<string, number>; orgTypes: [string, number][];
  /** Screening/phone rows set aside because their CPTID has no pvas.contacts row yet. */
  unmatchedSource?: { donorsearch: { rows: number; cptids: number[] }; phones: { rows: number; cptids: number[] } };
  batches: { batch: string; count: number; tiers: Record<string, number>; people: { cptid?: number; name: string; tier: string; interviewer: string; lifetime: number; ds: string; ask?: number }[] }[];
  feasibility: { total: number; completed: number; declined: number; consider: number; multiYear: number; leadership: number; introduce: number; byTier: { tier: string; prospects: number; completed: number; consider: number }[]; people: { cptid?: number; name: string; tier: string; company: string; result: string; date: string; consider: boolean; multiYear: boolean; leadership: boolean; introduce: boolean }[] };
}

export async function getPvasSnapshot(): Promise<PvasSnapshot | null> {
  if (!pvasCanonicalEnabled("pvas")) return legacy.getPvasSnapshot();
  try {
    return structuredClone((await currentPvas()).snapshot) as unknown as PvasSnapshot;
  } catch {
    return null;
  }
}

// Retained for legacy refresh/upload compatibility, not a read source.
export const PVAS_RECORDS_PATH = "pvas-data/records.json";

export interface IndexRow {
  solicitor?: string; solicitor2?: string; assignmentConflict?: boolean;
  cptid: number; name: string; kind?: string; city?: string; lifetime: number; gifts: number; largest: number;
  last: string; years: number; band: string; ds?: string; capacity?: string; capMin: number;
}
export interface DonorRecord {
  nativeGiftHistory?: NativeDonorHistory;
  _canonicalContact?:PvasContactProfile;
  otherGiftRows?:Record<string,unknown>[];
  assignment?: { solicitor: string; solicitor2: string; assignmentConflict?: boolean };
  cptid: number; name: string; kind?: string;
  contact?: Record<string, string>; flags?: string[]; ds?: Record<string, string>;
  softCredits?: Record<string, string>;
  gifts?: { date?: string; amount: number; amountExact?:string;_canonicalGift?:PvasGiftMetadata; stage?: string; type?: string; campaign?: string; allocation?: string; tribute?: string }[];
  board?: { board?: string; title?: string; term?: string; active?: boolean; ask?: number; get?: number }[];
  committees?: string[];
  calling?: { batch: string; tier?: string; interviewer?: string; appt?: string }[];
  calls?: { date?: string; result?: string; reason?: string; comments?: string }[];
  notes?: string[];
  feasibility?: { tier?: string; date?: string; completed?: boolean; declined?: boolean; consider?: boolean; multiYear?: boolean; leadership?: boolean; introduce?: boolean; result?: string; company?: string; title?: string };
  years?: { year: number; amount: number }[];
  givebutter?: { type: string; date: string; amount: number; campaign: string; status: string }[];
  portfolio?: { solicitor: string; solicitor2?: string; secondary?: string; ask: number; prevAsk?: number; priority?: string; task?: string; due?: string; relationship?: string; naming?: string; donorType?: string };
  summary: { lifetime: number; gifts: number; first?: string; last?: string; largest: number; years: number; band: string; ghoTotal?: number };
}
export interface PvasRecords { asOf: string; index: IndexRow[]; records: Record<string, DonorRecord> }

// Canonical PVAS builds are shared for at most 2 minutes (PVAS_CACHE_TTL_SECONDS, 0 disables).
// Confirmed edits and the dashboard Reload link invalidate it for every server instance.
type Built = Awaited<ReturnType<typeof buildPvas>>;
const blobStore: CacheBlobStore | null = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? {
  async read(path) {
    const r = await get(path, { access: "private", useCache: false });
    return r?.stream ? Buffer.from(await new Response(r.stream).arrayBuffer()) : null;
  },
  async write(path, body, contentType) {
    await put(path, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true,
      multipart: body.length > 50_000_000 });
  },
} : null;
const sharedCache = createPvasSharedCache<Built>({
  build: buildPvas, store: blobStore, log: m => console.warn(m),
  background: p => { try { after(() => p); } catch { void p; } },
});
export async function invalidatePvasDataCache(): Promise<void> {
  try { await sharedCache.invalidate(); } catch (e) { console.warn(`pvas cache invalidation marker failed: ${String(e)}`); }
}
async function currentPvas(): Promise<Built> { return sharedCache.get(); }
/** Identity of the current shared build (same freshness rules), for reusing per-build read views. */
export async function pvasBuildIdentity(): Promise<object | null> {
  if (!pvasCanonicalEnabled("pvas")) return null;
  try { return (await currentPvas()) as object; } catch { return null; }
}
export async function getPvasRecords(): Promise<PvasRecords | null> {
  if (!pvasCanonicalEnabled("pvas")) return legacy.getPvasRecords();
  try {
    return structuredClone((await currentPvas()).records) as unknown as PvasRecords;
  } catch { return null; }
}
