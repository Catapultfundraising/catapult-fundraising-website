import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Splits a free-typed "to" value into a de-duplicated list of valid email
// addresses. Accepts either a single string (comma, semicolon, and/or
// whitespace separated -- e.g. "anthonya@catapultfr.com, karen@catapultfr.com")
// or an array of strings, since sometimes two project leads sit on the same
// program and both need the generated PDF.
function parseRecipients(to: unknown): string[] {
  const raw: string[] = Array.isArray(to)
    ? to.flatMap((v) => String(v).split(/[,;]+/))
    : typeof to === "string"
      ? to.split(/[,;]+/)
      : [];
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const candidate of raw) {
    const email = candidate.trim();
    if (!email || !EMAIL_RE.test(email)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(email);
  }
  return valid;
}

export async function POST(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to, subject, fileName, pdfBase64, profileName, profileType } = await req.json();

    const recipients = parseRecipients(to);
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "At least one valid project lead email is required." },
        { status: 400 }
      );
    }
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return NextResponse.json({ error: "Missing PDF data." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not set; skipping project lead PDF email.");
      return NextResponse.json(
        { ok: false, error: "Email delivery isn't configured yet (RESEND_API_KEY missing)." },
        { status: 200 }
      );
    }

    const typeLabel =
      profileType === "corporate" ? "Corporate" : profileType === "foundation" ? "Foundation" : "Individual";

    const html = `
      <p>A ${typeLabel.toLowerCase()} research profile was just generated and marked <strong>Sent for Approval</strong>.</p>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <tr><td><strong>Profile</strong></td><td>${profileName || "Untitled Prospect"}</td></tr>
        <tr><td><strong>Type</strong></td><td>${typeLabel}</td></tr>
      </table>
      <p>The formatted PDF is attached.</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Catapult Research Portal <research@mail.catapultfr.com>",
        to: recipients,
        subject: subject || `${profileName || "Prospect"} — Sent for Approval`,
        html,
        attachments: [
          {
            filename: fileName || "Prospect_Intelligence_Profile.pdf",
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Resend API error (research profile email):", res.status, errorBody);
      return NextResponse.json(
        { ok: false, error: `Email delivery failed (status ${res.status}): ${errorBody}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, recipients });
  } catch (err) {
    console.error("research-profiles email-pdf error:", err);
    return NextResponse.json({ error: "Something went wrong sending the email." }, { status: 500 });
  }
}
