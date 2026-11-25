import type ExcelJS from "exceljs";

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

/** Run after populating the existing branded workbook, before writeBuffer.
 * Full oversized values live ONLY in ordered continuation parts; the source
 * cell points to them, avoiding ambiguous preview-prefix reconstruction.
 * Works for main data, report notes, headers and JAG extra sheets alike. */
export function preserveWorkbookText(wb: ExcelJS.Workbook): void {
  const sources = wb.worksheets.slice();
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
}
