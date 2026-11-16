// OFFLINE, invented research cookie, actual embedded AddAndUpload and gateway.
// Backend wire/ledger ONLY mocked. Never real SQL, hosted authentication or release proof.
// Install Playwright + esbuild OUTSIDE repository and set BOUNDED_BROWSER_TOOLS.
const fs = require("node:fs"), path = require("node:path"), os = require("node:os"), http = require("node:http");
const assert = require("node:assert/strict"), crypto = require("node:crypto"), Module = require("node:module"), ts = require("typescript");
const tools = process.env.BOUNDED_BROWSER_TOOLS;
if (!tools || !path.isAbsolute(tools)) throw Error("Set BOUNDED_BROWSER_TOOLS to an isolated absolute node_modules directory.");
const { chromium } = require(path.join(tools, "playwright")), esbuild = require(path.join(tools, "esbuild"));
const root = process.cwd(), temp = fs.mkdtempSync(path.join(os.tmpdir(), "bounded-direct-browser-"));
const evidence = process.env.BOUNDED_BROWSER_EVIDENCE || temp; fs.mkdirSync(evidence, { recursive: true });
const original = Module._load;
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
Module._load = function(name, parent, main) {
  if (name === "server-only") return {};
  if (name.startsWith("@/")) name = path.join(root, name.slice(2));
  return original.call(this, name, parent, main);
};
Object.assign(process.env, { RESEARCH_PASSWORD: "fictional-local-browser-password", RESEARCH_AUTH_SECRET: "fictional-local-browser-secret" });
const cookie = crypto.createHash("sha256").update(`${process.env.RESEARCH_PASSWORD}:${process.env.RESEARCH_AUTH_SECRET}`).digest("hex");
const { NextRequest } = require("next/server");
const wire = require("../lib/portal-v2/directFileProtocol.ts"), { directFileGateway } = require("../lib/portal-v2/direct-file-gateway.server.ts");
const { readStrictTracking } = require("../lib/portal-v2/direct-tracking-state.ts");
const { workbookParts, zipParts } = require("./fixtures/source-ooxml-test-fixture.ts");
const hex = c => c.repeat(64), receipts = new Map(), calls = [], tests = [];
let commits = 0, lastBatch;
const dependencies = {
  enabled: () => true, secret: () => "fictional-browser-source-bearer-long-enough", now: () => Math.floor(Date.now() / 1000),
  aliases: () => null, tracking: client => readStrictTracking(client, async () => ({ kind: "absent" })),
  call: async (client, op, body = {}) => {
    calls.push({ client, op, requestId: body.batch?.requestId ?? body.requestId });
    if (op === "directFileCapabilities") return { status: 200, body: { protocol: "direct-file-v1", client, status: "known", reason: null, applyEnabled: true,
      templates: [{ template: "fictional-portfolio", revision: hex("a"), fields: ["ask", "note"], cutovers: { ask: "2026-01-01", note: "2026-01-01" } }], solicitorAliases: { status: "unavailable", entries: [] } } };
    if (op === "directFileResolve") return { status: 200, body: { protocol: "direct-file-v1", status: "known", client, template: body.template, registrationRevision: hex("a"),
      matches: [...body.ids].sort((a, b) => a.clientId.localeCompare(b.clientId)).map(x => ({ ...x, cptid: x.clientId === "0001" ? 900001 : null, reason: x.clientId === "0001" ? null : "unknown-id" })) } };
    if (op === "directFileStatus") return { status: 200, body: receipts.get(`${client}:${body.requestId}`) ?? { protocol: "direct-file-v1", client, requestId: body.requestId, status: "not-found", note: "May be in flight; never resend." } };
    if (!["directFilePreview", "directFileCommit"].includes(op)) throw Error("Fixture operation not provided");
    const b = body.batch, payloadHash = wire.directFileHash(b), previewHash = wire.directFileHash([b, body.manualContext.payload.observations]);
    lastBatch = b;
    if (op === "directFilePreview") return { status: 200, body: { protocol: "direct-file-v1", status: "previewed", plan: { payloadHash, previewHash, proof: hex("b"), expiresAt: Date.now() + 60000,
      decisions: b.cells.map(c => ({ ordinal: c.ordinal, cptid: c.cptid, field: c.field, before: null, after: c.value,
        action: c.field === "note" && c.noteResolution !== "new-event" ? "held" : c.field === "note" ? "append" : "set",
        reason: c.field === "note" && c.noteResolution !== "new-event" ? "historical-coverage-incomplete" : null, eventKey: c.field === "note" ? hex("c") : null })) } } };
    assert.equal(body.approval.previewHash, previewHash);
    const key = `${client}:${b.requestId}`, previous = receipts.get(key);
    if (previous) return { status: 200, body: { ...previous, replay: true } };
    commits++;
    const result = { protocol: "direct-file-v1", requestId: b.requestId, client, status: "committed", saved: b.cells.length, held: 0, unchanged: 0, payloadHash, previewHash,
      effect: "source-state-only", effectiveChanges: "not-asserted", publication: "not-requested" };
    receipts.set(key, result); return { status: 200, body: result };
  },
};
const routes = Object.fromEntries(["jag", "csnf", "pvas", "wcbhc", "baq"].map(c => [c, directFileGateway(c, dependencies)]));
const entry = path.join(temp, "entry.tsx"), bundle = path.join(temp, "bundle.js");
fs.writeFileSync(entry, `import React,{useState} from ${JSON.stringify(path.join(root, "node_modules/react"))};
import {createRoot} from ${JSON.stringify(path.join(root, "node_modules/react-dom/client"))};
import {PortalV2Provider,AddAndUpload} from ${JSON.stringify(path.join(root, "components/portal-v2.tsx"))};
function App(){const [client,setClient]=useState("pvas");return <main><h1>OFFLINE MOCK-PAIRED — no SQL or production writes</h1><p>Actual shared Add + Upload owner; fictional backend ledger. Not hosted/SQL acceptance.</p><label>Dashboard client<select aria-label="Dashboard client" value={client} onChange={e=>setClient(e.target.value)}>{["jag","csnf","pvas","wcbhc","baq"].map(c=><option key={c}>{c}</option>)}</select></label><h2>Add + Upload</h2><PortalV2Provider key={"provider:"+client} client={client}><AddAndUpload/></PortalV2Provider></main>}createRoot(document.getElementById("root")!).render(<App/>);`);
let server, browser, currentPage;
(async () => {
  await esbuild.build({ entryPoints: [entry], bundle: true, outfile: bundle, platform: "browser", format: "iife", jsx: "automatic", alias: { "@": root }, nodePaths: [path.join(root, "node_modules")], define: { "process.env.NODE_ENV": '"production"' } });
  let css = "";
  const cssDir = path.join(root, ".next/static/css");
  if (fs.existsSync(cssDir)) css = fs.readdirSync(cssDir).filter(x => x.endsWith(".css")).map(x => fs.readFileSync(path.join(cssDir, x), "utf8")).join("\n");
  server = http.createServer(async (req, res) => {
    try {
      if (req.url === "/bundle.js") { res.setHeader("content-type", "text/javascript"); return res.end(fs.readFileSync(bundle)); }
      if (req.url === "/styles.css") { res.setHeader("content-type", "text/css"); return res.end(css); }
      const match = /^\/api\/(jag|csnf|pvas|wcbhc|baq)-data-direct-import$/.exec(req.url);
      if (match) {
        const chunks = []; for await (const c of req) chunks.push(c);
        const response = await routes[match[1]](new NextRequest(`http://localhost:${server.address().port}${req.url}`, { method: req.method, headers: req.headers, body: Buffer.concat(chunks) }));
        res.writeHead(response.status, Object.fromEntries(response.headers)); return res.end(Buffer.from(await response.arrayBuffer()));
      }
      if (req.url.startsWith("/api/")) { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ configured: true, goal: 0, prospects: [], gifts: [], updates: [], batches: [], matches: [], groups: [], log: [], total: 0 })); }
      res.setHeader("content-type", "text/html");
      res.end(`<html><head><link rel="stylesheet" href="/styles.css"><style>:root{--navy:14 30 49;--ink:14 30 49;--line:220 225 231;--paper:245 242 236}body{margin:0;background:#f5f2ec;color:#0e1e31;font:15px Arial}main{max-width:1120px;margin:auto;padding:24px}h1{font:600 25px Georgia;margin-bottom:12px}h2{font:600 23px Georgia;margin:24px 0}select,input{max-width:100%}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
    } catch (e) { res.statusCode = 503; res.end(JSON.stringify({ error: "Offline fixture unavailable" })); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://localhost:${server.address().port}`;
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
  const page = await context.newPage(); currentPage = page; const errors = []; page.on("pageerror", e => { errors.push(e.message); console.error("Browser error:", e.message); });
  await page.goto(origin);
  await page.getByRole("link", { name: /Open research login/ }).waitFor();
  tests.push("Dashboard rendering does not substitute for research authentication; existing login navigation displayed.");
  await context.addCookies([{ name: "catapult_research_auth", value: cookie, url: origin }]); await page.reload();
  const section = page.getByRole("region", { name: "Direct notes and portfolio import" });
  const csv = "Client_ID,CPTID,Campaign Ask,New Notes\n0001,900001,1500.25,Fictional follow-up\n";
  async function fill(client, bytes = csv, name = "fictional.csv") {
    await page.getByLabel("Dashboard client").selectOption(client);
    await section.locator("select").first().selectOption("fictional-portfolio");
    await section.getByLabel("Source date", { exact: true }).fill("2026-10-19");
    await section.getByLabel("Declared staff name").fill("Fictional reviewer");
    await section.getByLabel("Direct source file").setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(bytes) });
    await section.getByLabel("Map Client_ID", { exact: true }).waitFor();
  }
  for (const client of ["jag", "csnf", "pvas", "wcbhc", "baq"]) {
    await fill(client);
    await section.getByRole("checkbox", { name: /Use selected source date/ }).check();
    await section.getByRole("button", { name: "Preview complete file" }).click();
    await section.getByText("historical-coverage-incomplete", { exact: false }).waitFor();
    assert.equal(commits, 0);
    // The reviewed choice intentionally invalidates/removes the old preview immediately.
    await section.getByRole("checkbox", { name: /I reviewed row 1/ }).click();
    assert.equal(await section.getByRole("button", { name: /Approve this/ }).count(), 0);
    await section.getByRole("button", { name: "Preview complete file" }).click();
    await section.getByRole("cell", { name: "append", exact: false }).waitFor();
    tests.push(`${client}: embedded mapping/original bytes/explicit source date/new-event review + re-preview; no commit.`);
    if (client === "pvas") await section.screenshot({ path: path.join(evidence, "pvas-embedded-reviewed-preview.png") });
    await section.getByLabel("Direct source file").setInputFiles({ name: "invalid.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from("NOT ZIP") });
    await page.waitForFunction(() => !document.querySelector('[aria-label="Map Client_ID"]'));
    assert.equal(await section.getByRole("button", { name: "Preview complete file" }).isDisabled(), true);
    tests.push(`${client}: invalid replacement destroys previous file/mapping/plan; stale preview disabled.`);
  }
  await page.getByLabel("Dashboard client").selectOption("jag");
  assert.equal(await section.getByRole("button", { name: "Preview complete file" }).isDisabled(), true);
  assert.equal(await section.getByLabel("Direct source file").inputValue(), "");
  tests.push("Client transition remounts exactly one scoped importer and clears original bytes/mapping/pending preview.");
  assert.equal(await page.getByRole("region", { name: "Direct notes and portfolio import" }).count(), 1);
  await fill("pvas");
  const parts = workbookParts();
  parts["xl/worksheets/sheet1.xml"] = parts["xl/worksheets/sheet1.xml"].replace(/r="([A-D])([12])"/g, (_, c, r) => `r="${c}${Number(r) + 6}"`).replace(/<row r="([12])"/g, (_, r) => `<row r="${Number(r) + 6}"`);
  const xlsxBytes = zipParts(parts);
  await section.getByLabel("Direct source file").setInputFiles({ name: "fictional-header7.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: xlsxBytes });
  await section.getByLabel("Header row (1–100)").fill("7");
  await section.getByRole("button", { name: "Inspect chosen sheet + header" }).click();
  await section.getByLabel("Map Client_ID", { exact: true }).waitFor();
  await section.getByRole("checkbox", { name: /Use selected source date/ }).check();
  await section.getByRole("button", { name: "Preview complete file" }).click();
  await section.getByRole("button", { name: /Approve this/ }).waitFor();
  assert.equal(lastBatch.fileDigest, crypto.createHash("sha256").update(xlsxBytes).digest("hex"));
  assert.equal(lastBatch.parse.headerRow, 7); assert.equal(lastBatch.parse.sheet, "Data");
  assert.equal(lastBatch.cells[0].cptid, 900001); assert.equal(lastBatch.cells[0].value, "1500.25");
  await section.getByLabel("Header row (1–100)").fill("8");
  assert.equal(await section.getByRole("button", { name: /Approve this/ }).count(), 0);
  assert.equal(await section.getByRole("button", { name: "Preview complete file" }).isDisabled(), true);
  tests.push("Actual XLSX upload with explicit sheet/header7: numeric CPTID900001 and ask1500.25, original ZIP-byte SHA256 bound; header change invalidates mapping/approval.");
  await fill("pvas", "Client_ID,CPTID,Campaign Ask\n0001,900001,1500.25\n");
  await section.getByRole("button", { name: "Preview complete file" }).click();
  await section.getByRole("button", { name: /Approve this/ }).waitFor();
  await page.route("**/api/pvas-data-direct-import", async route => {
    const body = route.request().postDataJSON();
    if (body.op === "commit") { await route.fetch(); return route.abort("failed"); }
    return route.continue();
  });
  await section.getByRole("button", { name: /Approve this/ }).click();
  await section.getByText(/No success asserted/).waitFor();
  assert.equal(commits, 1);
  const originalId = await page.evaluate(() => localStorage.getItem("direct-import-pending:pvas"));
  assert.match(originalId, /^[a-f0-9]{32}$/);
  await page.unroute("**/api/pvas-data-direct-import"); await page.reload();
  await section.getByRole("button", { name: "Check original request status" }).click();
  await section.getByText(/Original request committed to source SQL/).waitFor();
  assert.equal(commits, 1);
  assert.equal(await page.evaluate(() => localStorage.getItem("direct-import-pending:pvas")), originalId);
  await section.getByRole("button", { name: "Retry current-view verification only" }).click();
  await section.getByText(/retry verification only, not import/).waitFor();
  assert.equal(commits, 1);
  tests.push("Mock lost commit reply retains exact32hex ID, survives reload, recovers via status only; failed view verification never resends import.");
  await section.screenshot({ path: path.join(evidence, "pvas-mock-recovered-receipt.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await section.screenshot({ path: path.join(evidence, "pvas-mobile-recovery.png") });
  tests.push("390px viewport no document horizontal overflow.");
  assert.deepEqual(errors, []);
  const result = { mode: "OFFLINE-MOCK-PAIRED", actualOwners: "AddAndUpload + DirectDashboardUpload + directFileGateway", sqlCalls: 0, hostedAcceptance: false, productionRegistrationChanged: false,
    mockBackendCommits: commits, commitRequestIds: calls.filter(c => c.op === "directFileCommit").map(c => c.requestId), tests, pageErrors: errors };
  fs.writeFileSync(path.join(evidence, "browser-results.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
})().catch(async e => { console.error(e); if (currentPage) { console.error((await currentPage.locator("body").innerText()).slice(0, 5000)); await currentPage.screenshot({ path: path.join(evidence, "failure.png"), fullPage: true }); } process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); });
