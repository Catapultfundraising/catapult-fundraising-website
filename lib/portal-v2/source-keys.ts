// Source record keys and crosswalk link values (pure; shared by browser and server).
export type Key = number | string;
export type KeyKind = "int" | "bigint" | "text";
export const TEXT_KEY = /^[^\s\x00-\x1F\x7F](?:[^\x00-\x1F\x7F]{0,98}[^\s\x00-\x1F\x7F])?$/;
/** Key by kind. bigint: whole number <= 2^53-1 (no rounding; DOUBLE-exported whole numbers like 1234.0 accepted).
 *  text: exact text, no trimming/case folding (leading/trailing spaces or control characters are rejected, never aliased). */
export function parseKeyOf(kind: KeyKind, raw: string | null | undefined): Key | null {
  if (kind === "int") return parseKey(raw);
  if (kind === "bigint") { const s = String(raw ?? "").trim(); if (!/^[1-9]\d{0,15}(\.0+)?$/.test(s)) return null; const n = Number(s.replace(/\.0+$/, "")); return Number.isSafeInteger(n) && String(n) === s.replace(/\.0+$/, "") ? n : null; }
  const s = String(raw ?? ""); return TEXT_KEY.test(s) ? s : null;
}
/** Canonical crosswalk link value: exact text, or integer text (leading zeros/".0" removed, no rounding, <= 2^53-1). */
export function canonLink(kind: "text" | "int", raw: string | null | undefined): string | null {
  if (kind === "text") { const s = String(raw ?? ""); return TEXT_KEY.test(s) ? s : null; }
  const s = String(raw ?? "").trim().replace(/\.0+$/, ""); if (!/^\d{1,16}$/.test(s)) return null;
  const n = Number(s); return Number.isSafeInteger(n) && n > 0 ? String(n) : null;
}
export const parseKey = (raw: string | null | undefined): number | null => {
  const s = String(raw ?? "").trim();
  if (!/^[1-9]\d{0,9}(\.0+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 && n <= 2147483647 ? n : null;
};
