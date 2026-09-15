import { NextRequest, NextResponse } from "next/server";
import { LEAD_EMAILS } from "@/lib/constants";
import { formatDollars } from "@/lib/gift-chart";
import {
  QUESTIONS,
  buildReadinessReport,
  decodeAnswers,
  type Answers,
  type ReadinessReport,
} from "@/lib/campaign-readiness";

/**
 * Lead capture for the gated Campaign Readiness Report Card.
 *
 * Two stages come through here:
 *  - "start": the gate form, same plumbing as /api/gift-chart-lead (notify the
 *    team, upsert the HubSpot contact, attach a note).
 *  - "result": the graded outcome, sent after the visitor finishes the
 *    questions. The client sends the encoded answers and this route regrades
 *    them with buildReadinessReport, so the note carries the answer the
 *    visitor gave to every question plus the recommended next steps, and the
 *    score is computed server side rather than trusted from the browser.
 *    The same numbers are written to contact properties, because a note is
 *    readable but not filterable and the point is to sort inbound by
 *    readiness instead of by arrival order.
 *
 * A HubSpot or email failure must never block the visitor from seeing their
 * own report card.
 */

const HUBSPOT_CONTACTS = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_SEARCH = "https://api.hubapi.com/crm/v3/objects/contacts/search";
const HUBSPOT_NOTES = "https://api.hubapi.com/crm/v3/objects/notes";
const HUBSPOT_TASKS = "https://api.hubapi.com/crm/v3/objects/tasks";
const HUBSPOT_OWNERS = "https://api.hubapi.com/crm/v3/owners";
const NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID = 202;
const TASK_TO_CONTACT_ASSOCIATION_TYPE_ID = 204;

/**
 * A low score on a large goal is the feasibility study conversation, so it
 * gets a task instead of waiting to be noticed in an inbox. Thresholds are
 * deliberately conservative: below a C+ on a goal this size, the gift chart
 * math in the report card has almost certainly already told them their goal is
 * ahead of their donor base.
 */
const TASK_SCORE_AT_OR_BELOW = 65;
const TASK_GOAL_AT_OR_ABOVE = 3_000_000;
const TASK_DUE_IN_DAYS = 1;
const TASK_OWNER_EMAIL = LEAD_EMAILS[0];

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

type StartFields = { name: string; org: string; email: string; goal: number };

type AreaScore = { label: string; score: number; grade: string };

type AnswerLine = { prompt: string; answer: string };

type ResultFields = {
  email: string;
  org: string;
  goal: number;
  score: number;
  grade: string;
  verdict: string;
  biggestRisk: string;
  areas: AreaScore[];
  nextSteps: { area: string; action: string }[];
  giftChartNotes: string[];
  answers: AnswerLine[];
};

function startNoteBody(fields: StartFields) {
  return [
    "Campaign Readiness Report Card (gated tool on catapultfr.com)",
    "",
    `Name: ${fields.name}`,
    fields.org ? `Organization: ${fields.org}` : "",
    `Email: ${fields.email}`,
    `Campaign goal entered: ${formatDollars(fields.goal)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function resultNoteBody(fields: ResultFields) {
  const lines = [
    "Campaign Readiness Report Card: result",
    "",
    `Overall: ${fields.grade} (${fields.score}/100)`,
    `Verdict: ${fields.verdict}`,
    `Biggest risk: ${fields.biggestRisk}`,
    fields.org ? `Organization: ${fields.org}` : "",
    `Campaign goal: ${formatDollars(fields.goal)}`,
    "",
    "By area:",
    ...fields.areas.map((a) => `- ${a.label}: ${a.grade} (${a.score}/100)`),
  ].filter(Boolean);

  if (fields.nextSteps.length) {
    lines.push("", "Recommended next steps:");
    fields.nextSteps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step.area}: ${step.action}`);
    });
  }

  if (fields.giftChartNotes.length) {
    lines.push("", "Goal against the gift chart:");
    fields.giftChartNotes.forEach((note) => lines.push(`- ${note}`));
  }

  if (fields.answers.length) {
    lines.push("", "Answers given:");
    fields.answers.forEach((a) => lines.push(`- ${a.prompt}`, `  ${a.answer}`));
  }

  return lines.join("\n");
}

/**
 * Regrade the submission from the encoded answers. The browser already has a
 * report on screen, but recomputing here means the note and the contact
 * properties cannot be spoofed or drift from the scoring code, and it gives us
 * the answer text and the recommendations, which the client never sent.
 */
function reportFromPayload(body: Record<string, unknown>): ReadinessReport | null {
  if (typeof body.answers !== "string" || !body.answers) return null;
  try {
    const largestGift = Number(body.largestGift) || 0;
    const prospectCount = Number(body.prospectCount) || 0;
    const answers: Answers = decodeAnswers(String(body.answers), largestGift, prospectCount);
    return buildReadinessReport({
      goal: Number(body.goal) || 0,
      org: body.org ? String(body.org) : "",
      answers,
    });
  } catch (err) {
    console.error("Readiness regrade failed; falling back to the client payload:", err);
    return null;
  }
}

/** Question prompt paired with the answer in the visitor's own terms. */
function answerLines(report: ReadinessReport, encoded: string): AnswerLine[] {
  const answers = decodeAnswers(encoded, report.largestGift, report.prospectCount);
  return QUESTIONS.map((question) => {
    const raw = answers[question.id];
    let answer = "Not answered";
    if (question.kind === "choice") {
      answer = question.choices?.[raw]?.label ?? "Not answered";
    } else if (question.id === "largestGift") {
      answer = formatDollars(report.largestGift);
    } else {
      answer = `${report.prospectCount.toLocaleString("en-US")} prospects`;
    }
    return { prompt: question.prompt, answer };
  });
}

/**
 * Contact properties, so a finished report card is filterable. These five are
 * custom properties on the contact object; if any is missing from the portal
 * HubSpot rejects the whole patch, so the failure is logged and swallowed the
 * same way a note failure is.
 */
async function writeReadinessProperties(
  token: string,
  email: string,
  fields: ResultFields,
) {
  const properties: Record<string, string> = {
    readiness_score: String(fields.score),
    readiness_grade: fields.grade,
    readiness_campaign_goal: String(fields.goal),
    readiness_biggest_risk: fields.biggestRisk,
    readiness_completed_date: new Date().toISOString().slice(0, 10),
  };

  try {
    const res = await fetch(
      `${HUBSPOT_CONTACTS}/${encodeURIComponent(email)}?idProperty=email`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ properties }),
      },
    );
    if (!res.ok) {
      console.error("HubSpot property error (readiness result):", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("HubSpot property patch threw (readiness result):", err);
    return false;
  }
}

async function sendEmailNotification(subject: string, rows: [string, string][]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set; skipping readiness lead email.");
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
    console.error("Resend API error (readiness lead):", res.status, await res.text());
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
      console.error("HubSpot note error (readiness lead):", res.status, await res.text());
    }
  } catch (err) {
    console.error("HubSpot note threw (readiness lead):", err);
  }
}

async function syncStartToHubSpot(fields: StartFields) {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    console.warn("HUBSPOT_PRIVATE_APP_TOKEN is not set; skipping readiness lead sync.");
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

  console.error("HubSpot API error (readiness lead):", res.status, errorBody);
  return false;
}

/**
 * Owner lookup so the task lands on a real task list rather than unassigned.
 * Cached for the life of the server process; an owner id does not change.
 */
let cachedOwnerId: string | null | undefined;

async function findTaskOwnerId(token: string): Promise<string | null> {
  if (cachedOwnerId !== undefined) return cachedOwnerId;
  try {
    const res = await fetch(`${HUBSPOT_OWNERS}?email=${encodeURIComponent(TASK_OWNER_EMAIL)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("HubSpot owner lookup error (readiness task):", res.status, await res.text());
      cachedOwnerId = null;
      return null;
    }
    const data = await res.json();
    const id = data.results?.[0]?.id;
    cachedOwnerId = id ? String(id) : null;
    return cachedOwnerId;
  } catch (err) {
    console.error("HubSpot owner lookup threw (readiness task):", err);
    cachedOwnerId = null;
    return null;
  }
}

function taskBody(fields: ResultFields) {
  const lines = [
    `${fields.org || "An inbound contact"} scored ${fields.grade} (${fields.score}/100) on the readiness report card with a ${formatDollars(fields.goal)} goal.`,
    `Biggest risk: ${fields.biggestRisk}.`,
  ];
  if (fields.giftChartNotes[0]) lines.push(fields.giftChartNotes[0]);
  lines.push("Full answers and recommended next steps are in the note on this contact.");
  return lines.join(" ");
}

/** Only for a low score on a goal big enough to be worth a call. */
async function createReadinessTask(token: string, contactId: string, fields: ResultFields) {
  if (fields.score > TASK_SCORE_AT_OR_BELOW || fields.goal < TASK_GOAL_AT_OR_ABOVE) return false;

  const ownerId = await findTaskOwnerId(token);
  const due = new Date(Date.now() + TASK_DUE_IN_DAYS * 24 * 60 * 60 * 1000);

  try {
    const res = await fetch(HUBSPOT_TASKS, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          hs_timestamp: due.toISOString(),
          hs_task_subject: `Readiness ${fields.grade} on a ${formatDollars(fields.goal)} goal: ${fields.org || fields.email}`,
          hs_task_body: taskBody(fields),
          hs_task_status: "NOT_STARTED",
          hs_task_priority: "HIGH",
          hs_task_type: "CALL",
          ...(ownerId ? { hubspot_owner_id: ownerId } : {}),
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: TASK_TO_CONTACT_ASSOCIATION_TYPE_ID,
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("HubSpot task error (readiness result):", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("HubSpot task threw (readiness result):", err);
    return false;
  }
}

/** The result note needs the contact the gate already created. */
async function findContactId(token: string, email: string): Promise<string | null> {
  try {
    const res = await fetch(HUBSPOT_SEARCH, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: "email", operator: "EQ", value: email }] },
        ],
        properties: ["email"],
        limit: 1,
      }),
    });
    if (!res.ok) {
      console.error("HubSpot search error (readiness result):", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.results?.[0]?.id ?? null;
  } catch (err) {
    console.error("HubSpot search threw (readiness result):", err);
    return null;
  }
}

async function handleStart(body: Record<string, unknown>) {
  const { name, org, email, goal, company, startedAt } = body;

  // Same honeypot plus minimum-fill-time checks as the contact form.
  const honeypotTripped = typeof company === "string" && company.trim().length > 0;
  const submittedTooFast =
    typeof startedAt === "number" && Number.isFinite(startedAt) && Date.now() - startedAt < MIN_HUMAN_SUBMIT_MS;

  if (honeypotTripped || submittedTooFast) {
    console.warn("Readiness report card: blocked a likely bot submission", {
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
    goal: Number(goal) || 0,
  };

  const [emailResult, hubspotSynced] = await Promise.all([
    sendEmailNotification(
      `Readiness report card started: ${fields.name}${fields.org ? ` (${fields.org})` : ""} - ${formatDollars(fields.goal)} goal`,
      [
        ["Name", fields.name],
        ["Organization", fields.org],
        ["Email", fields.email],
        ["Campaign goal entered", formatDollars(fields.goal)],
      ],
    ).catch((err) => {
      console.error("Readiness lead email threw:", err);
      return { sent: false };
    }),
    syncStartToHubSpot(fields).catch((err) => {
      console.error("Readiness lead HubSpot sync threw:", err);
      return false;
    }),
  ]);

  return NextResponse.json({ ok: true, emailSent: emailResult.sent, hubspotSynced });
}

async function handleResult(body: Record<string, unknown>) {
  const email =
    typeof body.email === "string" && EMAIL_RE.test(body.email) ? body.email : "";
  const report = reportFromPayload(body);

  // Prefer the server regrade. The fallback keeps older clients working while a
  // deploy rolls out, and keeps a partial payload from losing the lead.
  const clientAreas: AreaScore[] = Array.isArray(body.areas)
    ? (body.areas as AreaScore[]).slice(0, 12).map((a) => ({
        label: String(a.label ?? ""),
        score: Number(a.score) || 0,
        grade: String(a.grade ?? ""),
      }))
    : [];

  const fields: ResultFields = report
    ? {
        email,
        org: report.org,
        goal: report.goal,
        score: report.score,
        grade: report.grade,
        verdict: report.verdict.label,
        biggestRisk: report.biggestRisk.area.label,
        areas: report.areas.map((a) => ({
          label: a.area.label,
          score: a.score,
          grade: a.grade,
        })),
        nextSteps: report.nextSteps,
        giftChartNotes: [report.leadGiftNote, report.prospectNote],
        answers: answerLines(report, String(body.answers)),
      }
    : {
        email,
        org: body.org ? String(body.org) : "",
        goal: Number(body.goal) || 0,
        score: Number(body.score) || 0,
        grade: String(body.grade ?? ""),
        verdict: String(body.verdict ?? ""),
        biggestRisk: String(body.biggestRisk ?? ""),
        areas: clientAreas,
        nextSteps: [],
        giftChartNotes: [],
        answers: [],
      };

  const noteBody = resultNoteBody(fields);
  // Set READINESS_DEBUG_NOTE=1 locally to print the note that HubSpot receives.
  if (process.env.READINESS_DEBUG_NOTE) console.log(noteBody);

  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  const hubspotPromise = (async () => {
    if (!token || !fields.email) return { noted: false, propertiesWritten: false, taskCreated: false };
    const contactId = await findContactId(token, fields.email);
    if (!contactId) return { noted: false, propertiesWritten: false, taskCreated: false };
    const [, propertiesWritten, taskCreated] = await Promise.all([
      createNote(token, contactId, noteBody),
      writeReadinessProperties(token, fields.email, fields),
      createReadinessTask(token, contactId, fields),
    ]);
    return { noted: true, propertiesWritten, taskCreated };
  })();

  const [emailResult, hubspot] = await Promise.all([
    sendEmailNotification(
      `Readiness report card result: ${fields.grade} (${fields.score}/100)${fields.org ? ` - ${fields.org}` : ""}`,
      [
        ["Organization", fields.org],
        ["Campaign goal", formatDollars(fields.goal)],
        ["Overall", `${fields.grade} (${fields.score}/100)`],
        ["Verdict", fields.verdict],
        ["Biggest risk", fields.biggestRisk],
        ...fields.areas.map((a) => [a.label, `${a.grade} (${a.score}/100)`] as [string, string]),
        ...fields.nextSteps.map(
          (step, index) => [`Next step ${index + 1}`, `${step.area}: ${step.action}`] as [string, string],
        ),
        ...fields.answers.map((a) => [a.prompt, a.answer] as [string, string]),
      ],
    ).catch((err) => {
      console.error("Readiness result email threw:", err);
      return { sent: false };
    }),
    hubspotPromise.catch((err) => {
      console.error("Readiness result HubSpot sync threw:", err);
      return { noted: false, propertiesWritten: false, taskCreated: false };
    }),
  ]);

  return NextResponse.json({
    ok: true,
    emailSent: emailResult.sent,
    noted: hubspot.noted,
    propertiesWritten: hubspot.propertiesWritten,
    taskCreated: hubspot.taskCreated,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (body.stage === "result") return await handleResult(body);
    return await handleStart(body);
  } catch (err) {
    console.error("Readiness lead error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
