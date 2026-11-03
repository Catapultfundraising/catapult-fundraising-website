// Browser-safe owning type normalization for source cells (no node: imports). Shared by source-reconcile (server) and
// the durable gift panel (browser) so eligibility uses exactly the same canonical values.
export const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/; // C0 controls except TAB/LF/CR, plus DEL (ASCII escapes; no literal hyphen)
export const SOURCE_MAX_VALUE = 4000;
export type NormDest = { ty: string; len: number | null; p: number | null; s: number | null };
const INT_BOUNDS: Record<string, [bigint, bigint]> = { int: [BigInt("-2147483648"), BigInt("2147483647")], bigint: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")] };
function canonDecimal(t: string) {
  const neg = t.startsWith("-"); const [i, f = ""] = t.replace(/^-/, "").split(".");
  const ii = i.replace(/^0+(?=\d)/, ""); const ff = f.replace(/0+$/, "");
  const z = /^0$/.test(ii) && !ff;
  return { s: (neg && !z ? "-" : "") + ii + (ff ? "." + ff : ""), intDigits: ii === "0" ? 0 : ii.length, frac: ff.length };
}
export function normalize(d: NormDest, raw: string | null | undefined): { v: string | null; err?: string } {
  const s = raw == null ? "" : String(raw).trim();
  if (s === "") return { v: null };
  if (CTRL.test(s)) return { v: null, err: "control characters" };
  if (s.length > SOURCE_MAX_VALUE) return { v: null, err: "too long" };
  const num = s.replace(/^\$/, "").replace(/,(?=\d{3}(\D|$))/g, "");
  switch (d.ty) {
    case "int": case "bigint": {
      if (!/^-?\d+(\.0+)?$/.test(num)) return { v: null, err: "not a whole number" };
      const b = BigInt(num.split(".")[0]); const [lo, hi] = INT_BOUNDS[d.ty];
      if (b < lo || b > hi) return { v: null, err: `outside ${d.ty} range` };
      return { v: b.toString() };
    }
    case "decimal": case "numeric": {
      if (d.p == null || d.s == null) return { v: null, err: "destination precision unknown" };
      if (!/^-?\d+(\.\d+)?$/.test(num)) return { v: null, err: "not a number" };
      const c = canonDecimal(num);
      if (c.frac > d.s) return { v: null, err: `more than ${d.s} decimal places` };
      if (c.intDigits > d.p - d.s) return { v: null, err: `exceeds precision ${d.p}` };
      return { v: c.s };
    }
    case "float": {
      if (d.p != null && d.p !== 53) return { v: null, err: "only float(53) is supported" };
      if (!/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(num)) return { v: null, err: "not a number" };
      const n = Number(num);
      if (!Number.isFinite(n)) return { v: null, err: "number out of range" };
      return { v: String(n) }; // float(53) == IEEE double; shortest round-trip form, no rounding
    }
    case "bit": {
      const l = s.toLowerCase();
      if (["1", "true", "yes", "y"].includes(l)) return { v: "1" };
      if (["0", "false", "no", "n"].includes(l)) return { v: "0" };
      return { v: null, err: "not a yes/no value" };
    }
    case "date": case "datetime2": {
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/) || s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (!m) return { v: null, err: "unrecognized date (use YYYY-MM-DD or M/D/YYYY)" };
      const slash = m[0].includes("/");
      const [y, mo, dd] = (slash ? [m[3], m[1], m[2]] : [m[1], m[2], m[3]]).map(Number);
      const dt = new Date(Date.UTC(y, mo - 1, dd));
      if (y < 1753 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== dd) return { v: null, err: "invalid date" };
      const date = `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      if (m[4] === undefined) return { v: d.ty === "datetime2" ? `${date}T00:00:00` : date };
      if (d.ty === "date") return { v: null, err: "time not allowed for a date-only field" };
      const [h, mi, se] = [Number(m[4]), Number(m[5]), Number(m[6] ?? 0)];
      if (h > 23 || mi > 59 || se > 59) return { v: null, err: "invalid time" };
      return { v: `${date}T${String(h).padStart(2, "0")}:${m[5]}:${String(se).padStart(2, "0")}` };
    }
    case "nvarchar": case "varchar": {
      const v = s.normalize("NFC");
      if (d.len == null) return { v: null, err: "destination length unknown" };
      if (d.len !== -1 && v.length > d.len) return { v: null, err: `longer than ${d.len} characters` };
      if (d.ty === "varchar" && /[^\x20-\x7E]/.test(v)) return { v: null, err: "non-ASCII text for varchar" };
      return { v };
    }
    default: return { v: null, err: `type ${d.ty} has no verified conversion` };
  }
}
