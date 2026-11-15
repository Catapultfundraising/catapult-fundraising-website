const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");
const ts = require("typescript");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app/api/nov15-dashboard-backup-read/route.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const NOW = Date.parse("2026-01-01T12:00:00.000Z");
const prefix = "DASHBOARD_BACKUP_READ_NOV15_";
const secret = "synthetic-unit-test-secret";
const hash = (v) => crypto.createHash("sha256").update(v).digest("hex");
const chunkSize = 2 * 1024 * 1024;

function fixture(options = {}) {
  const calls = [], imports = [];
  let aborted = false, cancelled = false;
  const env = {
    VERCEL_ENV: "preview", [prefix + "ENABLED"]: "true",
    [prefix + "STARTS_AT"]: "2026-01-01T11:30:00Z",
    [prefix + "EXPIRES_AT"]: "2026-01-01T12:30:00.000Z",
    PORTAL_WRITE_SECRET: secret, BLOB_STORE_ID: "store_e7SitofNOvoFTa0p",
    VERCEL_GIT_COMMIT_SHA: "a".repeat(40), ...options.env,
  };
  const bytes = options.bytes ?? Buffer.from('{"synthetic":true,"unicode":"✓"}\n');
  const get = async (p, args) => {
    calls.push({ path: p, args });
    args.abortSignal.addEventListener("abort", () => { aborted = true; });
    if (options.get) return options.get(p, args);
    if (options.missing) return null;
    return {
      statusCode: 200,
      blob: { pathname: options.path ?? p, size: options.size ?? bytes.length, etag: "synthetic-etag" },
      stream: new ReadableStream({
        start(c) { if (!options.hangStream) { c.enqueue(bytes); c.close(); } },
        cancel() { cancelled = true; },
      }),
    };
  };
  const exports = {};
  class Clock extends Date { static now() { return NOW; } }
  const context = {
    exports, process: { env }, Buffer, URL, Request, Response, ReadableStream, AbortController,
    Date: Clock, clearTimeout,
    setTimeout: (fn, ms) => setTimeout(fn, options.fastTimeout ? 2 : ms),
    require: (name) => {
      imports.push(name);
      if (name === "node:crypto") return crypto;
      if (name === "@vercel/blob") return { get };
      throw new Error("Forbidden import");
    },
  };
  vm.runInNewContext(code, context);
  const request = (query = "client=baq&kind=snapshot&chunk=0", init = {}) => new Request(
    "https://synthetic.invalid/api/nov15-dashboard-backup-read?" + query,
    { headers: { authorization: `Bearer ${secret}` }, ...init },
  );
  return { route: exports, request, calls, imports, bytes, aborted: () => aborted, cancelled: () => cancelled };
}

async function error(f, status, code, query, init) {
  const r = await f.route.GET(f.request(query, init));
  assert.equal(r.status, status);
  assert.deepEqual(await r.json(), { error: code });
  assert.match(r.headers.get("cache-control"), /private.*no-store/);
}

test("preview-only default-off, strict TTL and store guards never read", async (t) => {
  const cases = [
    ["production", { VERCEL_ENV: "production" }, 404, "DISABLED"],
    ["development", { VERCEL_ENV: "development" }, 404, "DISABLED"],
    ["missing flag", { [prefix + "ENABLED"]: undefined }, 404, "DISABLED"],
    ["false flag", { [prefix + "ENABLED"]: "false" }, 404, "DISABLED"],
    ["noncanonical flag", { [prefix + "ENABLED"]: "TRUE" }, 404, "DISABLED"],
    ["missing start", { [prefix + "STARTS_AT"]: undefined }, 403, "INVALID_WINDOW"],
    ["invalid calendar", { [prefix + "STARTS_AT"]: "2026-02-30T11:30:00Z" }, 403, "INVALID_WINDOW"],
    ["invalid leap date", { [prefix + "STARTS_AT"]: "2026-02-29T11:30:00Z" }, 403, "INVALID_WINDOW"],
    ["24h normalized", { [prefix + "STARTS_AT"]: "2025-12-31T24:00:00Z" }, 403, "INVALID_WINDOW"],
    ["offset", { [prefix + "STARTS_AT"]: "2026-01-01T11:30:00+00:00" }, 403, "INVALID_WINDOW"],
    ["window too long", { [prefix + "EXPIRES_AT"]: "2026-01-01T13:00:00.001Z" }, 403, "INVALID_WINDOW"],
    ["reversed", { [prefix + "EXPIRES_AT"]: "2026-01-01T11:00:00Z" }, 403, "INVALID_WINDOW"],
    ["equal", { [prefix + "EXPIRES_AT"]: "2026-01-01T11:30:00Z" }, 403, "INVALID_WINDOW"],
    ["expired exactly", { [prefix + "EXPIRES_AT"]: "2026-01-01T12:00:00Z" }, 403, "INACTIVE_WINDOW"],
    ["future", { [prefix + "STARTS_AT"]: "2026-01-01T12:01:00Z" }, 403, "INACTIVE_WINDOW"],
    ["wrong store", { BLOB_STORE_ID: "wrong" }, 503, "STORE_MISMATCH"],
    ["missing store", { BLOB_STORE_ID: undefined }, 503, "STORE_MISMATCH"],
    ["token fallback denied", { BLOB_READ_WRITE_TOKEN: "synthetic" }, 503, "STORE_MISMATCH"],
    ["URL override denied", { VERCEL_BLOB_API_URL: "https://synthetic.invalid" }, 503, "STORE_MISMATCH"],
    ["public URL override denied", { NEXT_PUBLIC_VERCEL_BLOB_API_URL: "https://synthetic.invalid" }, 503, "STORE_MISMATCH"],
  ];
  for (const [name, env, status, code] of cases) await t.test(name, async () => {
    const f = fixture({ env }); await error(f, status, code); assert.equal(f.calls.length, 0);
  });
});

test("bearer required; cookies and malformed bearer cannot authorize", async () => {
  for (const headers of [{}, { cookie: "catapult_research_auth=synthetic" }, { authorization: "Bearer wrong" },
    { authorization: `bearer ${secret}` }, { authorization: "Bearer " + "x".repeat(8193) }]) {
    const f = fixture(); await error(f, 401, "UNAUTHORIZED", undefined, { headers }); assert.equal(f.calls.length, 0);
  }
  const f = fixture({ env: { PORTAL_WRITE_SECRET: undefined } }); await error(f, 401, "UNAUTHORIZED"); assert.equal(f.calls.length, 0);
});

test("strict query rejects arbitrary paths, unknown/duplicate/missing keys and noncanonical chunks", async () => {
  for (const query of [
    "", "client=baq&kind=snapshot", "client=baq&chunk=0", "kind=ids&chunk=0",
    "client=baq&kind=snapshot&chunk=0&path=other", "client=baq&kind=snapshot&chunk=0&client=baq",
    "client=baq&kind=snapshot&kind=ids&chunk=0", "client=baq&kind=snapshot&chunk=0&chunk=0",
    "client=BAQ&kind=snapshot&chunk=0", "client=../baq&kind=snapshot&chunk=0",
    "client=baq&kind=https://example.invalid&chunk=0",
    ...["-1", "00", "01", "1.0", "1e0", "+1", "32", "999999999999999999999", ""].map((v) => `client=baq&kind=snapshot&chunk=${v}`),
  ]) { const f = fixture(); await error(f, 400, "INVALID_QUERY", query); assert.equal(f.calls.length, 0); }
});

test("all twenty fixed paths: one uncached private store-bound OIDC get, raw-byte hashes and no writes", async () => {
  for (const client of ["baq", "csnf", "jag", "pvas", "wcbhc"]) for (const kind of ["snapshot", "records", "pirs", "ids"]) {
    const f = fixture(), r = await f.route.GET(f.request(`client=${client}&kind=${kind}&chunk=0`));
    assert.equal(r.status, 200);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), f.bytes);
    assert.equal(r.headers.get("x-content-sha256"), hash(f.bytes));
    assert.equal(r.headers.get("x-blob-sha256"), hash(f.bytes));
    assert.equal(r.headers.get("x-blob-etag-sha256"), hash("synthetic-etag"));
    assert.equal(r.headers.get("x-blob-bytes"), String(f.bytes.length));
    assert.equal(r.headers.get("x-chunk-count"), "1");
    assert.equal(r.headers.get("x-chunk-index"), "0");
    assert.equal(r.headers.get("x-deployment-sha"), "a".repeat(40));
    assert.equal(r.headers.get("content-type"), "application/octet-stream");
    for (const header of ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"]) assert.match(r.headers.get(header), /no-store/);
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0].path, `${client}-data/${kind}.json`);
    const args = f.calls[0].args;
    assert.deepEqual(Object.keys(args).sort(), ["abortSignal", "access", "storeId", "useCache"]);
    assert.equal(args.access, "private"); assert.equal(args.useCache, false); assert.equal(args.storeId, "store_e7SitofNOvoFTa0p");
    assert.deepEqual(f.imports.sort(), ["@vercel/blob", "node:crypto"]);
  }
  assert.doesNotMatch(source, /\b(?:put|del|list|sql|fetch)\s*\(/);
});

test("chunks reassemble exact bytes including BOM, final partial chunk; bounds and empty blob", async () => {
  const bytes = Buffer.concat([Buffer.from([239, 187, 191]), Buffer.alloc(chunkSize * 2 + 7, 120)]);
  const pieces = [];
  for (let i = 0; i < 3; i++) {
    const f = fixture({ bytes }), r = await f.route.GET(f.request(`client=pvas&kind=records&chunk=${i}`));
    assert.equal(r.status, 200); assert.equal(f.calls.length, 1);
    assert.equal(r.headers.get("x-blob-sha256"), hash(bytes));
    assert.equal(r.headers.get("x-chunk-count"), "3");
    const part = Buffer.from(await r.arrayBuffer()); assert.ok(part.length <= chunkSize);
    assert.equal(r.headers.get("x-content-sha256"), hash(part)); pieces.push(part);
  }
  assert.deepEqual(Buffer.concat(pieces), bytes);
  await error(fixture({ bytes }), 416, "CHUNK_OUT_OF_RANGE", "client=pvas&kind=records&chunk=3");
  const f = fixture({ bytes: Buffer.alloc(0) }), r = await f.route.GET(f.request());
  assert.equal(r.status, 200); assert.equal(r.headers.get("x-chunk-count"), "1"); assert.equal((await r.arrayBuffer()).byteLength, 0);
});

test("missing required and optional blobs have explicit distinct 404 codes", async () => {
  for (const kind of ["snapshot", "records", "pirs", "ids"]) {
    const f = fixture({ missing: true });
    await error(f, 404, kind === "snapshot" || kind === "records" ? "REQUIRED_BLOB_MISSING" : "OPTIONAL_BLOB_MISSING", `client=baq&kind=${kind}&chunk=0`);
    assert.equal(f.calls.length, 1);
  }
});

test("denial/error, metadata and stream byte caps, timeout and abort expose no exceptions", async () => {
  const f = fixture({ get: async () => { throw new Error("synthetic sensitive vendor detail"); } });
  await error(f, 502, "READ_FAILED"); assert.equal(f.calls.length, 1);
  const cap = 64 * 1024 * 1024;
  const oversized = fixture({ size: cap + 1 }); await error(oversized, 413, "BLOB_TOO_LARGE"); assert.ok(oversized.aborted());
  const actualOversize = fixture({ bytes: new Uint8Array(cap + 1), size: 1 }); await error(actualOversize, 413, "BLOB_TOO_LARGE");
  await error(fixture({ size: -1 }), 413, "BLOB_TOO_LARGE");
  await error(fixture({ size: 1 }), 502, "SIZE_MISMATCH");
  await error(fixture({ path: "other/secret.json" }), 502, "INVALID_BLOB");
  const hungGet = fixture({ fastTimeout: true, get: () => new Promise(() => {}) });
  await error(hungGet, 504, "READ_TIMEOUT"); assert.ok(hungGet.aborted());
  const hungStream = fixture({ fastTimeout: true, hangStream: true });
  await error(hungStream, 504, "READ_TIMEOUT"); assert.ok(hungStream.aborted()); assert.ok(hungStream.cancelled());
  const controller = new AbortController(); controller.abort();
  await error(fixture({ hangStream: true }), 499, "READ_ABORTED", undefined, { signal: controller.signal });
});

test("GET-only includes explicit HEAD protection without any store read", async () => {
  const f = fixture();
  for (const method of ["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.equal(f.route[method]().status, 405);
    await error(f, 405, "METHOD_NOT_ALLOWED", undefined, { method });
  }
  assert.equal(f.calls.length, 0);
});
