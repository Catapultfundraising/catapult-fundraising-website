import { NextRequest, NextResponse } from "next/server";
import { sendToolLeadEmail } from "@/lib/tool-lead-email";
import { formatDollars } from "@/lib/gift-chart";

/**
 * Lead capture for the gated gift chart calculator.
 *
 * Same plumbing as /api/contact: notify the team by email, then upsert the
 * contact in HubSpot with a note. The extra signal here is the campaign goal
 * the visitor typed in, which is the most useful qualifier we can get from a
 * first-touch form.
 *
 * A HubSpot or email failure must not lock the visitor out of the tool: the
 * gate opens as long as the submission looked human, and any sync problem is
 * logged for us rather than shown to them.
 */

const HUBSPOT_CONTACTS = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_NOTES = "https://api.hubapi.com/crm/v3/objects/notes";
const NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID = 202;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_HUMAN_SUBMIT_MS = 1500;

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstname = parts.shift() || "";
  const lastname = parts.join(" ");
  return { firstname, lastname };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

type Fields = { name: string; org: string; email: string; goal: number };

function buildNoteBody(fields: Fields) {
  return [
    "Gift Chart Calculator (gated tool on catapultfr.com)",
    "",
    `Name: ${fields.name}`,
    fields.org ? `Organization: ${fields.org}` : "",
    `Email: ${fields.email}`,
    `Campaign goal entered: ${formatDollars(fields.goal)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendEmailNotification(fields: Fields) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping gift chart lead email.");
    return { sent: false };
  }

  const html = `
    <h2>Gift chart calculator lead</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(fields.name)}</td></tr>
      <tr><td><strong>Organization</strong></td><td>${escapeHtml(fields.org || "")}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(fields.email)}</td></tr>
      <tr><td><strong>Campaign goal entered</strong></td><td>${formatDollars(fields.goal)}</td></tr>
    </table>
  `;

  return sendToolLeadEmail(apiKey, { subject: `Gift chart calculator: ${fields.name}${fields.org ? ` (${fields.org})` : ""} - ${formatDollars(fields.goal)} goal`, html, replyTo: fields.email }, "gift chart lead");
}

async function createNote(token: string, contactId: string, noteBody: string) {
  try {
    const res = await fetch(HUBSPOT_NOTES, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: { hs_timestamp: new Date().toISOString(), hs_note_body: noteBody },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID,
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("HubSpot note error (gift chart lead):", res.status, await res.text());
    }
  } catch (err) {
    console.error("HubSpot note threw (gift chart lead):", err);
  }
}

async function syncToHubSpot(fields: Fields) {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    console.warn("HUBSPOT_PRIVATE_APP_TOKEN is not set; skipping gift chart lead sync.");
    return false;
  }

  const { firstname, lastname } = splitName(fields.name);
  const noteBody = buildNoteBody(fields);
  const properties = {
    firstname,
    lastname,
    email: fields.email,
    company: fields.org || "",
    message: noteBody,
    lifecyclestage: "lead",
  };

  const res = await fetch(HUBSPOT_CONTACTS, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties }),
  });

  if (res.ok) {
    const created = await res.json();
    await createNote(token, created.id, noteBody);
    return true;
  }

  const errorBody = await res.text();

  // Existing contact: keep the record and just log this new touch.
  if (res.status === 409) {
    const existingId = errorBody.match(/Existing ID:\s*(\d+)/i)?.[1];
    if (existingId) {
      await createNote(token, existingId, noteBody);
      return true;
    }
  }

  console.error("HubSpot API error (gift chart lead):", res.status, errorBody);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { name, org, email, goal, company, startedAt } = await req.json();

    // Same honeypot plus minimum-fill-time checks as the contact form.
    const honeypotTripped = typeof company === "string" && company.trim().length > 0;
    const submittedTooFast =
      typeof startedAt === "number" && Number.isFinite(startedAt) && Date.now() - startedAt < MIN_HUMAN_SUBMIT_MS;

    if (honeypotTripped || submittedTooFast) {
      console.warn("Gift chart calculator: blocked a likely bot submission", {
        honeypotTripped,
        submittedTooFast,
      });
      return NextResponse.json({ ok: true });
    }

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const fields: Fields = {
      name: String(name),
      org: org ? String(org) : "",
      email: String(email),
      goal: Number(goal) || 0,
    };

    // Run both integrations, but never block the visitor on either one.
    const [emailResult, hubspotSynced] = await Promise.all([
      sendEmailNotification(fields).catch((err) => {
        console.error("Gift chart lead email threw:", err);
        return { sent: false };
      }),
      syncToHubSpot(fields).catch((err) => {
        console.error("Gift chart lead HubSpot sync threw:", err);
        return false;
      }),
    ]);

    return NextResponse.json({ ok: true, emailSent: emailResult.sent, hubspotSynced });
  } catch (err) {
    console.error("Gift chart lead error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
