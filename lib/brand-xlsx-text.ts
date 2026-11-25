import type ExcelJS from "exceljs";
import { PROSPECT_NOTES_LABEL } from "@/lib/portal-v2/report-fields";

/** XML 1.0 permits tabs/newlines and paired supplementary Unicode characters.
 * Sanitizing XML is deliberately separate from Excel's cell-length limit. */
export function sanitizeXlsxText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

const CELL_LIMIT = 32767;
const SHEET_ROW_LIMIT = 1048576;
/** Count UTF-16 units conservatively (accepted by Excel), never cut a pair. */
export function splitXlsxText(value: string): string[] {
  const parts: string[] = [];
  for (let start = 0; start < value.length;) {
    let end = Math.min(start + CELL_LIMIT, value.length);
    if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1])) end--;
    parts.push(value.slice(start, end));
    start = end;
  }
  return parts;
}


const NOTE_WIDTH = 64;
const DETAIL_WIDTH = 90;
const LINE_HEIGHT = 15;
// Leave headroom below Excel's409pt ceiling for font substitution and padding.
const INLINE_LINES = 24;
const DETAIL_LINES = 12;

/** Conservative display capacity at the workbook's existing10pt body size.
 * Count CRLF as one line and supplementary/wide glyphs as two units. Only the
 * layout is estimated: source strings (including CRLF) are never rewritten. */
function noteLines(text: string, width: number): number {
  const capacity = Math.max(1, Math.floor((width - 4) / 2));
  return text.split(/\r\n|\r|\n/).reduce((lines, line) => lines + Math.max(1,
    Math.ceil(Array.from(line).reduce((n, c) => n + (c.codePointAt(0)! > 255 ? 2 : 1), 0) / capacity)), 0);
}

function readableNoteParts(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  // Match CRLF and Unicode codepoints atomically; joining parts is byte-exact.
  for (const token of text.match(/\r\n|[\s\S]/gu) ?? []) {
    if (current && noteLines(current + token, DETAIL_WIDTH) > DETAIL_LINES) {
      parts.push(current); current = "";
    }
    current += token;
  }
  if (current) parts.push(current);
  return parts;
}

/** Applied through the existing all-six text owner, after normal cell-limit
 * preservation. The raw source is captured beforehand, so >32767-unit notes
 * retain their original Text continuation AND get a readable detail view. */
function captureProspectNotes(sources: ExcelJS.Worksheet[]) {
  const notes: { ws: ExcelJS.Worksheet; cell: ExcelJS.Cell; text: string; identity: string[] }[] = [];
  sources.forEach((ws, sheetIndex) => {
    const headerRow = sheetIndex === 0 ? 5 : 1;
    const headers = ws.getRow(headerRow).values as ExcelJS.CellValue[];
    const noteColumns = headers.flatMap((v, i) => typeof v === "string" &&
      (v === PROSPECT_NOTES_LABEL || /^(?:Prospect )?Notes$/i.test(v)) ? [i] : []);
    const id = headers.findIndex(v => typeof v === "string" && /^CPTID$/i.test(v));
    const name = headers.findIndex(v => typeof v === "string" && /^(?:(?:prospect|donor|full|display) )?name$/i.test(v));
    noteColumns.forEach(column => { ws.getColumn(column).width = NOTE_WIDTH; });
    ws.eachRow((row, rn) => {
      if (rn <= headerRow) return;
      for (const column of noteColumns) {
        const cell = row.getCell(column);
        if (cell.isMerged || typeof cell.value !== "string") continue;
        notes.push({ ws, cell, text: sanitizeXlsxText(cell.value), identity: [id, name].map(c => c > 0 ? row.getCell(c).text : "") });
      }
      // Individual record downloads place canonical notes in a labelled row.
      if (!noteColumns.length && row.getCell(1).value === "Notes" && typeof row.getCell(2).value === "string" && !row.getCell(2).isMerged) {
        ws.getColumn(2).width = NOTE_WIDTH;
        notes.push({ ws, cell: row.getCell(2), text: sanitizeXlsxText(row.getCell(2).value as string), identity: ["", ""] });
      }
    });
  });
  return notes;
}

function formatProspectNotes(wb: ExcelJS.Workbook, notes: ReturnType<typeof captureProspectNotes>): void {
  let detail: ExcelJS.Worksheet | undefined;
  const addDetail = () => {
    let name = "Prospect notes", ordinal = 1;
    while (wb.worksheets.some(s => s.name.toLowerCase() === name.toLowerCase())) name = `Prospect notes ${++ordinal}`;
    const sh = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
    const header = sh.addRow(["Report sheet", "Report cell", "CPTID", "Name", "Part", "Parts", PROSPECT_NOTES_LABEL]);
    header.height = 30;
    header.eachCell(cell => {
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15212E" } };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    [24, 12, 16, 28, 7, 7, DETAIL_WIDTH].forEach((width, i) => { sh.getColumn(i + 1).width = width; });
    sh.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:1" };
    return sh;
  };
  for (const { ws, cell, text, identity } of notes) {
    cell.alignment = { ...cell.alignment, vertical: "top", wrapText: true };
    let display = text;
    if (noteLines(text, NOTE_WIDTH) > INLINE_LINES) {
      const parts = readableNoteParts(text);
      const locations: string[] = [];
      const context = [ws.name, cell.address, ...identity].map(sanitizeXlsxText);
      if (context.some(v => v.length > CELL_LIMIT)) throw new Error("Prospect notes identity exceeds the Excel cell limit.");
      parts.forEach((part, i) => {
        if (!detail || detail.rowCount >= SHEET_ROW_LIMIT) detail = addDetail();
        const row = detail.addRow([...context, i + 1, parts.length, part]);
        if (!locations.includes(detail.name)) locations.push(detail.name);
        row.height = Math.max(30, noteLines(part, DETAIL_WIDTH) * LINE_HEIGHT + 8);
        row.eachCell(c => {
          c.font = { size: 10, color: { argb: "FF15212E" } };
          c.alignment = { vertical: "top", wrapText: true };
          if (row.number % 2) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1ECE0" } };
        });
      });
      display = `[Readable notes: ${locations.join(", ")}; report ${ws.name}!${cell.address}; ${parts.length} ordered parts]`;
      // Do not lose the existing lossless cell-limit pointer.
      if (text.length > CELL_LIMIT) display += `\n${cell.value}`;
      cell.value = display;
    }
    ws.getRow(Number(cell.row)).height = Math.max(ws.getRow(Number(cell.row)).height ?? 0, 24, noteLines(display, NOTE_WIDTH) * LINE_HEIGHT + 8);
  }
}

/** Run after populating the existing branded workbook, before writeBuffer.
 * Full oversized values live ONLY in ordered continuation parts; the source
 * cell points to them, avoiding ambiguous preview-prefix reconstruction.
 * Works for main data, report notes, headers and JAG extra sheets alike. */
export function preserveWorkbookText(wb: ExcelJS.Workbook): void {
  const sources = wb.worksheets.slice();
  const prospectNotes = captureProspectNotes(sources);
  let continuation: ExcelJS.Worksheet | undefined;
  let sheetOrdinal = 0;
  const addContinuation = () => {
    let name: string;
    do {
      sheetOrdinal++;
      name = sheetOrdinal === 1 ? "Text continuation" : `Text continuation ${sheetOrdinal}`;
    }
    while (wb.worksheets.some(s => s.name.toLowerCase() === name.toLowerCase()));
    const sh = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
    const header = sh.addRow(["Source sheet", "Source cell", "CPTID", "Name", "Column", "Part", "Parts", "Text"]);
    header.height = 22;
    header.eachCell(cell => {
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15212E" } };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
    [28, 14, 18, 30, 26, 10, 10, 80].forEach((width, i) => { sh.getColumn(i + 1).width = width; });
    sh.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:1" };
    return sh;
  };
  sources.forEach((ws, sheetIndex) => {
    const headers = ws.getRow(sheetIndex === 0 ? 5 : 1).values as ExcelJS.CellValue[];
    const cptidColumn = headers.findIndex(v => typeof v === "string" && /^\s*CPTID\s*$/i.test(v));
    const nameColumn = headers.findIndex(v => typeof v === "string" && /^\s*(?:(?:prospect|donor|full|display)\s+)?name\s*$/i.test(v));
    ws.eachRow(row => {
      // Capture identity before replacing any oversized cell in this row.
      const identity = [cptidColumn, nameColumn].map(column => column > 0 && !row.getCell(column).isMerged ? row.getCell(column).text : "");
      row.eachCell(cell => {
        if (cell.isMerged && cell.master !== cell) return;
        if (typeof cell.value !== "string") return;
        const text = sanitizeXlsxText(cell.value);
        if (text.length <= CELL_LIMIT) { cell.value = text; return; }
        const context = [ws.name, cell.address, ...identity, String(headers[Number(cell.col)] ?? cell.address)].map(sanitizeXlsxText);
        if (context.some(v => v.length > CELL_LIMIT)) {
          throw new Error("Excel continuation context exceeds the cell limit; use shorter column labels and identity fields.");
        }
        const parts = splitXlsxText(text);
        const locations: string[] = [];
        parts.forEach((part, i) => {
          if (!continuation || continuation.rowCount >= SHEET_ROW_LIMIT) {
            continuation = addContinuation();
            locations.push(continuation.name);
          } else if (!locations.length) locations.push(continuation.name);
          const r = continuation.addRow([...context, i + 1, parts.length, part]);
          r.eachCell(c => {
            c.font = { size: 10, color: { argb: "FF15212E" } };
            c.alignment = { vertical: "top", wrapText: true };
            if (r.number % 2) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1ECE0" } };
          });
        });
        cell.value = `[Full text: ${locations.join(", ")}; source ${ws.name}!${cell.address}; ${parts.length} ordered parts]`;
        cell.alignment = { ...cell.alignment, vertical: "top", wrapText: true };
      });
    });
  });
  formatProspectNotes(wb, prospectNotes);
}
