import { NextRequest, NextResponse } from "next/server";
import { LEAD_EMAILS } from "@/lib/constants";

const HUBSPOT_NOTES_BASE = "https://api.hubapi.com/crm/v3/objects/notes";
const NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID = 202;

// Basic email shape check. This isn't meant to be a full RFC validator,
// just enough to reject the obviously-fake addresses bot submissions use.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bots that fill out every form field usually also fill in this hidden
// honeypot input, and they almost always submit within a second or two of
// the page loading. Real visitors never see the honeypot field and always
// take longer than this to read the form and type a message.
const MIN_HUMAN_SUBMIT_MS = 1500;

// Splits a full name into first/last for HubSpot's contact schema.
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

async function sendEmailNotification(fields: {
  name: string;
  title: string;
  org: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping email notification.");
    return { sent: false, error: "RESEND_API_KEY is not configured." };
  }

  const html = `
    <h2>New website inquiry</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(fields.name)}</td></tr>
      <tr><td><strong>Title</strong></td><td>${escapeHtml(fields.title || "")}</td></tr>
      <tr><td><strong>Organization</strong></td><td>${escapeHtml(fields.org || "")}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(fields.email)}</td></tr>
      <tr><td><strong>Phone</strong></td><td>${escapeHtml(fields.phone || "")}</td></tr>
      <tr><td><strong>Service interested in</strong></td><td>${escapeHtml(fields.service || "Not specified")}</td></tr>
      <tr><td><strong>Message</strong></td><td>${escapeHtml(fields.message)}</td></tr>
    </table>
  `;

  // NOTE: Resend's sandbox sender (onboarding@resend.dev) can only deliver to
  // the email address the Resend account was signed up with. Sending to
  // additional recipients (e.g. a second team member) requires verifying a
  // custom domain at resend.com/domains and sending "from" that domain
  // instead. Until then, only the first LEAD_EMAILS address is used here to
  // avoid Resend rejecting the whole request with a 403 validation error.
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Catapult Fundraising Website <onboarding@resend.dev>",
      to: [LEAD_EMAILS[0]],
      reply_to: fields.email,
      subject: `New website inquiry from ${fields.name}${fields.org ? ` (${fields.org})` : ""}`,
      html,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Resend API error:", res.status, errorBody);
    return { sent: false, error: `status_${res.status}: ${errorBody}` };
  }

  return { sent: true };
}

function buildNoteBody(fields: {
  name: string;
  title: string;
  org: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}) {
  const lines = ["Contact Form Submission", "", `Name: ${fields.name}${fields.title ? `, ${fields.title}` : ""}`];
  if (fields.org) lines.push(`Organization: ${fields.org}`);
  lines.push(`Email: ${fields.email}`);
  if (fields.phone) lines.push(`Phone: ${fields.phone}`);
  lines.push(`Service interested in: ${fields.service || "Not specified"}`, "", "Message:", fields.message);
  return lines.join("\n");
}

async function createSubmissionNote({
  token,
  contactId,
  noteBody,
}: {
  token: string;
  contactId: string;
  noteBody: string;
}) {
  try {
    const res = await fetch(HUBSPOT_NOTES_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          hs_timestamp: new Date().toISOString(),
          hs_note_body: noteBody,
        },
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
      const body = await res.text();
      console.error("HubSpot note creation error:", res.status, body);
    }
  } catch (err) {
    // Never let a note-logging failure break the actual contact create/update.
    console.error("HubSpot note creation threw:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, title, org, email, phone, service, message, company, startedAt } = await req.json();

    // Anti-spam: "company" here is a honeypot input that is hidden from real
    // visitors via CSS, so only an automated form-filler would ever put
    // anything in it. "startedAt" is a timestamp captured when the form
    // first rendered; a submission that arrives faster than a human could
    // plausibly read and fill out the form is almost certainly a bot.
    // Both cases return a normal-looking success response so bots don't
    // learn they were caught and adjust their script.
    const honeypotTripped = typeof company === "string" && company.trim().length > 0;
    const submittedTooFast =
      typeof startedAt === "number" && Number.isFinite(startedAt) && Date.now() - startedAt < MIN_HUMAN_SUBMIT_MS;

    if (honeypotTripped || submittedTooFast) {
      console.warn("Contact form: blocked a likely bot submission", {
        honeypotTripped,
        submittedTooFast,
      });
      return NextResponse.json({ ok: true, emailSent: true, hubspotSynced: true });
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const emailResult = await sendEmailNotification({
      name,
      title,
      org,
      email,
      phone,
      service,
      message,
    });

    if (!emailResult.sent) {
      console.error("Contact form email delivery failed:", emailResult.error);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email delivery failed. Please try again, or email us directly.",
        },
        { status: 502 }
      );
    }

    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!token) {
      console.warn("HUBSPOT_PRIVATE_APP_TOKEN is not set; skipping HubSpot sync.");
      return NextResponse.json({ ok: true, emailSent: true, hubspotSynced: false });
    }

    const { firstname, lastname } = splitName(name);
    const noteBody = buildNoteBody({
      name,
      title: title || "",
      org: org || "",
      email,
      phone: phone || "",
      service: service || "",
      message,
    });

    const hubspotRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            firstname,
            lastname,
            email,
            phone: phone || "",
            jobtitle: title || "",
            company: org || "",
            message: noteBody,
            lifecyclestage: "lead",
          },
        }),
      }
    );

    if (!hubspotRes.ok) {
      const errorBody = await hubspotRes.text();

      if (hubspotRes.status === 409) {
        const existingIdMatch = errorBody.match(/Existing ID:\s*(\d+)/i);
        const existingId = existingIdMatch?.[1];

        if (existingId) {
          const updateRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                properties: {
                  firstname,
                  lastname,
                  phone: phone || "",
                  jobtitle: title || "",
                  company: org || "",
                  message: noteBody,
                },
              }),
            }
          );

          if (updateRes.ok) {
            await createSubmissionNote({ token, contactId: existingId, noteBody });
            return NextResponse.json({ ok: true, emailSent: true, hubspotSynced: true, updated: true });
          }
        }
      }

      console.error("HubSpot API error:", hubspotRes.status, errorBody);
      return NextResponse.json(
        { ok: true, emailSent: true, hubspotSynced: false, error: "HubSpot sync failed, but the email was sent." },
        { status: 200 }
      );
    }

    const created = await hubspotRes.json();
    await createSubmissionNote({ token, contactId: created.id, noteBody });

    return NextResponse.json({ ok: true, emailSent: true, hubspotSynced: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Something went wrong submitting the form." },
      { status: 500 }
    );
  }
}
