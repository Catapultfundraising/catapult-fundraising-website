import "server-only";
import { pvasCanonicalEnabled } from "./pvas-canonical";
import type { PortalClient } from "./clients";
import { portalCampaignStateSafe } from "./server";
import { currentTracking, directTrackingView, directData, requireCurrentSql } from "./direct-source-state.server";
import { currentRecordProjection } from "./records-route";
import { currentDashboardSnapshot } from "./current-dashboard-snapshot";
import { buildDashboardExportModel, tableExportPayload, type CurrentExportPayload, type ExportIntent } from "./dashboard-export-types";
import { buildReportRows } from "./report-route";
import { sanitizeQuery, queryErrors, FIELD_BY_ID, reportNotes, runReport, PDF_MAX_ROWS } from "./report-fields";
import type { UpdateRow } from "./record-overlay";
import type { AssignmentTracking } from "./effective-assignment";

export class ExportIntentError extends Error { status = 400; }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const ownKeys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
const id = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 2147483647;
function intentError(): never { throw new ExportIntentError("This export needs a current dashboard selection. Reload the dashboard and download again."); }
export function validateExportIntent(v: unknown): ExportIntent {
  if (!object(v)) return intentError();
  switch (v.kind) {
    case "record":
      if (!ownKeys(v, ["kind", "id"]) || !id(v.id)) return intentError();
      return v as ExportIntent;
    case "index":
      if (!ownKeys(v, ["kind", "ids"]) || !Array.isArray(v.ids) || v.ids.length > 50000 || !v.ids.every(id) || new Set(v.ids).size !== v.ids.length) return intentError();
      return v as ExportIntent;
    case "report":
      if (!ownKeys(v, ["kind", "query"]) || !object(v.query) || !Array.isArray(v.query.fields) || !v.query.fields.length || !v.query.fields.every(f => typeof f === "string" && FIELD_BY_ID.has(f))) return intentError();
      if (queryErrors(sanitizeQuery(v.query)).length) return intentError();
      return v as ExportIntent;
    case "table": {
      if (!ownKeys(v, ["kind", "table", "parameters", "search", "sort"]) || typeof v.table !== "string" || !/^[A-Za-z]+\.\d$/.test(v.table) ||
          (v.search !== undefined && (typeof v.search !== "string" || v.search.length > 1000))) return intentError();
      if (v.parameters !== undefined) {
        const p = v.parameters;
        if (!object(p) || !ownKeys(p, ["goal", "level", "pool", "assignment"]) ||
            (p.goal !== undefined && (typeof p.goal !== "number" || !Number.isFinite(p.goal) || p.goal < 100000 || p.goal > 500000000)) ||
            (p.level !== undefined && (typeof p.level !== "number" || !Number.isFinite(p.level) || p.level <= 0 || p.level > 500000000)) ||
            (p.pool !== undefined && (!Number.isInteger(p.pool) || Number(p.pool) < 0 || Number(p.pool) > 3)) ||
            (p.assignment !== undefined && !["all", "assigned", "unassigned", "review"].includes(String(p.assignment)))) return intentError();
      }
      if (v.table.startsWith("GiftChartTab.") && (!object(v.parameters) || v.parameters.goal === undefined || (v.table === "GiftChartTab.1" && v.parameters.level === undefined))) return intentError();
      if (v.sort !== undefined && v.sort !== null && (!object(v.sort) || !ownKeys(v.sort, ["key", "dir"]) || typeof v.sort.key !== "string" || v.sort.key.length > 100 || ![1, -1].includes(Number(v.sort.dir)) || typeof v.sort.dir !== "number")) return intentError();
      return v as ExportIntent;
    }
    default: return intentError();
  }
}
/** Existing per-client IO owners; no internal HTTP/auth bypass or new credentials. */
async function owners(client: PortalClient) {
  switch (client) {
    case "pvas": { const [s,t,m] = await Promise.all([import("../pvas-data-store"),import("../pvas-tracking"),import("./pvas-export-model")]); return { records:s.getPvasRecords,snapshot:s.getPvasSnapshot,tracking:t.getPvasTracking,index:m.indexPayload,record:m.recordPayload }; }
    case "jag": { const [s,t,m] = await Promise.all([import("../jag-data-store"),import("../jag-tracking"),import("./jag-export-model")]); return { records:s.getJagRecords,snapshot:s.getJagSnapshot,tracking:t.getJagTracking,index:m.indexPayload,record:m.recordPayload }; }
    case "csnf": { const [s,t,m] = await Promise.all([import("../csnf-data-store"),import("../csnf-tracking"),import("./csnf-export-model")]); return { records:s.getCsnfRecords,snapshot:s.getCsnfSnapshot,tracking:t.getCsnfTracking,index:m.indexPayload,record:m.recordPayload }; }
    case "wcbhc": { const [s,t,m] = await Promise.all([import("../wcbhc-data-store"),import("../wcbhc-tracking"),import("./wcbhc-export-model")]); return { records:s.getWcbhcRecords,snapshot:s.getWcbhcSnapshot,tracking:t.getWcbhcTracking,index:m.indexPayload,record:m.recordPayload }; }
    case "baq": { const [s,t,m] = await Promise.all([import("../baq-data-store"),import("../baq-tracking"),import("./baq-export-model")]); return { records:s.getBaqRecords,snapshot:s.getBaqSnapshot,tracking:t.getBaqTracking,index:m.indexPayload,record:m.recordPayload }; }
    case "imas": { const [s,t,m] = await Promise.all([import("../imas-data-store"),import("../imas-tracking"),import("./imas-export-model")]); return { records:s.getImasRecords,snapshot:s.getImasSnapshot,tracking:t.getImasTracking,index:m.indexPayload,record:m.recordPayload }; }
  }
}
export async function reconstructDashboardExport(client: PortalClient, rawIntent: unknown, presentation: { title?: unknown; subtitle?: unknown }): Promise<CurrentExportPayload> {
  const intent = validateExportIntent(rawIntent), io = await owners(client);
  const [data, state, tracking] = await Promise.all([io.records(), portalCampaignStateSafe(client), currentTracking<AssignmentTracking>(client, io.tracking as () => Promise<AssignmentTracking>).then(t => directTrackingView(client, t))]);
  requireCurrentSql(client, state);
  if (!data || !state || !tracking) throw new Error("Current complete records/manual/source view unavailable");
  const revision = (data as unknown as {directSourceRevision?:string}).directSourceRevision;
  if (!pvasCanonicalEnabled(client) && (!revision || revision !== (tracking as unknown as {directSourceRevision?:string}).directSourceRevision)) throw new Error("Source changed while preparing export; reload and retry");
  const projection = currentRecordProjection(client, data, state, tracking);
  const title = typeof presentation.title === "string" ? presentation.title.slice(0, 120) : "Current dashboard report";
  const subtitle = typeof presentation.subtitle === "string" ? presentation.subtitle.slice(0, 500) : "";
  if (intent.kind === "record") {
    const record = projection.record(intent.id);
    if (!record || record.cptid !== intent.id || !projection.index.some(r=>r.cptid===intent.id)) throw new ExportIntentError("This record was merged, deleted or changed. Reload it before downloading.");
    // Same client-specific six-column record model; only current server-owned record/tracking passed.
    return io.record(record as never, tracking as never, true);
  }
  if (intent.kind === "index") {
    const rows = new Map(projection.index.map(r => [r.cptid, r]));
    if (intent.ids.some(c => !rows.has(c))) throw new ExportIntentError("This selected list contains a merged/deleted record. Reload the list before downloading.");
    return io.index(title, subtitle, intent.ids.map(c => rows.get(c)!) as never);
  }
  if (intent.kind === "report") {
    const query = sanitizeQuery(intent.query), rows = runReport(buildReportRows(data, state, tracking), query);
    if (rows.length > PDF_MAX_ROWS) throw new ExportIntentError(`PDF is limited to ${PDF_MAX_ROWS.toLocaleString()} rows. Add a filter or download Excel.`);
    const fields = query.fields.map(f => FIELD_BY_ID.get(f)!);
    return { title, subtitle: `${rows.length.toLocaleString()} records${data.asOf ? ` · Data as of ${data.asOf}` : ""}`,
      cols: fields.map(c => ({label:c.label,kind:c.kind==="usd"?"usd":c.kind==="num"&&c.id!=="cptid"?"num":"text"})),
      sections:[{rows:rows.map(r=>fields.map(c=>c.id==="cptid"?String(r.cptid??""):r[c.id]??""))}],notes:reportNotes(query,true) };
  }
  const raw = await io.snapshot();
  if (!raw) throw new Error("Current snapshot unavailable");
  const source = await directData(client, raw, "snapshot");
  if ((source as unknown as {directSourceRevision?:string}).directSourceRevision !== revision) throw new Error("Source changed during export; reload and retry");
  const snapshot = currentDashboardSnapshot(client, { ...source, campaignGifts: state.gifts }, projection.index, tracking, state.updates as UpdateRow[]);
  try {
    const model = buildDashboardExportModel(client, {table:intent.table,parameters:intent.parameters,snapshot,index:projection.index,tracking});
    return tableExportPayload(model, intent);
  } catch (e) {
    if (/Unknown dashboard table selector|Unknown table sort field|Selected GC2P level/.test((e as Error).message)) throw new ExportIntentError((e as Error).message + ". Reload the report and try again.");
    throw e;
  }
}
