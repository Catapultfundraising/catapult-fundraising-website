import ExcelJS from "exceljs";
import { LOGO_URL, LOGO_ASPECT } from "@/lib/jag-brand-pdf";
import { FIRM_EMAIL, FIRM_PHONE } from "@/lib/constants";

export type ColKind = "text" | "usd" | "num" | "pct";
export interface ExportCol { label: string; kind?: ColKind }
export interface ExportSection { heading?: string; rows: (string | number | null)[][] }

const NAVY = "FF15212E", BRASS = "FFB28C46", CREAM = "FFF1ECE0", WHITE = "FFFFFFFF";
const FMT: Record<ColKind, string | undefined> = { text: undefined, usd: '"$"#,##0', num: "#,##0", pct: '0.0"%"' };

let logoCache: Buffer | null = null;
async function logo(): Promise<Buffer | null> {
  if (logoCache) return logoCache;
  try { logoCache = Buffer.from(await (await fetch(LOGO_URL)).arrayBuffer()); } catch { return null; }
  return logoCache;
}

// Branded workbook: logo, navy title bar, gold rule, navy header row,
// cream banding, money formats, frozen header, tagline footer.
export async function buildBrandedXlsx(opts: {
  title: string; subtitle: string; client: string; cols: ExportCol[]; sections: ExportSection[]; notes?: string[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Catapult Fundraising";
  const ws = wb.addWorksheet(opts.title.slice(0, 31).replace(/[\\/?*[\]:]/g, " "), { views: [{ state: "frozen", ySplit: 5, showGridLines: false }] });
  const n = Math.max(opts.cols.length, 4);
  const img = await logo();
  ws.getRow(1).height = 40;
  if (img) {
    const id = wb.addImage({ buffer: img as unknown as ExcelJS.Buffer, extension: "png" });
    ws.addImage(id, { tl: { col: 0, row: 0.15 }, ext: { width: 30 * LOGO_ASPECT * 1.3, height: 30 * 1.3 } });
  }
  const put = (r: number, text: string, font: Partial<ExcelJS.Font>, fill?: string, height?: number) => {
    ws.mergeCells(r, 1, r, n);
    const c = ws.getCell(r, 1);
    c.value = text; c.font = { name: "Calibri", ...font };
    c.alignment = { vertical: "middle", wrapText: true };
    if (fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    if (height) ws.getRow(r).height = height;
  };
  put(2, opts.title, { size: 16, bold: true, color: { argb: WHITE } }, NAVY, 28);
  put(3, opts.subtitle, { size: 10, italic: true, color: { argb: NAVY } }, CREAM, 18);
  ws.getRow(4).height = 4;
  for (let i = 1; i <= n; i++) ws.getCell(4, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRASS } };
  const head = ws.getRow(5);
  opts.cols.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: c.kind && c.kind !== "text" ? "right" : "left", wrapText: true };
  });
  head.height = 22;
  let r = 6, band = 0;
  for (const s of opts.sections) {
    if (s.heading) {
      ws.mergeCells(r, 1, r, n);
      const c = ws.getCell(r, 1);
      c.value = s.heading; c.font = { bold: true, size: 11, color: { argb: NAVY } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRASS } };
      ws.getRow(r).height = 20; r++; band = 0;
    }
    for (const row of s.rows) {
      opts.cols.forEach((col, i) => {
        const cell = ws.getCell(r, i + 1);
        cell.value = row[i] ?? "";
        const f = FMT[col.kind ?? "text"];
        if (f && typeof row[i] === "number") cell.numFmt = f;
        if (band % 2) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFD6CDBA" } } };
        cell.font = { size: 10, color: { argb: NAVY } };
      });
      r++; band++;
    }
  }
  r++;
  for (const note of opts.notes ?? []) { put(r, note, { size: 9, italic: true, color: { argb: "FF5A6675" } }); r++; }
  put(r + 1, `Growing your donor base at every stage of the giving journey  ·  catapultfr.com · ${FIRM_PHONE} · ${FIRM_EMAIL}`, { size: 9, bold: true, color: { argb: BRASS } }, NAVY, 20);
  opts.cols.forEach((c, i) => {
    let w = c.label.length;
    for (const s of opts.sections) for (const row of s.rows.slice(0, 400)) w = Math.max(w, String(row[i] ?? "").length + (c.kind === "usd" ? 4 : 0));
    ws.getColumn(i + 1).width = Math.min(48, Math.max(10, w + 2));
  });
  ws.pageSetup = { orientation: opts.cols.length > 6 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "5:5" };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
