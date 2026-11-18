/** Server-only adapter. Never imported from a client component. No default-on integration. */
import "server-only";
import { pvasCanonicalEnabled } from "./pvas-canonical";
import { get } from "@vercel/blob";
import { LIVE_CLIENTS, liveBuild, sqlTracking, type LiveClient } from "../client-live-data.server";
import { applyTrackingBases, recordBase } from "./sql-newer";
import { open } from "node:fs/promises";
import { readStrictTracking, projectTrackingManual, type DirectClient, type RawRead, type StrictTracking, type TrackingDocument } from "./direct-tracking-state";

const LIMIT = 4 * 1024 * 1024;
export async function strictTrackingFor(client: DirectClient) {
  if (pvasCanonicalEnabled(client)) {
    // Canonical SQL tracking also owns direct-file conflict checks; never read
    // the retired PVAS tracking blob, even if an import callback asks directly.
    try {
      const { getPvasTracking } = await import("../pvas-tracking");
      const state = await getPvasTracking();
      return { kind: "present", revision: state.revision!, document: state as unknown as TrackingDocument } as StrictTracking;
    } catch { return { kind: "unavailable", reason: "read-failed" } as StrictTracking; }
  }
  if ((LIVE_CLIENTS as readonly string[]).includes(client)) {
    // After the client's switch its tracking lives in its own SQL schema; same strict validation and revision.
    let fromSql;
    try { fromSql = await sqlTracking(client as LiveClient); } catch { return { kind: "unavailable", reason: "read-failed" } as StrictTracking; }
    if (fromSql) {
      // Same newest-change-wins view as the tracking store (a solicitor changed in SQL after the edit wins).
      let prospects;
      try { prospects = applyTrackingBases(fromSql.prospects as Record<string, Record<string, unknown>>, recordBase(client, (await liveBuild(client as LiveClient)).records.records)); }
      catch { return { kind: "unavailable", reason: "read-failed" } as StrictTracking; }
      const bytes = new TextEncoder().encode(JSON.stringify({ prospects, activity: fromSql.activity, removed: fromSql.removed }));
      return readStrictTracking(client, async () => ({ kind: "bytes", bytes }));
    }
  }
  return readStrictTracking(client, async (path): Promise<RawRead> => {
    const dir = process.env[`${client.toUpperCase()}_LOCAL_DIR`];
    if (dir) {
      // Existing local-fixture owner. No request-supplied path; no writes.
      let file;
      try { file = await open(`${dir}/tracking.json`, "r"); }
      catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return { kind: "absent" }; throw e; }
      try {
        if ((await file.stat()).size > LIMIT) throw new Error("tracking too large");
        // Bounded even if a concurrent fixture writer grows the file after stat.
        const bytes = new Uint8Array(LIMIT + 1);
        let length = 0;
        while (length < bytes.length) {
          const r = await file.read(bytes, length, bytes.length - length, null);
          if (!r.bytesRead) break;
          length += r.bytesRead;
        }
        if (length > LIMIT) throw new Error("tracking too large");
        return { kind: "bytes", bytes: bytes.slice(0, length) };
      } finally { await file.close(); }
    }
    const result = await get(path, { access: "private", useCache: false, abortSignal: AbortSignal.timeout(5000) });
    // SDK null means explicit not-found. Exceptions/no stream are UNKNOWN, never absent.
    if (result === null) return { kind: "absent" };
    if (!result.stream || result.statusCode !== 200) throw new Error("tracking unavailable");
    const reader = result.stream.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.length; if (size > LIMIT) throw new Error("tracking too large");
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return { kind: "bytes", bytes };
  });
}

/** Internal-only callback candidate. No HTTP route, no browser-provided manual flags.
 * Re-reads on every observation, never waits on SQL or calls effective/directState.
 * This does NOT assert SQL manual absence: backend same-transaction guards remain mandatory.
 */
export async function strictTrackingManualFor(client: DirectClient, cptids: number[]) {
  return projectTrackingManual(await strictTrackingFor(client), cptids);
}
