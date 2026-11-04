// TEST-ONLY aggregate acceptance runner for the paired harness (PLAN-H3-A1 §5). Runs node's test runner (via a version-
// checked tsx; never installs anything) with the TAP reporter and exits NONZERO unless: exit 0, fail=0, cancelled=0,
// skipped=0, todo=0, tests>0 and every listed file exists. Mock SQL harness results are NOT real SQL/HTTP/hosted evidence.
//   HARNESS_TSX_PATH=<dir of tsx package> (optional; default: the npm npx cache under $HOME) ; expected tsx 4.23.15
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
export const TSX_VERSION = "4.23.15";
export interface Verdict { ok: boolean; reasons: string[]; counts: Record<string, number> }
export function evaluate(tap: string, exitCode: number | null, files: readonly string[], exists: (f: string) => boolean = existsSync): Verdict {
  const counts: Record<string, number> = {}; const reasons: string[] = [];
  for (const k of ["tests", "suites", "pass", "fail", "cancelled", "skipped", "todo"]) { const m = [...tap.matchAll(new RegExp(`^# ${k} (\\d+)$`, "gm"))]; if (m.length !== 1) reasons.push(`summary line '# ${k}' missing or repeated`); else counts[k] = Number(m[0][1]); }
  if (!files.length) reasons.push("no test files listed");
  for (const f of files) if (!exists(f)) reasons.push(`missing test file ${f}`);
  if (exitCode !== 0) reasons.push(`runner exit ${exitCode}`);
  if (!(counts.tests > 0)) reasons.push("zero tests");
  for (const k of ["fail", "cancelled", "skipped", "todo"]) if (counts[k] !== 0) reasons.push(`${k}=${counts[k]}`);
  return { ok: reasons.length === 0, reasons, counts };
}
export function resolveTsx(env: Record<string, string | undefined> = process.env): string {
  const cands = env.HARNESS_TSX_PATH ? [env.HARNESS_TSX_PATH] : (() => { const c = join(env.HOME ?? "", ".npm/_npx"); return existsSync(c) ? readdirSync(c).map((d) => join(c, d, "node_modules/tsx")) : []; })();
  for (const d of cands) { try { if (JSON.parse(readFileSync(join(d, "package.json"), "utf8")).version === TSX_VERSION && existsSync(join(d, "dist/cli.mjs"))) return d; } catch { /* next */ } }
  throw new Error(`harness: tsx ${TSX_VERSION} not found (set HARNESS_TSX_PATH); nothing is installed automatically`);
}
if (process.argv[1] && /run-acceptance\.ts$/.test(process.argv[1])) {
  const files = process.argv.slice(2);
  let v: Verdict;
  try {
    const missing = files.filter((f) => !existsSync(f));
    if (missing.length || !files.length) v = evaluate("", null, files);
    else { const tsx = resolveTsx(); const r = spawnSync(process.execPath, [join(tsx, "dist/cli.mjs"), "--test", "--test-reporter=tap", ...files], { encoding: "utf8", env: { ...process.env, HARNESS_ACCEPTANCE: "1" }, maxBuffer: 64 << 20 });
      process.stdout.write(r.stdout ?? ""); process.stderr.write(r.stderr ?? ""); v = evaluate(r.stdout ?? "", r.status, files); }
  } catch (e) { v = { ok: false, reasons: [String((e as Error).message)], counts: {} }; }
  process.stdout.write(`\nACCEPTANCE ${v.ok ? "PASS" : "FAIL"} ${JSON.stringify(v.counts)}${v.reasons.length ? " reasons=" + JSON.stringify(v.reasons) : ""}\n`);
  process.exit(v.ok ? 0 : 1);
}
