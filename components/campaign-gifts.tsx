"use client";
import type { ComponentType } from "react";
import type { TableSource } from "@/lib/portal-v2/dashboard-export-types";
import { campaignLedger, campaignGiftSource } from "@/lib/portal-v2/campaign-ledger";
import { campaignByLevel, type PortalGift } from "@/lib/portal-v2/clients";
import { CampaignProgress } from "@/components/portal-v2";
import { useRecordNav } from "@/components/dashboard-shared";

const card = "min-w-0 rounded-xl border border-[rgb(var(--line))] bg-white p-4 sm:p-5";
const usd = (n: number) => n.toLocaleString("en-US", {style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});

/** Shared across every employee dashboard. Tables retain each client's existing
 * search, sort, donor navigation and server-reconstructed PDF/Excel downloads. */
export function CampaignGifts({ snapshot, Table }: {
  snapshot: object;
  Table: ComponentType<{ exportSource: TableSource; csvName?: string; rowClick?: (row: Record<string, unknown>) => void }>;
}) {
  const nav = useRecordNav();
  const gifts = campaignLedger(snapshot);
  const payments = gifts.filter(g => g.kind === "gift"), pledges = gifts.filter(g => g.kind === "pledge");
  const totals = campaignByLevel({rows:[]}, gifts);
  const drill = (title: string, rows: PortalGift[]) => nav?.drillIds(title, "Donor records linked to current campaign entries", rows.map(g => Number(g.cptid)).filter(id => id > 0));
  const donors = new Set(payments.map(g => g.cptid ? `c${g.cptid}` : `n${g.donor_name.trim().toLowerCase()}`)).size;
  return <div className="space-y-6">
    <CampaignProgress />
    <div className={card}><p className="text-sm text-[rgb(var(--ink))]/75">
      Current campaign gifts and pledges from the same effective ledger as the campaign total, including corrections, Stewardship commitments and portal entries. Voided entries are excluded.
      Payments received + outstanding commitment = campaign total. Pledged is the full face value, not an amount to add to payments received. Campaign credit uses the larger of each donor&apos;s total gifts or pledges, so pledge payments are not counted twice. Online provider activity and lifetime giving remain separate.
    </p></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {[
        ["Campaign gifts", payments.length.toLocaleString("en-US")],
        ["Campaign payments received", usd(totals.totalGifts)],
        ["Campaign pledges", pledges.length.toLocaleString("en-US")],
        ["Pledged", usd(totals.totalPledges)],
        ["Campaign total", usd(totals.raised)],
        ["Outstanding commitment", usd(Math.max(0, totals.raised - totals.totalGifts))],
      ].map(([label,value], i) => <button type="button" key={label} onClick={() => drill(label, i === 4 ? gifts : i < 2 ? payments : pledges)} className={`${card} text-left hover:border-[rgb(var(--brass))]`}><p className="font-display text-2xl text-[rgb(var(--navy))]">{value}</p><p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">{label}</p>{i === 0 && <p className="mt-1 text-xs text-[rgb(var(--ink))]/55">{donors.toLocaleString("en-US")} donors</p>}</button>)}
    </div>
    {[
      ["Campaign.0","Gifts by source","Campaign Gifts by Source"],
      ["Campaign.1","Pledges","Campaign Pledges"],
      ["Campaign.2","Gifts","Campaign Gifts"],
    ].map(([table,title,csvName]) => <div key={table} className={card}>
      <h2 className="font-display mb-3 text-xl text-[rgb(var(--navy))]">{title}</h2>
      <Table exportSource={{table,snapshot,parameters:{}}} csvName={csvName}
        rowClick={table === "Campaign.0" ? row => drill(String(row.source), payments.filter(g => campaignGiftSource(g) === row.source)) : undefined} />
    </div>)}
  </div>;
}
