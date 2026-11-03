// SYNTHETIC tests for the review-only baseline attestation packet builder + read-only gateway. Engage is a stubbed
// fetch; no network, no SQL. Golden destination digests were generated from the pinned backend (c836a12) by calling
// its own resolve() + attestDestDigest(); they are NOT live acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

Object.assign(process.env, { RESEARCH_PASSWORD: "localpw", RESEARCH_AUTH_SECRET: "localsec", SOURCE_IMPORT_PREVIEW: "enabled", ENGAGE_SOURCE_IMPORT_URL: "https://engage.invalid/api/source-import", PORTAL_WRITE_SECRET: "w".repeat(32) });
const COOKIE = createHash("sha256").update("localpw:localsec").digest("hex");
const GOLD = JSON.parse(readFileSync(new URL("./fixtures/baseline-dest-digests-c836a12.json", import.meta.url), "utf8"));

let engage: (b: Record<string, unknown>) => Response = () => Response.json({});
const calls: Record<string, unknown>[] = [];
globalThis.fetch = (async (_u: unknown, init: { body: string }) => { const b = JSON.parse(init.body); calls.push(b); return engage(b); }) as unknown as typeof fetch;
const route = () => import("../app/api/research-source-import/route");
const post = async (body: Record<string, unknown>, opts: { cookie?: boolean; origin?: string } = {}) => (await route()).POST(new NextRequest("http://localhost:3100/api/research-source-import", { method: "POST",
  headers: { "content-type": "application/json", origin: opts.origin ?? "http://localhost:3100", host: "localhost:3100", ...(opts.cookie === false ? {} : { cookie: `catapult_research_auth=${COOKIE}` }) }, body: JSON.stringify(body) }));
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const draft = (o: Record<string, unknown> = {}) => ({ client: "baq", table: "master", fileName: "prior-export.csv", sourceDate: "2025-06-30", mapping: { ID: "CPTID", Town: "City" }, personHeader: "", linkHeader: "",
  provenanceStatement: "This prior source export is the file originally loaded into this destination.", attestedBy: "Pat Example", attestedAt: "2026-11-03T12:00:00Z", reference: "TICKET-0001", confirmed: true, ...o });
const plan = (o: Record<string, unknown> = {}) => ({ planDigest: "a".repeat(64), rows: [{ key: "7", col: "City", value: " Springfield " }], held: [{ key: 8, col: "City", reason: "current differs from attested prior export (possible manual edit)" }], counts: { eligible: 1, held: 1, "current differs from attested prior export (possible manual edit)": 1 }, ...o });

test("golden parity: website destination digest equals backend attestDestDigest for every existing destination", async () => {
  const { attestDestination } = await import("../lib/portal-v2/source-baseline-attest");
  const { REGISTRY_META } = await import("../lib/portal-v2/source-registry");
  assert.equal(GOLD.rev, REGISTRY_META.rev, "registry revision synchronized");
  const kinds = new Set<string>();
  for (const [k, v] of Object.entries(GOLD.vectors) as [string, { digest: string; keyKind: string; personLink: string | null; xw: unknown; cols: number }][]) {
    const [c, t] = k.split("."); const r = attestDestination(c, t);
    assert.ok(r.ok, k); if (!r.ok) continue;
    assert.equal(r.dest.digest, v.digest, k); assert.equal(r.dest.cols.length, v.cols, k);
    assert.equal(r.dest.keyKind, v.keyKind); assert.equal(r.dest.personLink, v.personLink); assert.deepEqual(r.dest.xw, v.xw);
    kinds.add(v.xw ? "crosswalk" : v.personLink ? "person" : "plain"); if (v.keyKind === "text") kinds.add("text");
  }
  assert.deepEqual([...kinds].sort(), ["crosswalk", "person", "plain", "text"]);
  assert.equal(Object.keys(GOLD.vectors).length, 33);
  assert.equal(attestDestination("baq", "no_such").ok, false);
  assert.equal(attestDestination("jag", "_load_log").ok, false, "nonwritable metadata is never a destination");
});

test("auth, origin, context and unconfigured read path (no network)", async () => {
  calls.length = 0;
  assert.equal((await post({ op: "baselineContext", client: "baq", table: "master" }, { cookie: false })).status, 401);
  assert.equal((await post({ op: "baselineContext", client: "baq", table: "master" }, { origin: "https://evil.example" })).status, 403);
  const ctx = await (await post({ op: "baselineContext", client: "baq", table: "master" })).json();
  assert.equal(ctx.available, true); assert.equal(ctx.key, "CPTID"); assert.equal(ctx.personRequired, false); assert.ok(!("destDigest" in ctx));
  const notes = await (await post({ op: "baselineContext", client: "pvas", table: "notes" })).json();
  assert.equal(notes.personRequired, true); assert.equal(notes.linkRequired, false); assert.ok(!notes.columns.includes("CPTID"), "person link never a mapped column");
  const prev = process.env.SOURCE_IMPORT_PREVIEW; delete process.env.SOURCE_IMPORT_PREVIEW;
  const r = await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: b64("ID,Town\n7,X\n"), draft: draft() });
  assert.equal(r.status, 501); assert.equal(calls.length, 0, "nothing sent when unconfigured");
  const s = await post({ op: "baselineStatus", client: "baq", table: "master", requestId: "b".repeat(32) }); assert.equal(s.status, 501);
  process.env.SOURCE_IMPORT_PREVIEW = prev;
  assert.equal((await post({ op: "baselineApply", client: "baq", table: "master" })).status, 400, "no apply op on the website");
});

test("packet: exact values, server file sha, explicit attestor fields, no defaults; response minimized", async () => {
  calls.length = 0; engage = () => Response.json(plan());
  const csv = "\uFEFFID,Town\n7, Springfield \n8,06001\n";
  const res = await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: b64(csv), draft: draft() });
  assert.equal(res.status, 200); const j = await res.json();
  assert.equal(calls.length, 1); const sent = calls[0] as { op: string; packet: Record<string, unknown>; prior: { key: number; values: Record<string, string> }[] };
  assert.deepEqual(Object.keys(sent).sort(), ["op", "packet", "prior"]); assert.equal(sent.op, "baselinePreview");
  assert.deepEqual(sent.prior, [{ key: 7, values: { City: " Springfield " } }, { key: 8, values: { City: "06001" } }], "exact strings, never trimmed or numeric-cast");
  const pk = sent.packet as { priorFile: { sha256: string }; approvedBy: string; approvedAt: string; approvalRef: string; destDigest: string };
  assert.equal(pk.priorFile.sha256, createHash("sha256").update(Buffer.from(csv, "utf8")).digest("hex"), "sha of exact uploaded bytes incl. BOM");
  assert.equal(pk.approvedBy, "Pat Example"); assert.equal(pk.approvedAt, "2026-11-03T12:00:00Z"); assert.equal(pk.approvalRef, "TICKET-0001");
  assert.equal(pk.destDigest, GOLD.vectors["baq.master"].digest);
  assert.deepEqual(j.plan, { planDigest: "a".repeat(64), eligible: 1, held: 1, reasons: [{ reason: "current differs from attested prior export (possible manual edit)", count: 1 }] });
  assert.ok(!JSON.stringify(j).includes("Springfield"), "no values returned"); assert.ok(!JSON.stringify(j).includes('"key"'), "no keys returned");
  const ex = JSON.parse(j.export);
  assert.match(ex.status, /proposed/); assert.ok(!/ready/i.test(j.export)); assert.ok(Buffer.byteLength(j.export) <= 64 * 1024);
  assert.ok(!j.export.includes("Springfield") && !j.export.includes("06001"), "export has no row values");
  assert.equal(ex.attestor.name, "Pat Example"); assert.equal(ex.priorRows, 2); assert.equal(ex.fileSha256 ?? ex.priorFile.sha256, pk.priorFile.sha256);
  // stable: rebuilding the same draft yields the same packet + export
  const j2 = await (await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: b64(csv), draft: draft() })).json();
  assert.equal(j2.export, j.export); assert.deepEqual(calls[1], calls[0]);
});

test("draft validation refuses missing/defaulted provenance and bad mappings before any network", async () => {
  calls.length = 0; engage = () => Response.json(plan());
  const csv = b64("ID,Town,Person,Extra\n7,X,9001,y\n");
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ confirmed: false }, /Confirm/], [{ attestedBy: "" }, /Attestor/], [{ attestedAt: "" }, /UTC/], [{ attestedAt: "2026-11-03 12:00" }, /UTC/],
    [{ reference: "" }, /Reference/], [{ reference: "draft" }, /Reference/], [{ sourceDate: "" }, /date/], [{ sourceDate: "2026-02-30" }, /date/],
    [{ provenanceStatement: "looks right" }, /Statement/], [{ fileName: "" }, /file name/],
    [{ mapping: { Town: "City" } }, /key CPTID/], [{ mapping: { ID: "CPTID" } }, /value column/], [{ mapping: { ID: "CPTID", Town: "City", Extra: "City" } }, /once/],
    [{ mapping: { ID: "CPTID", Town: "No_Such" } }, /approved column/], [{ mapping: JSON.parse('{"ID":"CPTID","__proto__":"City"}') }, /disallowed/],
    [{ personHeader: "Person" }, /no person link/], [{ extra: 1 }, /unknown fields/],
  ];
  for (const [o, re] of cases) {
    const r = await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: csv, draft: draft(o) });
    assert.equal(r.status, 400, JSON.stringify(o)); assert.match((await r.json()).error, re, JSON.stringify(o));
  }
  const bad = [["ID,Town\n007,X\n", /exact positive/], ["ID,Town\n7.0,X\n", /exact positive/], ["ID,Town\n2147483648,X\n", /exact positive/], ["ID,Town\n 7,X\n", /exact positive/], ["ID,Town\n7,X\n7\n", /exactly one value/], ["ID,ID\n7,8\n", /duplicate/]];
  for (const [c, re] of bad) { const r = await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: b64(c as string), draft: draft() }); assert.equal(r.status, 400, c as string); assert.match((await r.json()).error, re as RegExp); }
  assert.equal((await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: "%%%", draft: draft() })).status, 400);
  assert.equal((await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: Buffer.from([0x49, 0x44, 0x0a, 0xff]).toString("base64"), draft: draft() })).status, 400, "invalid UTF-8");
  assert.equal((await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: csv, draft: draft(), extra: 1 })).status, 400, "unknown body field");
  for (const [c, o] of [["ID,Town,Bad\u0007\n7,X,y\n", {}], ["ID,Town,constructor\n7,X,y\n", {}], ["ID,Town," + "h".repeat(201) + "\n7,X,y\n", {}], ["ID,Town,Extra\n7,X,y\n", { mapping: { ID: "CPTID", Town: "City", Extra: 5 } }], ["ID,Town\n7,X\n", { mapping: { ID: "CPTID", Town: "City", Nope: "" } }]] as [string, Record<string, unknown>][]) {
    const r = await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: b64(c), draft: draft(o) }); assert.equal(r.status, 400, c.slice(0, 30) + JSON.stringify(o));
  }
  const big = "ID,Town\n" + Array.from({ length: 501 }, (_, i) => `${i + 1},X`).join("\n");
  assert.match((await (await post({ op: "baselinePreview", client: "baq", table: "master", fileB64: b64(big), draft: draft() })).json()).error, /split the file/);
  assert.equal(calls.length, 0, "no network for any refused draft");
});

test("person-linked and crosswalk tables need separate exact person/link columns", async () => {
  const { attestDestination } = await import("../lib/portal-v2/source-baseline-attest");
  calls.length = 0; engage = () => Response.json(plan({ rows: [], held: [], counts: { eligible: 0, held: 0 } }));
  const nd = attestDestination("pvas", "notes"); assert.ok(nd.ok); const col = nd.ok ? nd.dest.cols.find((c) => c !== "ID")! : "";
  const nb = (o: Record<string, unknown>) => draft({ client: "pvas", table: "notes", mapping: { NoteID: "ID", Text: col }, personHeader: "Person", ...o });
  const csv = b64(`NoteID,Text,Person\n11,hello,9001\n12,again,9001\n`);
  assert.match((await (await post({ op: "baselinePreview", client: "pvas", table: "notes", fileB64: csv, draft: nb({ personHeader: "" }) })).json()).error, /person CPTID/);
  assert.match((await (await post({ op: "baselinePreview", client: "pvas", table: "notes", fileB64: b64("NoteID,Text,Person\n11,hello,9001.5\n"), draft: nb({}) })).json()).error, /exact positive whole CPTID/);
  assert.match((await (await post({ op: "baselinePreview", client: "pvas", table: "notes", fileB64: csv, draft: nb({ mapping: { NoteID: "ID", Text: col, Person: "CPTID" } }) })).json()).error, /approved column/);
  assert.equal(calls.length, 0);
  const ok = await post({ op: "baselinePreview", client: "pvas", table: "notes", fileB64: csv, draft: nb({}) }); assert.equal(ok.status, 200);
  assert.deepEqual((calls[0] as { prior: unknown[] }).prior, [{ key: 11, values: { [col]: "hello" }, person: 9001 }, { key: 12, values: { [col]: "again" }, person: 9001 }]);
  // crosswalk (text link)
  const xd = attestDestination("csnf", "Raw_Data_Gift_File"); assert.ok(xd.ok); const xcol = xd.ok ? xd.dest.cols.find((c) => c !== xd.dest.key)! : "";
  const xk = xd.ok ? xd.dest.key : "";
  const xb = draft({ client: "csnf", table: "Raw_Data_Gift_File", mapping: { GiftID: xk, V: xcol }, personHeader: "Person", linkHeader: "Acct" });
  calls.length = 0;
  assert.match((await (await post({ op: "baselinePreview", client: "csnf", table: "Raw_Data_Gift_File", fileB64: b64("GiftID,V,Person,Acct\n5,x,9001, A1\n"), draft: xb })).json()).error, /source link/);
  assert.match((await (await post({ op: "baselinePreview", client: "csnf", table: "Raw_Data_Gift_File", fileB64: b64("GiftID,V,Person,Acct\n5,x,9001,A1\n"), draft: { ...xb, linkHeader: "" } })).json()).error, /source link/);
  assert.equal(calls.length, 0);
  assert.equal((await post({ op: "baselinePreview", client: "csnf", table: "Raw_Data_Gift_File", fileB64: b64("GiftID,V,Person,Acct\n5,x,9001,A1\n"), draft: xb })).status, 200);
  assert.deepEqual((calls[0] as { prior: unknown[] }).prior, [{ key: 5, values: { [xcol]: "x" }, person: 9001, link: "A1" }]);
});

test("upstream responses are strictly validated and sanitized", async () => {
  const go = async () => post({ op: "baselinePreview", client: "baq", table: "master", fileB64: b64("ID,Town\n7,X\n"), draft: draft() });
  engage = () => Response.json({ ...plan(), approved: true }); let r = await go(); assert.equal(r.status, 400); assert.match((await r.json()).error, /Unexpected/);
  engage = () => Response.json(plan({ rows: [{ key: "7", col: "City", value: "x", current: "secret" }] })); r = await go(); assert.equal(r.status, 400);
  engage = () => Response.json(plan({ counts: { eligible: 5, held: 1 } })); r = await go(); assert.equal(r.status, 400);
  engage = () => Response.json({ error: "boom with internal detail Server=tcp:x" }, { status: 500 }); r = await go(); assert.equal(r.status, 502); assert.ok(!JSON.stringify(await r.json()).includes("tcp"));
  engage = () => Response.json({ error: "registry revision mismatch Password=PRIVATE-TEST-MARKER", code: "invalid" }, { status: 400 }); r = await go(); { const t = await r.json(); assert.equal(r.status, 400); assert.equal(t.code, "upstream_refused"); assert.ok(!JSON.stringify(t).includes("PRIVATE")); }
  engage = () => Response.json(plan({ held: [{ key: 8, reason: "Password=PRIVATE-TEST-MARKER" }], counts: { eligible: 1, held: 1, "Password=PRIVATE-TEST-MARKER": 1 } })); r = await go(); assert.equal(r.status, 400); assert.ok(!JSON.stringify(await r.json()).includes("PRIVATE"), "unknown reason refused, not echoed");
  engage = () => Response.json(plan({ counts: { eligible: 1, held: 1, "current differs from attested prior export (possible manual edit)": 1, extra: 0 } })); r = await go(); assert.equal(r.status, 400, "unknown counts key refused");
  engage = () => Response.json(plan({ counts: { eligible: 1, held: 1, "current differs from attested prior export (possible manual edit)": 2 } })); r = await go(); assert.equal(r.status, 400, "reason count mismatch refused");
  engage = () => { throw new Error("network"); }; r = await go(); assert.equal(r.status, 502); assert.match((await r.json()).error, /nothing was saved/);
});

test("baselineStatus: scoped, found:false is unconfirmed, extra upstream fields dropped", async () => {
  calls.length = 0;
  assert.equal((await post({ op: "baselineStatus", client: "baq", table: "master", requestId: "xyz" })).status, 400);
  assert.equal((await post({ op: "baselineStatus", client: "prepared_nope", table: "master", requestId: "b".repeat(32) })).status, 400);
  assert.equal(calls.length, 0);
  engage = () => Response.json({ found: false, note: "x" });
  const a = await (await post({ op: "baselineStatus", client: "baq", table: "master", requestId: "b".repeat(32) })).json();
  assert.equal(a.found, false); assert.match(a.message, /Unconfirmed/); assert.ok(!/not saved/i.test(a.message));
  assert.deepEqual(calls[0], { op: "baselineStatus", client: "baq", table: "master", requestId: "b".repeat(32) });
  engage = () => Response.json({ found: true, status: "committed", result: { secret: "s" } });
  const c = await (await post({ op: "baselineStatus", client: "baq", table: "master", requestId: "b".repeat(32) })).json();
  assert.deepEqual(c, { found: true, status: "committed", message: "Recorded as committed." });
  engage = () => Response.json({ found: true, status: "Password=PRIVATE-TEST-MARKER" });
  const u = await (await post({ op: "baselineStatus", client: "baq", table: "master", requestId: "b".repeat(32) })).json();
  assert.equal(u.status, "unknown"); assert.ok(!JSON.stringify(u).includes("PRIVATE"));
  calls.length = 0;
  for (const bad of [{ client: ["baq"], table: "master" }, { client: "baq", table: ["master"] }, { client: "baq", table: "master", requestId: ["b".repeat(32)] }]) {
    const r = await post({ op: "baselineStatus", requestId: "b".repeat(32), ...bad }); assert.equal(r.status, 400, JSON.stringify(bad));
  }
  assert.equal((await post({ op: "baselineContext", client: ["baq"], table: "master" })).status, 400);
  assert.equal((await post({ op: "baselinePreview", client: "baq", table: ["master"], fileB64: b64("ID,Town\n7,X\n"), draft: draft() })).status, 400);
  assert.equal(calls.length, 0, "non-string scalars refused before network");
  engage = () => Response.json({ error: "x" }, { status: 503 });
  assert.equal((await post({ op: "baselineStatus", client: "baq", table: "master", requestId: "b".repeat(32) })).status, 502);
});
