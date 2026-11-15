import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { exactOoxmlNumber, type ExactNumberKind } from "../lib/portal-v2/source-ooxml-values";
import { fixture, inspect, plan, simulate, type PreviewRequest } from "../lib/portal-v2/portfolio-preview";
import { fileInfo } from "../lib/portal-v2/source-file-preview";
import { zipParts, workbookParts, numberCell, textCell, NS, REL, PKG } from "./fixtures/source-ooxml-test-fixture";
const row = (id = textCell("A2", "0001"), cp = numberCell("B2", "900001"), ask = numberCell("C2", "1500.25"), note = textCell("D2", "")) => `<row r="2">${id}${cp}${ask}${note}</row>`;
const mapping = { Client_ID: "clientId", CPTID: "verifyCptid", "Campaign Ask": "askAmount", "New Notes": "note" };
function request(parts: Record<string, string | Buffer> = workbookParts()): PreviewRequest {
  return { client: "pvas", state: fixture("pvas"), bytes: zipParts(parts).toString("base64"), fileName: "ordinary-numeric.xlsx", sourceDate: "2026-10-19", actor: "Fictional exact-value reviewer", mapping, parseSettings: { format: "xlsx", sheet: "Data", headerRow: 1 } };
}
function exact(lexeme: string, kind: ExactNumberKind, expected: string) { assert.deepEqual(exactOoxmlNumber(lexeme, kind), { ok: true, value: expected }); }
test("exact decimal/scientific policy expands strings without financial/identity Number conversion", () => {
  for (const value of ["1500.25", "1.50025E3", "150025e-2", "1500.2500", "+1500.25"]) exact(value, "askAmount", "1500.25");
  for (const value of ["900001", "900001.0000", "9.00001E5", "90000100e-2"]) exact(value, "cptid", "900001");
  exact("0", "askAmount", "0.00"); exact("+.25", "askAmount", "0.25"); exact("1E-2", "askAmount", "0.01");
  exact("9999999999.99", "askAmount", "9999999999.99"); exact("2147483647", "cptid", "2147483647");
  exact("9007199254740993", "clientId-integer", "9007199254740993"); // deliberately beyond exact JS integer range
  for (const value of ["-0", "-1500.25", "1.501", "1500.250000000000000001", "10000000000", "NaN", "INF", "Infinity", "1e", "1e++2", "1.2.3", "1e101", "1e-101", " 1500.25", "1500.25 ", "\t1", "1,500.25", ""]) assert.equal(exactOoxmlNumber(value, "askAmount").ok, false, value);
  for (const value of ["0", "-0", "900001.00000000000000001", "2147483648", "1E-1", "9e99"]) assert.equal(exactOoxmlNumber(value, "cptid").ok, false, value);
});
test("ordinary Excel numeric CPTID and ask remain exact; CSV-equivalent proposals and original-byte identity", () => {
  const input = request(), p = plan(input);
  assert.equal(p.changes, 2); assert.equal(p.next.people[0].askAmount, "1500.25");
  assert.equal(p.reviews[0].fields.find(f => f.target === "askAmount")?.numericLexeme, "1500.25");
  assert.equal(p.fileDigest, createHash("sha256").update(Buffer.from(input.bytes, "base64")).digest("hex"));
  const csv = { ...input, fileName: "same.csv", parseSettings: { format: "csv" as const }, bytes: Buffer.from("Client_ID,CPTID,Campaign Ask,New Notes\r\n0001,900001,1500.25,Exact numeric visit\r\n").toString("base64") };
  const fields = (q: ReturnType<typeof plan>) => q.reviews[0].fields.map(({ numericLexeme: _, ...f }) => f);
  assert.deepEqual(fields(plan(csv)), fields(p));
  const applied = simulate(input, p.binding); assert.equal(applied.receipt.sqlCommitted, false);
  assert.equal(plan({ ...input, state: applied.next }).changes, 0);
});
test("scientific lexemes use exact expansion and excessive precision never rounds to a plausible number", () => {
  let input = request(workbookParts(row(undefined, numberCell("B2", "9.00001E5"), numberCell("C2", "1.50025E3"))));
  assert.equal(plan(input).next.people[0].askAmount, "1500.25");
  for (const value of ["1500.250000000000000001", "1500.251", "1e999", "NaN", "1500oops", "-1500.25"]) {
    input = request(workbookParts(row(undefined, undefined, numberCell("C2", value))));
    const p = plan(input); assert.equal(p.changes, 0, value);
    const field = p.reviews[0].fields.find(f => f.target === "askAmount")!;
    assert.match(field.outcome, /^Held:/); assert.equal(field.numericLexeme, value);
  }
  for (const value of ["900001.00000000000000001", "900001.1", "2147483648", "-900001"]) {
    const p = plan(request(workbookParts(row(undefined, numberCell("B2", value)))));
    assert.equal(p.changes, 0); assert.match(p.reviews[0].reason!, /CPTID/);
  }
});
test("numeric client IDs require an explicit integer declaration AND its separate crosswalk; no zero-format alias", () => {
  const input = request(workbookParts(row(numberCell("A2", "1.01E2"))));
  assert.match(plan(input).reviews[0].reason!, /declared integer source/);
  const declared: PreviewRequest = { ...input, parseSettings: { format: "xlsx", sheet: "Data", headerRow: 1, clientIdFormat: "integer" } };
  assert.equal(plan(declared).next.people[0].askAmount, "1500.25");
  const zero = { ...declared, bytes: zipParts(workbookParts(row(numberCell("A2", "1")))).toString("base64") };
  assert.equal(plan(zero).changes, 0); assert.match(plan(zero).reviews[0].reason!, /unknown/);
  const paddedText = { ...declared, bytes: zipParts(workbookParts(row(textCell("A2", "0001")))).toString("base64") };
  assert.equal(plan(paddedText).changes, 0); assert.match(plan(paddedText).reviews[0].reason!, /canonical text/);
  const p = plan(declared);
  assert.throws(() => simulate(input, p.binding), /Stale/);
  assert.throws(() => plan({ ...declared, client: "jag" }), /Reset/);
});
test("numeric identity contradictions, raw formula flags and protected manual asks stay held", () => {
  assert.equal(plan(request(workbookParts(row(undefined, numberCell("B2", "900002"))))).changes, 0);
  assert.equal(plan(request(workbookParts(row(undefined, numberCell("B2", "900001", "1+900000"))))).changes, 0);
  const formula = plan(request(workbookParts(row(undefined, undefined, numberCell("C2", "1500.25", "1500+0.25")))));
  assert.equal(formula.changes, 0); assert.match(formula.reviews[0].fields[0].outcome, /formula/);
  const manual = plan(request(workbookParts(row(textCell("A2", "0002"), numberCell("B2", "900002"), numberCell("C2", "3000.25"), textCell("D2", "Independent new note")))));
  assert.equal(manual.changes, 1); assert.equal(manual.next.people[1].askAmount, "2500.00"); assert.match(manual.reviews[0].fields[0].outcome, /protected manual/);
});
test("raw empty numeric cell cannot contaminate the next row; long text notes remain supported", () => {
  const rows = `<row r="2"><c r="A2"><v/></c></row><row r="3">${textCell("A3", "0001")}${numberCell("B3", "900001")}${numberCell("C3", "1500.25")}${textCell("D3", "Follow-up Smith-Jones\n" + "Long text ".repeat(60))}</row>`;
  const p = plan(request(workbookParts(rows)));
  assert.equal(p.reviews.length, 2); assert.equal(p.reviews[0].cptid, null); assert.equal(p.reviews[1].cptid, 900001);
  assert.equal(p.changes, 2); assert.ok(p.next.people[0].notes[1].text.length > 256);
});
test("DTD/custom entities, malformed XML, UTF8, namespace and XML depth/attribute quotas refuse", () => {
  const base = workbookParts();
  for (const [part, value] of [
    ["xl/workbook.xml", `<!DOCTYPE workbook [<!ENTITY x SYSTEM "https://example.invalid/no-request">]>${base["xl/workbook.xml"]}`],
    ["customXml/security.xml", '<!DOCTYPE a [<!ENTITY x "expanded">]><a>&x;</a>'],
    ["customXml/security.xml", "<a>&unknown;</a>"],
    ["customXml/security.xml", "<a><b></a>"],
    ["customXml/security.xml", "<a>".repeat(41) + "</a>".repeat(41)],
    ["customXml/security.xml", `<a ${Array.from({ length: 33 }, (_, i) => `a${i}="x"`).join(" ")}/>`],
    ["xl/workbook.xml", base["xl/workbook.xml"].replace(`xmlns="${NS}"`, 'xmlns="urn:not-ooxml"')],
  ]) assert.throws(() => fileInfo(zipParts({ ...base, [part]: value }).toString("base64"), "xlsx"), /OOXML/);
  assert.throws(() => fileInfo(zipParts({ ...base, "customXml/security.xml": Buffer.from([255]) }).toString("base64"), "xlsx"), /UTF-8/);
});
test("duplicate sheets/relationships/cell references and relationship/namespace differentials refuse before SheetJS", () => {
  const base = workbookParts();
  const variants = [
    { ...base, "xl/workbook.xml": base["xl/workbook.xml"].replace("</sheets>", `<sheet name="data" sheetId="2" r:id="rId2"/></sheets>`) },
    { ...base, "xl/workbook.xml": base["xl/workbook.xml"].replace('r:id="rId1"', 'r:id="rId1" xmlns:e="urn:evil" e:id="rId2"') },
    { ...base, "xl/_rels/workbook.xml.rels": `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { ...base, "xl/_rels/workbook.xml.rels": `<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/worksheet" Target="./worksheets/sheet1.xml"/></Relationships>` },
    { ...base, "xl/_rels/workbook.xml.rels": base["xl/_rels/workbook.xml.rels"].replace('Target="worksheets/sheet1.xml"', 'TargetMode="External" Target="https://example.invalid/sheet.xml"') },
    { ...base, "xl/_rels/workbook.xml.rels": base["xl/_rels/workbook.xml.rels"].replace('Target="worksheets/sheet1.xml"', 'Target="../worksheets/sheet1.xml"') },
    { ...base, "xl/_rels/workbook.xml.rels": base["xl/_rels/workbook.xml.rels"].replace('Target="worksheets/sheet1.xml"', 'Target="%2E%2E/worksheets/sheet1.xml"') },
    workbookParts(`<row r="2">${textCell("A2", "0001")}${numberCell("B2", "900001")}${numberCell("B2", "900002")}</row>`),
    workbookParts(`<row r="2">${textCell("A3", "0001")}</row>`),
    workbookParts(`<row r="2">${textCell("A2", "0001")}<c r="C2"><v>1500.25</v><v>1</v></c></row>`),
  ];
  for (const parts of variants) assert.throws(() => inspect(zipParts(parts).toString("base64"), { format: "xlsx", sheet: "Data", headerRow: 1 }), /OOXML|Duplicate|Worksheet|worksheet/);
});
test("normalized workbook-local targets and original raw bytes/settings are independently bound", () => {
  const parts = workbookParts(); parts["xl/_rels/workbook.xml.rels"] = parts["xl/_rels/workbook.xml.rels"].replace('Target="worksheets/sheet1.xml"', 'Target="/xl/worksheets/sheet1.xml"');
  assert.equal(plan(request(parts)).changes, 2);
  const input = request(), p = plan(input), changed = request({ ...workbookParts(), "customXml/provenance.xml": "<metadata>Different original bytes</metadata>" });
  assert.equal(plan(changed).changes, 2); assert.notEqual(plan(changed).fileDigest, p.fileDigest);
  assert.throws(() => simulate(changed, p.binding), /Stale/);
});
