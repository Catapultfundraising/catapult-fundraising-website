import { directLaneEnabled } from "./portal-v2/direct-registration.server";
import { invalidateCommittedDashboard } from "./dashboard-ready-invalidation.server";
import { clientFingerprint } from "./portal-refresh/fingerprint";
import "server-only";
import { after } from "next/server";
import { createDashboardReadyCache } from "./dashboard-ready-cache.server";
import { cacheTtlMs } from "./pvas-shared-cache.server";
import { readyBlobStore } from "./dashboard-ready-blob.server";
import { DASHBOARD_READY_COMPATIBILITY, prepareDashboardRead, validateReadyBuild, type PreparedRead } from "./dashboard-ready-model.server";
import type { IdRow } from "./portal-refresh/ids";
import { stampTrackingBases, recordBase } from "./portal-v2/sql-newer";

// CSNF, JAG, WCBHC and BAQ dashboards read their client's SQL schema live (Anthony, 2026-11-18), the same way
// PVAS does: one shared build per client, SQL-fingerprint-verified every 2 minutes (TTL=0 disables),
// cleared by the dashboard's "Reload current SQL view" link. Dashboard edits are applied on top at read time,
// so they show at once. No weekly file refresh feeds these dashboards any more; SQL is the only source.

export type LiveClient = "csnf" | "jag" | "wcbhc" | "baq" | "imas" | "imas";
export const LIVE_CLIENTS: readonly LiveClient[] = ["csnf", "jag", "wcbhc", "baq", "imas"];
type Build = { snapshot: { kpi?: unknown; health?: unknown }; records: { index: unknown[]; records: Record<string, unknown> }; pirs: Record<string, { name: string; url: string }> };
export type LiveBuild = Build & { ids: IdRow[]; readyRead: PreparedRead };

async function buildClient(client: LiveClient): Promise<LiveBuild> {
  const { buildIds } = await import("./portal-refresh/ids");
  const build: () => Promise<Build> =
    client === "imas" ? async () => (await import("./portal-refresh/imas")).buildImas() as Promise<Build>
      : client === "baq" ? async () => (await import("./portal-refresh/baq")).buildBaq() as Promise<Build>
      : client === "csnf" ? async () => (await import("./portal-refresh/csnf")).buildCsnf() as Promise<Build>
        : client === "jag" ? async () => (await import("./portal-refresh/jag")).buildJag() as Promise<Build>
          : async () => (await import("./portal-refresh/wcbhc")).buildWcbhc() as Promise<Build>;
  const [built, ids] = await Promise.all([build(), buildIds(client)]);
  // Never show an empty dashboard because SQL is half-way through a reload; fail visibly instead.
  if (!built.records?.index?.length) throw new Error(`${client} SQL build returned no records`);
  return { ...built, ids, readyRead: await prepareDashboardRead(client, built as never) };
}

const caches = new Map<LiveClient, ReturnType<typeof createDashboardReadyCache<LiveBuild>>>();
function cacheFor(client: LiveClient) {
  let c = caches.get(client);
  if (!c) {
    c = createDashboardReadyCache<LiveBuild>({
      compatibility: `${DASHBOARD_READY_COMPATIBILITY}-${directLaneEnabled(client) ? "direct-on" : "direct-off"}`, prefix: `dashboard-ready/${client}`,
      markerPath: `${client}-cache/invalidated-v1.json`, store: readyBlobStore,
      enabled: cacheTtlMs() > 0, canPublish: process.env.VERCEL_ENV === "production",
      fingerprint: () => clientFingerprint(client, true), build: () => buildClient(client),
      validate: validateReadyBuild as (value: unknown) => asserts value is LiveBuild,
      background: p => { try { after(() => p); } catch { void p; } },
    });
    caches.set(client, c);
  }
  return c;
}
/** The current shared SQL build for a client (never a weekly file). Callers must not mutate it. */
export const liveBuild = (client: LiveClient) => cacheFor(client).get();
export const inspectLiveReady = (client: LiveClient, generation?: string) => cacheFor(client).inspect(generation);
export const refreshLiveReady = (client: LiveClient, allowPreview = false) => cacheFor(client).refresh({ allowPreview });
export async function invalidateLive(client: LiveClient): Promise<void> {
  await cacheFor(client).invalidate();
}
/** Same build identity/freshness gate as PVAS; local JSON QA bypasses the memo. */
export async function liveBuildIdentity(client: LiveClient, generation?: string): Promise<object | null> {
  if (liveLocalDir(client)) return null;
  try { return generation ? (await inspectLiveReady(client, generation)).built : await liveBuild(client); } catch { return null; }
}
/** Local QA only: {CLIENT}_LOCAL_DIR keeps reading the old JSON files. */
export const liveLocalDir = (client: LiveClient) => process.env[`${client.toUpperCase()}_LOCAL_DIR`];

// ---- Committee tracking in the client's own SQL schema (via Engage, the static-IP writer) ----
export type SqlTracking = { prospects: Record<string, unknown>; activity: unknown[]; removed: unknown[] };
function engageUrl() { return process.env.ENGAGE_PORTAL_URL_OVERRIDE || process.env.ENGAGE_PORTAL_URL; }
async function engageTracking(client: LiveClient, op: "getClientTracking" | "saveClientTracking", extra: Record<string, unknown> = {}) {
  const url = engageUrl(), secret = process.env.PORTAL_WRITE_SECRET;
  if (!url || !secret) throw new Error("Engage is not configured (ENGAGE_PORTAL_URL / PORTAL_WRITE_SECRET)");
  const r = await fetch(url, { method: "POST", cache: "no-store", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
    body: JSON.stringify({ ...extra, op, client }), signal: AbortSignal.timeout(60_000) });
  const body = await r.json().catch(() => ({ error: `engage ${r.status}` })) as Record<string, unknown>;
  return { status: r.status, body };
}
/** null = this client's tracking has not moved to SQL yet (keep using the blob). Errors are never treated as null. */
export async function sqlTracking(client: LiveClient): Promise<SqlTracking | null> {
  if (liveLocalDir(client)) return null;
  const { status, body } = await engageTracking(client, "getClientTracking");
  if (status !== 200) throw new Error(String(body.error || `tracking read failed (${status})`));
  if (body.available === false) return null;
  if (body.available !== true || !body.prospects || typeof body.prospects !== "object" || !Array.isArray(body.activity) || !Array.isArray(body.removed))
    throw new Error("tracking read returned an unexpected shape");
  return { prospects: body.prospects as Record<string, unknown>, activity: body.activity, removed: body.removed };
}
/** Saves the whole tracking document to SQL. Returns false only when the client has not moved to SQL yet. */
export async function saveSqlTracking(client: LiveClient, t: { prospects: unknown; activity: unknown; removed?: unknown }): Promise<boolean> {
  if (liveLocalDir(client)) return false;
  const { status, body } = await engageTracking(client, "saveClientTracking", { tracking: { prospects: t.prospects, activity: t.activity, removed: t.removed ?? [] } });
  if (status === 409 && body.code === "tracking-not-in-sql") return false;
  if (status !== 200 || body.ok !== true) throw new Error(String(body.error || `tracking save failed (${status})`));
  await invalidateCommittedDashboard(client);
  return true;
}

/** Saves tracking, recording beside each newly saved solicitor the SQL value it replaced (so a later SQL change wins). */
export async function saveTrackingWithBases(client: LiveClient, t: { prospects: unknown; activity: unknown; removed?: unknown }): Promise<boolean> {
  if (liveLocalDir(client)) return false;
  const prev = await sqlTracking(client);
  if (!prev) return false;
  const records = (await liveBuild(client)).records.records;
  const prospects = stampTrackingBases(t.prospects as Record<string, Record<string, unknown>>, prev.prospects as Record<string, Record<string, unknown>>, recordBase(client, records));
  return saveSqlTracking(client, { ...t, prospects });
}
