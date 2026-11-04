// SYNTHETIC TESTS for W0 on the website (fictional data; global fetch is MOCKED, no network, no SQL, no real Engage).
// The backend is the sole activation/latch authority; the website only consumes the strict boolean projection.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { dbGiftEditsAvailable, mixedGiftIdentity, DB_GIFT_EDIT_UNAVAILABLE_UI } from "../lib/portal-v2/gift-edit-guard";

const CRON = "c".repeat(32);
Object.assign(process.env, { CRON_SECRET: CRON, PORTAL_WRITE_SECRET: "w".repeat(32), ENGAGE_PORTAL_URL_OVERRIDE: "http://engage.mock.invalid/api/portal-v2" });
type Call = { url: string; body: Record<string, any> };
const calls: Call[] = []; let reply: { status: number; body: unknown } = { status: 200, body: { changed: 1 } };
globalThis.fetch = (async (url: string, init: RequestInit) => { calls.push({ url: String(url), body: JSON.parse(String(init.body)) }); return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json" } }); }) as typeof fetch;
const post = async (body: unknown) => {
  const { portalV2Route } = await import("../lib/portal-v2/server");
  return portalV2Route("wcbhc").POST(new NextRequest("http://localhost/api/wcbhc-data-v2", { method: "POST", headers: { authorization: `Bearer ${CRON}`, "content-type": "application/json" }, body: JSON.stringify(body) }));
};

test("projection is strict: only literal true enables database-key edit controls (missing/malformed => false)", () => {
  assert.equal(dbGiftEditsAvailable(true), true);
  for (const v of [undefined, null, false, "true", 1, {}, []]) assert.equal(dbGiftEditsAvailable(v), false);
});

test("mixed id+key detection: positive id with ANY key property (even empty/0/false)", () => {
  for (const key of ["k", "", 0, false]) assert.equal(mixedGiftIdentity({ id: 4, key }), true);
  assert.equal(mixedGiftIdentity({ id: 4 }), false); assert.equal(mixedGiftIdentity({ id: 4, key: null }), false); assert.equal(mixedGiftIdentity({ key: "k" }), false); assert.equal(mixedGiftIdentity({ id: 0, key: "k" }), false);
});

test("[MOCK FETCH] actual route: mixed id+key refused 400 BEFORE normalization; nothing forwarded", async () => {
  for (const op of ["editGift", "voidGift"]) for (const key of ["k1", ""]) {
    calls.length = 0;
    const r = await post({ op, by: "Pat Example", reason: "dup", gift: { id: 5, key, amount: "10" } });
    assert.equal(r.status, 400); assert.equal((await r.json()).code, "mixed_gift_identity"); assert.equal(calls.length, 0);
  }
});

test("[MOCK FETCH] actual route: backend typed 409 refusal passed through with code and fixed UI text; id-only unchanged", async () => {
  calls.length = 0; reply = { status: 409, body: { error: "backend text SELECT engage.x", code: "database_gift_edits_unavailable" } };
  let r = await post({ op: "voidGift", by: "Pat Example", reason: "dup", gift: { key: "db:1" } });
  assert.equal(r.status, 409); const j = await r.json(); assert.equal(j.code, "database_gift_edits_unavailable"); assert.equal(j.error, DB_GIFT_EDIT_UNAVAILABLE_UI);
  assert.equal(calls[0].body.op, "voidGift"); assert.equal(calls[0].body.gift.key, "db:1");
  reply = { status: 500, body: { error: "boom" } }; r = await post({ op: "editGift", by: "Pat", gift: { key: "db:1", amount: "5" } }); assert.equal(r.status, 500); assert.equal((await r.json()).code, undefined);
  calls.length = 0; reply = { status: 200, body: { changed: 1, id: 7 } };
  r = await post({ op: "editGift", by: "Pat", gift: { id: 7, amount: "5" } });
  assert.equal(r.status, 200); assert.equal(calls[0].body.gift.id, 7); assert.equal(calls[0].body.gift.key, undefined);
});

test("website keeps NO activation/approval/latch list; state projection and UI use the strict helper", () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of [...walk("lib"), ...walk("components"), ...walk("app")].filter((f) => /\.(ts|tsx)$/.test(f)))
    assert.ok(!/GIFT_IMPORT_APPROVALS|GIFT_EDIT_DENY_LATCH|giftImportApproved/.test(readFileSync(f, "utf8")), f);
  const s = readFileSync("lib/portal-v2/server.ts", "utf8");
  assert.ok(s.includes("databaseGiftEditsAvailable: dbGiftEditsAvailable(state.databaseGiftEditsAvailable)"));
  const b = s.slice(s.indexOf('b.op === "editGift" || b.op === "voidGift"')); assert.ok(b.indexOf("mixedGiftIdentity(g)") < b.indexOf("const key = id > 0 ? undefined"));
  const c = readFileSync("components/portal-v2.tsx", "utf8"); assert.ok(c.includes("dbGiftEditsAvailable(state.databaseGiftEditsAvailable)") && c.includes("Edits unavailable"));
});
