// Bounded file inspection for the source-import simulation adapter. No formulas are evaluated.
// Original bytes remain the identity; sheet/header settings are a separate part of preview/profile binding.
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import * as XLSX from "xlsx";
import { parseCsv } from "./csv-parse";
import { originalWorkbookSheets, originalWorksheetCells, validateOriginalXmlParts, OoxmlValueError } from "./source-ooxml-values";
export type ParseSettings = { format: "csv" } | { format: "xlsx"; sheet: string; headerRow: number; clientIdFormat?: "text" | "integer" };
export class FilePreviewError extends Error {}
function fail(message: string): never { throw new FilePreviewError(message); }
function ooxml<T>(read: () => T): T { try { return read(); } catch (error) { if (error instanceof OoxmlValueError) return fail(error.message); throw error; } }
export function originalBytes(encoded: string) {
  if (typeof encoded !== "string" || encoded.length > 2_800_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) fail("Choose a file of at most 2 MB");
  const raw = Buffer.from(encoded, "base64");
  if (!raw.length || raw.length > 2 * 1024 * 1024) fail("Choose a file of at most 2 MB");
  return raw;
}
// Validate the ZIP directory AND actual bounded decompression before handing untrusted bytes to SheetJS.
// Reject ZIP64/encryption/multidisk, duplicate paths, overlapping entries, macros and external links.
function boundedXlsx(raw: Buffer) {
  const entries = new Map<string, Buffer>();
  // No EOCD comments/trailing bytes: SheetJS searches backward for the last signature, so both parsers
  // must agree on exactly one final, fixed-position directory terminator.
  const end = raw.length - 22;
  if (end < 0 || raw.readUInt32LE(end) !== 0x06054b50 || raw.readUInt16LE(end + 20) || raw.readUInt16LE(end + 4) || raw.readUInt16LE(end + 6)) fail("Unsupported XLSX ZIP container (comments/descriptors/ZIP64 are not supported)");
  const count = raw.readUInt16LE(end + 10), size = raw.readUInt32LE(end + 12), start = raw.readUInt32LE(end + 16);
  if (!count || count > 300 || count !== raw.readUInt16LE(end + 8) || start + size !== end) fail("Unsupported XLSX ZIP directory");
  let p = start, total = 0;
  const names = new Set<string>(), ranges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || raw.readUInt32LE(p) !== 0x02014b50) fail("Malformed XLSX ZIP entry");
    const flags = raw.readUInt16LE(p + 8), method = raw.readUInt16LE(p + 10), compressed = raw.readUInt32LE(p + 20), expanded = raw.readUInt32LE(p + 24), n = raw.readUInt16LE(p + 28), extra = raw.readUInt16LE(p + 30), comment = raw.readUInt16LE(p + 32), local = raw.readUInt32LE(p + 42);
    if (p + 46 + n + extra + comment > end || local + 30 > start || raw.readUInt32LE(local) !== 0x04034b50) fail("Malformed XLSX ZIP bounds");
    const name = raw.subarray(p + 46, p + 46 + n).toString("utf8");
    if (!name || names.has(name) || name.includes("..") || name.startsWith("/") || name.split("/").some(s => ["__proto__", "constructor", "prototype"].includes(s.split(".")[0])) || /vbaProject|externalLinks|embeddings|activeX/i.test(name)) fail("Unsupported or duplicate XLSX entry");
    names.add(name);
    const localN = raw.readUInt16LE(local + 26), localExtra = raw.readUInt16LE(local + 28), data = local + 30 + localN + localExtra, finish = data + compressed;
    // SheetJS trusts LOCAL allocation sizes before checking the directory. Validate both copies first.
    // This milestone rejects descriptors entirely (bit3), allowing only the UTF8 flag. ZIP64 is refused.
    if ((flags & ~0x0800) || ![0, 8].includes(method) || raw.readUInt16LE(local + 6) !== flags || raw.readUInt16LE(local + 8) !== method || raw.readUInt16LE(local + 4) > 20 || raw.readUInt16LE(p + 6) > 20 || raw.readUInt16LE(p + 34) !== 0 ||
      raw.readUInt32LE(local + 18) !== compressed || raw.readUInt32LE(local + 22) !== expanded || raw.readUInt32LE(local + 14) !== raw.readUInt32LE(p + 16) ||
      raw.subarray(local + 30, local + 30 + localN).toString("utf8") !== name || data > start || finish > start || expanded > 8 * 1024 * 1024 || (total += expanded) > 24 * 1024 * 1024 || ranges.some(([a, b]) => local < b && finish > a)) fail("XLSX exceeds safe expansion limits, has mismatched local sizes, unsupported flags or overlapping entries");
    for (const [offset, length] of [[p + 46 + n, extra], [local + 30 + localN, localExtra]]) {
      let q = offset;
      while (q < offset + length) {
        if (q + 4 > offset + length) fail("Malformed XLSX ZIP extra field");
        const tag = raw.readUInt16LE(q), len = raw.readUInt16LE(q + 2);
        if (tag === 1 || q + 4 + len > offset + length) fail("ZIP64 or malformed XLSX extra field is not supported");
        q += 4 + len;
      }
    }
    ranges.push([local, finish]);
    const packed = raw.subarray(data, finish);
    const unpacked = method === 0 ? packed : inflateRawSync(packed, { maxOutputLength: 8 * 1024 * 1024 });
    if (unpacked.length !== expanded) fail("XLSX ZIP size mismatch");
    entries.set(name, unpacked);
    p += 46 + n + extra + comment;
  }
  if (p !== end || !names.has("[Content_Types].xml") || !names.has("xl/workbook.xml")) fail("Not an XLSX workbook");
  ooxml(() => validateOriginalXmlParts(entries));
  return entries;
}
export function fileInfo(encoded: string, format: "csv" | "xlsx") {
  const raw = originalBytes(encoded);
  if (format === "csv") return { format, sheets: [] as string[] };
  if (format !== "xlsx") fail("Only UTF-8 CSV and XLSX are supported");
  const entries = boundedXlsx(raw);
  return { format, sheets: ooxml(() => originalWorkbookSheets(entries)).map(s => s.name) };
}
export function inspectSourceFile(encoded: string, settings: ParseSettings = { format: "csv" }) {
  const raw = originalBytes(encoded), fileDigest = createHash("sha256").update(raw).digest("hex");
  if (!settings || !["csv", "xlsx"].includes(settings.format)) fail("Choose the file format");
  let headers: string[], rows: string[][], lines: number[];
  const formulaSlots = new Set<string>(), numericSlots = new Set<string>(), otherSlots = new Set<string>(), numericLexemes = new Map<string, string>();
  if (settings.format === "csv") {
    if (Object.keys(settings).some(k => k !== "format")) fail("CSV does not accept worksheet settings");
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw); } catch { return fail("CSV must be valid UTF-8; export it again"); }
    const parsed = parseCsv(text);
    if (parsed.length < 2 || parsed.length > 501) fail("Choose 1 to 500 CSV data rows");
    headers = parsed[0]; rows = parsed.slice(1); lines = rows.map((_, i) => i + 2);
    if (rows.some(row => row.length !== headers.length)) fail("Every row must have the same number of columns as the header");
  } else {
    const { sheet, headerRow } = settings;
    if (Object.keys(settings).some(k => !["format", "sheet", "headerRow", "clientIdFormat"].includes(k)) || (settings.clientIdFormat !== undefined && !["text", "integer"].includes(settings.clientIdFormat)) || typeof sheet !== "string" || !Number.isSafeInteger(headerRow) || headerRow < 1 || headerRow > 100) fail("Choose a worksheet, ID format and header row from 1 to 100");
    const entries = boundedXlsx(raw), sheets = ooxml(() => originalWorkbookSheets(entries)), selected = sheets.find(s => s.name === sheet);
    if (!selected) fail("Choose a worksheet and header row from 1 to 100");
    const originals = ooxml(() => originalWorksheetCells(entries, selected));
    const book = XLSX.read(raw, { type: "buffer", sheets: [sheet], sheetRows: headerRow + 501, cellFormula: true, cellNF: true, cellDates: false, bookVBA: false });
    const ws = book.Sheets[sheet];
    if (!ws?.["!ref"]) fail("Selected worksheet is empty");
    const range = XLSX.utils.decode_range(ws["!fullref"] || ws["!ref"]!);
    if (range.e.c >= 500 || range.e.r >= headerRow + 500 || range.e.r < headerRow) fail("Selected sheet needs headers plus 1 to 500 data rows and at most 500 columns");
    headers = Array.from({ length: range.e.c + 1 }, (_, c) => {
      const address = XLSX.utils.encode_cell({ r: headerRow - 1, c }), cell = ws[address], original = originals.get(address);
      if (!original || original.formula || !cell || cell.f || cell.t !== "s" || typeof cell.v !== "string" || !cell.v.trim()) fail("Every selected header must be nonempty plain text, not a formula");
      return cell.v as string;
    });
    rows = []; lines = [];
    for (let r = headerRow; r <= range.e.r; r++) {
      const index = rows.length;
      const values = headers.map((_, c) => {
        const address = XLSX.utils.encode_cell({ r, c }), cell = ws[address], original = originals.get(address), slot = `${index}|${c}`;
        if (original?.formula || cell?.f) { formulaSlots.add(slot); return ""; } // raw formula flags win even when the library drops a cached value
        if (original?.type === "n" && original.value !== null) { numericSlots.add(slot); numericLexemes.set(slot, original.value); return original.value; }
        if (!cell || cell.t === "z") return "";
        if (!original) { otherSlots.add(slot); return ""; }
        if (cell.t === "s" && typeof cell.v === "string") return cell.v;
        otherSlots.add(slot); return "";
      });
      if (values.some(Boolean) || headers.some((_, c) => formulaSlots.has(`${index}|${c}`) || otherSlots.has(`${index}|${c}`) || numericSlots.has(`${index}|${c}`))) { rows.push(values); lines.push(r + 1); }
    }
    if (!rows.length) fail("Selected worksheet has no data rows after the header");
  }
  return { headers, rows, lines, fileDigest, byteLength: raw.length, parseSettings: settings, formulaSlots, numericSlots, otherSlots, numericLexemes };
}
