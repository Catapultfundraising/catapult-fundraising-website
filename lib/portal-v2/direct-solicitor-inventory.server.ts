import "server-only";
import type { PortalClient } from "./clients";
import type { StrictTracking } from "./direct-tracking-state";
import { compileDirectSolicitors, type DirectSolicitorInventory } from "./directFileProtocol";
import { strictTrackingFor } from "./direct-tracking-reader.server";

export interface SolicitorInventoryDeps {
  snapshot(client: PortalClient): Promise<unknown>;
  tracking(client: PortalClient): Promise<StrictTracking>;
  sql(client: PortalClient): Promise<unknown>;
}
const defaults: SolicitorInventoryDeps = {
  snapshot: async client => {
    switch (client) {
      case "jag": return (await import("../jag-data-store")).getJagSnapshot();
      case "csnf": return (await import("../csnf-data-store")).getCsnfSnapshot();
      case "pvas": return (await import("../pvas-data-store")).getPvasSnapshot();
      case "wcbhc": return (await import("../wcbhc-data-store")).getWcbhcSnapshot();
      case "baq": return (await import("../baq-data-store")).getBaqSnapshot();
    }
  },
  tracking: strictTrackingFor,
  sql: async client => {
    const r = await (await import("./server")).engageCall(client, "state");
    if (r.status !== 200) throw new Error("manual-state-unavailable");
    return r.body;
  },
};
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const id = (x: unknown) => Number.isInteger(x) && Number(x) > 0 && Number(x) <= 2147483647;
/** Complete observations of the existing website owners, never effective/direct-composed data.
 * Unavailable is NOT known-empty. No stored aliases, browser names or new native SQL queries.
 */
export async function observeSolicitorInventory(client: PortalClient, deps: SolicitorInventoryDeps = defaults): Promise<DirectSolicitorInventory | null> {
  try {
    const [snapshot, tracking, sql] = await Promise.all([deps.snapshot(client), deps.tracking(client), deps.sql(client)]);
    if (!object(snapshot) || typeof snapshot.client !== "string" || !snapshot.client.trim() || !Array.isArray(snapshot.pool) ||
        tracking.kind === "unavailable" || !object(sql) || sql.configured === false || sql.error ||
        !Array.isArray(sql.updates) || !Array.isArray(sql.prospects) || sql.updates.length > 10000 || sql.prospects.length > 10000 ||
        !sql.prospects.every(p => object(p) && id(p.cptid))) return null;
    const required = ["pool", "highWealth", "midLevel", "legacy", "lapsed", "top",
      ...(["pvas", "wcbhc", "baq"].includes(client) ? ["portfolio", "committed"] : [])];
    if (!required.every(key => Array.isArray(snapshot[key]))) return null;
    const names = new Set<string>();
    const add = (value: unknown) => {
      if (value === undefined || value === null || value === "") return;
      if (typeof value !== "string" || value.length > 300 || Array.from(value).some(c => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159))) throw new Error("invalid-solicitor-inventory");
      const name = value.trim().replace(/\s+/g, " ");
      if (name) names.add(name);
      if (names.size > 1000) throw new Error("solicitor-inventory-too-large");
    };
    // These are the native snapshot's assignment-bearing donor collections.
    // Committed entries may supply labels only; no financial rows are ever altered.
    for (const key of ["pool", "portfolio", "committed", "highWealth", "midLevel", "legacy", "lapsed", "top"]) {
      const rows = snapshot[key];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) return null;
      for (const row of rows) {
        if (!object(row)) return null;
        add(row.solicitor); add(row.solicitor2);
      }
    }
    for (const row of Object.values(tracking.document.prospects)) { add(row.solicitor); add(row.solicitor2); }
    const latest = new Map<string, Record<string, unknown>>(), updateIds = new Set<number>();
    for (const row of sql.updates) {
      if (!object(row) || !id(row.cptid) || !Number.isSafeInteger(row.id) || typeof row.field !== "string" ||
          !(row.new_value === null || typeof row.new_value === "string") || updateIds.has(Number(row.id))) return null;
      updateIds.add(Number(row.id));
      if (row.voided) continue;
      if (row.field !== "solicitor" && row.field !== "solicitor2") continue;
      const key = `${row.cptid}:${row.field}`, prior = latest.get(key);
      if (!prior || Number(row.id) > Number(prior.id)) latest.set(key, row);
    }
    for (const row of latest.values()) add(row.new_value);
    const inventory = [...names].sort(), compiled = compileDirectSolicitors(inventory);
    return { revision: compiled.revision!, names: inventory };
  } catch { return null; }
}
