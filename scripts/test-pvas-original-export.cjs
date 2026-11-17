// Synthetic-only execution of the actual route; no credentials/network/storage.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { createHash } = require("node:crypto");
const source = fs.readFileSync("app/api/internal/pvas-original-export/route.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const hash = b => createHash("sha256").update(b).digest("hex");
const etag = '"fixture-version-1"';
function load(options = {}) {
  const calls = [], exports = {};
  const env = { VERCEL_ENV: "production", CRON_SECRET: "synthetic-only", ...options.env };
  class Clock extends Date { static now() { return options.now ?? Date.parse("2026-11-17T15:00:00Z"); } }
  const context = {
    exports, Buffer, Response, Request, URL, Uint8Array, AbortController, Date: Clock,
    process: { env },
    setTimeout: options.fastTimeout ? fn => { queueMicrotask(fn); return 1; } : setTimeout,
    clearTimeout: options.fastTimeout ? () => {} : clearTimeout,
    require(name) {
      if (name === "node:crypto") return require(name);
      assert.equal(name, "@vercel/blob");
      return { get: async (...args) => { calls.push(args); return options.get ? options.get(...args) : null; } };
    },
  };
  vm.runInNewContext(compiled, context);
  return { route: exports, calls, env };
}
function blob(path, data, headers = {}, overrides = {}) {
  const bytes = Buffer.from(data);
  const h = new Headers({ etag, "content-length": String(bytes.length), ...headers });
  return { statusCode: 200, headers: h,
    blob: { pathname: path, etag: h.get("etag"), size: Number(h.get("content-length")) },
    stream: new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } }), ...overrides };
}
function req(params = { part: "records", mode: "metadata" }, options = {}) {
  return new Request("https://fictional.invalid/api/internal/pvas-original-export?" + new URLSearchParams(params),
    { headers: { authorization: "Bearer synthetic-only", ...options.headers }, method: options.method || "GET" });
}
function chunk(extra = {}) {
  return { part: "records", mode: "chunk", offset: "0", length: "3", total: "9", etag, ...extra };
}
function privateResponse(response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
}
async function status(box, request, expected, handler = "GET") {
  const response = await box.route[handler](request);
  assert.equal(response.status, expected); privateResponse(response);
  return response;
}

test("only production and fixed absolute unexpired window; no storage reads", async () => {
  for (const env of ["preview", "development", undefined]) {
    const b = load({ env: { VERCEL_ENV: env } });
    await status(b, req(), 404); assert.equal(b.calls.length, 0);
  }
  for (const now of ["2026-11-18T14:00:00.000Z", "2026-11-19T00:00:00Z"]) {
    const b = load({ now: Date.parse(now) }); await status(b, req(), 404); assert.equal(b.calls.length, 0);
  }
});
test("CRON_SECRET bearer only, never cookies or other project secrets", async () => {
  for (const authorization of ["", "Bearer wrong", "bearer synthetic-only", "Bearer synthetic-onlY"]) {
    const b = load();
    await status(b, req(undefined, { headers: { authorization, cookie: "catapult_pvas_auth=valid; catapult_research_auth=valid",
      "x-research-password": "synthetic-only" } }), 401);
    assert.equal(b.calls.length, 0);
  }
  const b = load({ env: { CRON_SECRET: undefined, PORTAL_WRITE_SECRET: "synthetic-only" } });
  await status(b, req(), 401); assert.equal(b.calls.length, 0);
});
test("all unsupported methods receive private errors without reading storage", async () => {
  const b = load();
  for (const method of ["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) await status(b, req(undefined, { method }), 405, method);
  assert.equal(b.calls.length, 0);
});
test("strict part enum and exact singleton parameters reject paths, duplicates and extensions", async () => {
  const b = load();
  for (const part of ["../records", "__proto__", "constructor", "Records", "https://example.test", "records.json", ""]) {
    await status(b, req({ part, mode: "metadata" }), 400);
  }
  for (const query of ["part=records", "part=records&mode=metadata&path=pvas-data/ids.json",
    "part=records&mode=metadata&part=ids", "part=records&mode=metadata&mode=chunk",
    "part=records&mode=metadata&offset=0", "part=records&mode=other"]) {
    await status(b, new Request("https://fictional.invalid/?" + query, { headers: { authorization: "Bearer synthetic-only" } }), 400);
  }
  assert.equal(b.calls.length, 0);
});
test("metadata preserves original binary identity for all five fixed paths", async () => {
  const bytes = Buffer.from([239, 187, 191, 0, 255, 13, 10, 65]);
  const modified = "Tue, 17 Nov 2026 12:00:00 GMT";
  for (const part of ["snapshot", "records", "tracking", "pirs", "ids"]) {
    const b = load({ get: path => blob(path, bytes, { "last-modified": modified }) });
    const response = await status(b, req({ part, mode: "metadata" }), 200);
    assert.deepEqual(await response.json(), { part, bytes: bytes.length, sha256: hash(bytes), etag, lastModified: modified });
    const [path, options] = b.calls[0]; assert.equal(path, `pvas-data/${part}.json`);
    assert.equal(options.access, "private"); assert.equal(options.useCache, false);
    assert.equal(options.headers["Accept-Encoding"], "identity");
    assert.equal(options.headers.Range, undefined); assert.ok(options.abortSignal);
    assert.equal(Object.hasOwn(options, "token"), false); assert.equal(Object.hasOwn(options, "oidcToken"), false);
  }
});
test("metadata omits unknown last-modified; empty source is not a default object", async () => {
  const b = load({ get: path => blob(path, "") });
  const response = await status(b, req(), 200);
  assert.deepEqual(await response.json(), { part: "records", bytes: 0, sha256: hash(""), etag });
});
test("metadata hashes original multiple stream segments incrementally", async () => {
  const parts = [Buffer.from([239, 187]), Buffer.from([191, 255, 0]), Buffer.from("\r\n{}")];
  const original = Buffer.concat(parts);
  const b = load({ get: path => blob(path, original, {}, {
    stream: new ReadableStream({ start(c) { for (const part of parts) c.enqueue(part); c.close(); } }),
  }) });
  const response = await status(b, req(), 200);
  assert.equal((await response.json()).sha256, hash(original));
});
test("exact256KiB raw chunk and final partial chunk with SDK status200", async () => {
  for (const [offset, length, total] of [[0, 262144, 262145], [262144, 1, 262145]]) {
    const bytes = Buffer.alloc(length, 255); bytes[0] = 0;
    const range = `bytes ${offset}-${offset + length - 1}/${total}`;
    const b = load({ get: path => blob(path, bytes, { "content-range": range }) });
    const response = await status(b, req(chunk({ offset: String(offset), length: String(length), total: String(total) })), 206);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.equal(response.headers.get("content-range"), range);
    assert.equal(response.headers.get("content-length"), String(length));
    assert.equal(response.headers.get("etag"), etag);
    assert.equal(response.headers.get("x-content-sha256"), hash(bytes));
    assert.equal(b.calls[0][1].headers.Range, `bytes=${offset}-${offset + length - 1}`);
    assert.equal(b.calls[0][1].headers["If-Match"], etag);
    assert.equal(b.calls[0][1].headers["Accept-Encoding"], "identity");
  }
});
test("invalid chunk bounds/etag cannot reach storage", async () => {
  const cases = [{ offset: "-1" }, { offset: "01" }, { offset: "1e0" }, { offset: "99999999999999999999999" },
    { length: "0" }, { length: "262145" }, { offset: "9" }, { offset: "8", length: "2" },
    { total: "0" }, { total: "67108865" }, { total: "NaN" }, { etag: 'W/"weak"' }, { etag: "unquoted" },
    { etag: '"line\nbreak"' }, { extra: "no" }];
  const b = load();
  for (const entry of cases) await status(b, req(chunk(entry)), 400);
  assert.equal(b.calls.length, 0);
});
test("ignored range, changed version/total, compression and malformed source fail closed", async () => {
  const cases = [
    { "content-range": null }, { "content-range": "bytes 1-3/9" }, { "content-range": "bytes 0-2/10" },
    { etag: '"changed"' }, { etag: 'W/"weak"' }, { "content-encoding": "gzip" }, { "content-length": "4" },
  ];
  for (const headers of cases) {
    const b = load({ get: path => blob(path, "abc", { "content-range": "bytes 0-2/9", ...headers }) });
    // null above is serialized by Headers as "null", still correctly rejected.
    await status(b, req(chunk()), 409);
  }
  for (const override of [{ blob: { pathname: "other", etag, size: 3 } }, { statusCode: 304, stream: null }]) {
    const b = load({ get: path => blob(path, "abc", { "content-range": "bytes 0-2/9" }, override) });
    await status(b, req(chunk()), 409);
  }
});
test("missing/malformed/oversized metadata never invents content", async () => {
  const missing = load(); await status(missing, req(), 404);
  for (const headers of [{ "content-length": "67108865" }, { "content-range": "bytes 0-2/9" },
    { etag: "" }, { "content-length": "-1" }, { "content-length": "01" }]) {
    const b = load({ get: path => blob(path, "abc", headers) }); await status(b, req(), 409);
  }
});
test("short/overlong/failed body and upstream exception yield static private failure", async () => {
  for (const data of ["ab", "abcd"]) {
    const b = load({ get: path => blob(path, data, { "content-length": "3", "content-range": "bytes 0-2/9" }) });
    const response = await status(b, req(chunk()), 503);
    assert.deepEqual(await response.json(), { error: "storage_unavailable" });
  }
  const b = load({ get: () => { throw new Error("DO-NOT-LEAK-source-or-secret"); } });
  const response = await status(b, req(), 503); assert.equal((await response.text()).includes("DO-NOT-LEAK"), false);
  const failed = load({ get: path => blob(path, "abc", {}, {
    stream: new ReadableStream({ start(c) { c.error(new Error("DO-NOT-LEAK")); } }),
  }) });
  await status(failed, req(), 503);
});
test("bounded stream deadline returns static failure and cancels hung source", async () => {
  let cancelled = false;
  const b = load({ fastTimeout: true, get: path => blob(path, "abc", {}, {
    stream: new ReadableStream({ cancel() { cancelled = true; } }),
  }) });
  await status(b, req(), 503); assert.equal(cancelled, true);
});
test("actual installed Blob SDK forwards range/precondition/identity headers, no network", async () => {
  const undici = require("undici"), realFetch = undici.fetch;
  const actualGet = require("@vercel/blob").get;
  const requests = [];
  try {
    undici.fetch = async (url, options) => {
      requests.push({ url, options });
      assert.equal(options.method, "GET");
      assert.equal(options.headers["Accept-Encoding"], "identity");
      assert.equal(options.headers.Range, "bytes=0-2");
      assert.equal(options.headers["If-Match"], etag);
      return new Response(Buffer.from("abc"), { status: 206,
        headers: { etag, "content-length": "3", "content-range": "bytes 0-2/9" } });
    };
    // Fictional token used only to exercise SDK URL construction against the
    // replaced fetch. No real credential, OIDC request or network is involved.
    const b = load({ get: (path, options) => actualGet(path, { ...options, token: "vercel_blob_rw_fixture_synthetic" }) });
    const response = await status(b, req(chunk()), 206);
    assert.equal(await response.text(), "abc"); assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://fixture.private.blob.vercel-storage.com/pvas-data/records.json?cache=0");
  } finally { undici.fetch = realFetch; }
});
