import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";

export const runtime = "nodejs";

// Basic email shape check, matching the same lightweight validator used by
// the public contact form -- just enough to reject obviously-malformed
// addresses before we spend a Resend call on them.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends a just-generated research profile PDF to a project lead's inbox as
// an email attachment. This is the automatic "PDF generated + status is
// Sent for Approval" notification -- triggered from each profile builder's
// generatePdf() function, not a standalone user-facing form. Reuses the
// same Resend setup as the public contact form (see app/api/contact/route.ts)
// rather than introducing a second email provider.
export async function POST(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to, subject, fileName, pdfBase64, profileName, profileType } = await req.json();

    if (!to || typeof to !== "string" || !EMAIL_RE.test(to)) {
      return NextResponse.json({ error: "A valid project lead email is required." }, { status: 400 });
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

    // NOTE: Resend's sandbox sender (onboarding@resend.dev) can only deliver
    // to the address the Resend account was signed up with. Sending to an
    // arbitrary project lead's inbox requires a verified sending domain at
    // resend.com/domains (e.g. sending "from" a catapultfr.com address).
    // Until that's set up, this call will succeed for the account's own
    // signup address and fail (with Resend's validation error surfaced
    // below) for any other recipient.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Catapult Research Portal <onboarding@resend.dev>",
        to: [to],
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
        { ok: false, error: `Email delivery failed (status ${res.status}).` },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("research-profiles email-pdf error:", err);
    return NextResponse.json({ error: "Something went wrong sending the email." }, { status: 500 });
  }
}
