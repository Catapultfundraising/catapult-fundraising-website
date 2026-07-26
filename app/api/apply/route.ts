import { NextRequest, NextResponse } from "next/server";
import { LEAD_EMAILS } from "@/lib/constants";

// TEMPORARY: Resend's sandbox sender (onboarding@resend.dev) can only deliver
// to the single email address the Resend account was signed up with. Sending
// to info@catapultfr.com and recruiter@catapultfr.com together causes a 403
// from Resend and the whole request fails. Once mail.catapultfr.com is
// verified as a custom sending domain in Resend, switch this back to
// ["info@catapultfr.com", "recruiter@catapultfr.com"] and update the "from"
// address below to use the verified domain.
const APPLY_EMAILS = [LEAD_EMAILS[0]];

const MAX_RESUME_SIZE = 8 * 1024 * 1024; // 8MB

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const position = String(formData.get("position") || "").trim();
    const linkedin = String(formData.get("linkedin") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const resume = formData.get("resume") as File | null;

    if (!name || !email || !position) {
      return NextResponse.json(
        { error: "Name, email, and the position you're applying for are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn("RESEND_API_KEY is not set; skipping job application email.");
      return NextResponse.json(
        { ok: false, error: "Email delivery is not configured." },
        { status: 502 }
      );
    }

    let attachments: { filename: string; content: string }[] = [];

    if (resume && resume.size > 0) {
      if (resume.size > MAX_RESUME_SIZE) {
        return NextResponse.json(
          { error: "Resume file is too large. Please upload a file under 8MB." },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await resume.arrayBuffer());
      attachments = [
        {
          filename: resume.name || "resume",
          content: buffer.toString("base64"),
        },
      ];
    }

    const html = `
      <h2>New job application</h2>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Position applying for</strong></td><td>${escapeHtml(position)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone || "Not provided")}</td></tr>
        <tr><td><strong>LinkedIn / Portfolio</strong></td><td>${escapeHtml(linkedin || "Not provided")}</td></tr>
        <tr><td><strong>Cover message</strong></td><td>${escapeHtml(message || "Not provided")}</td></tr>
        <tr><td><strong>Resume attached</strong></td><td>${resume && resume.size > 0 ? "Yes (attached to this email)" : "No"}</td></tr>
      </table>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Catapult Fundraising Careers <onboarding@resend.dev>",
        to: APPLY_EMAILS,
        reply_to: email,
        subject: `New job application: ${position} — ${name}`,
        html,
        ...(attachments.length ? { attachments } : {}),
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Resend API error (job application):", res.status, errorBody);
      return NextResponse.json(
        {
          ok: false,
          error: "Email delivery failed. Please try again, or email us directly.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Job application error:", err);
    return NextResponse.json(
      { error: "Something went wrong submitting your application." },
      { status: 500 }
    );
  }
}
