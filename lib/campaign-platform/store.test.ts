import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, signSession, readSession } from "./store";
import { runQueue, screeningId, type Transport, type QueueState } from "./queue";
import type { TenantRecord, DsResult } from "./tenant";

const rec = (id: string, names: string[]): TenantRecord => ({ id, name: id, goal: 1e6, createdAt: "", gifts: [], prospects: [], constituents: names.map((n) => ({ name: n, state: "NV", given: 0 })) });

test("one client cannot read or list another client's campaigns", async () => {
  const s = new MemoryStore();
  await s.createAccount("a@x.org", "correct-horse-1", "tA"); await s.createAccount("b@y.org", "battery-staple-2", "tB");
  const a = (await s.verify("a@x.org", "correct-horse-1"))!, b = (await s.verify("b@y.org", "battery-staple-2"))!;
  await s.saveCampaign(a, rec("c1", ["Ann"]));
  assert.equal((await s.listCampaigns(b)).length, 0);
  assert.equal(await s.getCampaign(b, "c1"), null);
  assert.equal((await s.listCampaigns(a)).length, 1);
  await s.saveCampaign(b, rec("c1", ["Bob"])); // same id, different tenant: no overwrite
  assert.equal((await s.getCampaign(a, "c1"))!.constituents![0].name, "Ann");
});
test("bad password and tampered session are rejected", async () => {
  const s = new MemoryStore(); await s.createAccount("a@x.org", "correct-horse-1", "tA");
  assert.equal(await s.verify("a@x.org", "wrong-password-1"), null);
  assert.equal(await s.verify("nobody@x.org", "correct-horse-1"), null);
  const tok = signSession({ email: "a@x.org", tenantId: "tA" }, "sec");
  assert.equal(readSession(tok, "sec")?.tenantId, "tA");
  assert.equal(readSession(tok, "other"), null);
  const [b, sig] = tok.split("."); const forged = Buffer.from(JSON.stringify({ email: "a@x.org", tenantId: "tB", exp: Date.now() + 1e6 })).toString("base64url");
  assert.equal(readSession(`${forged}.${sig}`, "sec"), null); void b;
  assert.equal(readSession(signSession({ email: "a", tenantId: "t" }, "sec", -1), "sec"), null);
});
test("queue is resumable, never bills twice, skips excluded", async () => {
  const t = rec("t1", ["A", "B", "C", "D"]); t.constituents![3].excluded = "Deceased";
  const ds: DsResult = { rating: "C", capacity: 1, source: "donorsearch", confidence: "high" };
  const server = new Map<string, DsResult>(); let searches = 0;
  const tr: Transport = { read: async (id) => server.get(id) ?? null, search: async (id) => { searches++; server.set(id, ds); return ds; } };
  const st: QueueState = { campaignId: "t1", done: {}, failed: {}, startedAt: "" };
  const r1 = await runQueue(t, st, tr, 2); assert.equal(r1.processed, 2); assert.equal(r1.remaining, 1);
  // crash: local state lost, but the vendor already has A and B
  const fresh: QueueState = { campaignId: "t1", done: {}, failed: {}, startedAt: "" };
  const r2 = await runQueue(t, fresh, tr, 10); assert.equal(r2.remaining, 0);
  assert.equal(searches, 3); // A, B once each, C once; D excluded
  assert.notEqual(screeningId("t1", t.constituents![0]), screeningId("t1", t.constituents![1]));
});
