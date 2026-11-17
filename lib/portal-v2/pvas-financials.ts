/** Exact wire arithmetic. Never parse financial amounts through Number first. */
export function moneyCents(value: unknown): bigint {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,15})\.\d{2}$/.test(value)) throw new Error("Invalid canonical decimal amount");
  return BigInt(value.replace(".", ""));
}
export function moneyInput(value:string):string {
  const s=value.replace(/[$,]/g,"").trim(),m=/^(0|[1-9]\d{0,15})(?:\.(\d{1,2}))?$/.exec(s);
  if(!m)throw new Error("Enter a positive plain decimal amount with at most two cents digits");
  const wire=`${m[1]}.${(m[2]??"").padEnd(2,"0")}`;
  if(moneyCents(wire)<=BigInt(0))throw new Error("Gift amount must be greater than zero");
  return wire;
}
export function centsMoney(value: bigint): string {
  if (value < BigInt(0)) throw new Error("Negative canonical amount");
  const s = value.toString().padStart(3, "0");
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}
export function usdExact(value:string):string {
  moneyCents(value);
  const [whole,cents]=value.split(".");
  return `$${BigInt(whole).toLocaleString("en-US")}.${cents}`;
}
/** Compatibility boundary for existing numeric chart props only. Exact wire
 * strings remain alongside the display model. Unsafe values HOLD, not round. */
export function displayMoney(value: unknown): number {
  const cents = moneyCents(value);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Canonical amount exceeds numeric display limit");
  const n = Number(cents) / 100;
  // Existing numeric dashboard props pass through common.round2 again.
  // A Number can stringify to the correct cents yet shift by a cent there.
  // Hold only this PVAS compatibility boundary; exact wire/bigint arithmetic
  // and the shared rounding behavior for other clients remain unchanged.
  const projected = Math.round((n + Number.EPSILON) * 100) / 100;
  if (n.toFixed(2) !== value || projected.toFixed(2) !== value) throw new Error("Canonical amount cannot roundtrip display");
  return n;
}
export type PvasFinancials = {
  v: 1;
  donors: { cptid: number; lifetime: string; receivedCount: number; undatedReceived: string; undatedCount: number; undatedPledged: string; firstDate: string | null; lastDate: string | null; largestGift: string;
    years: { year: number; received: string; receivedCount: number; pledged: string }[] }[];
  totals: { received: string; pledged: string };
};
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const count = (x: unknown): x is number => Number.isSafeInteger(x) && Number(x) >= 0;
const day = (x: unknown) => x === null || (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x);
export function validatePvasFinancials(raw: unknown): PvasFinancials {
  if (!object(raw) || raw.v !== 1 || !Array.isArray(raw.donors) || !object(raw.totals)) throw new Error("Canonical financial feed unavailable");
  const ids = new Set<number>(); let received = BigInt(0), pledged = BigInt(0);
  for (const row of raw.donors) {
    if (!object(row) || !Number.isInteger(row.cptid) || Number(row.cptid) <= 0 || Number(row.cptid) > 2147483647 || ids.has(Number(row.cptid)) ||
        !count(row.receivedCount) || !day(row.firstDate) || !day(row.lastDate) || !Array.isArray(row.years)) throw new Error("Invalid canonical donor financials");
    ids.add(Number(row.cptid));
    const lifetime = moneyCents(row.lifetime), largest = moneyCents(row.largestGift);
    if (largest > lifetime) throw new Error("Invalid canonical largest gift");
    if (!count(row.undatedCount)) throw new Error("Invalid canonical undated count");
    let sum = moneyCents(row.undatedReceived), gifts = row.undatedCount; const years = new Set<number>();
    pledged += moneyCents(row.undatedPledged);
    for (const y of row.years) {
      if (!object(y) || !Number.isInteger(y.year) || Number(y.year) < 1 || Number(y.year) > 9999 || years.has(Number(y.year)) || !count(y.receivedCount)) throw new Error("Invalid canonical financial year");
      years.add(Number(y.year)); sum += moneyCents(y.received); pledged += moneyCents(y.pledged); gifts += y.receivedCount;
    }
    if (sum !== lifetime || gifts !== row.receivedCount || !Number.isSafeInteger(gifts)) throw new Error("Canonical donor totals do not reconcile");
    received += lifetime;
  }
  if (received !== moneyCents(raw.totals.received) || pledged !== moneyCents(raw.totals.pledged)) throw new Error("Canonical financial totals do not reconcile");
  return raw as unknown as PvasFinancials;
}
