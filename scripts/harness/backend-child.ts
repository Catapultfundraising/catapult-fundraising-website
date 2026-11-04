// TEST-ONLY backend child for the paired harness (H2). Runs under the BACKEND's own tsx/Next 14 (cwd = verified backend
// extract) and serves the REAL handleSourceImport over stdio JSON frames. Frames: request | seed | failpoint | inspect |
// reset | shutdown. Seed/failpoint/inspect exist only in this test protocol. No ports, no network, no env mutation.
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import { createMock, LostResponseAfterCommit, type StatementDef, type Failpoint } from "./mock-sql";
const B = process.cwd(); const req = createRequire(B + "/package.json");
type Deps = { env: Record<string, string>; activation?: unknown; giftRegistrations?: unknown[]; prepared?: unknown[]; policies?: unknown[] };
(async () => {
  const { handleSourceImport } = await import(B + "/lib/sourceImportRoute.ts");
  const { SOURCE_SQL } = await import(B + "/lib/sourceImport.ts");
  const TABLES = ["source_import.requests", "engage.portal_gift_overrides"] as const;
  const R = "source_import.requests", O = "engage.portal_gift_overrides";
  const DEFS: StatementDef[] = [
    { id: "source.lockRequest", sql: SOURCE_SQL.lockRequest, params: ["rid"], write: false, tables: [R], exec: (t, p) => ({ rows: t[R].filter((r) => r.request_id === p.rid).map((r) => ({ request_id: r.request_id, client: r.client, payload_hash: r.payload_hash, status: r.status, result_json: r.result_json })), affected: 0 }) },
    { id: "source.status", sql: SOURCE_SQL.status, params: ["rid", "client"], write: false, tables: [R], exec: (t, p) => ({ rows: t[R].filter((r) => r.request_id === p.rid && r.client === p.client).map((r) => ({ request_id: r.request_id, status: r.status, result_json: r.result_json, created_at: r.created_at })), affected: 0 }) },
    { id: "source.lockGiftOverrides", sql: SOURCE_SQL.lockGiftOverrides, params: ["client"], write: false, tables: [O], exec: (t, p) => ({ rows: t[O].filter((r) => r.client === p.client && r.superseded === 0).slice(0, 1).map((r) => ({ id: r.id })), affected: 0 }) },
  ];
  const m = createMock(DEFS, TABLES); let deps: Deps = { env: {} };
  let crashOnNextTx = false;
  const txf = async (fn: never) => { if (crashOnNextTx) { process.stdout.write(JSON.stringify({ kind: "crashing" }) + "\n"); process.exit(70); } return m.txf(fn); };
  const out = (o: unknown) => process.stdout.write(JSON.stringify(o) + "\n");
  const rl = createInterface({ input: process.stdin });
  for await (const line of rl) {
    let f: Record<string, any>; try { f = JSON.parse(line); } catch { out({ kind: "error", error: "bad frame" }); continue; }
    const id = f.id;
    try {
      if (f.kind === "request") {
        const r = await handleSourceImport(new Request(f.url, { method: f.method, headers: f.headers, body: f.body }), { reader: async () => m.reader, txf, env: deps.env,
          ...(deps.activation !== undefined ? { activation: deps.activation } : {}), ...(deps.giftRegistrations ? { giftRegistrations: deps.giftRegistrations } : {}), ...(deps.prepared ? { prepared: deps.prepared } : {}), ...(deps.policies ? { policies: deps.policies } : {}) } as never);
        out({ kind: "response", id, status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() });
      } else if (f.kind === "seed") {
        if (f.tables) m.seed(f.tables);
        if (f.deps) { if (typeof f.deps !== "object" || typeof f.deps.env !== "object") throw new Error("seed.deps.env required"); deps = f.deps; }
        out({ kind: "ok", id });
      } else if (f.kind === "failpoint") {
        if (f.name === "crashOnNextTx") crashOnNextTx = true; else m.setFailpoint(f.name as Failpoint);
        out({ kind: "ok", id });
      } else if (f.kind === "inspect") {
        const loaded = Object.keys(req.cache);
        out({ kind: "inspect", id, counts: m.counts(), trace: m.trace, stats: m.stats, statements: DEFS.map((d) => ({ id: d.id, params: d.params, write: d.write, tables: d.tables })),
          nextVersion: req("next/package.json").version, nextServer: req.resolve("next/server"), outsideBackend: loaded.filter((p) => !p.startsWith(B + "/")).map((p) => p.replace(/^.*\/scripts\/harness\//, "harness/")), ...(f.dump ? { tables: m.dump() } : {}) });
      } else if (f.kind === "reset") { m.reset(); deps = { env: {} }; crashOnNextTx = false; out({ kind: "ok", id }); }
      else if (f.kind === "shutdown") { out({ kind: "ok", id }); process.exit(0); }
      else out({ kind: "error", id, error: "unknown frame kind" });
    } catch (e) { out({ kind: "error", id, error: e instanceof LostResponseAfterCommit ? "lost" : String((e as Error)?.message ?? e).slice(0, 200) }); }
  }
})().catch((e) => { process.stdout.write(JSON.stringify({ kind: "fatal", error: String(e?.message ?? e).slice(0, 300) }) + "\n"); process.exit(1); });
