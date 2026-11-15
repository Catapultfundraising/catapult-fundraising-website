// Test-only ZIP/XML fixture encoder. Production XML is read by saxes; this is not an XML parser.
import { deflateRawSync } from "node:zlib";
export const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
export const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const PKG = "http://schemas.openxmlformats.org/package/2006/relationships";
export const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export const textCell = (ref: string, value: string) => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
export const numberCell = (ref: string, lexeme: string, formula?: string) => `<c r="${ref}">${formula === undefined ? "" : `<f>${escapeXml(formula)}</f>`}<v>${escapeXml(lexeme)}</v></c>`;
function crc32(bytes: Buffer) {
  let crc = -1;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ -1) >>> 0;
}
export function zipParts(parts: Record<string, string | Buffer>): Buffer {
  const records: Buffer[] = [], directory: Buffer[] = []; let offset = 0;
  for (const [path, value] of Object.entries(parts)) {
    const name = Buffer.from(path), raw = Buffer.isBuffer(value) ? value : Buffer.from(value), packed = deflateRawSync(raw), crc = crc32(raw);
    const local = Buffer.alloc(30), central = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(name.length, 26);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10); central.writeUInt32LE(crc, 16); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    records.push(local, name, packed); directory.push(central, name); offset += local.length + name.length + packed.length;
  }
  const central = Buffer.concat(directory), end = Buffer.alloc(22), count = Object.keys(parts).length;
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...records, central, end]);
}
export function workbookParts(rows = `<row r="2">${textCell("A2", "0001")}${numberCell("B2", "900001")}${numberCell("C2", "1500.25")}${textCell("D2", "Exact numeric visit")}</row>`) {
  const header = `<row r="1">${textCell("A1", "Client_ID")}${textCell("B1", "CPTID")}${textCell("C1", "Campaign Ask")}${textCell("D1", "New Notes")}</row>`;
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="${NS}"><sheetData>${header}${rows}</sheetData></worksheet>`,
  };
}
