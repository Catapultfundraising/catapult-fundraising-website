import type { PortalGift } from "./clients";
import { moneyCents, centsMoney, displayMoney } from "./pvas-financials";
import type { TableModel, TableColumn } from "./dashboard-export-types";

/** Only the already-effective campaign state belongs here. Never append provider
 * snapshots or reapply overrides/Stewardship: the state owner has done that. */
export function campaignLedger(snapshot: unknown): PortalGift[] {
  const gifts = (snapshot as { campaignGifts?: PortalGift[] } | null)?.campaignGifts;
  if (!Array.isArray(gifts)) throw new Error("Current campaign ledger unavailable");
  if (gifts.some(g => g.amountExact !== undefined) && !gifts.every(g => typeof g.amountExact === "string"))
    throw new Error("Incomplete exact campaign amounts");
  return gifts;
}
export function campaignGiftSource(g: PortalGift): string {
  if (g._nativeGift) return g._nativeGift.representation === "admitted-event" ? "Recorded gift" :
    g._nativeGift.source.system === "website_db" ? "Client database" : "Portal entry";
  return g.created_by === "Stewardship" ? "Stewardship" :
    g.source === "database" ? "Client database" :
    g.source === "upload" ? "Client file" : "Portal entry";
}
const money = (value: never) => Number(value).toLocaleString("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const moneyCol = (key: string, label: string): TableColumn => ({ key, label, right: true, fmt: money });
function total(gifts: PortalGift[]): number {
  // Canonical state supplies exact strings for every row. Do not silently mix
  // rounded legacy amounts into an exact ledger.
  if (gifts.some(g => g.amountExact !== undefined)) {
    if (!gifts.every(g => typeof g.amountExact === "string")) throw new Error("Incomplete exact campaign amounts");
    return displayMoney(centsMoney(gifts.reduce((s,g) => s + moneyCents(g.amountExact!), BigInt(0))));
  }
  return gifts.reduce((s,g) => s + Number(g.amount), 0);
}
export function campaignLedgerTable(table: string, snapshot: unknown): TableModel {
  const gifts = campaignLedger(snapshot);
  if (table === "Campaign.0") {
    const groups = new Map<string, PortalGift[]>();
    for (const g of gifts.filter(g => g.kind === "gift")) {
      const source = campaignGiftSource(g);
      groups.set(source, [...(groups.get(source) ?? []), g]);
    }
    return { title: "Campaign Gifts by Source",
      rows: Array.from(groups, ([source, rows]) => ({ source, gifts: rows.length, total: total(rows) })),
      cols: [{key:"source",label:"Source"},{key:"gifts",label:"Gifts",right:true},moneyCol("total","Dollars")] };
  }
  if (table !== "Campaign.1" && table !== "Campaign.2") throw new Error("Unknown dashboard table selector");
  const pledge = table === "Campaign.1";
  return { title: pledge ? "Campaign Pledges" : "Campaign Gifts",
    rows: gifts.filter(g => g.kind === (pledge ? "pledge" : "gift")).map(g => ({
      cptid:g.cptid, name:g.donor_name, date:g.gift_date ?? "",
      amount:g.amountExact === undefined ? Number(g.amount) : displayMoney(g.amountExact),
      source:campaignGiftSource(g), note:g.note ?? "", corrected:g.corrected ? "Corrected" : "",
    })).sort((a,b) => pledge ? b.amount-a.amount : b.date.localeCompare(a.date)),
    cols:[{key:"date",label:pledge?"Pledge date":"Date"},{key:"name",label:"Name"},
      moneyCol("amount",pledge?"Pledged":"Received"),{key:"source",label:"Source"},
      {key:"note",label:"Notes"},{key:"corrected",label:"Correction"}] };
}
