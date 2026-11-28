import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../../app/api/campaign-platform/register/route";
import { POST as login } from "../../app/api/campaign-platform/login/route";
import { readSession } from "./store";
process.env.PORTAL_WRITE_SECRET = "y".repeat(32); process.env.CP_STORE = "memory";
const reg = (b: object, ip = "1.1.1.1") => POST(new Request("http://x", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(b) }));
test("self-service sign-up creates a fresh server-generated tenant and signs in", async () => {
  const a = await reg({ email: "a@one.org", password: "long-enough-pw1", tenantId: "victim" });
  const b = await reg({ email: "b@two.org", password: "long-enough-pw2" }, "2.2.2.2");
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  const { createHmac } = await import("node:crypto");
  const key = createHmac("sha256", "y".repeat(32)).update("campaign-platform-session-v1").digest("hex");
  const ta = readSession(/catapult_cp_session=([^;]+)/.exec(a.headers.get("set-cookie")!)![1], key)!, tb = readSession(/catapult_cp_session=([^;]+)/.exec(b.headers.get("set-cookie")!)![1], key)!;
  assert.match(ta.tenantId, /^t-[0-9a-f]{24}$/); assert.notEqual(ta.tenantId, tb.tenantId);
  const again = await login(new Request("http://x", { method: "POST", body: JSON.stringify({ email: "a@one.org", password: "long-enough-pw1" }) }));
  assert.equal(again.status, 200);
});
test("rejects duplicates, weak passwords, bad emails, honeypot, floods", async () => {
  assert.equal((await reg({ email: "a@one.org", password: "long-enough-pw1" }, "3.3.3.3")).status, 400);
  assert.equal((await reg({ email: "c@x.org", password: "short" }, "3.3.3.3")).status, 400);
  assert.equal((await reg({ email: "nope", password: "long-enough-pw1" }, "3.3.3.3")).status, 400);
  assert.equal((await reg({ email: "d@x.org", password: "long-enough-pw1", website: "spam" }, "3.3.3.3")).status, 400);
  for (let i = 0; i < 5; i++) await reg({ email: `f${i}@x.org`, password: "long-enough-pw1" }, "9.9.9.9");
  assert.equal((await reg({ email: "g@x.org", password: "long-enough-pw1" }, "9.9.9.9")).status, 429);
});
