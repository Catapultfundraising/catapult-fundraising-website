import { NextRequest, NextResponse } from "next/server";
import { LEAD_EMAILS } from "@/lib/constants";

const SITE_URL = "https://www.catapultfr.com";

// Splits a full name into first/last for HubSpot's contact schema.
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstname = parts.shift() || "";
  const lastname = parts.join(" ");
  return { firstname, lastname };
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
  const [primaryEmail, ...ccEmails] = LEAD_EMAILS;

  const formData = new FormData();
  formData.append("Name", fields.name);
  formData.append("Title", fields.title || "");
  formData.append("Organization", fields.org || "");
  formData.append("Email", fields.email);
  formData.append("Phone", fields.phone || "");
  formData.append("Service interested in", fields.service || "Not specified");
  formData.append("Message", fields.message);
  formData.append("_subject", `New website inquiry from ${fields.name}${fields.org ? ` (${fields.org})` : ""}`);
  formData.append("_cc", ccEmails.join(","));
  formData.append("_replyto", fields.email);
  formData.append("_template", "table");
  formData.append("_captcha", "false");

  // FormSubmit's AJAX endpoint requires a Referer/Origin that matches a
  // browser page load. Server-to-server requests (like this one, sent from
  // the Vercel serverless function rather than the user's browser) have no
  // Referer by default, which FormSubmit rejects with:
  // "Make sure you open this page through a web server..." — silently
  // failing to deliver the email. Setting these headers explicitly fixes it.
  const formSubmitRes = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(primaryEmail)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Referer: `${SITE_URL}/contact`,
        Origin: SITE_URL,
      },
      body: formData,
    }
  );

  const rawBody = await formSubmitRes.text();
  let parsed: { success?: string | boolean; message?: string } = {};
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    // non-JSON response, fall through to the ok-check below
  }

  // FormSubmit can return HTTP 200 with a body indicating logical failure
  // (e.g. { success: "false", message: "This form needs Activation..." }),
  // so checking formSubmitRes.ok alone is not sufficient.
  const succeeded =
    formSubmitRes.ok && parsed.success !== "false" && parsed.success !== false;

  if (!succeeded) {
    console.error("FormSubmit error:", formSubmitRes.status, rawBody);
    return { sent: false, error: parsed.message || rawBody };
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
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email delivery failed. The destination inbox may need to activate this form — check for a 'FormSubmit - Activate your form' email.",
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
