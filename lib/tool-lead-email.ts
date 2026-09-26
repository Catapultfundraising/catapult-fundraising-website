import { TOOL_LEAD_EMAILS } from "@/lib/constants";

// Sends a free-tool lead notification (gift chart calculator, readiness and
// loyalty report cards) to everyone in TOOL_LEAD_EMAILS.
//
// Resend's sandbox sender (onboarding@resend.dev) can only deliver to the
// Resend account's own address, so multi-recipient mail has to go out from the
// catapultfr.com domain (already used by the research portal's
// research@catapultfr.com sender). If that send is rejected for any reason, we
// fall back to the original sandbox send to the first address so a lead
// notification is never lost.
export async function sendToolLeadEmail(
  apiKey: string,
  msg: { subject: string; html: string; replyTo?: string },
  logLabel: string,
): Promise<{ sent: boolean }> {
  const send = (from: string, to: string[]) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        subject: msg.subject,
        html: msg.html,
      }),
    });

  const res = await send("Catapult Fundraising Website <website@catapultfr.com>", TOOL_LEAD_EMAILS);
  if (res.ok) return { sent: true };
  console.error(`Resend API error (${logLabel}, team send):`, res.status, await res.text());

  const fallback = await send("Catapult Fundraising Website <onboarding@resend.dev>", [
    TOOL_LEAD_EMAILS[0],
  ]);
  if (!fallback.ok) {
    console.error(`Resend API error (${logLabel}, fallback):`, fallback.status, await fallback.text());
    return { sent: false };
  }
  return { sent: true };
}
