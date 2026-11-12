import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/contact/route";
import { ATTRIBUTION_KEY, attributionFromSearch, attributionText, attributedBookingUrl, captureLeadAttribution, isMarketingPath, readLeadAttribution, sanitizeAttribution } from "../lib/lead-attribution";
import { trackLeadSubmission } from "../lib/analytics";

const labels = { utm_source: "linkedin", utm_medium: "paid_social", utm_campaign: "capital_feasibility_pilot", utm_content: "goal_confidence" };
for (const bad of [null, 7, [], "text"]) assert.deepEqual(sanitizeAttribution(bad), {});
assert.deepEqual(sanitizeAttribution({ ...labels, email: "someone@example.com", url: "https://private.example", utm_term: "<script>" }), labels);
for (const bad of ["someone@example.com", "https://private.example/?donor=42", "a\nsecret", "x".repeat(121), 123]) assert.deepEqual(sanitizeAttribution({ utm_source: bad }), {});
assert.deepEqual(attributionFromSearch("?utm_source=linkedin&utm_content=goal_confidence&email=private"), { utm_source: "linkedin", utm_content: "goal_confidence" });
for (const p of ["/", "/contact", "/services", "/services/feasibility-study"]) assert.equal(isMarketingPath(p), true);
for (const p of ["/research", "/apply", "/jag/data-dashboard", "/services-private", "/contact/private"]) assert.equal(isMarketingPath(p), false);

const local = new Map<string,string>(); const session = new Map<string,string>();
const store = (m: Map<string,string>) => ({ getItem: (k:string) => m.get(k) ?? null, setItem: (k:string,v:string) => m.set(k,v), removeItem: (k:string) => m.delete(k) });
const fakeWindow = { localStorage: store(local), sessionStorage: store(session), location: { pathname: "/services/feasibility-study", search: "?utm_source=linkedin&utm_content=goal_confidence" }, gtag: (..._args: unknown[]) => {} };
Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });
captureLeadAttribution(); assert.equal(session.has(ATTRIBUTION_KEY), false);
local.set("catapult_cookie_consent", "necessary"); captureLeadAttribution(); assert.deepEqual(readLeadAttribution(), {});
local.set("catapult_cookie_consent", "accepted"); captureLeadAttribution(); assert.equal(readLeadAttribution().utm_content, "goal_confidence");
fakeWindow.location = { pathname: "/contact", search: "" }; captureLeadAttribution(); assert.equal(readLeadAttribution().utm_source, "linkedin");
fakeWindow.location = { pathname: "/research", search: "?utm_source=private_client" }; captureLeadAttribution(); assert.deepEqual(readLeadAttribution(), {}); assert.ok(!session.get(ATTRIBUTION_KEY)!.includes("private_client"));
fakeWindow.location = { pathname: "/contact", search: "?utm_source=other" }; captureLeadAttribution(); assert.deepEqual(readLeadAttribution(), { utm_source: "other" });
local.set("catapult_cookie_consent", "necessary"); captureLeadAttribution(); assert.equal(session.has(ATTRIBUTION_KEY), false);
fakeWindow.sessionStorage.getItem = () => { throw new Error("storage blocked"); }; assert.deepEqual(readLeadAttribution(), {});
const booking = new URL(attributedBookingUrl("https://go.catapultfr.com/meetings/anthonya?keep=yes", labels));
assert.equal(booking.searchParams.get("keep"), "yes"); assert.equal(booking.searchParams.get("utm_content"), "goal_confidence");
assert.equal(new URL(attributedBookingUrl("https://go.catapultfr.com/meetings/anthonya?utm_source=existing", labels)).searchParams.get("utm_source"), "existing");
for (const url of ["https://evil.example/meetings/anthonya", "https://go.catapultfr.com.evil.example/meetings/anthonya", "http://go.catapultfr.com/meetings/anthonya", "https://go.catapultfr.com/private", "javascript:alert(1)"]) assert.equal(attributedBookingUrl(url, labels), url);
assert.ok(!attributionText({ utm_source: "<script>" }).includes("script"));

async function scenario(existing: boolean, mailFails = false) {
  const calls: { url: string; body: any }[] = [];
  global.fetch = async (url, init) => {
    const u = String(url); const body = JSON.parse(String(init?.body || "{}")); calls.push({ url: u, body });
    assert.ok(u.startsWith("https://api.hubapi.com/") || u === "https://api.resend.com/emails");
    if (u === "https://api.resend.com/emails") return Response.json({ id: "synthetic" }, { status: mailFails ? 503 : 200 });
    if (u.endsWith("/contacts") && existing) return new Response("Contact already exists. Existing ID: 123", { status: 409 });
    return Response.json({ id: "123" });
  };
  const response = await POST(new NextRequest("https://www.catapultfr.com/api/contact", { method: "POST", body: JSON.stringify({ name: "Synthetic Test", org: "Synthetic QA", email: "synthetic@example.invalid", message: "Synthetic test", startedAt: Date.now() - 10000, attribution: { ...labels, utm_term: "<img src=x>", email: "private@example.invalid" } }) }));
  const data = await response.json();
  if (mailFails) { assert.equal(response.status, 502); assert.equal(data.ok, false); assert.equal(calls.length, 1); return; }
  assert.equal(data.hubspotSynced, true);
  const mail = calls.find(c => c.url === "https://api.resend.com/emails")!.body;
  assert.deepEqual(mail.to, ["anthonya@catapultfr.com", "jeffg@catapultfr.com"]);
  assert.ok(mail.html.includes("goal_confidence")); assert.ok(!mail.html.includes("<img src=x>"));
  const note = calls.find(c => c.url.endsWith("/notes"))!.body.properties.hs_note_body;
  assert.ok(note.includes("utm_source: linkedin")); assert.ok(note.includes("utm_content: goal_confidence")); assert.ok(!note.includes("private@example.invalid"));
  const contactWrite = calls.find(c => c.body.properties?.message)?.body.properties.message;
  assert.ok(contactWrite.includes("utm_campaign: capital_feasibility_pilot"));
}
async function main() {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = "synthetic-test-only";
  process.env.RESEND_API_KEY = "synthetic-test-only";
  await scenario(false); await scenario(true); await scenario(false, true);
  const events: unknown[][] = []; fakeWindow.gtag = (...args) => { events.push(args); };
  trackLeadSubmission("contact_form"); assert.equal(events.length, 1); assert.equal(events[0][1], "generate_lead");
  console.log("PASS: label sanitization, consent, session retention, campaign replacement, protected-path exclusion, blocked storage, booking URL scope, new/existing inquiry attribution, notification routing, CRM notes and failed delivery.");
}
main().catch(e => { console.error(e); process.exit(1); });
