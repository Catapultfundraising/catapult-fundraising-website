import { NextRequest, NextResponse } from "next/server";
import { LEAD_EMAILS } from "@/lib/constants";

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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Catapult Fundraising Website <onboarding@resend.dev>",
      to: LEAD_EMAILS,
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

export async function POST(req: NextRequest) {
  try {
    const { name, title, org, email, phone, service, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
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
    const noteBody = `Service interested in: ${service || "Not specified"}\n\n${message}`;

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

    return NextResponse.json({ ok: true, emailSent: true, hubspotSynced: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Something went wrong submitting the form." },
      { status: 500 }
    );
  }
}
