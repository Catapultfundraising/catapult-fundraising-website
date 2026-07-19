import { NextRequest, NextResponse } from "next/server";

// Splits a full name into first/last for HubSpot's contact schema.
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstname = parts.shift() || "";
  const lastname = parts.join(" ");
  return { firstname, lastname };
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

    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!token) {
      console.warn("HUBSPOT_PRIVATE_APP_TOKEN is not set; skipping HubSpot sync.");
      return NextResponse.json({ ok: true, hubspotSynced: false });
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
            return NextResponse.json({ ok: true, hubspotSynced: true, updated: true });
          }
        }
      }

      console.error("HubSpot API error:", hubspotRes.status, errorBody);
      return NextResponse.json(
        { ok: true, hubspotSynced: false, error: "HubSpot sync failed, but submission was received." },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, hubspotSynced: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Something went wrong submitting the form." },
      { status: 500 }
    );
  }
}
