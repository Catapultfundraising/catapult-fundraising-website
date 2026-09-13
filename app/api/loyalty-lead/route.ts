import { NextRequest, NextResponse } from "next/server";
import { LEAD_EMAILS } from "@/lib/constants";

/**
 * Lead capture for the gated Donor Loyalty and Legacy Report Card.
 *
 * Same two stages and the same plumbing as /api/readiness-lead:
 *  - "start": the gate form (notify the team, upsert the HubSpot contact, note).
 *  - "result": the graded outcome, so inbound can be sorted by which program
 *    fits rather than by arrival order.
 *
 * A HubSpot or email failure must never block the visitor from seeing their own
 * report card.
 */

const HUBSPOT_CONTACTS = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_SEARCH = "https://api.hubapi.com/crm/v3/objects/contacts/search";
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

function count(value: number) {
  return value.toLocaleString("en-US");
}

type StartFields = { name: string; org: string; email: string; totalDonors: number };

type ResultFields = {
  email: string;
  org: string;
  totalDonors: number;
  loyalCount: number;
  midCount: number;
  legacyScore: number;
  legacyGrade: string;
  midScore: number;
  midGrade: string;
  recommendation: string;
  projection: string;
};

function startNoteBody(fields: StartFields) {
  return [
    "Donor Loyalty and Legacy Report Card (gated tool on catapultfr.com)",
    "",
    `Name: ${fields.name}`,
    fields.org ? `Organization: ${fields.org}` : "",
    `Email: ${fields.email}`,
    `Active donors (estimate): ${count(fields.totalDonors)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function resultNoteBody(fields: ResultFields) {
  return [
    "Donor Loyalty and Legacy Report Card: result",
    "",
    `Recommendation: ${fields.recommendation}`,
    `Legacy readiness: ${fields.legacyGrade} (${fields.legacyScore}/100)`,
    `Mid-level readiness: ${fields.midGrade} (${fields.midScore}/100)`,
    fields.org ? `Organization: ${fields.org}` : "",
    `Active donors: ${count(fields.totalDonors)}`,
    `Donors at 10+ consecutive years (estimate): ${count(fields.loyalCount)}`,
    `Donors giving $250 to $4,999 (estimate): ${count(fields.midCount)}`,
    `Legacy projection shown: ${fields.projection}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendEmailNotification(subject: string, rows: [string, string][]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping loyalty lead email.");
    return { sent: false };
  }

  const html = `
    <h2>${escapeHtml(subject)}</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`,
        )
        .join("")}
    </table>
  `;

  // See the note in /api/contact: the Resend sandbox sender can only deliver
  // to the account address, so only the first lead address is used.
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Catapult Fundraising Website <onboarding@resend.dev>",
      to: [LEAD_EMAILS[0]],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend API error (loyalty lead):", res.status, await res.text());
    return { sent: false };
  }
  return { sent: true };
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
      console.error("HubSpot note error (loyalty lead):", res.status, await res.text());
    }
  } catch (err) {
    console.error("HubSpot note threw (loyalty lead):", err);
  }
}

async function syncStartToHubSpot(fields: StartFields) {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    console.warn("HUBSPOT_PRIVATE_APP_TOKEN is not set; skipping loyalty lead sync.");
    return false;
  }

  const { firstname, lastname } = splitName(fields.name);
  const noteBody = startNoteBody(fields);
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

  console.error("HubSpot API error (loyalty lead):", res.status, errorBody);
  return false;
}

/** The result note needs the contact the gate already created. */
async function findContactId(token: string, email: string): Promise<string | null> {
  try {
    const res = await fetch(HUBSPOT_SEARCH, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
        properties: ["email"],
        limit: 1,
      }),
    });
    if (!res.ok) {
      console.error("HubSpot search error (loyalty result):", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.results?.[0]?.id ?? null;
  } catch (err) {
    console.error("HubSpot search threw (loyalty result):", err);
    return null;
  }
}

async function handleStart(body: Record<string, unknown>) {
  const { name, org, email, totalDonors, company, startedAt } = body;

  const honeypotTripped = typeof company === "string" && company.trim().length > 0;
  const submittedTooFast =
    typeof startedAt === "number" &&
    Number.isFinite(startedAt) &&
    Date.now() - startedAt < MIN_HUMAN_SUBMIT_MS;

  if (honeypotTripped || submittedTooFast) {
    console.warn("Loyalty report card: blocked a likely bot submission", {
      honeypotTripped,
      submittedTooFast,
    });
    return NextResponse.json({ ok: true });
  }

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const fields: StartFields = {
    name: String(name),
    org: org ? String(org) : "",
    email,
    totalDonors: Number(totalDonors) || 0,
  };

  const [emailResult, hubspotSynced] = await Promise.all([
    sendEmailNotification(
      `Donor loyalty report card started: ${fields.name}${fields.org ? ` (${fields.org})` : ""} - ${count(fields.totalDonors)} donors`,
      [
        ["Name", fields.name],
        ["Organization", fields.org],
        ["Email", fields.email],
        ["Active donors (estimate)", count(fields.totalDonors)],
      ],
    ).catch((err) => {
      console.error("Loyalty lead email threw:", err);
      return { sent: false };
    }),
    syncStartToHubSpot(fields).catch((err) => {
      console.error("Loyalty lead HubSpot sync threw:", err);
      return false;
    }),
  ]);

  return NextResponse.json({ ok: true, emailSent: emailResult.sent, hubspotSynced });
}

async function handleResult(body: Record<string, unknown>) {
  const fields: ResultFields = {
    email: typeof body.email === "string" && EMAIL_RE.test(body.email) ? body.email : "",
    org: body.org ? String(body.org) : "",
    totalDonors: Number(body.totalDonors) || 0,
    loyalCount: Number(body.loyalCount) || 0,
    midCount: Number(body.midCount) || 0,
    legacyScore: Number(body.legacyScore) || 0,
    legacyGrade: String(body.legacyGrade ?? ""),
    midScore: Number(body.midScore) || 0,
    midGrade: String(body.midGrade ?? ""),
    recommendation: String(body.recommendation ?? ""),
    projection: String(body.projection ?? ""),
  };

  const noteBody = resultNoteBody(fields);

  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  const notePromise = (async () => {
    if (!token || !fields.email) return false;
    const contactId = await findContactId(token, fields.email);
    if (!contactId) return false;
    await createNote(token, contactId, noteBody);
    return true;
  })();

  const [emailResult, noted] = await Promise.all([
    sendEmailNotification(
      `Donor loyalty report card result: ${fields.recommendation}${fields.org ? ` - ${fields.org}` : ""}`,
      [
        ["Organization", fields.org],
        ["Recommendation", fields.recommendation],
        ["Legacy readiness", `${fields.legacyGrade} (${fields.legacyScore}/100)`],
        ["Mid-level readiness", `${fields.midGrade} (${fields.midScore}/100)`],
        ["Active donors", count(fields.totalDonors)],
        ["Donors at 10+ consecutive years", count(fields.loyalCount)],
        ["Donors giving $250 to $4,999", count(fields.midCount)],
        ["Legacy projection shown", fields.projection],
      ],
    ).catch((err) => {
      console.error("Loyalty result email threw:", err);
      return { sent: false };
    }),
    notePromise.catch((err) => {
      console.error("Loyalty result note threw:", err);
      return false;
    }),
  ]);

  return NextResponse.json({ ok: true, emailSent: emailResult.sent, noted });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (body.stage === "result") return await handleResult(body);
    return await handleStart(body);
  } catch (err) {
    console.error("Loyalty lead error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
