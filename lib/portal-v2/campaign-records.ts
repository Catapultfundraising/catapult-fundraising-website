import type { PortalGift } from "./clients";

/** Read-only fallback records for campaign-only donors absent from the master file.
 * Pledges appear as campaign activity, never as received/lifetime giving. No new
 * CPTID is invented for unlinked gifts, and no donor rows are merged by name.
 */
export function campaignRecords(gifts: PortalGift[]) {
  const out = new Map<number, {
    cptid: number; name: string; kind: string; contact: Record<string, string>;
    flags: string[]; gifts: { amount: number }[]; summary: { lifetime: number; gifts: number; largest: number; years: number; band: string };
    givebutter: { type: string; date: string; amount: number; campaign: string; status: string }[];
    notes: string[];
  }>();
  for (const g of gifts) {
    const id = Number(g.cptid);
    if (!(id > 0) || !g.donor_name.trim()) continue;
    const r = out.get(id) ?? {
      cptid: id, name: g.donor_name, kind: "Campaign donor", contact: {},
      flags: ["Campaign donor"], gifts: [], summary: { lifetime: 0, gifts: 0, largest: 0, years: 0, band: "" },
      givebutter: [], notes: ["This donor has campaign activity but no master donor record in the latest client file. Campaign pledges count toward the campaign goal, not lifetime payments received."],
    };
    r.givebutter.push({ type: g.kind, date: g.gift_date ?? "", amount: Number(g.amount), campaign: "Capital campaign", status: g.kind === "pledge" ? "Pledged" : "Received" });
    out.set(id, r);
  }
  return out;
}
