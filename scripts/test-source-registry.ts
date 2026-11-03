import test from "node:test"; import assert from "node:assert/strict";
import { classifySourceMapping, SOURCE_FIELDS, SOURCE_WRITE_ENABLED } from "../lib/portal-v2/source-registry";
test("disabled by default", () => assert.equal(SOURCE_WRITE_ENABLED, false));
test("unknown destination reported not dropped", () => { const r = classifySourceMapping("baq","master",{"X":"DROP TABLE"}); assert.equal(r.length,1); assert.equal(r[0].state,"unsupported"); });
test("jag gift history held", () => { const f = SOURCE_FIELDS.find(x=>x.c==="jag"&&x.t==="raw_master_giving_history"); assert.ok(f); assert.equal(f!.st,"held"); });
test("all five clients present", () => { for (const c of ["jag","csnf","pvas","wcbhc","baq"]) assert.ok(SOURCE_FIELDS.some(x=>x.c===c)); });
test("no row_id destination", () => assert.ok(!SOURCE_FIELDS.some(x=>x.col==="row_id")));
