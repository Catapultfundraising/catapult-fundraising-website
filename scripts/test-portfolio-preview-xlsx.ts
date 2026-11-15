import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { fixture, inspect, mappingProfile, plan, simulate, type PreviewRequest } from "../lib/portal-v2/portfolio-preview";
import { fileInfo, type ParseSettings } from "../lib/portal-v2/source-file-preview";
import { syntheticPortfolioWorkbook, PORTFOLIO_HEADERS } from "../lib/portal-v2/portfolio-preview-fixture";
const settings: ParseSettings = { format: "xlsx", sheet: "Capital_Campaign_Portfolio", headerRow: 7 };
const mapping = { CPTID: "verifyCptid", Client_ID: "clientId", "Primary Solicitor": "portfolio", "Secondary Solicitor": "secondarySolicitor", "Campaign Ask": "askAmount", "New Notes": "note" };
function request(client = "pvas"): PreviewRequest {
  return { client, state: fixture(client), fileName: "synthetic-row7.xlsx", bytes: syntheticPortfolioWorkbook().toString("base64"), parseSettings: settings, sourceDate: "2026-10-19", actor: "Fictional Excel reviewer", mapping };
}
for (const client of ["pvas", "csnf", "jag", "wcbhc", "baq"]) test(`${client}: row7 XLSX, independent secondary, formula/numeric holds and repeat-file dedup`, () => {
  const input = request(client), p = plan(input);
  assert.equal(p.changes, 6);
  assert.equal(p.reviews[0].line, 8); assert.equal(p.next.people[0].portfolio, "Synthetic team B");
  assert.equal(p.next.people[0].secondarySolicitor, "Synthetic secondary B");
  assert.equal(p.next.people[1].secondarySolicitor, "Manual secondary");
  assert.ok(p.reviews.some(r => r.reason?.includes("client ID must be text")));
  assert.ok(p.reviews.flatMap(r => r.fields).some(f => f.outcome.includes("cached value not used")));
  assert.ok(p.reviews.flatMap(r => r.fields).some(f => f.outcome.includes("numeric currency")));
  assert.equal(p.next.people.flatMap(p => p.notes).some(n => n.text.includes("Cached formula")), false);
  const s = simulate(input, p.binding);
  assert.deepEqual(s.receipt.parseSettings, settings);
  assert.equal(plan({ ...input, state: s.next }).changes, 0);
});
test("original XLSX bytes, sheet and header-row identity are bound independently", () => {
  const input = request(), raw = Buffer.from(input.bytes, "base64"), p = plan(input);
  assert.equal(p.fileDigest, createHash("sha256").update(raw).digest("hex"));
  assert.deepEqual(fileInfo(input.bytes, "xlsx").sheets, ["Instructions", "Capital_Campaign_Portfolio", "Alternate_Portfolio"]);
  assert.deepEqual(inspect(input.bytes, settings).headers, PORTFOLIO_HEADERS);
  const alternate = { ...settings, sheet: "Alternate_Portfolio" };
  assert.equal(plan({ ...input, parseSettings: alternate }).changes, 6);
  assert.throws(() => simulate({ ...input, parseSettings: alternate }, p.binding), /Stale/);
  const profile = mappingProfile(input.client, input.bytes, mapping, undefined, settings);
  assert.throws(() => mappingProfile(input.client, input.bytes, mapping, JSON.stringify(profile), alternate), /out of date/);
  assert.throws(() => plan({ ...input, parseSettings: { ...settings, headerRow: 1 } }), /header/);
  assert.throws(() => inspect(input.bytes, { ...settings, sheet: "Missing" }), /worksheet/);
  assert.throws(() => inspect(input.bytes, { ...settings, headerRow: 0 }), /header row/);
  assert.throws(() => inspect(input.bytes, { ...settings, headerRow: 1.5 }), /header row/);
});
function workbook(grid: unknown[][], mutate?: (sheet: XLSX.WorkSheet) => void) {
  const book = XLSX.utils.book_new(), sheet = XLSX.utils.aoa_to_sheet(grid); mutate?.(sheet);
  XLSX.utils.book_append_sheet(book, sheet, "Data"); return XLSX.write(book, { type: "buffer", bookType: "xlsx", compression: true }).toString("base64");
}
test("exact text IDs and decimal strings preserved; ALL numeric ask cells held without currency rounding", () => {
  const input = request(); input.parseSettings = { format: "xlsx", sheet: "Data", headerRow: 1 }; input.mapping = { ID: "clientId", Ask: "askAmount", Note: "note" };
  input.bytes = workbook([["ID", "Ask", "Note"], ["0001", "1500.25", "Smith-Jones: follow-up"]]);
  assert.equal(plan(input).next.people[0].askAmount, "1500.25");
  input.bytes = workbook([["ID", "Ask", "Note"], ["0001", 1500, "Integer currency"]]);
  assert.equal(plan(input).next.people[0].askAmount, "1000.00"); // independent text note may append
  input.bytes = workbook([["ID", "Ask", "Note"], [1, 1500, "Wrong identity"]], ws => { ws.A2.z = "0000"; });
  assert.equal(plan(input).changes, 0);
  input.bytes = workbook([["ID", "Ask", "Note"], ["0001", 1500.25, ""]]);
  assert.equal(plan(input).changes, 0);
});
test("formula headers refuse; formula identity/cached write cells never imported", () => {
  const input = request(); input.parseSettings = { format: "xlsx", sheet: "Data", headerRow: 1 }; input.mapping = { ID: "clientId", Note: "note" };
  input.bytes = workbook([["ID", "Note"], ["0001", "Cached note"]], ws => { ws.A1.f = '"ID"'; });
  assert.throws(() => plan(input), /header/);
  input.bytes = workbook([["ID", "Note"], ["0001", "Cached note"]], ws => { ws.B2.f = '"Cached note"'; });
  assert.equal(plan(input).changes, 0);
  assert.match(plan(input).reviews[0].fields[0].outcome, /formula/);
  input.bytes = workbook([["ID", "Note"], ["0001", "Cached note"]], ws => { ws.A2.f = '"0001"'; });
  assert.equal(plan(input).changes, 0); assert.equal(plan(input).reviews[0].cptid, null);
});
test("invalid containers, oversized expansion metadata, non-CSV parse settings and unsupported entry payloads refuse", () => {
  assert.throws(() => fileInfo(Buffer.from("not-a-workbook").toString("base64"), "xlsx"), /ZIP/);
  const raw = syntheticPortfolioWorkbook();
  const central = raw.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert.ok(central > 0); raw.writeUInt32LE(9 * 1024 * 1024, central + 24);
  assert.throws(() => fileInfo(raw.toString("base64"), "xlsx"), /expansion/);
  assert.throws(() => inspect(Buffer.from("ID,Note\r\n0001,x").toString("base64"), { format: "csv", sheet: "Bad" } as unknown as ParseSettings), /worksheet/);
});
test("ZIP parser differential: local sizes/flags cannot bypass central limits; EOCD comments refused", () => {
  const base = syntheticPortfolioWorkbook();
  const central = base.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])), local = base.readUInt32LE(central + 42);
  for (const [offset, value] of [[local + 22, 0x7fffffff], [local + 18, 0x7fffffff]]) {
    const bad = Buffer.from(base); bad.writeUInt32LE(value, offset);
    assert.throws(() => fileInfo(bad.toString("base64"), "xlsx"), /mismatched local sizes/);
  }
  for (const flags of [1, 8, 0x40]) {
    const bad = Buffer.from(base); bad.writeUInt16LE(flags, local + 6); bad.writeUInt16LE(flags, central + 8);
    assert.throws(() => fileInfo(bad.toString("base64"), "xlsx"), /unsupported flags/);
  }
  const commented = Buffer.concat([base, Buffer.from("comment-PK\u0005\u0006-parser-differential")]);
  commented.writeUInt16LE(commented.length - base.length, base.length - 2);
  assert.throws(() => fileInfo(commented.toString("base64"), "xlsx"), /ZIP container/);
  const zip64Version = Buffer.from(base); zip64Version.writeUInt16LE(45, local + 4); zip64Version.writeUInt16LE(45, central + 6);
  assert.throws(() => fileInfo(zip64Version.toString("base64"), "xlsx"), /unsupported flags/);
});
test("ZIP64 extra tag is refused before SheetJS parses a workbook", () => {
  const name = Buffer.from("[Content_Types].xml"), extra = Buffer.from([1, 0, 0, 0]);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(extra.length, 28);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6); central.writeUInt16LE(name.length, 28); central.writeUInt16LE(extra.length, 30);
  const directory = Buffer.concat([central, name, extra]), data = Buffer.concat([local, name, extra]), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(data.length, 16);
  assert.throws(() => fileInfo(Buffer.concat([data, directory, end]).toString("base64"), "xlsx"), /ZIP64/);
});
