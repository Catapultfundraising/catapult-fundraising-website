import { NextRequest, NextResponse } from "next/server";
import { TIER_CONFIGS, type TierData } from "@/lib/prospect-assessment";

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const HUBSPOT_CONTACTS_BASE = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_NOTES_BASE = "https://api.hubapi.com/crm/v3/objects/notes";
const NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID = 202;

function buildTierSummary(
  tierLabels: Record<string, string>,
  tiersData: Record<string, TierData>
) {
  const lines: string[] = [];
  TIER_CONFIGS.forEach((tier, index) => {
    const label = tierLabels?.[tier.id] || tier.defaultLabel || `Donor Tier ${index + 1}`;
    const data = tiersData?.[tier.id] || {};
    const rowParts: string[] = [];
    tier.rows.forEach((row) => {
      const value = data[row.key];
      if (value?.count || value?.avgGift) {
        rowParts.push(
          `${row.constituent} (${row.year}): ${value?.count || "0"} records${
            value?.avgGift ? `, $${value.avgGift} avg` : ""
          }`
        );
      }
    });
    if (rowParts.length > 0) {
      lines.push(`${label} — ${rowParts.join("; ")}`);
    }
  });
  return lines.join("\n");
}

function splitName(contactName: string) {
  const parts = (contactName || "").trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && !parts[0])) {
    return { firstname: "", lastname: "" };
  }
  if (parts.length === 1) {
    return { firstname: parts[0], lastname: "" };
  }
  return { firstname: parts.slice(0, -1).join(" "), lastname: parts[parts.length - 1] };
}

function buildNoteBody(fields: {
  orgName: string;
  contactName: string;
  title: string;
  email: string;
  phone: string;
  fiscalYear: string;
  caseForSupport: string;
  solicitationHistory: string;
  tierSummary: string;
}) {
  const lines = [
    "Prospect Research Intake Form Submission",
    "",
    `Organization: ${fields.orgName}`,
    `Contact: ${fields.contactName}${fields.title ? `, ${fields.title}` : ""}`,
    `Email: ${fields.email}`,
  ];
  if (fields.phone) lines.push(`Phone: ${fields.phone}`);
  if (fields.fiscalYear) lines.push(`Fiscal Year: ${fields.fiscalYear}`);
  lines.push("");
  if (fields.caseForSupport) {
    lines.push("Case for Support:", fields.caseForSupport, "");
  }
  if (fields.solicitationHistory) {
    lines.push("Prior Solicitation History:", fields.solicitationHistory, "");
  }
  if (fields.tierSummary) {
    lines.push("Donor Tier Data:", fields.tierSummary);
  }
  return lines.join("\n");
}

async function createSubmissionNote({
  contactId,
  noteBody,
}: {
  contactId: string;
  noteBody: string;
}) {
  try {
    const res = await fetch(HUBSPOT_NOTES_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
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
  if (!HUBSPOT_TOKEN) {
    console.error("HUBSPOT_PRIVATE_APP_TOKEN is not configured.");
    return NextResponse.json(
      { ok: false, error: "HubSpot is not configured on the server yet." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const {
      orgName,
      contactName,
      title,
      email,
      phone,
      fiscalYear,
      caseForSupport,
      solicitationHistory,
      tierLabels,
      tiersData,
    } = body || {};

    if (!orgName || !contactName || !email) {
      return NextResponse.json(
        { error: "Organization name, name, and email are required." },
        { status: 400 }
      );
    }

    const { firstname, lastname } = splitName(contactName);
    const tierSummary = buildTierSummary(tierLabels || {}, tiersData || {});

    const properties: Record<string, string> = {
      email,
      firstname,
      lastname,
      company: orgName,
      jobtitle: title || "",
      phone: phone || "",
      lifecyclestage: "lead",
      prospect_fiscal_year: fiscalYear || "",
      prospect_case_for_support: caseForSupport || "",
      prospect_solicitation_history: solicitationHistory || "",
      prospect_tier_summary: tierSummary,
    };

    const authHeaders = {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    };

    const noteBody = buildNoteBody({
      orgName,
      contactName,
      title: title || "",
      email,
      phone: phone || "",
      fiscalYear: fiscalYear || "",
      caseForSupport: caseForSupport || "",
      solicitationHistory: solicitationHistory || "",
      tierSummary,
    });

    // Try create first.
    const createRes = await fetch(HUBSPOT_CONTACTS_BASE, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ properties }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      await createSubmissionNote({ contactId: created.id, noteBody });
      return NextResponse.json({ ok: true, hubspotContactId: created.id });
    }

    // If the contact already exists (409 CONFLICT), fall back to updating it by email.
    if (createRes.status === 409) {
      const updateRes = await fetch(
        `${HUBSPOT_CONTACTS_BASE}/${encodeURIComponent(email)}?idProperty=email`,
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ properties }),
        }
      );

      if (updateRes.ok) {
        const updated = await updateRes.json();
        await createSubmissionNote({ contactId: updated.id, noteBody });
        return NextResponse.json({ ok: true, hubspotContactId: updated.id, updated: true });
      }

      const updateErrorBody = await updateRes.text();
      console.error("HubSpot update error:", updateRes.status, updateErrorBody);
      return NextResponse.json(
        { ok: false, error: "Failed to update the existing HubSpot contact." },
        { status: 502 }
      );
    }

    const createErrorBody = await createRes.text();
    console.error("HubSpot create error:", createRes.status, createErrorBody);
    return NextResponse.json(
      { ok: false, error: "Failed to create the HubSpot contact." },
      { status: 502 }
    );
  } catch (err) {
    console.error("Submit (HubSpot) error:", err);
    return NextResponse.json(
      { error: "Something went wrong submitting the form." },
      { status: 500 }
    );
  }
}
