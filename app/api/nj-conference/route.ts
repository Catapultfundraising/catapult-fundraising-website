import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { NJ_CUTOFF, NJ_EVENT, NJ_NOTE_PREFIX, excludedNjEmail, validateNjFields } from "@/lib/nj-conference";

export const runtime = "nodejs";
const reply = (body: object, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

/** Append-only receipts, not mutable contact properties. No public read/draw API. */
export async function POST(req: NextRequest) {
  if (Date.now() >= Date.parse(NJ_CUTOFF)) return reply({ error: "Entries are closed. Thank you for visiting us!" }, 410);
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return reply({ error: "Please submit from the giveaway page." }, 403);
  if (Number(req.headers.get("content-length") || 0) > 8192) return reply({ error: "Request is too large." }, 413);
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 8192) return reply({ error: "Request is too large." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ error: "Please check your entry and try again." }, 400);
  }
  if (body.website !== undefined && body.website !== "") return reply({ error: "Unable to accept this entry." }, 400);
  const fields = validateNjFields(body);
  if (!fields) return reply({ error: "Please complete your name, valid email and organization, and check the optional fields." }, 400);
  if (excludedNjEmail(fields.email)) return reply({ error: "Please use a non-staff, non-test email address." }, 400);
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) return reply({ error: "We could not save your entry. Please try again or speak with us at the booth." }, 503);

  // The acceptance clock belongs to the server, never the browser/contact record.
  const acceptedAt = new Date().toISOString();
  if (Date.parse(acceptedAt) >= Date.parse(NJ_CUTOFF)) return reply({ error: "Entries are now closed." }, 410);
  const entryKey = createHash("sha256").update(`${NJ_EVENT}\n${fields.email}`).digest("hex");
  const snapshot = { schemaVersion: 1, eventId: NJ_EVENT, entryKey, acceptedAt, cutoff: NJ_CUTOFF, ...fields };
  try {
    const saved = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: { hs_timestamp: acceptedAt, hs_note_body: NJ_NOTE_PREFIX + JSON.stringify(snapshot) },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!saved.ok || typeof (await saved.json()).id !== "string") throw new Error("persistence");
    // Retried/concurrent receipts have the same entryKey. The private draw
    // collapses them, rather than trusting eventually consistent CRM search.
    return reply({ ok: true, message: "Your entry is saved. One entry per email; repeat submissions do not add chances." });
  } catch {
    // Do not log entrant data, tokens, or upstream error bodies.
    console.error("NJ giveaway receipt persistence failed");
    return reply({ error: "We could not confirm your entry was saved. Please retry with the same email or speak with us at the booth." }, 503);
  }
}
