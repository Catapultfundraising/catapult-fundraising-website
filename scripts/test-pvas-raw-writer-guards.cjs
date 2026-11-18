// Fictional, route-composed fixtures only. No SQL, network or Blob access.
const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const ts = require(process.cwd() + "/node_modules/typescript");
const env = { CRON_SECRET: "fictional-secret", PVAS_SQL_EXISTING_RECORDS_ENABLED: "1" };
const clients = ["csnf", "jag", "pvas", "wcbhc", "baq"];
let builds = [], puts = [], idBuilds = [], closes = 0, bodyReads = 0;
function compile(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  }}).outputText, {
    exports, process: { env }, Buffer, URL, console: { log() {} },
    require: name => {
      if (name === "next/server") return { NextResponse: Response };
      if (Object.hasOwn(deps, name)) return deps[name];
      throw new Error("Unmocked dependency: " + name);
    },
  });
  return exports;
}
const gate = compile("lib/portal-v2/pvas-canonical.ts");
const policy = compile("lib/portal-v2/pvas-existing-only.ts");
const deps = {
  "@/lib/portal-v2/pvas-canonical": gate,
  "@/lib/portal-v2/pvas-existing-only": policy,
  "@vercel/blob": { put: async (...args) => { puts.push(args); } },
  "node:zlib": require("node:zlib"),
  "@/lib/portal-refresh/common": { closePool: async () => { closes++; } },
  "@/lib/portal-refresh/ids": { buildIds: async c => { idBuilds.push(c); return [{ cptid: 1 }]; } },
  "@/lib/portal-v2/clients": { idsPath: c => `${c}/ids.json` },
};
for (const c of clients) {
  const prefix = c.toUpperCase();
  deps[`@/lib/${c}-data-store`] = {
    [`${prefix}_DATA_PATH`]: `${c}/snapshot.json`, [`${prefix}_RECORDS_PATH`]: `${c}/records.json`,
  };
  deps[`@/lib/${c}-tracking`] = { [`${prefix}_PIRS_PATH`]: `${c}/pirs.json` };
  deps[`@/lib/portal-refresh/${c}`] = { [`build${c[0].toUpperCase()}${c.slice(1)}`]: async () => {
    builds.push(c);
    return {
      snapshot: { asOf: "fictional", kpi: { gifts: 1, total: 1, donors: 1 },
        health: { constituents: 1 }, pool: [], highWealthCount: 0 },
      records: { index: [{ cptid: 1 }], records: { 1: {} } },
      pirs: { 1: {} },
    };
  }};
}
const upload = compile("app/api/pvas-data-upload/route.ts", deps);
const refresh = compile("app/api/portal-data-refresh/route.ts", deps);
function req(query = "", authorized = true, body = "") {
  const url = `https://fictional.invalid/api?${query}`;
  return { url, nextUrl: new URL(url),
    headers: new Headers(authorized ? { authorization: `Bearer ${env.CRON_SECRET}` } : {}),
    arrayBuffer: async () => { bodyReads++; return Buffer.from(body); },
  };
}
function reset() { builds = []; puts = []; idBuilds = []; closes = 0; bodyReads = 0; }
function untouched() {
  assert.deepEqual(builds, []); assert.deepEqual(puts, []);
  assert.deepEqual(idBuilds, []); assert.equal(bodyReads, 0); assert.equal(closes, 0);
}
async function refusal(response) {
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(policy.PVAS_EXISTING_ONLY)));
}
(async () => {
  reset();
  assert.equal((await upload.POST(req("", false))).status, 401);
  assert.equal((await refresh.POST(req("client=pvas", false))).status, 401);
  untouched();
  for (const kind of ["snapshot", "records", "pirs"]) {
    reset(); await refusal(await upload.POST(req(`kind=${kind}`))); untouched();
  }
  reset(); await refusal(await refresh.POST(req("client=pvas"))); untouched();
  reset(); await refusal(await refresh.GET(req("client=pvas&dry=1"))); untouched();
  reset(); assert.equal((await refresh.GET(req("client=all"))).status, 410); untouched();
  console.log("PASS auth first; enabled PVAS upload all kinds refused before body/PUT; explicit refresh and dry refused; GET write disabled");

  for (const query of ["", "client=all"]) {
    reset();
    const response = await refresh.POST(req(query)), result = await response.json();
    assert.equal(response.status, 200); assert.equal(result.ok, true);
    assert.deepEqual(builds, ["csnf", "jag", "wcbhc", "baq"]); assert.deepEqual(idBuilds, builds);
    assert.equal(puts.length, 16); assert.equal(closes, 1);
    assert.deepEqual(puts.map(p => p[0]), builds.flatMap(c => ["snapshot", "records", "pirs", "ids"].map(k => `${c}/${k}.json`)));
    assert.deepEqual(result.results.pvas, { skipped: true, saved: false, code: policy.PVAS_EXISTING_ONLY.code });
    for (const c of builds) assert.equal(result.results[c].saved, true);
  }
  for (const c of clients.filter(c => c !== "pvas")) {
    reset(); assert.equal((await refresh.POST(req(`client=${c}`))).status, 200);
    assert.deepEqual(builds, [c]); assert.equal(puts.length, 4);
  }
  reset();
  const dryResult = await (await refresh.GET(req("dry=1"))).json();
  assert.deepEqual(builds, ["csnf", "jag", "wcbhc", "baq"]); assert.equal(puts.length, 0);
  assert.equal(dryResult.results.pvas.skipped, true);
  console.log("PASS enabled all/default process original four in order with four original PUTs each and explicit PVAS skip; individual others and dry preserved");

  for (const flag of [undefined, "0", "true"]) {
    if (flag === undefined) delete env.PVAS_SQL_EXISTING_RECORDS_ENABLED;
    else env.PVAS_SQL_EXISTING_RECORDS_ENABLED = flag;
    reset(); const all = await (await refresh.POST(req())).json();
    assert.deepEqual(builds, clients); assert.equal(puts.length, 20);
    assert.equal(all.results.pvas.saved, true); assert.equal(all.results.pvas.skipped, undefined);
    reset(); assert.equal((await refresh.POST(req("client=pvas"))).status, 200);
    assert.deepEqual(builds, ["pvas"]); assert.equal(puts.length, 4);
    const bodies = { snapshot: { client: "pvas", kpi: {} }, records: { index: [], records: {} }, pirs: {} };
    for (const kind of Object.keys(bodies)) {
      reset(); const body = JSON.stringify(bodies[kind]);
      assert.equal((await upload.POST(req(`kind=${kind}`, true, body))).status, 200);
      assert.equal(bodyReads, 1); assert.equal(puts.length, 1);
      assert.equal(puts[0][0], `pvas/${kind}.json`); assert.equal(puts[0][1], body);
    }
  }
  console.log("PASS flag absent/0/nonexact1 preserves all five refresh targets and all original PVAS upload kinds");
})().catch(e => { console.error(e); process.exitCode = 1; });
