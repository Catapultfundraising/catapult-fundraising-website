import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { reportListsRoute, strictSavedQuery, type EngageCaller } from "./report-lists";

// In-memory stand-in for the Engage op with the same contract (409 name/version, 404 missing, per-client rows).
type Row = { id: number; client: string; name: string; query: unknown; version: number; created_by: string; updated_by: string; deleted?: boolean; importKey?: string };
const rows: Row[] = []; let seq = 0; const calls: { client: string; op: string; body: Record<string, unknown> }[] = [];
const out = (r: Row) => ({ id: r.id, name: r.name, query: r.query, version: r.version, created_by: r.created_by, updated_by: r.updated_by, created_at: "", updated_at: "" });
const fake: EngageCaller = async (client, op, b) => {
  calls.push({ client, op, body: b });
  const live = rows.filter((r) => r.client === client && !r.deleted);
  const find = () => live.find((r) => r.id === b.id);
  const clash = (n: string, id?: number) => live.some((r) => r.name.toLowerCase() === n.toLowerCase() && r.id !== id);
  switch (op) {
    case "listReportLists": return { status: 200, body: { lists: live.map(out) } };
    case "createReportList": {
      const ik = b.importKey as string | undefined; const prev = ik && rows.find((r) => r.client === client && r.importKey === ik);
      if (prev) return { status: 200, body: { list: out(prev), alreadyImported: true } };
      if (clash(b.name as string)) return { status: 409, body: { error: "taken", code: "name_taken" } };
      const r = { id: ++seq, client, name: b.name as string, query: b.query, version: 1, created_by: b.by as string, updated_by: b.by as string, importKey: ik };
      rows.push(r); return { status: 200, body: { list: out(r) } };
    }
    case "updateReportList": case "deleteReportList": {
      const r = find(); if (!r) return { status: 404, body: { error: "gone", code: "not_found" } };
      if (r.version !== b.expectedVersion) return { status: 409, body: { error: `changed by ${r.updated_by}`, code: "version_conflict", current: out(r) } };
      if (op === "deleteReportList") { r.deleted = true; r.version++; return { status: 200, body: { deleted: r.id } }; }
      if (b.name && clash(b.name as string, r.id)) return { status: 409, body: { error: "taken", code: "name_taken" } };
      Object.assign(r, b.name ? { name: b.name } : {}, b.query ? { query: b.query } : {}, { version: r.version + 1, updated_by: b.by });
      return { status: 200, body: { list: out(r) } };
    }
  }
  return { status: 400, body: { error: "unknown op" } };
};
const yes = async () => true, no = async () => false;
const req = (method: string, body?: unknown) => new NextRequest("https://x.test/api/pvas-data-report-lists", { method, ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}) });
const q = { fields: ["cptid", "name", "lifetime"], filters: [{ field: "lifetime", op: "gte", value: "1000" }], search: "", sort: { field: "lifetime", dir: -1 }, top: 250 };

(async () => {
  const pvas = reportListsRoute("pvas", yes, fake), csnf = reportListsRoute("csnf", yes, fake), denied = reportListsRoute("pvas", no, fake);
  const j = async (r: Response) => ({ s: r.status, b: await r.json() });
  // auth before anything
  for (const m of ["GET", "POST", "PATCH", "DELETE"] as const) { const n = calls.length; assert.equal((await denied[m](req(m, m === "GET" ? undefined : { name: "x", query: q, by: "A" }))).status, 401); assert.equal(calls.length, n); }
  // create + list roundtrip
  let r = await j(await pvas.POST(req("POST", { name: "Top 250 lifetime", query: q, by: "Staff A", client: "csnf" })));
  assert.equal(r.s, 200); const id = r.b.list.id; assert.equal(calls.at(-1)!.client, "pvas", "client comes from the route, not the body");
  assert.deepEqual((await j(await pvas.GET(req("GET")))).b.lists.map((l: { name: string }) => l.name), ["Top 250 lifetime"]);
  // cross-client isolation
  assert.equal((await j(await csnf.GET(req("GET")))).b.lists.length, 0);
  assert.equal((await csnf.PATCH(req("PATCH", { id, expectedVersion: 1, name: "hijack", by: "B" }))).status, 404);
  assert.equal((await csnf.DELETE(req("DELETE", { id, expectedVersion: 1, by: "B" }))).status, 404);
  // no silent overwrite on duplicate names (case-insensitive)
  r = await j(await pvas.POST(req("POST", { name: "top 250 LIFETIME", query: q, by: "Staff B" }))); assert.equal(r.s, 409); assert.equal(r.b.code, "name_taken");
  // concurrent update: A and B both opened v1; A wins, B gets 409 with current version and nothing is overwritten
  r = await j(await pvas.PATCH(req("PATCH", { id, expectedVersion: 1, query: { ...q, top: 100 }, by: "Staff A" }))); assert.equal(r.s, 200); assert.equal(r.b.list.version, 2);
  r = await j(await pvas.PATCH(req("PATCH", { id, expectedVersion: 1, query: { ...q, top: 5 }, by: "Staff B" }))); assert.equal(r.s, 409); assert.equal(r.b.code, "version_conflict"); assert.equal(r.b.current.version, 2);
  assert.equal(rows[0].query && (rows[0].query as { top: number }).top, 100);
  // rename then delete (versioned)
  r = await j(await pvas.PATCH(req("PATCH", { id, expectedVersion: 2, name: "Top 100", by: "Staff A" }))); assert.equal(r.b.list.name, "Top 100");
  assert.equal((await pvas.DELETE(req("DELETE", { id, expectedVersion: 2, by: "Staff A" }))).status, 409);
  assert.equal((await pvas.DELETE(req("DELETE", { id, expectedVersion: 3, by: "Staff A" }))).status, 200);
  assert.equal((await j(await pvas.GET(req("GET")))).b.lists.length, 0);
  // explicit legacy import is retry-safe
  const a = await j(await pvas.POST(req("POST", { name: "Browser list", query: q, by: "A", importKey: "local-123" })));
  const b2 = await j(await pvas.POST(req("POST", { name: "Browser list", query: q, by: "A", importKey: "local-123" })));
  assert.equal(a.b.list.id, b2.b.list.id); assert.equal(b2.b.alreadyImported, true);
  // validation: unknown field / op / bad top / missing name or attribution never reach SQL
  const n = calls.length;
  for (const bad of [{ name: "x", query: { ...q, fields: ["cptid", "ssn"] }, by: "A" }, { name: "x", query: { ...q, filters: [{ field: "nope", op: "equals", value: "1" }] }, by: "A" },
    { name: "x", query: { ...q, sort: { field: "nope", dir: 1 } }, by: "A" }, { name: "x", query: { ...q, filters: [{ field: "lifetime", op: "drop", value: "1" }] }, by: "A" },
    { name: "x", query: { ...q, filters: [{ field: "lifetime", op: "gte", value: "abc" }] }, by: "A" }, { name: "x", query: { ...q, top: 25001 }, by: "A" },
    { name: "x", query: { ...q, filters: [{ field: "lifetime", op: "contains", value: "1" }] }, by: "A" }, { name: "x", query: { ...q, filters: [{ field: "name", op: "gte", value: "1" }] }, by: "A" },
    { name: "x", query: { ...q, evil: 1 }, by: "A" }, { name: "", query: q, by: "A" }, { name: "x", query: q, by: "" }, { name: "x", query: q, by: "A", importKey: "../x" }]) {
    const res = await j(await pvas.POST(req("POST", bad))); assert.equal(res.s, 400, JSON.stringify(bad).slice(0, 120));
  }
  assert.equal((await pvas.PATCH(req("PATCH", { id: "x", expectedVersion: 1, name: "n", by: "A" }))).status, 400);
  assert.equal(calls.length, n, "invalid input never forwarded");
  assert.throws(() => strictSavedQuery({ ...q, fields: [] }));
  // SQL / Engage unavailable fails closed (503, nothing claimed saved)
  const down = reportListsRoute("pvas", yes, async () => { throw new Error("ECONNREFUSED"); });
  const sqlDown = reportListsRoute("pvas", yes, async () => ({ status: 500, body: { error: "Login failed for user engage_app" } }));
  for (const rt of [down, sqlDown]) {
    assert.equal((await rt.GET(req("GET"))).status, 503);
    const res = await j(await rt.POST(req("POST", { name: "x", query: q, by: "A" }))); assert.equal(res.s, 503); assert.doesNotMatch(JSON.stringify(res.b), /engage_app|Nothing was changed/); assert.match(res.b.error, /Could not confirm/);
  }
  console.log("report-lists tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
