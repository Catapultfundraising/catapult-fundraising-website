// Phase A: original-byte parser + metadata mapping only. No route, simulation, network or SQL.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileInfo, inspectSourceFile } from "../lib/portal-v2/source-file-preview";
import { exactOoxmlNumber } from "../lib/portal-v2/source-ooxml-values";
import { buildProfile, checkProfile } from "../lib/portal-v2/source-mapping-profile";
import { parseKeyOf } from "../lib/portal-v2/source-keys";
import { zipParts, workbookParts, numberCell, textCell, NS, REL, PKG } from "./fixtures/source-ooxml-test-fixture";
const settings = { format: "xlsx" as const, sheet: "Data", headerRow: 1 };
const encode = (s: string | Buffer) => Buffer.from(s).toString("base64");
const inspect = (parts = workbookParts()) => inspectSourceFile(encode(zipParts(parts)), settings);
test("ordinary numeric CPTID/ask are original lexemes, not converted JS numeric values", () => {
  const raw = zipParts(workbookParts()), p = inspectSourceFile(encode(raw), settings);
  assert.deepEqual(p.headers, ["Client_ID", "CPTID", "Campaign Ask", "New Notes"]);
  assert.equal(p.rows[0][0], "0001");
  assert.equal(p.numericLexemes.get("0|1"), "900001");
  assert.equal(p.numericLexemes.get("0|2"), "1500.25");
  assert.equal(p.fileDigest, createHash("sha256").update(raw).digest("hex"));
  assert.equal(p.byteLength, raw.length);
  assert.deepEqual(p.parseSettings, settings);
  assert.deepEqual(fileInfo(encode(raw), "xlsx").sheets, ["Data"]);
});
test("decimal/scientific expansion is exact and finite; identifiers never infer leading zeros", () => {
  for (const lexeme of ["1500.25", "1.50025E3", "150025e-2", "+1500.2500"])
    assert.deepEqual(exactOoxmlNumber(lexeme, "askAmount"), { ok: true, value: "1500.25" });
  for (const lexeme of ["900001", "9.00001E5", "90000100e-2"])
    assert.deepEqual(exactOoxmlNumber(lexeme, "cptid"), { ok: true, value: "900001" });
  assert.deepEqual(exactOoxmlNumber("9007199254740993", "clientId-integer"), { ok: true, value: "9007199254740993" });
  assert.equal(parseKeyOf("text", "0001"), "0001");
  assert.notEqual(parseKeyOf("text", "0001"), parseKeyOf("text", "1"));
  for (const value of ["-0", "-1", "1500.251", "1500.250000000000000001", "10000000000", "NaN", "INF", "1e", "1e++2", "1.2.3", "1e101", "1e-101", " 1", "1 ", "1,000", ""])
    assert.equal(exactOoxmlNumber(value, "askAmount").ok, false, value);
  for (const value of ["0", "-0", "1.01", "2147483648", "9e99"])
    assert.equal(exactOoxmlNumber(value, "cptid").ok, false, value);
});
test("formula/cache distinction and empty-row slot alignment survive parsing", () => {
  const parts = workbookParts(`<row r="2">${numberCell("B2", "900001", "900000+1")}${numberCell("C2", "1500.25", "1500+.25")}</row><row r="3">${textCell("A3", "0001")}${numberCell("C3", "1500.251")}</row>`);
  const p = inspect(parts);
  assert.ok(p.formulaSlots.has("0|1")); assert.ok(p.formulaSlots.has("0|2"));
  assert.equal(p.numericLexemes.has("0|2"), false);
  assert.equal(p.numericLexemes.get("1|2"), "1500.251");
  assert.deepEqual(p.lines, [2, 3]);
});
test("sheet/header and source-format choices are explicit and retained independently of original digest", () => {
  const parts = workbookParts();
  parts["xl/worksheets/sheet1.xml"] = parts["xl/worksheets/sheet1.xml"].replace(/r="([A-D])([12])"/g, (_, c, r) => `r="${c}${Number(r) + 6}"`).replace(/<row r="([12])"/g, (_, r) => `<row r="${Number(r) + 6}"`);
  const bytes = encode(zipParts(parts)), p = inspectSourceFile(bytes, { ...settings, headerRow: 7, clientIdFormat: "integer" });
  assert.equal(p.lines[0], 8); assert.equal(p.parseSettings.format, "xlsx");
  assert.throws(() => inspectSourceFile(bytes, settings), /header/);
  assert.throws(() => inspectSourceFile(bytes, { ...settings, sheet: "Unknown" }), /worksheet/);
  assert.equal(p.fileDigest, inspectSourceFile(bytes, { ...settings, headerRow: 7 }).fileDigest);
  assert.notDeepEqual(p.parseSettings, inspectSourceFile(bytes, { ...settings, headerRow: 7 }).parseSettings);
});
test("CSV strictness, exact UTF8 original-byte hash and <=500row/2MB limits remain", () => {
  const raw = Buffer.from('\ufeffClient_ID,New Notes\r\n0001,"Follow-up — Smith-Jones\nsecond line"\r\n');
  const p = inspectSourceFile(encode(raw), { format: "csv" });
  assert.equal(p.rows[0][0], "0001"); assert.equal(p.rows[0][1], "Follow-up — Smith-Jones\nsecond line");
  assert.equal(p.fileDigest, createHash("sha256").update(raw).digest("hex"));
  for (const raw of [Buffer.from([0xff]), Buffer.from('ID,Note\n1,"unterminated'), Buffer.from("ID,Note\n1"), Buffer.from("ID,Note\n1,\0"), Buffer.from("ID\n" + "1\n".repeat(501)), Buffer.alloc(2 * 1024 * 1024 + 1)])
    assert.throws(() => inspectSourceFile(encode(raw), { format: "csv" }));
});
test("ZIP local/central size disagreement, descriptors, comments and later EOCD signatures refuse", () => {
  const bytes = zipParts(workbookParts());
  for (const offset of [18, 22]) {
    const bad = Buffer.from(bytes); bad.writeUInt32LE(0x40000000, offset);
    assert.throws(() => fileInfo(encode(bad), "xlsx"), /XLSX/);
  }
  const flags = Buffer.from(bytes); flags.writeUInt16LE(8, 6);
  assert.throws(() => fileInfo(encode(flags), "xlsx"), /XLSX/);
  const extra = Buffer.concat([bytes, Buffer.from("PK\x05\x06malicious comment")]);
  extra.writeUInt16LE(extra.length - bytes.length, bytes.length - 2);
  assert.throws(() => fileInfo(encode(extra), "xlsx"), /ZIP/);
});
test("XML DTD/entity, malformed namespace, duplicate cells and external/traversal relationships refuse", () => {
  const mutate = (fn: (parts: Record<string, string>) => void) => {
    const p = workbookParts(); fn(p); assert.throws(() => inspect(p));
  };
  mutate(p => { p["xl/workbook.xml"] = '<!DOCTYPE workbook [<!ENTITY x "bad">]>' + p["xl/workbook.xml"]; });
  mutate(p => { p["xl/workbook.xml"] = p["xl/workbook.xml"].replace(NS, "urn:wrong"); });
  mutate(p => { p["xl/worksheets/sheet1.xml"] = p["xl/worksheets/sheet1.xml"].replace("</sheetData>", `<row r="2">${numberCell("B2", "900002")}</row></sheetData>`); });
  mutate(p => { p["xl/_rels/workbook.xml.rels"] = `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="https://invalid.example/sheet.xml" TargetMode="External"/></Relationships>`; });
  mutate(p => { p["xl/_rels/workbook.xml.rels"] = p["xl/_rels/workbook.xml.rels"].replace("worksheets/sheet1.xml", "../../outside.xml"); });
  mutate(p => { p["xl/_rels/workbook.xml.rels"] = p["xl/_rels/workbook.xml.rels"].replace("</Relationships>", `<Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`); });
  mutate(p => { p["xl/workbook.xml"] = p["xl/workbook.xml"].replace("</sheets>", `<sheet name="Data" sheetId="2" r:id="rId1"/></sheets>`); });
});
const context = () => ({ client: "fictional", table: "portfolio", registryRev: "a".repeat(64), keyCol: "clientId", keyKind: "text",
  dests: [{ col: "clientId", ty: "nvarchar", st: "candidate", key: "clientId" }, { col: "ask", ty: "decimal", st: "candidate", key: "" }, { col: "note", ty: "nvarchar", st: "held", key: "" }, { col: "gift", ty: "decimal", st: "unsupported", key: "" }],
  preparedDigest: null, allocatorDigest: null, insertPolicyDigest: null });
const headers = ["Client_ID", "Campaign Ask", "New Notes"], mapping = { Client_ID: "clientId", "Campaign Ask": "ask", "New Notes": "note" };
test("mapping profiles are metadata-only, bound to current server context; held stays held", () => {
  const p = buildProfile(context(), headers, mapping);
  const r = checkProfile(JSON.stringify(p), context(), [...headers, "Additional"]);
  assert.deepEqual({ ...r.mapping }, { ...mapping, Additional: "" });
  assert.deepEqual(r.held, ["note"]); assert.deepEqual(r.unmapped, ["Additional"]);
  assert.equal(JSON.stringify(p).includes("900001"), false);
  assert.equal(buildProfile(context(), headers, mapping).profileHash, p.profileHash);
  for (const ctx of [{ ...context(), client: "other" }, { ...context(), registryRev: "b".repeat(64) }, { ...context(), preparedDigest: "c".repeat(64) }, { ...context(), dests: context().dests.map(d => ({ ...d, ty: "varchar" })) }])
    assert.throws(() => checkProfile(JSON.stringify(p), ctx, headers));
  assert.throws(() => checkProfile(JSON.stringify({ ...p, mapping: [["Client_ID", "ask"]] }), context(), headers), /integrity/);
  assert.throws(() => buildProfile(context(), headers, { ...mapping, "Campaign Ask": "gift" }), /unsupported/);
  assert.throws(() => buildProfile(context(), ["Client_ID", " client_id "], { Client_ID: "clientId" }), /Duplicate/);
  assert.throws(() => buildProfile(context(), ["__proto__"], {}), /not allowed/);
  assert.throws(() => buildProfile(context(), ["", "Client_ID"], mapping), /plain text/);
});
