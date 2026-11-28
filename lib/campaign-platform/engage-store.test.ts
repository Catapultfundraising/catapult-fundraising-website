import { test } from "node:test";
import assert from "node:assert/strict";
import { EngageStore } from "./engage-store";
import type { TenantRecord } from "./tenant";

// Fake Engage that mirrors the real endpoint's contract (action in, tenant-scoped rows out).
function fakeEngage() {
  const camps = new Map<string, string>(); const accts = new Map<string, string>();
  process.env.PORTAL_WRITE_SECRET = "z".repeat(32);
  globalThis.fetch = (async (_u: string, init: RequestInit) => {
    const b = JSON.parse(String(init.body)); let out: unknown = { error: "bad" }; let status = 400;
    if ((init.headers as Record<string, string>).authorization !== `Bearer ${"z".repeat(32)}`) return new Response("{}", { status: 401 });
    if (b.action === "createAccount") { accts.set(b.email, b.tenantId); out = { ok: true }; status = 200; }
    if (b.action === "verify") { out = { session: accts.has(b.email) ? { email: b.email, tenantId: accts.get(b.email) } : null }; status = 200; }
    if (b.action === "save") { camps.set(`${b.tenantId}/${b.id}`, b.body); out = { ok: true }; status = 200; }
    if (b.action === "list") { out = { bodies: [...camps].filter(([k]) => k.startsWith(`${b.tenantId}/`)).map(([, v]) => v) }; status = 200; }
    return new Response(JSON.stringify(out), { status });
  }) as typeof fetch;
}
const rec = (id: string): TenantRecord => ({ id, name: "Org", goal: 1e6, createdAt: "", gifts: [{ donor: "A", amount: 5, kind: "gift", date: null }], prospects: [], constituents: [{ name: "A", state: "NV", given: 5, ds: { rating: "B", capacity: 9, source: "sample", confidence: "high" } }] });

test("save then sign out and back in returns the same campaign, and only that tenant's", async () => {
  fakeEngage(); const s = new EngageStore();
  await s.createAccount("a@x.invalid", "long-enough-pw1", "t-aaa"); await s.createAccount("b@x.invalid", "long-enough-pw2", "t-bbb");
  const a1 = (await s.verify("a@x.invalid", "x"))!; await s.saveCampaign(a1, rec("c1"));
  const again = (await s.verify("a@x.invalid", "x"))!; // a fresh session after sign-in
  const got = await s.listCampaigns(again);
  assert.equal(got.length, 1); assert.deepEqual(got[0], rec("c1"));
  assert.equal((await s.listCampaigns((await s.verify("b@x.invalid", "x"))!)).length, 0);
});
