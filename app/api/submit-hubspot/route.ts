import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { TIER_CONFIGS, type TierData } from "@/lib/prospect-assessment";
import { LEAD_EMAILS } from "@/lib/constants";

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

// Builds an .xlsx workbook of the full submission: one "Summary" sheet with
// the organization/contact fields, and one "Donor Tier Data" sheet with a
// row per donor tier / constituent segment, mirroring the on-page tables.
function buildSubmissionWorkbook(fields: {
  orgName: string;
  contactName: string;
  title: string;
  email: string;
  phone: string;
  fiscalYear: string;
  caseForSupport: string;
  solicitationHistory: string;
  tierLabels: Record<string, string>;
  tiersData: Record<string, TierData>;
}) {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["Field", "Value"],
    ["Organization", fields.orgName],
    ["Contact Name", fields.contactName],
    ["Title", fields.title || ""],
    ["Email", fields.email],
    ["Phone", fields.phone || ""],
    ["Fiscal Year", fields.fiscalYear || ""],
    ["Case for Support", fields.caseForSupport || ""],
    ["Prior Solicitation History", fields.solicitationHistory || ""],
    ["Submitted", new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 26 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const tierRows: (string | number)[][] = [
    ["Donor Tier", "Constituent Segment", "Year", "Record Count", "Average Gift"],
  ];
  TIER_CONFIGS.forEach((tier, index) => {
    const label = fields.tierLabels?.[tier.id] || tier.defaultLabel || `Donor Tier ${index + 1}`;
    const data = fields.tiersData?.[tier.id] || {};
    tier.rows.forEach((row) => {
      const value = data[row.key];
      if (value?.count || value?.avgGift) {
        tierRows.push([
          label,
          row.constituent,
          row.year,
          value?.count ? Number(value.count) : "",
          value?.avgGift ? Number(value.avgGift) : "",
        ]);
      }
    });
  });
  const tierSheet = XLSX.utils.aoa_to_sheet(tierRows);
  tierSheet["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, tierSheet, "Donor Tier Data");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer as Buffer;
}

async function sendEmailNotification(fields: {
  orgName: string;
  contactName: string;
  title: string;
  email: string;
  phone: string;
  fiscalYear: string;
  caseForSupport: string;
  solicitationHistory: string;
  tierSummary: string;
  tierLabels: Record<string, string>;
  tiersData: Record<string, TierData>;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping email notification for /submit.");
    return { sent: false, error: "RESEND_API_KEY is not configured." };
  }

  const html = `
    <h2>New Prospect Research Intake submission</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><td><strong>Organization</strong></td><td>${escapeHtml(fields.orgName)}</td></tr>
      <tr><td><strong>Contact</strong></td><td>${escapeHtml(fields.contactName)}${fields.title ? ` — ${escapeHtml(fields.title)}` : ""}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(fields.email)}</td></tr>
      <tr><td><strong>Phone</strong></td><td>${escapeHtml(fields.phone || "")}</td></tr>
      <tr><td><strong>Fiscal Year</strong></td><td>${escapeHtml(fields.fiscalYear || "")}</td></tr>
      <tr><td><strong>Case for Support</strong></td><td>${escapeHtml(fields.caseForSupport || "")}</td></tr>
      <tr><td><strong>Prior Solicitation History</strong></td><td>${escapeHtml(fields.solicitationHistory || "")}</td></tr>
      <tr><td><strong>Donor Tier Data</strong></td><td>${escapeHtml(fields.tierSummary || "")}</td></tr>
    </table>
    <p style="margin-top:16px;">A full Excel workbook of this submission (summary + donor tier data) is attached.</p>
  `;

  let attachments: { filename: string; content: string }[] = [];
  try {
    const workbookBuffer = buildSubmissionWorkbook(fields);
    const safeOrgName = (fields.orgName || "submission").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    attachments = [
      {
        filename: `prospect-intake-${safeOrgName}.xlsx`,
        content: workbookBuffer.toString("base64"),
      },
    ];
  } catch (err) {
    console.error("Failed to build Excel workbook for /submit notification:", err);
  }

  // Same constraint as /api/contact: Resend's sandbox sender can only deliver
  // to the address the Resend account was signed up with, so only the first
  // LEAD_EMAILS address is used here.
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
      subject: `New Prospect Research Intake — ${fields.orgName}`,
      html,
      ...(attachments.length ? { attachments } : {}),
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Resend API error (submit-hubspot):", res.status, errorBody);
    return { sent: false, error: `status_${res.status}: ${errorBody}` };
  }

  return { sent: true };
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

    // Fire the email notification in parallel with the HubSpot sync — a slow
    // or failed email should never block the actual contact create/update.
    const emailPromise = sendEmailNotification({
      orgName,
      contactName,
      title: title || "",
      email,
      phone: phone || "",
      fiscalYear: fiscalYear || "",
      caseForSupport: caseForSupport || "",
      solicitationHistory: solicitationHistory || "",
      tierSummary,
      tierLabels: tierLabels || {},
      tiersData: tiersData || {},
    }).catch((err) => {
      console.error("Email notification threw (submit-hubspot):", err);
      return { sent: false, error: String(err) };
    });

    // Try create first.
    const createRes = await fetch(HUBSPOT_CONTACTS_BASE, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ properties }),
    });

    const emailResult = await emailPromise;
    if (!emailResult.sent) {
      console.error("Email notification failed (submit-hubspot):", emailResult.error);
    }

    if (createRes.ok) {
      const created = await createRes.json();
      await createSubmissionNote({ contactId: created.id, noteBody });
      return NextResponse.json({ ok: true, hubspotContactId: created.id, emailSent: emailResult.sent });
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
        return NextResponse.json({
          ok: true,
          hubspotContactId: updated.id,
          updated: true,
          emailSent: emailResult.sent,
        });
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
