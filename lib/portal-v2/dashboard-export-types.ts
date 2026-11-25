import { campaignLedgerTable } from "./campaign-ledger";
import type { PortalClient } from "./clients";
import { pvasExportTable } from "./pvas-export-model";
import { jagExportTable } from "./jag-export-model";
import { csnfExportTable } from "./csnf-export-model";
import { wcbhcExportTable } from "./wcbhc-export-model";
import { baqExportTable } from "./baq-export-model";
import { imasExportTable } from "./imas-export-model";

export type ExportCell = string | number | null;
export type TableRow = Record<string, unknown>;
export type TableColumn = { key: string; label: string; right?: boolean; fmt?: (value: never, row: never) => string };
export type TableParameters = { goal?: number; level?: number; pool?: number; assignment?: string };
export type TableSource = { table: string; snapshot: unknown; parameters?: TableParameters };
export type TableContext = Omit<TableSource, "table"> & { index: unknown[]; tracking: unknown };
export type TableModel = { title: string; subtitle?: string; rows: TableRow[]; cols: TableColumn[] };
export type ExportIntent =
  | { kind: "portfolio"; solicitor: string; summary?: boolean }
  | { kind: "table"; table: string; parameters?: TableParameters; search?: string; sort?: { key: string; dir: 1 | -1 } | null }
  | { kind: "index"; ids: number[] }
  | { kind: "record"; id: number }
  | { kind: "report"; query: unknown };
export type CurrentExportPayload = {
  title: string; subtitle?: string; cols: { label: string; kind?: "text" | "usd" | "num" | "pct" }[];
  sections: { heading?: string; rows: ExportCell[][] }[]; notes?: string[]; intent?: ExportIntent;
};
export function buildDashboardExportModel(client: PortalClient, context: TableSource & { index: unknown[]; tracking: unknown }): TableModel {
  // Old open tabs may still send Givebutter selectors; only PVAS owns a provider-only view.
  if (client !== "pvas" && /^Givebutter\.[012]$/.test(context.table))
    return campaignLedgerTable(context.table.replace("Givebutter.", "Campaign."), context.snapshot);
  if (context.table.startsWith("Campaign.")) return campaignLedgerTable(context.table, context.snapshot);
  return ({ pvas: pvasExportTable, jag: jagExportTable, csnf: csnfExportTable, wcbhc: wcbhcExportTable, baq: baqExportTable, imas: imasExportTable })[client](context.table, context);
}
/** Exact existing cmpValues semantics, without importing a React/client component into server IO. */
export function compareExportValues(a: unknown, b: unknown): number {
  const na = typeof a === "number" ? a : null, nb = typeof b === "number" ? b : null;
  if (na !== null && nb !== null) return na - nb;
  const ea = a === null || a === undefined || a === "", eb = b === null || b === undefined || b === "";
  if (ea || eb) return ea && eb ? 0 : ea ? 1 : -1;
  const sa = String(a), sb = String(b);
  const da = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sa) ? sa.replace(/^(\d+)\/(\d+)\/(\d{4})$/, (_, m, d, y) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`) : sa;
  const db = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(sb) ? sb.replace(/^(\d+)\/(\d+)\/(\d{4})$/, (_, m, d, y) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`) : sb;
  const money = (x: string) => (/^-?\$?[\d,]+(\.\d+)?$/.test(x) ? Number(x.replace(/[$,]/g, "")) : null);
  const ma = money(da), mb = money(db);
  if (ma !== null && mb !== null) return ma - mb;
  return da.localeCompare(db, undefined, { numeric: true, sensitivity: "base" });
}
function kindOf(c: TableColumn, row?: TableRow): "text" | "usd" | "num" {
  if (!row || typeof row[c.key] !== "number") return "text";
  if (!c.fmt) return c.right ? "num" : "text";
  return c.fmt(row[c.key] as never, row as never).startsWith("$") ? "usd" : "text";
}
export function tableExportPayload(model: TableModel, intent: Extract<ExportIntent, { kind: "table" }>): CurrentExportPayload {
  if (intent.sort && !model.cols.some(c => c.key === intent.sort!.key)) throw new Error("Unknown table sort field");
  let rows = intent.search ? model.rows.filter(r => JSON.stringify(r).toLowerCase().includes(intent.search!.toLowerCase())) : model.rows;
  if (intent.sort) rows = [...rows].sort((a, b) => compareExportValues(a[intent.sort!.key], b[intent.sort!.key]) * intent.sort!.dir);
  return {
    title: model.title, subtitle: [model.subtitle, intent.search ? `Filtered: "${intent.search}"` : ""].filter(Boolean).join(" · ") || undefined,
    cols: model.cols.map(c => ({ label: c.label, kind: kindOf(c, rows[0]) })),
    sections: [{ rows: rows.map(r => model.cols.map(c => {
      const value = r[c.key], kind = kindOf(c, r);
      if (kind === "usd" || kind === "num") return typeof value === "number" ? value : String(value ?? "");
      return c.fmt ? c.fmt(value as never, r as never) : String(value ?? "");
    })) }],
  };
}
