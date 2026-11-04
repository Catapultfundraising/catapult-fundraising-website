// H3a self-tests for the aggregate acceptance runner (pure; no child, no network). TEST-ONLY.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { evaluate, resolveTsx, TSX_VERSION } from "./harness/run-acceptance";
const sum = (o: Partial<Record<string, number>>) => ["tests", "suites", "pass", "fail", "cancelled", "skipped", "todo"].map((k) => `# ${k} ${o[k] ?? 0}`).join("\n") + "\n";
const ok = { tests: 5, pass: 5 };
const yes = () => true;
test("[RUNNER] pass only when exit0, tests>0 and fail/cancelled/skipped/todo all 0 and files exist", () => {
  assert.equal(evaluate(sum(ok), 0, ["a.ts"], yes).ok, true);
  for (const [k, v] of [["fail", 1], ["cancelled", 1], ["skipped", 1], ["todo", 1]] as const) { const r = evaluate(sum({ ...ok, [k]: v }), 0, ["a.ts"], yes); assert.equal(r.ok, false, k); assert.ok(r.reasons.includes(`${k}=1`)); }
  assert.ok(evaluate(sum({ tests: 0 }), 0, ["a.ts"], yes).reasons.includes("zero tests"));
  assert.ok(evaluate(sum(ok), 1, ["a.ts"], yes).reasons.includes("runner exit 1"));
  assert.ok(evaluate(sum(ok), null, ["a.ts"], yes).reasons.includes("runner exit null"));
  assert.ok(evaluate(sum(ok), 0, ["a.ts", "gone.ts"], (f) => f === "a.ts").reasons.includes("missing test file gone.ts"));
  assert.ok(evaluate(sum(ok), 0, [], yes).reasons.includes("no test files listed"));
  assert.equal(evaluate("no summary", 0, ["a.ts"], yes).ok, false);
  assert.equal(evaluate(sum(ok) + sum(ok), 0, ["a.ts"], yes).ok, false, "repeated summary refused");
});
test("[RUNNER] tsx resolution: explicit HARNESS_TSX_PATH must be the checked version; never installs", () => {
  assert.throws(() => resolveTsx({ HARNESS_TSX_PATH: "/nonexistent", HOME: "/nonexistent" }), new RegExp(`tsx ${TSX_VERSION} not found`));
  assert.throws(() => resolveTsx({ HOME: "/nonexistent" }), /not found/);
});
test("[RUNNER] executable end-to-end: missing listed file => exit 1, nothing spawned", () => {
  const r = spawnSync(process.execPath, [...process.execArgv, "scripts/harness/run-acceptance.ts", "scripts/does-not-exist.ts"], { encoding: "utf8" });
  assert.equal(r.status, 1); assert.match(r.stdout, /ACCEPTANCE FAIL .*missing test file scripts\/does-not-exist\.ts/);
});
