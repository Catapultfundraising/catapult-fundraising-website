// Pure report and gift-chart logic for the fictional sample dashboard (testable without React).
import { cmpValues, isoToUs } from "@/components/dashboard-shared";
import { buildGiftChart } from "@/lib/gift-chart";
import { DEMO_DONORS, lifetime, paid, outstanding, lastGift, type Donor } from "./data";
import type { Cell } from "./export";

export type FieldKey = "name" | "type" | "city" | "stage" | "solicitor" | "capacity" | "rating" | "lifetime" | "last" | "pledge" | "received" | "outstanding" | "ask" | "email";
export const FIELDS: Record<FieldKey, { label: string; get: (d: Donor) => Cell; money?: boolean; num?: (d: Donor) => number }> = {
  name: { label: "Name", get: (d) => d.name }, type: { label: "Type", get: (d) => d.type }, city: { label: "City", get: (d) => d.city },
  stage: { label: "Stage", get: (d) => d.stage }, solicitor: { label: "Solicitor", get: (d) => d.solicitor },
  capacity: { label: "Capacity", get: (d) => d.capacityLabel, num: (d) => d.capacity }, rating: { label: "Rating", get: (d) => d.rating },
  lifetime: { label: "Historical giving", get: lifetime, money: true }, last: { label: "Last gift", get: (d) => isoToUs(lastGift(d)), num: (d) => +lastGift(d).replace(/-/g, "") },
  pledge: { label: "Campaign pledge", get: (d) => d.pledge?.amount ?? 0, money: true }, received: { label: "Received", get: paid, money: true },
  outstanding: { label: "Outstanding", get: outstanding, money: true }, ask: { label: "Proposed ask", get: (d) => d.ask, money: true }, email: { label: "Email (fictional)", get: (d) => d.email },
};
export interface ReportSetup { fields: FieldKey[]; stage: string; type: string; solicitor: string; minCapacity: number; status: "all" | "committed" | "outstanding" | "open"; sortBy: FieldKey; dir: 1 | -1; top: number }
export const DEFAULT_SETUP: ReportSetup = { fields: ["name", "stage", "solicitor", "pledge", "received", "outstanding"], stage: "", type: "", solicitor: "", minCapacity: 0, status: "committed", sortBy: "pledge", dir: -1, top: 0 };
export function runReport(s: ReportSetup, donors: Donor[] = DEMO_DONORS): Donor[] {
  let r = donors.filter((d) => (!s.stage || d.stage === s.stage) && (!s.type || d.type === s.type) && (!s.solicitor || d.solicitor === s.solicitor) && d.capacity >= s.minCapacity
    && (s.status === "all" || (s.status === "committed" && !!d.pledge) || (s.status === "outstanding" && outstanding(d) > 0) || (s.status === "open" && !d.pledge && d.ask > 0 && d.stage !== "Declined")));
  const f = FIELDS[s.sortBy];
  r = [...r].sort((a, b) => cmpValues(f.num ? f.num(a) : f.get(a), f.num ? f.num(b) : f.get(b)) * s.dir);
  return s.top > 0 ? r.slice(0, s.top) : r;
}

export function seatGiftChart(goal: number, donors: Donor[] = DEMO_DONORS) {
  const chart = buildGiftChart(goal);
  const levels = chart.rows.filter((r) => r.level !== null);
  const seat = (amt: number) => levels.findIndex((r) => amt >= r.level!);
  return chart.rows.map((row, i) => {
    const isMany = row.level === null;
    const inRow = (amt: number) => (isMany ? seat(amt) === -1 : seat(amt) === i);
    return {
      row,
      committed: donors.filter((d) => d.pledge && inRow(d.pledge.amount)),
      prospects: donors.filter((d) => !d.pledge && d.ask && d.stage !== "Declined" && inRow(d.ask)),
    };
  });
}

