// Original OOXML numeric values: maintained SAX parser, never SheetJS's already-converted JS Number.
import { SaxesParser, type SaxesTagNS } from "saxes";
import { posix } from "node:path";
export class OoxmlValueError extends Error {}
function refuse(message: string): never { throw new OoxmlValueError(message); }
const MAIN = new Set(["http://schemas.openxmlformats.org/spreadsheetml/2006/main", "http://purl.oclc.org/ooxml/spreadsheetml/main"]);
const DOC_REL = new Set(["http://schemas.openxmlformats.org/officeDocument/2006/relationships", "http://purl.oclc.org/ooxml/officeDocument/relationships"]);
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const SHEET_TYPES = new Set([...DOC_REL].map(uri => `${uri}/worksheet`));
type XmlHandlers = { open: (tag: SaxesTagNS, stack: SaxesTagNS[]) => void; close?: (tag: SaxesTagNS, stack: SaxesTagNS[]) => void; text?: (text: string, stack: SaxesTagNS[]) => void };
function xml(bytes: Buffer | undefined, handlers: XmlHandlers) {
  if (!bytes) refuse("Selected OOXML part is missing");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return refuse("OOXML parts must be valid UTF-8"); }
  const parser = new SaxesParser({ xmlns: true }), stack: SaxesTagNS[] = [];
  let nodes = 0, attributes = 0;
  parser.on("error", () => refuse("Malformed OOXML XML"));
  parser.on("doctype", () => refuse("OOXML doctypes and custom entities are not supported"));
  parser.on("processinginstruction", () => refuse("OOXML processing instructions are not supported"));
  parser.on("opentagstart", () => { attributes = 0; });
  parser.on("attribute", () => { if (++attributes > 32) refuse("OOXML attribute quota exceeded"); });
  parser.on("opentag", tag => { stack.push(tag); if (stack.length > 40 || ++nodes > 500_000) refuse("OOXML nesting or element quota exceeded"); handlers.open(tag, stack); });
  parser.on("closetag", tag => { handlers.close?.(tag, stack); stack.pop(); });
  parser.on("text", value => handlers.text?.(value, stack));
  parser.on("cdata", value => handlers.text?.(value, stack));
  parser.write(text).close();
}
function attr(tag: SaxesTagNS, name: string, uris?: Set<string>) {
  const candidates = Object.values(tag.attributes).filter(a => a.local === name && a.uri !== "http://www.w3.org/2000/xmlns/");
  if (candidates.length > 1) refuse("Ambiguous OOXML attribute");
  const value = candidates[0];
  if (value && !(uris ? uris.has(value.uri) : !value.uri)) refuse("Unsupported namespace for an OOXML attribute");
  return value?.value;
}
export function validateOriginalXmlParts(entries: ReadonlyMap<string, Buffer>) {
  for (const [name, bytes] of entries) if (name.endsWith(".xml") || name.endsWith(".rels")) xml(bytes, { open() {} });
}
export type OriginalSheet = { name: string; relationship: string };
export function originalWorkbookSheets(entries: ReadonlyMap<string, Buffer>): OriginalSheet[] {
  const sheets: OriginalSheet[] = [], names = new Set<string>(), links = new Set<string>(), ids = new Set<string>();
  xml(entries.get("xl/workbook.xml"), { open(tag, stack) {
    if (stack.length === 1 && (tag.local !== "workbook" || !MAIN.has(tag.uri))) refuse("Unsupported OOXML workbook namespace");
    if (tag.local !== "sheet") return;
    if (!MAIN.has(tag.uri) || stack.length !== 3 || stack[1].local !== "sheets" || stack[1].uri !== tag.uri || stack[0].uri !== tag.uri) refuse("Unsupported OOXML sheet placement or namespace");
    const name = attr(tag, "name"), relationship = attr(tag, "id", DOC_REL), id = attr(tag, "sheetId");
    if (!name || !relationship || !id || !/^[1-9][0-9]{0,8}$/.test(id) || ids.has(id) || names.has(name.toLowerCase()) || links.has(relationship) || ["__proto__", "constructor", "prototype"].includes(name.toLowerCase())) refuse("Duplicate, reserved or unlinked OOXML worksheet");
    ids.add(id); names.add(name.toLowerCase()); links.add(relationship); sheets.push({ name, relationship });
  } });
  if (!sheets.length || sheets.length > 50) refuse("Choose a workbook with 1 to 50 distinct worksheets");
  return sheets;
}
export type OriginalCell = { type: string; formula: boolean; value: string | null };
export function originalWorksheetCells(entries: ReadonlyMap<string, Buffer>, sheet: OriginalSheet): Map<string, OriginalCell> {
  const relationships = new Map<string, { target: string; type: string; external: boolean }>();
  xml(entries.get("xl/_rels/workbook.xml.rels"), { open(tag, stack) {
    if (stack.length === 1 && (tag.local !== "Relationships" || tag.uri !== PKG_REL)) refuse("Unsupported OOXML relationship namespace");
    if (tag.local !== "Relationship") return;
    if (stack.length !== 2 || tag.uri !== PKG_REL) refuse("Unsupported OOXML relationship placement or namespace");
    const id = attr(tag, "Id"), target = attr(tag, "Target"), type = attr(tag, "Type");
    if (!id || !target || !type || relationships.has(id)) refuse("Duplicate or malformed OOXML relationship");
    const external = attr(tag, "TargetMode") !== undefined && attr(tag, "TargetMode") !== "Internal";
    if (external) refuse("External OOXML workbook relationships are not supported");
    relationships.set(id, { target, type, external });
  } });
  const relationship = relationships.get(sheet.relationship);
  if (!relationship || relationship.external || !SHEET_TYPES.has(relationship.type)) refuse("Selected sheet has no unambiguous internal worksheet relationship");
  const targets = new Set<string>();
  const resolve = (targetIn: string) => {
    let target: string;
    try { target = decodeURIComponent(targetIn); } catch { return refuse("Malformed worksheet relationship target"); }
    if (target.includes("\\") || target.includes(":") || target.includes("?") || target.includes("#") || target.split("/").includes("..") || target.startsWith("//")) refuse("Unsupported worksheet relationship target");
    const path = target.startsWith("/") ? target.slice(1) : posix.join("xl", target);
    if (!path.startsWith("xl/") || !path.endsWith(".xml") || !entries.has(path)) refuse("Selected worksheet part is missing");
    return path;
  };
  for (const link of relationships.values()) if (SHEET_TYPES.has(link.type)) { const path = resolve(link.target); if (targets.has(path)) refuse("Duplicate worksheet relationship target"); targets.add(path); }
  const path = resolve(relationship.target);
  const cells = new Map<string, OriginalCell>();
  let cell: OriginalCell | null = null, address = "", valueDepth = 0, valueSeen = false;
  xml(entries.get(path), {
    open(tag, stack) {
      if (stack.length === 1 && (tag.local !== "worksheet" || !MAIN.has(tag.uri))) refuse("Unsupported OOXML worksheet namespace");
      if (tag.local === "c" && !(MAIN.has(tag.uri) && stack.length === 4 && stack[1].local === "sheetData" && stack[2].local === "row" && stack.every(t => t.uri === tag.uri))) refuse("Unsupported OOXML cell placement or namespace");
      if (tag.local === "c") {
        const rawAddress = attr(tag, "r");
        // This regex validates a cell address, not XML. XML structure/namespaces are parsed by saxes.
        const parts = rawAddress && /^([A-Z]{1,3})([1-9][0-9]{0,6})$/.exec(rawAddress);
        if (!parts || cells.has(rawAddress!) || cells.size >= 300_000) refuse("Duplicate, missing or unsupported worksheet cell address");
        let column = 0; for (const letter of parts[1]) column = column * 26 + letter.charCodeAt(0) - 64;
        const row = parts[2], enclosingRow = attr(stack[2], "r");
        if (column > 16384 || row.length > 7 || (row.length === 7 && row > "1048576") || (enclosingRow !== undefined && enclosingRow !== row)) refuse("Worksheet cell address disagrees with its row or Excel bounds");
        address = rawAddress!; cell = { type: attr(tag, "t") || "n", formula: false, value: null }; cells.set(address, cell); valueSeen = false;
      } else if (cell && stack.length === 5 && (tag.local === "f" || tag.local === "v") && tag.uri !== stack[0].uri) refuse("Unsupported namespace for an OOXML formula/value");
      else if (cell && stack.length === 5 && MAIN.has(tag.uri)) {
        if (tag.local === "f") cell.formula = true;
        if (tag.local === "v") { if (valueSeen) refuse("Worksheet cell contains duplicate values"); valueSeen = true; valueDepth = stack.length; cell.value = ""; }
      } else if (valueDepth && stack.length > valueDepth) refuse("Worksheet value contains unsupported nested XML");
    },
    text(text) {
      if (cell && valueDepth) {
        if (cell.type !== "n" && cell.type !== "s") { cell.value = null; return; } // strings/notes are decoded by the existing owner, not numeric metadata
        cell.value = (cell.value || "") + text;
        if (cell.value.length > 128) refuse("Worksheet numeric value exceeds the bounded exact-value limit");
      }
    },
    close(tag, stack) {
      if (valueDepth === stack.length && tag.local === "v") valueDepth = 0;
      if (cell && stack.length === 4 && tag.local === "c" && MAIN.has(tag.uri)) { cell = null; address = ""; }
    },
  });
  return cells;
}

export type ExactNumberKind = "giftAmount" | "cptid" | "askAmount" | "clientId-integer";
export type ExactNumber = { ok: true; value: string } | { ok: false; reason: string };
/** Bounded decimal/scientific expansion by string position only. No Number/parseFloat of source values. */
export function exactOoxmlNumber(lexeme: string, kind: ExactNumberKind): ExactNumber {
  const held = (reason: string): ExactNumber => ({ ok: false, reason });
  if (typeof lexeme !== "string" || !lexeme || lexeme.length > 128) return held("numeric lexeme is missing or exceeds the exact-value bound");
  if (lexeme.startsWith("-")) return held("negative numeric values (including negative zero) are not permitted");
  const m = /^\+?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(lexeme);
  if (!m) return held("malformed or non-finite OOXML numeric value");
  const fraction = m[2] ?? m[3] ?? "", exponentText = m[4] || "0";
  if (exponentText.replace(/^[+-]/, "").length > 3) return held("scientific exponent exceeds the bounded exact policy");
  // Only a bounded decimal-position exponent is converted, never a monetary/identity coefficient.
  const exponent = Number(exponentText);
  if (Math.abs(exponent) > 100) return held("scientific exponent exceeds the bounded exact policy");
  let coefficient = ((m[1] || "0") + fraction).replace(/^0+/, "") || "0", scale = fraction.length - exponent;
  while (scale > 0 && coefficient.endsWith("0") && coefficient !== "0") { coefficient = coefficient.slice(0, -1); scale--; }
  if (coefficient === "0") return (kind === "askAmount" || kind === "giftAmount") ? { ok: true, value: "0.00" } : held("identity must be a positive whole number");
  if (scale > ((kind === "askAmount" || kind === "giftAmount") ? 2 : 0)) return held((kind === "askAmount" || kind === "giftAmount") ? "ask has more than two exact decimal places; not rounded" : "identity is not an exact whole number");
  const maxInteger = kind === "clientId-integer" ? 32 : kind === "giftAmount" ? 12 : 10;
  if (coefficient.length - scale > maxInteger) return held("numeric precision exceeds the supported field bound");
  if (scale < 0) { coefficient += "0".repeat(-scale); scale = 0; }
  const padded = coefficient.padStart(scale + 1, "0"), split = padded.length - scale;
  const whole = padded.slice(0, split), decimals = padded.slice(split);
  if (kind === "cptid" && (whole.length > 10 || (whole.length === 10 && whole > "2147483647"))) return held("CPTID exceeds the positive SQL integer range");
  return { ok: true, value: (kind === "askAmount" || kind === "giftAmount") ? `${whole}.${decimals.padEnd(2, "0")}` : whole };
}
