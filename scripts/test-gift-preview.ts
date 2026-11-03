// SYNTHETIC tests for the review-only JAG provisional gift-ID preview. Fictional data only; no network, no SQL.
// fetch is stubbed to fail loudly, proving the gift ops make no upstream calls.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { parseCsv } from "../lib/portal-v2/csv-parse";
import { stageGift, exportGift, neutralize, verifyGiftToken, GIFT_TOKEN_TTL_MS, PENDING, STATUS, WARNING, APPENDED } from "../lib/portal-v2/gift-preview";

Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "localsec" });
const COOKIE = createHash("sha256").update("localpw:localsec").digest("hex");
let fetches = 0; globalThis.fetch = (async () => { fetches++; throw new Error("no network in tests"); }) as unknown as typeof fetch;
const route = () => import("../app/api/research-source-import/route");
const post = async (body: Record<string, unknown>, cookie = true) => (await route()).POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST",
  headers: { "content-type": "application/json", origin: "http://localhost:3100", host: "localhost:3100", ...(cookie ? { cookie: `catapult_research_auth=${COOKIE}` } : {}) }, body: JSON.stringify(body) }));
const S = "test-secret"; const NOW = Date.UTC(2026, 10, 3, 12);
const CSV = "Donor No,Amount,Year,Memo\r\n9001,25.00,2025,=SUM(A1)\r\n9001,25.00,2025, @cmd\r\n,10,2024,ok\r\n09002,5,2024,\"multi\nline\"\r\n3000000000,1,2024,-5\r\n";
const MAP = { "Donor No": "CPTID", Amount: "Gift_Amount", Year: "Calendar_Year" };
const enc = (s: string) => new TextEncoder().encode(s);
const st = (csv = CSV, mapping: unknown = MAP, o: Record<string, unknown> = {}) => stageGift({ client: "jag", table: "raw_master_giving_history", bytes: enc(csv), grid: parseCsv(csv), mapping, secret: S, now: NOW, ...o });

test("every row HELD pending reconciliation; zero automatic proposals; CPTID syntax only (exact int32 text)", () => {
  const r = st();
  assert.equal(r.counts.held, 5); assert.equal(r.counts.proposedNew, 0);
  for (const row of r.rows) assert.equal(row.reasons[0], PENDING);
  assert.deepEqual(r.rows.map((x) => x.cptidStatus), ["syntax-ok", "syntax-ok", "blank", "invalid", "out-of-range"]);
  assert.equal(st("CPTID\r\n 9001\r\n9001.0\r\n-1\r\n2147483647\r\n2147483648\r\n", { CPTID: "CPTID" }).rows.map((x) => x.cptidStatus).join(), "invalid,invalid,invalid,syntax-ok,out-of-range");
});

test("identical gifts stay separate with distinct 128-bit provisional IDs; fresh nonce per preview", () => {
  const a = st(), b = st();
  assert.match(a.rows[0].pid, /^PROV-[a-f0-9]{32}$/);
  assert.notEqual(a.rows[0].pid, a.rows[1].pid);
  assert.equal(new Set(a.rows.map((r) => r.pid)).size, a.rows.length);
  assert.notEqual(a.rows[0].pid, b.rows[0].pid, "new preview, new IDs");
});

test("reserved/returned-ID headers and PROV- cells refuse the whole file even when unmapped", () => {
  for (const h of ["Catapult Gift ID", " provisional  preview id", "Preview Warning", "HOLD REASONS"]) assert.throws(() => st(`CPTID,${h}\r\n1,x\r\n`, { CPTID: "CPTID" }), /reserved/);
  assert.throws(() => st("CPTID,Other\r\n1, prov-abc\r\n", { CPTID: "CPTID" }), /provisional preview ID/);
});

test("mapping validation: CPTID required, registry columns only, no double mapping, duplicate headers refused", () => {
  assert.throws(() => st(CSV, { Amount: "Gift_Amount" }), /CPTID/);
  assert.throws(() => st(CSV, { ...MAP, Memo: "dbo.anything" }), /not a JAG gift column/);
  assert.throws(() => st(CSV, { ...MAP, Memo: "Gift_Amount" }), /mapped twice/);
  assert.throws(() => st(CSV, { ...MAP, Nope: "Record_Type" }), /unknown header/);
  assert.throws(() => st(CSV, { ...MAP, Memo: 5 }), /must be text/);
  assert.throws(() => st("CPTID,cptid\r\n1,2\r\n", { CPTID: "CPTID" }), /duplicate/);
  assert.throws(() => st(CSV, MAP, { client: "pvas" }), /only for JAG/);
});

test("formula neutralization covers leading whitespace/control variants; ordinary text unchanged", () => {
  for (const c of ["=1", "+1", "-1", "@x", " =1", "\t=1", "\n=1", "\r+1", "\u0001@x", "\t", "\nabc"]) assert.equal(neutralize(c).v, "'" + c, JSON.stringify(c));
  for (const c of ["Anne-Marie", "a=b", "25.00", "", "x@y.com"]) assert.equal(neutralize(c).changed, false);
});

test("export: header row first, original columns kept in order, appended warnings on EVERY row, status always HELD", () => {
  const r = st(); const dec = ["proposed-new", "proposed-existing", "held", "held", "held"];
  const x = exportGift({ client: "jag", table: "raw_master_giving_history", bytes: enc(CSV), grid: parseCsv(CSV), mapping: MAP, decisions: dec, token: r.token, secret: S, now: NOW + 1000, fileName: "gifts 2026.csv" });
  const g = parseCsv(x.csv);
  assert.deepEqual(g[0], ["Donor No", "Amount", "Year", "Memo", ...APPENDED]);
  assert.equal(g.length, 6);
  for (const [i, row] of g.slice(1).entries()) { assert.equal(row[4], r.rows[i].pid); assert.equal(row[5], STATUS); assert.equal(row[8], WARNING); assert.match(row[7], /pending reconciliation/); }
  assert.equal(g[1][6], "proposed new (unverified, not recorded)"); assert.equal(g[3][6], "held");
  assert.equal(g[1][3], "'=SUM(A1)"); assert.equal(g[2][3], "' @cmd"); assert.equal(g[5][3], "'-5"); assert.equal(g[4][3], "multi\nline"); assert.equal(g[1][0], "9001");
  assert.equal(x.escapedCells, 3); assert.equal(x.fileName, "gifts_2026.PROVISIONAL-REVIEW-COPY.csv");
  const m = JSON.parse(x.sidecar); assert.equal(m.escapedCells, 3); assert.equal(m.held, 5); assert.deepEqual(m.operatorProposalsNotRecorded, { held: 3, "proposed-new": 1, "proposed-existing": 1 });
  assert.ok(!x.sidecar.includes("9001") && !x.sidecar.includes("SUM"), "metadata only, no donor values"); assert.ok(x.sidecar.length < 65536);
});

test("export rebinds: tampered token, expiry, other file, other mapping, other client, bad decisions are refused", () => {
  const r = st(); const base = { client: "jag", table: "raw_master_giving_history", bytes: enc(CSV), grid: parseCsv(CSV), mapping: MAP, decisions: Array(5).fill("held"), token: r.token, secret: S, now: NOW, fileName: "a.csv" };
  assert.ok(exportGift(base).csv);
  const [p, sg] = r.token.split("."); const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), rows: 9 })).toString("base64url");
  assert.throws(() => exportGift({ ...base, token: `${forged}.${sg}` }), /invalid/);
  assert.throws(() => exportGift({ ...base, token: r.token + "x" }), /invalid/);
  assert.throws(() => exportGift({ ...base, now: NOW + GIFT_TOKEN_TTL_MS + 1 }), /expired/);
  assert.throws(() => exportGift({ ...base, secret: "other" }), /invalid/);
  const csv2 = CSV.replace("25.00,2025,=", "26.00,2025,=");
  assert.throws(() => exportGift({ ...base, bytes: enc(csv2), grid: parseCsv(csv2) }), /File changed/);
  assert.throws(() => exportGift({ ...base, mapping: { ...MAP, Memo: "Campaign_Appeal" } }), /Mapping changed/);
  assert.throws(() => exportGift({ ...base, decisions: ["held"] }), /every row/);
  assert.throws(() => exportGift({ ...base, decisions: Array(5).fill("approved") }), /every row/);
  // an earlier session token stays valid until expiry (stateless; no server-side revocation is claimed)
  const r2 = st(); assert.ok(verifyGiftToken(r.token, S, NOW)); assert.notEqual(r2.token, r.token);
});

test("606-row file stages; 5000 cap", () => {
  const big = "CPTID,Gift_Amount\r\n" + Array.from({ length: 606 }, (_, i) => `${1000 + (i % 50)},10`).join("\r\n");
  const r = st(big, { CPTID: "CPTID", Gift_Amount: "Gift_Amount" }); assert.equal(r.rows.length, 606); assert.equal(new Set(r.rows.map((x) => x.pid)).size, 606);
  assert.throws(() => st("CPTID\r\n" + "1\r\n".repeat(5001), { CPTID: "CPTID" }), /5000/);
});

test("route: staff auth required, JAG-only, exact bodies, no upstream calls, export round trip", async () => {
  const fileB64 = Buffer.from(CSV).toString("base64");
  assert.equal((await post({ op: "giftStage", client: "jag", table: "raw_master_giving_history", fileB64, mapping: MAP }, false)).status, 401);
  assert.equal((await post({ op: "giftStage", client: "pvas", table: "notes", fileB64, mapping: MAP })).status, 400);
  assert.equal((await post({ op: "giftStage", client: "jag", table: "raw_master_giving_history", fileB64, mapping: MAP, extra: 1 })).status, 400);
  assert.equal((await post({ op: "giftStage", client: ["jag"], table: "raw_master_giving_history", fileB64, mapping: MAP })).status, 400);
  const ctx = await post({ op: "giftContext", client: "jag", table: "raw_master_giving_history" }); assert.ok((await ctx.json()).columns.includes("CPTID"));
  const s = await post({ op: "giftStage", client: "jag", table: "raw_master_giving_history", fileB64, mapping: MAP }); assert.equal(s.status, 200);
  const j = await s.json(); assert.equal(j.counts.held, 5);
  const e = await post({ op: "giftExport", client: "jag", table: "raw_master_giving_history", fileB64, mapping: MAP, decisions: Array(5).fill("held"), token: j.token, fileName: "x.csv" });
  assert.equal(e.status, 200); assert.ok((await e.json()).csv.includes("PROV-"));
  const bad = await post({ op: "giftStage", client: "jag", table: "raw_master_giving_history", fileB64: Buffer.from("CPTID,Catapult Gift ID\r\n1,2\r\n").toString("base64"), mapping: { CPTID: "CPTID" } });
  assert.equal(bad.status, 400); assert.match((await bad.json()).error, /reserved/);
  assert.equal(fetches, 0, "no upstream/network calls");
});
