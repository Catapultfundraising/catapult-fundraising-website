import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { POST } from "../app/api/research-source-import/portfolio-preview/route";
import { SAMPLE } from "../lib/portal-v2/portfolio-preview";
const origin = "https://simulation.example";
Object.assign(process.env, { RESEARCH_PASSWORD: "fictional-test-password", RESEARCH_AUTH_SECRET: "fictional-test-secret", VERCEL_ENV: "preview" });
const cookie = createHash("sha256").update("fictional-test-password:fictional-test-secret").digest("hex");
function req(body: unknown, auth = true, sameOrigin = true) { return new NextRequest(origin + "/api/research-source-import/portfolio-preview", {
  method: "POST", headers: { "content-type": "application/json", host: "simulation.example", origin: sameOrigin ? origin : "https://other.example", ...(auth ? { cookie: `catapult_research_auth=${cookie}` } : {}) }, body: JSON.stringify(body),
}); }
test("route: authentication, origin, production gate; no external transport during simulation", async () => {
  assert.equal((await POST(req({ op: "context", client: "pvas" }, false))).status, 401);
  assert.equal((await POST(req({ op: "context", client: "pvas" }, true, false))).status, 403);
  process.env.VERCEL_ENV = "production";
  assert.equal((await POST(req({ op: "context", client: "pvas" }))).status, 404);
  process.env.VERCEL_ENV = "preview";
  const previousFetch = globalThis.fetch;
  let outgoing = 0; globalThis.fetch = async () => { outgoing++; throw new Error("Network forbidden"); };
  try {
    for (const client of ["pvas", "csnf", "jag", "wcbhc", "baq"]) {
      const context = await (await POST(req({ op: "context", client }))).json();
      const input = { client, state: context.state, bytes: Buffer.from(SAMPLE).toString("base64"), fileName: "synthetic.csv", sourceDate: "2026-10-19", actor: "Fictional staff", mapping: { Client_ID: "clientId", "New Notes": "note", "Campaign Ask": "askAmount", "Primary Solicitor": "portfolio" } };
      const preview = await (await POST(req({ op: "preview", input }))).json();
      assert.equal(preview.changes, 5);
      assert.equal((await POST(req({ op: "simulate", input: { ...input, actor: "Changed" }, binding: preview.binding }))).status, 400);
      const result = await (await POST(req({ op: "simulate", input, binding: preview.binding }))).json();
      assert.equal(result.receipt.sqlCommitted, false); assert.equal(result.receipt.published, false);
      if (client === "pvas") {
        const sample = await (await POST(req({ op: "sampleXlsx" }))).json();
        const info = await (await POST(req({ op: "fileInfo", bytes: sample.bytes, format: "xlsx" }))).json();
        assert.ok(info.sheets.includes("Capital_Campaign_Portfolio"));
        const parseSettings = { format: "xlsx", sheet: "Capital_Campaign_Portfolio", headerRow: 7 };
        const inspected = await (await POST(req({ op: "inspect", bytes: sample.bytes, parseSettings }))).json();
        assert.equal(inspected.headers.length, 47);
        const excelInput = { ...input, bytes: sample.bytes, fileName: "synthetic.xlsx", parseSettings, mapping: { ...input.mapping, "Secondary Solicitor": "secondarySolicitor" } };
        const excelPreview = await (await POST(req({ op: "preview", input: excelInput }))).json();
        assert.equal(excelPreview.changes, 6);
        assert.equal((await POST(req({ op: "simulate", input: { ...excelInput, parseSettings: { ...parseSettings, sheet: "Alternate_Portfolio" } }, binding: excelPreview.binding }))).status, 400);
      }
    }
    assert.equal(outgoing, 0);
  } finally { globalThis.fetch = previousFetch; }
});
