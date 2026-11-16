// Browser-safe public monthly campaign-cash contract; no SQL/runtime secrets.
export type MonthlyRow = { row: number; transactionId: string; clientId: string; cptid: number; donorName: string; amount: string; date: string; note: string; kind: "gift"; status: "received"; currency: "USD" };
export type MonthlyRequest = { client: string; source: string; requestId: string; fileName: string; fileDigest: string; sourceDate: string; period: string; actor: string; campaignOnly: true; currency: "USD"; basis: "received-cash"; rows: MonthlyRow[] };
export type MonthlyCounts = { new: number; unchanged: number; held: number };
export type MonthlyTotals = { new: string; unchanged: string; held: string };
export type MonthlyPlan = { v: 1; status: "preview"; requestId: string; payloadHash: string; planHash: string; expiresAt: number; proof: string; counts: MonthlyCounts; totals: MonthlyTotals; rows: { row: number; action: "new" | "unchanged" | "held"; reason: string | null }[] };
export type MonthlyApproval = { planHash: string; expiresAt: number; proof: string; confirm: true };
export type MonthlyReceipt = { v: 1; status: "committed"; requestId: string; client: string; payloadHash: string; batchId: number | null; counts: MonthlyCounts; totals: MonthlyTotals; scope: "campaign-gifts-only"; replayed: boolean };
export function monthlyCanonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(monthlyCanonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${monthlyCanonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
}
export const monthlyObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const monthlyHex = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
export const monthlyId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{32}$/.test(v);
export const monthlyExact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v, k));
export function monthlyCents(value: string): bigint {
  if (!/^(0|[1-9][0-9]*)\.[0-9]{2}$/.test(value) || value.length > 24) throw new Error("Invalid exact cash total");
  return BigInt(value.replace(".", ""));
}
function countsAndTotals(raw: Record<string, unknown>, expectedRows?: number) {
  if (!monthlyObject(raw.counts) || !monthlyObject(raw.totals) || !monthlyExact(raw.counts, ["new", "unchanged", "held"]) || !monthlyExact(raw.totals, ["new", "unchanged", "held"])) throw new Error("Unconfirmed monthly counts");
  let n = 0;
  for (const key of ["new", "unchanged", "held"]) {
    const count = raw.counts[key], total = raw.totals[key];
    if (!Number.isSafeInteger(count) || Number(count) < 0 || Number(count) > 1000 || typeof total !== "string" || monthlyCents(total) > BigInt("99999999999999000") || (count === 0 && total !== "0.00")) throw new Error("Unconfirmed monthly totals");
    n += Number(count);
  }
  if (n < 1 || n > 1000 || (expectedRows !== undefined && n !== expectedRows)) throw new Error("Unconfirmed monthly row count");
}
export function confirmedMonthlyPlan(raw: unknown, requestId: string, payloadHash?: string, rows?: MonthlyRow[]): MonthlyPlan {
  if (!monthlyObject(raw) || !monthlyExact(raw, ["v", "status", "requestId", "payloadHash", "planHash", "expiresAt", "proof", "counts", "totals", "rows"]) ||
      raw.v !== 1 || raw.status !== "preview" || raw.requestId !== requestId || !monthlyId(requestId) || !monthlyHex(raw.payloadHash) || !monthlyHex(raw.planHash) ||
      !monthlyHex(raw.proof) || !Number.isSafeInteger(raw.expiresAt) || (payloadHash !== undefined && raw.payloadHash !== payloadHash) || !Array.isArray(raw.rows)) throw new Error("Invalid monthly preview; nothing approved");
  countsAndTotals(raw, rows?.length);
  const seen = new Set<number>(), count = { new: 0, unchanged: 0, held: 0 }, total = { new: BigInt(0), unchanged: BigInt(0), held: BigInt(0) };
  for (const d of raw.rows) {
    if (!monthlyObject(d) || !monthlyExact(d, ["row", "action", "reason"]) || !Number.isSafeInteger(d.row) || Number(d.row) < 1 || seen.has(Number(d.row)) ||
        !["new", "unchanged", "held"].includes(String(d.action)) || !(d.reason === null || typeof d.reason === "string")) throw new Error("Invalid monthly decisions");
    const action = d.action as keyof typeof count, row = Number(d.row); seen.add(row); count[action]++;
    if (rows) { const source = rows.find(r => r.row === row); if (!source) throw new Error("Foreign monthly decision"); total[action] += monthlyCents(source.amount); }
  }
  if (JSON.stringify(count) !== JSON.stringify(raw.counts) && monthlyCanonical(count) !== monthlyCanonical(raw.counts)) throw new Error("Monthly decision/count mismatch");
  if (rows && Object.keys(total).some(k => total[k as keyof typeof total] !== monthlyCents((raw.totals as MonthlyTotals)[k as keyof MonthlyTotals]))) throw new Error("Monthly decision/total mismatch");
  return raw as MonthlyPlan;
}
export function confirmedMonthlyReceipt(raw: unknown, client: string, requestId: string, payloadHash?: string, rows?: number): MonthlyReceipt {
  if (!monthlyObject(raw) || !monthlyExact(raw, ["v", "status", "requestId", "client", "payloadHash", "batchId", "counts", "totals", "scope", "replayed"]) ||
      raw.v !== 1 || raw.status !== "committed" || raw.requestId !== requestId || !monthlyId(requestId) || raw.client !== client || !monthlyHex(raw.payloadHash) ||
      (payloadHash !== undefined && raw.payloadHash !== payloadHash) || !(raw.batchId === null || (Number.isSafeInteger(raw.batchId) && Number(raw.batchId) > 0)) ||
      raw.scope !== "campaign-gifts-only" || typeof raw.replayed !== "boolean") throw new Error("Unconfirmed monthly outcome; keep original request ID and check status, never resend");
  countsAndTotals(raw, rows);
  return raw as MonthlyReceipt;
}
