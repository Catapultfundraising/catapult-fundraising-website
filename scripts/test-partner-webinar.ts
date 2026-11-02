import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/partner-lead/route";
import { getPartner } from "../lib/partners";
import { selectedPartnerChoices, partnerNotificationRecipients } from "../lib/partner-lead-options";

const partner = getPartner("endowment-partners")!;
assert.equal(partner.hubspotValue, "endowment_partners_cga");
assert.equal(partner.assignOwnerId, "36164952");
assert.deepEqual(selectedPartnerChoices(["A", "A", "bad", 7], ["A"]), ["A"]);
assert.deepEqual(selectedPartnerChoices("A", ["A"]), []);
assert.deepEqual(partnerNotificationRecipients(partner, []), ["anthonya@catapultfr.com"]);
assert.deepEqual(partnerNotificationRecipients(partner, ["Endowment Partners"]), ["anthonya@catapultfr.com", "diane@endowmentpartners.com"]);
assert.deepEqual(partnerNotificationRecipients(partner, ["attacker@example.com"]), ["anthonya@catapultfr.com"]);
for (const slug of ["wayne-olson", "afpnj-middle-market", "philly-pg-day"]) {
  const existing = getPartner(slug)!;
  assert.deepEqual(partnerNotificationRecipients(existing, []), existing.notify);
}

type Captured = { url: string; method: string; body: any };
async function scenario(opts: { existing?: boolean; followUp?: string[]; failure?: boolean }) {
  const captured: Captured[] = [];
  global.fetch = async (url: any, init?: RequestInit) => {
    const target = String(url);
    assert.ok(target.startsWith("https://api.hubapi.com/") || target === "https://api.resend.com/emails", `Unexpected network destination: ${target}`);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    captured.push({ url: target, method, body });
    if (target === "https://api.resend.com/emails") return Response.json({ id: "synthetic-mail" });
    if (opts.failure) return Response.json({ message: "synthetic outage" }, { status: 503 });
    if (target.endsWith("/contacts") && method === "POST") {
      return opts.existing
        ? new Response("Contact already exists. Existing ID: 123456", { status: 409 })
        : Response.json({ id: "123456" });
    }
    if (method === "GET") return Response.json({ properties: { referral_partner: "wayne_olson", hubspot_owner_id: "41803510", hs_lead_status: "OPEN" } });
    return Response.json({ id: "synthetic" });
  };
  const response = await POST(new NextRequest("http://localhost/api/partner-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partner: "endowment-partners", firstname: "Synthetic", lastname: "Test",
      email: "synthetic@example.invalid", org: "Synthetic QA",
      startedAt: Date.now() - 10_000,
      interests: ["Catapult: Legacy Call / Planned Giving", "Endowment Partners: Governance", "untrusted value"],
      followUp: opts.followUp ?? [], utm: "utm_source=webinar&utm_medium=qr",
    }),
  }));
  assert.equal(response.status, 200);
  const result = await response.json();
  const mail = captured.find((c) => c.url === "https://api.resend.com/emails")!;
  assert.deepEqual(mail.body.to, (opts.followUp ?? []).includes("Endowment Partners")
    ? ["anthonya@catapultfr.com", "diane@endowmentpartners.com"]
    : ["anthonya@catapultfr.com"]);
  assert.ok(mail.body.html.includes("Legacy Call"));
  assert.ok(mail.body.html.includes("Governance"));
  assert.ok(!mail.body.html.includes("untrusted value"));
  if (opts.failure) {
    assert.equal(result.hubspotSynced, false);
  } else {
    assert.equal(result.hubspotSynced, true);
    const patch = captured.find((c) => c.method === "PATCH")!;
    assert.equal(patch.body.properties.referral_partner, "wayne_olson;endowment_partners_cga");
    assert.equal(patch.body.properties.hubspot_owner_id, "36164952");
    assert.ok(!("hs_lead_status" in patch.body.properties));
    const note = captured.find((c) => c.url.endsWith("/notes"))!;
    assert.ok(note.body.properties.hs_note_body.includes("November 4, 2026"));
    assert.ok(note.body.properties.hs_note_body.includes("Legacy Call"));
    assert.ok(note.body.properties.hs_note_body.includes("utm_source=webinar"));
    assert.ok(!note.body.properties.hs_note_body.includes("untrusted value"));
  }
}

async function main() {
  process.env.HUBSPOT_PRIVATE_APP_TOKEN = "synthetic-not-a-token";
  process.env.RESEND_API_KEY = "synthetic-not-a-key";
  await scenario({});
  await scenario({ existing: true, followUp: ["Catapult Fundraising", "Endowment Partners"] });
  await scenario({ existing: true, followUp: ["Endowment Partners"] });
  await scenario({ followUp: ["attacker@example.com"] });
  await scenario({ failure: true });
  const invalid = await POST(new NextRequest("http://localhost/api/partner-lead", {
    method: "POST", body: JSON.stringify({ partner: "endowment-partners", email: "not-an-email" }),
  }));
  assert.equal(invalid.status, 400);
  const unknown = await POST(new NextRequest("http://localhost/api/partner-lead", {
    method: "POST", body: JSON.stringify({ partner: "unknown" }),
  }));
  assert.equal(unknown.status, 400);
  console.log("PASS: partner choices, consent-aware routing, existing partner regression, new and existing HubSpot contacts, tag preservation, ownership, notes, notification, validation and integration failure.");
}
main().catch((e) => { console.error(e); process.exit(1); });
