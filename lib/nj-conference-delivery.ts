import type { NjFields } from "./nj-conference";

const CONTACTS = "https://api.hubapi.com/crm/v3/objects/contacts";
const timeout = () => AbortSignal.timeout(4000);

/** Side effects only: the immutable standalone receipt remains the draw authority. */
export async function syncNjContact(token: string, fields: NjFields, noteId: string): Promise<boolean> {
  let stage = "contact_lookup";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const email = fields.email.trim().toLowerCase();
  const lookup = () => fetch(`${CONTACTS}/${encodeURIComponent(email)}?idProperty=email`, {
    headers, cache: "no-store", signal: timeout(),
  });
  try {
    let contact = await lookup();
    if (contact.status === 404) {
      stage = "contact_create";
      contact = await fetch(CONTACTS, {
        method: "POST", headers, cache: "no-store", signal: timeout(),
        body: JSON.stringify({ properties: {
          email, firstname: fields.firstName, lastname: fields.lastName,
          company: fields.organization, ...(fields.phone ? { phone: fields.phone } : {}),
        } }),
      });
      // A concurrent submission may have created the same email. Re-read by
      // HubSpot's unique email key; never parse upstream errors or create twice.
      if (contact.status === 409) {
        stage = "contact_conflict_lookup";
        contact = await lookup();
      }
    }
    if (!contact.ok) throw new Error("contact");
    const id: unknown = (await contact.json()).id;
    if (typeof id !== "string" || !/^\d+$/.test(id)) throw new Error("contact_id");
    // Existing contacts are deliberately not patched, even when fields are
    // blank: a read-then-fill race could overwrite a staff update. Preserve
    // identities, owners, lifecycle/lead status, marketing status and opt-outs.
    stage = "contact_association";
    const associated = await fetch(
      `https://api.hubapi.com/crm/v4/objects/notes/${encodeURIComponent(noteId)}/associations/contacts/${id}`,
      {
        method: "PUT", headers, cache: "no-store", signal: timeout(),
        // Direction matters: note -> contact is 202 (contact -> note is 201).
        body: JSON.stringify([{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }]),
      },
    );
    if (!associated.ok) throw new Error("association");
    return true;
  } catch {
    // Reconcile from this durable note, not a mutable contact or raw error.
    console.error("NJ giveaway contact sync failed", { stage, noteId: /^\d+$/.test(noteId) ? noteId : "unavailable" });
    return false;
  }
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Same Resend sender/pattern as presentation forms; no entrant confirmation. */
export async function notifyNjEntry(fields: NjFields, acceptedAt: string, noteId: string): Promise<boolean> {
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("unconfigured");
    const rows = [
      ["Name", `${fields.firstName} ${fields.lastName}`],
      ["Email", fields.email], ["Organization", fields.organization],
      ["Phone", fields.phone || "Not provided"],
      ["Service interest", fields.serviceInterest || "Not specified"],
      ["Entry accepted (UTC)", acceptedAt], ["Receipt ID", noteId],
    ];
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", cache: "no-store", signal: timeout(),
      headers: {
        Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        "Idempotency-Key": `nj-entry-${noteId}`,
      },
      body: JSON.stringify({
        from: "Catapult Fundraising Website <website@catapultfr.com>",
        to: ["anthonya@catapultfr.com", "gwenp@catapultfr.com"],
        reply_to: fields.email,
        subject: "New NJ conference giveaway entry",
        html: `<h2>New NJ conference giveaway entry</h2><p>An entry was saved for the $50 Starbucks gift card drawing. This is an entry notification, not a winner announcement.</p><table cellpadding="6" style="border-collapse:collapse">${rows.map(([label, value]) => `<tr><td><strong>${esc(label)}</strong></td><td>${esc(value)}</td></tr>`).join("")}</table>`,
      }),
    });
    if (!response.ok) throw new Error("notification");
    return true;
  } catch {
    console.error("NJ giveaway entry notification failed", { noteId: /^\d+$/.test(noteId) ? noteId : "unavailable" });
    return false;
  }
}
