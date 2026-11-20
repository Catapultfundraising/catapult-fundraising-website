// Pure current table models extracted from the existing IMAS dashboard.
// Shared by visible Table and authoritative export; no caller cell values or executable input.
import type {ImasSnapshot,Person,IndexRow} from "../imas-data-store";
import type {ImasTracking} from "../imas-tracking-types";
import {seatGc2p,extrasFromIndex} from "../imas-gc2p";
import {formatDollars} from "../gift-chart";
import {campaignAskAmount} from "./effective-ask";
import {filterAssignments,assignmentMembers,belongsToSolicitor,isUnassigned} from "./effective-assignment";
import type {TableContext,TableColumn,TableRow,TableModel} from "./dashboard-export-types";
export function imasExportTable(table:string,context:TableContext):TableModel {
const d=context.snapshot as ImasSnapshot, index=context.index as IndexRow[], tracking=context.tracking as ImasTracking, parameters=context.parameters??{};
switch(table){
case "Overview.0": {
const recent = d.fys.slice(-10);
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
            { key: "fy", label: "Year" },
            { key: "total", label: "Dollars", fmt: (v) => usd(v as number), right: true },
            { key: "donors", label: "Donors", right: true },
            { key: "newDonors", label: "New donors", right: true },
            { key: "retention", label: "Retention", fmt: (v) => `${v}%`, right: true },
          ];
return {title:("Giving by Year").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:([...recent].reverse().map((f) => {
            const r = d.retention.find((x) => x.fy === f.fy);
            return { ...f, retention: r ? r.rate : 0, newDonors: r ? r.new : 0 };
          })) as unknown as TableRow[],cols:exportCols};
}
case "Overview.1": {
const num = (n: number) => n.toLocaleString("en-US");
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
            { key: "stage", label: "Donor Type" },
            { key: "gifts", label: "Gifts", right: true, fmt: (v) => num(v as number) },
            { key: "total", label: "Dollars", right: true, fmt: (v) => usd(v as number) },
          ];
return {title:("Giving by Donor Type").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(d.stages) as unknown as TableRow[],cols:exportCols};
}
case "Pyramid.0": {
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const personCols: { key: keyof Person; label: string; fmt?: (v: never) => string; right?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "solicitor", label: "Primary Solicitor" }, { key: "solicitor2", label: "Secondary Solicitor" },
  { key: "lifetime", label: "Lifetime", fmt: (v: number) => usd(v), right: true },
  { key: "gifts", label: "# Gifts", right: true },
  { key: "largest", label: "Largest", fmt: (v: number) => usd(v), right: true },
  { key: "years", label: "Yrs Giving", right: true },
  { key: "first", label: "First Gift" },
  { key: "last", label: "Last Gift" },
  { key: "ds", label: "DS Rating" },
  { key: "capacity", label: "Capacity" },
];
const exportCols: TableColumn[] = personCols;
return {title:("Top 250 Donors").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(d.top) as unknown as TableRow[],cols:exportCols};
}
case "GiftChartTab.0": {
const goal = parameters.goal!;
const { chart, seated, removed, below, belowLevel } = seatGc2p(goal, d.pool, tracking, extrasFromIndex(index, tracking, d.pool));
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
            { key: "gifts", label: "Gifts" }, { key: "level", label: "Gift Level" },
            { key: "value", label: "Value", fmt: (v) => usd(v as number), right: true },
            { key: "cumulative", label: "Cumulative", fmt: (v) => usd(v as number), right: true },
            { key: "prospects", label: "Prospects Needed", right: true },
            { key: "share", label: "% of Goal", fmt: (v) => `${v}%`, right: true },
          ];
return {title:(`Gift Chart ${formatDollars(goal)}`).replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(chart.rows.map((r) => ({
            lvl: r.level, gifts: r.gifts ?? "Many", level: r.level === null ? `Under ${formatDollars(r.under ?? 0)}` : formatDollars(r.level),
            value: r.value, cumulative: r.cumulative, prospects: r.prospects ?? "", share: Math.round(r.shareOfGoal * 1000) / 10,
          }))) as unknown as TableRow[],cols:exportCols};
}
case "GiftChartTab.1": {
const goal = parameters.goal!;
const { chart, seated, removed, below, belowLevel } = seatGc2p(goal, d.pool, tracking, extrasFromIndex(index, tracking, d.pool));
const x = seated.find(v => v.level === parameters.level); if (!x) throw new Error("Selected GC2P level is no longer available");
const stOf = (id: number) => tracking.prospects[String(id)];
const exportCols: TableColumn[] = [
                    { key: "name", label: "Prospect" },
                    { key: "solicitor", label: "Committee Solicitor / Connection" }, { key: "solicitor2", label: "Secondary Solicitor" },
                    { key: "status", label: "Status" },
                    { key: "pir", label: "PIR" },
                    { key: "donorType", label: "Type" },
                    { key: "wealth", label: "Wealth Rating" },
                    { key: "capText", label: "Capacity / Grant Range" },
                    { key: "history", label: "Giving History" },
                    { key: "note", label: "Notes" },
                  ];
return {title:(`GC2P ${formatDollars(x.level)} Level`).replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:`${formatDollars(goal)} goal`,rows:(x.people.map((p) => ({ ...p, solicitor2: p.solicitor2 ?? "", solicitor: p.solicitor, status: stOf(p.cptid)?.status ?? p.status ?? "", pir: tracking.pirs[String(p.cptid)] ? "Yes" : "" }))) as unknown as TableRow[],cols:exportCols};
}
case "GiftChartTab.2": {
const goal = parameters.goal!;
const { chart, seated, removed, below, belowLevel } = seatGc2p(goal, d.pool, tracking, extrasFromIndex(index, tracking, d.pool));
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
                  { key: "name", label: "Prospect" },
                  { key: "amount", label: "Ask / Rating", fmt: (v: unknown) => usd(v as number), right: true },
                  { key: "ds", label: "DS" },
                  { key: "lifetime", label: "Lifetime", fmt: (v: unknown) => usd(v as number), right: true },
                  { key: "largest", label: "Largest Gift", fmt: (v: unknown) => usd(v as number), right: true },
                  { key: "last", label: "Last Gift" },
                ];
return {title:(`GC2P Below ${formatDollars(belowLevel)}`).replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:`${formatDollars(goal)} goal`,rows:(below.map((p) => ({ ...p, amount: campaignAskAmount(p) }))) as unknown as TableRow[],cols:exportCols};
}
case "Prospects.0": {
const pools = [
    { k: "High Wealth", rows: d.highWealth, n: d.highWealthCount, desc: "DonorSearch capacity of $25K or more, sorted by capacity. Major gift and campaign prospects." },
    { k: "Mid-Level", rows: d.midLevel, n: d.midLevelCount, desc: "Lifetime $250 to $4,999 with a gift in the last 3 years. Mid-Level program pool." },
    { k: "Legacy", rows: d.legacy, n: d.legacyCount, desc: "Gave in 3 or more calendar years, lifetime under $25K. Legacy Call pool." },
    { k: "Lapsed $1K+", rows: d.lapsed, n: d.lapsedCount, desc: "Lifetime $1K or more, no gift in the last 3 years. Reactivation pool." },
  ];
const sel = parameters.pool ?? 0;
const p = pools[sel];
const assignmentFilter = parameters.assignment ?? "all";
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const personCols: { key: keyof Person; label: string; fmt?: (v: never) => string; right?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "solicitor", label: "Primary Solicitor" }, { key: "solicitor2", label: "Secondary Solicitor" },
  { key: "lifetime", label: "Lifetime", fmt: (v: number) => usd(v), right: true },
  { key: "gifts", label: "# Gifts", right: true },
  { key: "largest", label: "Largest", fmt: (v: number) => usd(v), right: true },
  { key: "years", label: "Yrs Giving", right: true },
  { key: "first", label: "First Gift" },
  { key: "last", label: "Last Gift" },
  { key: "ds", label: "DS Rating" },
  { key: "capacity", label: "Capacity" },
];
const exportCols: TableColumn[] = personCols;
return {title:(`${p.k} Prospects`).replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(filterAssignments(p.rows, assignmentFilter)) as unknown as TableRow[],cols:exportCols};
}
case "Board.0": {
const stew = new Map(((d as unknown as { committed?: { cptid: number; ask: number }[] }).committed ?? []).filter((p) => p.ask > 0).map((p) => [p.cptid, p.ask] as const));
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
            { key: "name", label: "Name" },
            { key: "title", label: "Status" },
            { key: "term", label: "Date" },
            { key: "ask", label: "Pledge", fmt: (v) => usd(v as number), right: true },
            { key: "get", label: "Gift", fmt: (v) => usd(v as number), right: true },
            { key: "lifetime", label: "Lifetime", fmt: (v) => usd(v as number), right: true },
            { key: "last", label: "Last Gift" },
            { key: "ds", label: "DS" },
            { key: "capacity", label: "Capacity" },
          ];
return {title:("Committee Giving").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(d.board.map((b) => (stew.has(b.cptid ?? -1) ? { ...b, get: stew.get(b.cptid ?? -1)! } : b))) as unknown as TableRow[],cols:exportCols};
}
case "Health.0": {

const exportCols: TableColumn[] = [{ key: "type", label: "Donor Type" }, { key: "count", label: "Records", right: true }];
return {title:("Donor Types").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(d.donorType.map(([k, n]) => ({ type: k, count: n }))) as unknown as TableRow[],cols:exportCols};
}
case "Health.1": {

const exportCols: TableColumn[] = [{ key: "flag", label: "Flag" }, { key: "count", label: "Records", right: true }];
return {title:("Affiliation Flags").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(Object.entries(d.flags).map(([k, n]) => ({ flag: k, count: n }))) as unknown as TableRow[],cols:exportCols};
}
case "Health.2": {

const exportCols: TableColumn[] = [{ key: "type", label: "Type" }, { key: "count", label: "Orgs", right: true }];
return {title:("Organization Types").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(d.orgTypes.map(([k, n]) => ({ type: k, count: n }))) as unknown as TableRow[],cols:exportCols};
}
case "Portfolio.0": {
const bySol = Array.from(new Set(d.portfolio.flatMap((p) => assignmentMembers(p)))).sort().map((s) => {
    const ps = d.portfolio.filter((p) => belongsToSolicitor(p, s));
    return { solicitor: s, prospects: ps.length, asks: ps.filter((p) => p.ask > 0).length, ask: ps.reduce((a, p) => a + p.ask, 0) };
  }).sort((a, b) => b.ask - a.ask);
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
          { key: "solicitor", label: "Solicitor / Connection" }, { key: "prospects", label: "Prospects", right: true },
          { key: "asks", label: "Seated", right: true }, { key: "ask", label: "Total of Gift Levels", fmt: (v) => usd(v as number), right: true },
        ];
return {title:("Prospects by Solicitor").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(bySol) as unknown as TableRow[],cols:exportCols};
}
case "Portfolio.1": {
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const cols = [
    { key: "name", label: "Prospect" }, { key: "solicitor", label: "Committee Solicitor / Connection" }, { key: "solicitor2", label: "Secondary Solicitor" },
    { key: "ask", label: "Gift Level", fmt: (v: unknown, r: { askConflict?: boolean; askBlank?: boolean; askEdited?: boolean; directAskPresent?: boolean }) => r.askConflict ? "Review merged asks" : r.askBlank ? "" : (v || r.askEdited || r.directAskPresent ? usd(v as number) : ""), right: true },
    { key: "priority", label: "Status" }, { key: "type", label: "Type" },
    { key: "lifetime", label: "Lifetime", fmt: (v: unknown) => usd(v as number), right: true },
    { key: "ds", label: "Wealth Rating" }, { key: "capacity", label: "Capacity / Grant Range" }, { key: "task", label: "Notes" },
  ];
const exportCols: TableColumn[] = cols;
return {title:("Campaign Prospects").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(d.portfolio.map((p) => ({ ...p, solicitor2: p.solicitor2 ?? "" }))) as unknown as TableRow[],cols:exportCols};
}
case "Portfolio.2": {

const exportCols: TableColumn[] = [{ key: "name", label: "Prospect" }, { key: "type", label: "Type" }, { key: "note", label: "Notes" }];
return {title:("Pipeline Not Yet Seated").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(d.unrated) as unknown as TableRow[],cols:exportCols};
}
case "Portfolio.3": {

const exportCols: TableColumn[] = [{ key: "name", label: "Prospect" }, { key: "reason", label: "Reason" }];
return {title:("Not Seated").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(d.notSeated) as unknown as TableRow[],cols:exportCols};
}
case "Givebutter.0": {
const g = d.givebutter;
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
          { key: "campaign", label: "Type" }, { key: "gifts", label: "Gifts", right: true },
          { key: "total", label: "Dollars", fmt: (v) => usd(v as number), right: true },
        ];
return {title:("Campaign Gifts by Type").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(g.byCampaign) as unknown as TableRow[],cols:exportCols};
}
case "Givebutter.1": {
const g = d.givebutter;
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
          { key: "name", label: "Name" }, { key: "pledged", label: "Pledged On" },
          { key: "amount", label: "Amount", fmt: (v: unknown) => usd(v as number), right: true },
          { key: "remaining", label: "Remaining", fmt: (v: unknown) => usd(v as number), right: true },
                    { key: "campaign", label: "Campaign" }, { key: "status", label: "Status" },
        ];
return {title:("Campaign Pledges").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(g.pledges) as unknown as TableRow[],cols:exportCols};
}
case "Givebutter.2": {
const g = d.givebutter;
const usd = (n: number, d = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const exportCols: TableColumn[] = [
          { key: "date", label: "Date" }, { key: "name", label: "Name" },
          { key: "amount", label: "Amount", fmt: (v: unknown) => usd(v as number, 2), right: true },
          { key: "dedication", label: "Type" }, { key: "fund", label: "Description" }, { key: "status", label: "Status" },
        ];
return {title:("Campaign Gifts").replace(/\.csv$/i,"").replace(/^IMAS /,""),subtitle:undefined,rows:(g.transactions) as unknown as TableRow[],cols:exportCols};
}
default:throw new Error("Unknown dashboard table selector");
}}

import type {DonorRecord} from "../imas-data-store";
import type {CurrentExportPayload} from "./dashboard-export-types";
import type {DirectFileStateNote} from "./directFileProtocol";
import {viewAssignment} from "./effective-assignment";
const recordUsd=(n:number,d=0)=>(n||0).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:d,minimumFractionDigits:d});
export const indexCols: { key: keyof IndexRow; label: string; kind?: ExportKind }[] = [
  { key: "name", label: "Name" }, { key: "kind", label: "Type" }, { key: "city", label: "City" },
  { key: "lifetime", label: "Lifetime", kind: "usd" }, { key: "gifts", label: "# Gifts", kind: "num" },
  { key: "largest", label: "Largest", kind: "usd" }, { key: "last", label: "Last Gift" },
  { key: "solicitor", label: "Primary Solicitor" }, { key: "solicitor2", label: "Secondary Solicitor" },
  { key: "ds", label: "DS Rating" }, { key: "capacity", label: "Capacity" },
];
export function indexPayload(title: string, sub: string, rows: IndexRow[]): CurrentExportPayload {
  return {
    title, subtitle: sub, cols: [{ label: "CPTID" }, ...indexCols.map((c) => ({ label: c.label, kind: c.kind }))],
    sections: [{ rows: rows.map((r) => [r.cptid, ...indexCols.map((c) => (r[c.key] ?? "") as string | number)]) }],
  };
}
export function recordPayload(r: DonorRecord, t?: ImasTracking, includeDirect=false): CurrentExportPayload {
  const ca=(r as unknown as {campaignAsk?:{ask?:number|null;askBlank?:boolean;askConflict?:boolean}}).campaignAsk;
  const st = t?.prospects[String(r.cptid)];
  const acts = (t?.activity ?? []).filter((a) => a.cptid === r.cptid).sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
  const c = r.contact ?? {};
  const assignment = viewAssignment({ cptid: r.cptid, ...r.assignment }, null, t ?? { prospects: {} });
  const prof: (string | number | null)[][] = [
    ["Primary solicitor", assignment.solicitor || "Unassigned", "", "", "", ""],
    ["Secondary solicitor", assignment.solicitor2 || "Unassigned", "", "", "", ""],
    ...(includeDirect ? [["Campaign ask", ca?.askConflict ? "Review merged asks" : ca?.askBlank || ca?.ask == null ? "" : recordUsd(ca.ask), "", "", "", ""]] : []),
    ["CPTID", String(r.cptid), "", "", "", ""], ["Type", r.kind ?? "", "", "", "", ""],
    ["Address", [c.street, c.city, c.state, c.zip].filter(Boolean).join(", "), "", "", "", ""],
    ["Phone", [c.phone, c.mobile].filter(Boolean).join(" / "), "", "", "", ""], ["Email", [c.email, c.workEmail].filter(Boolean).join(" / "), "", "", "", ""],
    ["Lifetime giving", recordUsd(r.summary.lifetime), "", "", "", ""], ["Gifts", String(r.summary.gifts), "", "", "", ""],
    ["Largest gift", recordUsd(r.summary.largest), "", "", "", ""], ["First / last gift", `${r.summary.first ?? ""} / ${r.summary.last ?? ""}`, "", "", "", ""],
    ["DS rating / capacity", `${r.ds?.["DS Rating"] ?? ""} / ${r.ds?.["Wealth-Based Capacity"] ?? ""}`, "", "", "", ""],
    ["Affiliations", (r.flags ?? []).join(", "), "", "", "", ""],
  ];
  return {
    title: `Donor Record, ${r.name}`, subtitle: `CPTID ${r.cptid}`,
    cols: [{ label: "Year" }, { label: "Amount", kind: "usd" }, { label: "" }, { label: "" }, { label: "" }, { label: "" }],
    sections: [
      { heading: "Profile", rows: prof.filter((x) => x[1]) },
      ...(st || acts.length ? [{ heading: `Campaign tracking${st ? `: ${st.status}${st.level ? `, $${st.level.toLocaleString("en-US")} level` : ""}${st.solicitor ? `, solicitor ${st.solicitor}` : ""}${st.solicitor2 ? `, secondary solicitor ${st.solicitor2}` : ""}` : ""}`, rows: acts.map((a) => [a.date, null, a.kind, a.by, a.note, ""] as (string | number | null)[]) }] : []),
      ...(includeDirect && (r as unknown as {directSourceNotes?:DirectFileStateNote[]}).directSourceNotes?.length ? [{heading:"Imported source notes — read only (declared attribution)",rows:(r as unknown as {directSourceNotes:DirectFileStateNote[]}).directSourceNotes.map(n=>[n.note_date,null,n.declared_actor,n.file_name,n.body,`Source date ${n.source_date}; request ${n.request_id}; SHA256 ${n.file_digest}`] as (string|number|null)[])}] : []),
      { heading: `Giving by calendar year (${r.gifts?.length ?? 0})`, rows: (r.gifts ?? []).map((g) => [g.date ?? "", g.amount, "", "", "", ""]) },
    ],
    notes: [...(r.calls ?? []).map((x) => `Call ${x.date}: ${x.result}${x.reason ? ` (${x.reason})` : ""}. ${x.comments ?? ""}`), ...(r.notes ?? []).map((n) => `Note: ${n}`)],
  };
}

type ExportKind = "text"|"usd"|"num"|"pct";
