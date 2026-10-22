import { NextRequest, NextResponse } from "next/server";
import { getPartner } from "@/lib/partners";

/**
 * Lead capture for referral-partner signup pages (/partners/{slug}).
 * Upserts the HubSpot contact, adds referral_partner, logs a note, and emails
 * Anthony + the partner. Failures never block the visitor from the content.
 */

const HUBSPOT_CONTACTS = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_NOTES = "https://api.hubapi.com/crm/v3/objects/notes";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_HUMAN_SUBMIT_MS = 1500;
const LEAD_OWNER_ID = "36164952"; // Anthony

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Fields = { name: string; firstname: string; lastname: string; email: string; org: string; title: string; city: string; state: string; utm: string; interests: string[] };

async function syncHubSpot(
  token: string,
  f: Fields,
  partnerValue: string,
  partnerName: string,
  leadSource?: string,
  assignOwnerId?: string,
) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const { firstname, lastname } = f;
  const noteBody = [
    `${leadSource ? `Event signup: ${leadSource}` : `Referral partner signup: ${partnerName}`} (catapultfr.com/partners page)`,
    "",
    `Name: ${f.name}`,
    `Email: ${f.email}`,
    f.org ? `Organization: ${f.org}` : "",
    f.title ? `Title: ${f.title}` : "",
    f.city || f.state ? `Location: ${[f.city, f.state].filter(Boolean).join(", ")}` : "",
    f.interests.length ? `Requested service information: ${f.interests.join(", ")}` : "",
    f.utm ? `Tracking: ${f.utm}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let id: string | undefined;
  const res = await fetch(HUBSPOT_CONTACTS, {
    method: "POST",
    headers,
    body: JSON.stringify({
      properties: {
        firstname,
        lastname,
        email: f.email,
        company: f.org,
        jobtitle: f.title,
        ...(f.city ? { city: f.city } : {}),
        ...(f.state ? { state: f.state } : {}),
        lifecyclestage: "lead",
        ...(assignOwnerId ? { hubspot_owner_id: assignOwnerId } : {}),
      },
    }),
  });
  if (res.ok) id = (await res.json()).id;
  else {
    const body = await res.text();
    id = body.match(/Existing ID:\s*(\d+)/i)?.[1];
    if (!id) {
      console.error("HubSpot create error (partner lead):", res.status, body);
      return false;
    }
  }

  const cur = await fetch(
    `${HUBSPOT_CONTACTS}/${id}?properties=referral_partner,hubspot_owner_id,hs_lead_status`,
    { headers },
  );
  const ex: Record<string, string | null> = cur.ok ? (await cur.json()).properties ?? {} : {};
  const props: Record<string, string> = {};
  if (partnerValue) {
    const partners = new Set((ex.referral_partner || "").split(";").filter(Boolean));
    partners.add(partnerValue);
    props.referral_partner = Array.from(partners).join(";");
  }
  if (assignOwnerId || (cur.ok && !ex.hubspot_owner_id)) {
    props.hubspot_owner_id = assignOwnerId || LEAD_OWNER_ID;
  }
  if (cur.ok && !ex.hs_lead_status) props.hs_lead_status = "NEW";

  const [patch] = await Promise.all([
    fetch(`${HUBSPOT_CONTACTS}/${id}`, { method: "PATCH", headers, body: JSON.stringify({ properties: props }) }),
    fetch(HUBSPOT_NOTES, {
      method: "POST",
      headers,
      body: JSON.stringify({
        properties: { hs_timestamp: new Date().toISOString(), hs_note_body: noteBody },
        associations: [
          { to: { id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] },
        ],
      }),
    }),
  ]);
  if (!patch.ok) console.error("HubSpot patch error (partner lead):", patch.status, await patch.text());
  return patch.ok;
}

async function notify(to: string[], f: Fields, partnerName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const rows: [string, string][] = [
    ["Name", f.name],
    ["Email", f.email],
    ["Organization", f.org],
    ["Title", f.title],
    ["Location", [f.city, f.state].filter(Boolean).join(", ")],
    ["Referred by", partnerName],
    ["Interested services", f.interests.join(", ")],
  ];
  const html = `<h2>New signup from ${esc(partnerName)}'s webinar</h2>
<table cellpadding="6" style="border-collapse:collapse">${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`)
    .join("")}</table>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Catapult Fundraising Website <website@catapultfr.com>",
      to,
      reply_to: f.email,
      subject: `New signup via ${partnerName}: ${f.name}${f.org ? ` (${f.org})` : ""}`,
      html,
    }),
  });
  if (!res.ok) console.error("Resend error (partner lead):", res.status, await res.text());
  return res.ok;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const partner = getPartner(String(body.partner || ""));
  if (!partner) return NextResponse.json({ error: "Unknown partner." }, { status: 400 });

  const honeypot = typeof body.company === "string" && body.company.trim().length > 0;
  const tooFast =
    typeof body.startedAt === "number" && Date.now() - body.startedAt < MIN_HUMAN_SUBMIT_MS;
  if (honeypot || tooFast) return NextResponse.json({ ok: true });

  const f: Fields = {
    firstname: String(body.firstname || "").trim().slice(0, 80),
    lastname: String(body.lastname || "").trim().slice(0, 80),
    name: "",
    email: String(body.email || "").trim(),
    org: String(body.org || "").trim(),
    city: String(body.city || "").trim().slice(0, 80),
    state: String(body.state || "").trim().slice(0, 40),
    title: String(body.title || "").trim(),
    utm: String(body.utm || "").slice(0, 300),
    interests: Array.isArray(body.interests)
      ? body.interests
          .filter((value): value is string => typeof value === "string")
          .filter((value) => partner.serviceChoices?.includes(value))
          .slice(0, partner.serviceChoices?.length ?? 0)
      : [],
  };
  f.name = `${f.firstname} ${f.lastname}`.trim();
  if (!f.firstname || !f.lastname || !EMAIL_RE.test(f.email)) {
    return NextResponse.json({ error: "Please enter your name and a valid email." }, { status: 400 });
  }

  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  const [hubspotSynced, emailSent] = await Promise.all([
    token
      ? syncHubSpot(
          token,
          f,
          partner.hubspotValue,
          partner.name,
          partner.leadSource,
          partner.assignOwnerId,
        ).catch((e) => {
          console.error("Partner lead HubSpot threw:", e);
          return false;
        })
      : Promise.resolve(false),
    notify(partner.notify, f, partner.name).catch(() => false),
  ]);
  return NextResponse.json({ ok: true, hubspotSynced, emailSent });
}
