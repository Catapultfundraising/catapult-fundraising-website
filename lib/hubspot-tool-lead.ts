import { LEAD_EMAILS } from "@/lib/constants";

/**
 * Tags a HubSpot contact as a free-tool lead so inbound can be pulled with a
 * filter or list instead of read note by note.
 *
 * Every tool submission writes:
 *  - website_tool            multi-select, every tool this contact has used
 *  - website_tool_last_used  the tool used on this submission
 *  - website_tool_last_date  today's date
 * plus any tool-specific properties the caller passes in `extra`.
 *
 * Owner (Anthony) and Lead Status (New) are only filled when they are empty,
 * so an existing client or a contact someone is already working keeps its
 * owner and status. Catapult staff addresses (@catapultfr.com) are skipped.
 *
 * The custom properties live in the "Website Free Tools" group on the contact
 * object. HubSpot rejects the whole patch if any property is missing, so a
 * failure is logged and swallowed and never blocks the visitor.
 */

export type WebsiteTool = "gift_chart" | "readiness" | "loyalty";

const HUBSPOT_CONTACTS = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_OWNERS = "https://api.hubapi.com/crm/v3/owners";
const LEAD_OWNER_EMAIL = LEAD_EMAILS[0];
const INTERNAL_DOMAIN_RE = /@catapultfr\.com$/i;

let cachedOwnerId: string | null | undefined;

export async function findLeadOwnerId(token: string): Promise<string | null> {
  if (cachedOwnerId !== undefined) return cachedOwnerId;
  try {
    const res = await fetch(`${HUBSPOT_OWNERS}?email=${encodeURIComponent(LEAD_OWNER_EMAIL)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("HubSpot owner lookup error (tool lead):", res.status, await res.text());
      cachedOwnerId = null;
      return null;
    }
    const data = await res.json();
    const id = data.results?.[0]?.id;
    cachedOwnerId = id ? String(id) : null;
    return cachedOwnerId;
  } catch (err) {
    console.error("HubSpot owner lookup threw (tool lead):", err);
    cachedOwnerId = null;
    return null;
  }
}

export async function tagToolLead(
  token: string,
  contactId: string,
  tool: WebsiteTool,
  extra: Record<string, string> = {},
): Promise<boolean> {
  try {
    const current = await fetch(
      `${HUBSPOT_CONTACTS}/${contactId}?properties=email,website_tool,hubspot_owner_id,hs_lead_status`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const existing: Record<string, string | null> = current.ok
      ? (await current.json()).properties ?? {}
      : {};

    // Staff testing the tools should not land in the lead list.
    if (INTERNAL_DOMAIN_RE.test(existing.email || "")) return true;

    const tools = new Set(
      (existing.website_tool || "")
        .split(";")
        .map((t) => t.trim())
        .filter(Boolean),
    );
    tools.add(tool);

    const properties: Record<string, string> = {
      ...extra,
      website_tool: Array.from(tools).join(";"),
      website_tool_last_used: tool,
      website_tool_last_date: new Date().toISOString().slice(0, 10),
    };

    if (current.ok && !existing.hubspot_owner_id) {
      const ownerId = await findLeadOwnerId(token);
      if (ownerId) properties.hubspot_owner_id = ownerId;
    }
    if (current.ok && !existing.hs_lead_status) {
      properties.hs_lead_status = "NEW";
    }

    const res = await fetch(`${HUBSPOT_CONTACTS}/${contactId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    });
    if (!res.ok) {
      console.error(`HubSpot tool tag error (${tool}):`, res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`HubSpot tool tag threw (${tool}):`, err);
    return false;
  }
}
