import "server-only";
import { createHash } from "node:crypto";
import { inspectSourceFile, originalBytes, type ParseSettings } from "./source-file-preview";
import { exactOoxmlNumber } from "./source-ooxml-values";
import { parseKeyOf } from "./source-keys";
import { monthlyCanonical, monthlyExact, monthlyId, monthlyObject, type MonthlyRequest, type MonthlyRow } from "./monthly-wire";
export type MonthlyFile = { bytes: string; fileName: string; requestId: string; source: string; sourceDate: string; period: string; actor: string; campaignOnly: true; receivedUsdCash: true; parseSettings: ParseSettings; dateSystem: "iso" | "excel1900" | "excel1904"; mapping: Record<string, string> };
export type MonthlyIdentity = { cptid: number; clientId: string; name: string };
export class MonthlyFileError extends Error {
  constructor(message: string, public exceptions: { row: number; reason: string }[] = []) { super(message); }
}
export const monthlyDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s && s >= "1900-01-01";
const plain = (s: unknown, n: number): s is string => typeof s === "string" && s.length <= n && !Array.from(s).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
export function parseMonthlyFile(raw: unknown): MonthlyFile {
  if (!monthlyObject(raw) || !monthlyExact(raw, ["bytes", "fileName", "requestId", "source", "sourceDate", "period", "actor", "campaignOnly", "receivedUsdCash", "parseSettings", "dateSystem", "mapping"]) ||
      !monthlyId(raw.requestId) || !plain(raw.fileName, 300) || !/\.(csv|xlsx)$/i.test(raw.fileName) || !plain(raw.source, 100) || !raw.source || raw.source !== raw.source.trim() ||
      !plain(raw.actor, 200) || !raw.actor || raw.actor !== raw.actor.trim() || !monthlyDate(raw.sourceDate) || typeof raw.period !== "string" || !monthlyDate(`${raw.period}-01`) ||
      raw.campaignOnly !== true || raw.receivedUsdCash !== true || !monthlyObject(raw.parseSettings) || !monthlyObject(raw.mapping) || !["iso", "excel1900", "excel1904"].includes(String(raw.dateSystem))) throw new MonthlyFileError("Complete the source, source date, calendar month, attribution and campaign/USD received-cash attestations.");
  if (typeof raw.bytes !== "string" || originalBytes(raw.bytes).length > 2_000_000) throw new MonthlyFileError("Choose a file at most 2,000,000 bytes.");
  if (raw.parseSettings.format !== (/\.xlsx$/i.test(raw.fileName) ? "xlsx" : "csv")) throw new MonthlyFileError("File format/settings disagree.");
  return raw as MonthlyFile;
}
export function monthlyMoney(text: string, numeric: boolean): string {
  if (numeric) { const n = exactOoxmlNumber(text, "giftAmount"); if (!n.ok || n.value === "0.00") throw new Error("Amount must be positive exact USD cents, never rounded."); return n.value; }
  if (!/^\$?(?:0|[1-9][0-9]{0,11}|[1-9][0-9]{0,2}(?:,[0-9]{3}){1,3})(?:\.[0-9]{1,2})?$/.test(text)) throw new Error("Use a positive exact USD amount (no ambiguous separator, negative, exponent or excess precision).");
  const [whole, fraction = ""] = text.replace(/[$,]/g, "").split(".");
  if (whole.length > 12 || (BigInt(whole) === BigInt(0) && !/[1-9]/.test(fraction))) throw new Error("Amount exceeds the supported positive cash bound.");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}
export function monthlyTransactionDate(value: string, numeric: boolean, system: MonthlyFile["dateSystem"]): string {
  if (!numeric) { if (!monthlyDate(value)) throw new Error("Date must be actual ISO YYYY-MM-DD text."); return value; }
  if (system === "iso" || !/^[0-9]{1,7}$/.test(value)) throw new Error("Numeric Excel dates require an explicit 1900/1904 date-system selection; no time fraction.");
  const serial = Number(value);
  if (serial < 0 || serial > 2958465 || (system === "excel1900" && (serial < 1 || serial === 60))) throw new Error("Invalid Excel calendar date.");
  const days = system === "excel1900" ? serial - (serial > 60 ? 1 : 0) : serial;
  const d = new Date(Date.UTC(system === "excel1900" ? 1899 : 1904, system === "excel1900" ? 11 : 0, system === "excel1900" ? 31 : 1) + days * 86400000).toISOString().slice(0, 10);
  if (!monthlyDate(d)) throw new Error("Invalid Excel calendar date."); return d;
}
export function buildMonthlyRequest(client: string, file: MonthlyFile, identities: MonthlyIdentity[]): { request: MonthlyRequest; payloadHash: string; unmapped: string[] } {
  const parsed = inspectSourceFile(file.bytes, file.parseSettings, 1000);
  const targets = ["clientId", "transactionId", "amount", "date", "donorName", "note", "cptid", "kind", "status", "currency"];
  const mapping = Object.entries(file.mapping).filter(([, value]) => value !== ""), byTarget = new Map<string, number>();
  for (const [header, target] of mapping) {
    if (!parsed.headers.includes(header) || !targets.includes(target) || byTarget.has(target) || parsed.headers.filter(h => h === header).length !== 1) throw new MonthlyFileError("Map distinct existing headers to unique supported fields.");
    byTarget.set(target, parsed.headers.indexOf(header));
  }
  if (["clientId", "transactionId", "amount", "date"].some(t => !byTarget.has(t))) throw new MonthlyFileError("Map exact client ID, transaction ID, amount and transaction date.");
  if (parsed.headers.some(h => h.toLowerCase().replace(/[^a-z0-9]/g, "") === "cptid") && !byTarget.has("cptid")) throw new MonthlyFileError("Map supplied CPTID as verification, or remove the conflicting column.");
  // Recognized cash-policy columns cannot be silently ignored by an arbitrary mapping.
  for (const [pattern, target] of [[/^(type|kind|gift type|transaction type)$/i, "kind"], [/^(status|transaction status)$/i, "status"], [/^(currency|currency code)$/i, "currency"]] as const)
    if (parsed.headers.some(h => pattern.test(h)) && !byTarget.has(target)) throw new MonthlyFileError(`Map the ${target} column so unsupported transactions cannot be silently counted.`);
  const index = new Map<string, Map<number, MonthlyIdentity>>();
  if (!Array.isArray(identities)) throw new MonthlyFileError("Current exact client-ID crosswalk unavailable.");
  for (const id of identities) {
    if (typeof id.clientId !== "string" || !id.clientId) continue;
    if (!Number.isInteger(id.cptid) || id.cptid < 1 || id.cptid > 2147483647) throw new MonthlyFileError("Current client-ID crosswalk is invalid.");
    const bucket = index.get(id.clientId) ?? new Map(); bucket.set(id.cptid, id); index.set(id.clientId, bucket);
  }
  const exceptions: { row: number; reason: string }[] = [], rows: MonthlyRow[] = [], seen = new Set<string>();
  for (let r = 0; r < parsed.rows.length; r++) {
    try {
      const read = (target: string, allowNumeric = false) => {
        const c = byTarget.get(target); if (c === undefined) return "";
        const slot = `${r}|${c}`;
        if (parsed.formulaSlots.has(slot) || parsed.otherSlots.has(slot)) throw new Error(`Formula/unsupported ${target} cell; cached values never used.`);
        if (parsed.numericSlots.has(slot) && !allowNumeric) throw new Error(`${target} must be exact text; numeric identifiers require the declared integer client-ID option.`);
        return parsed.numericLexemes.get(slot) ?? parsed.rows[r][c] ?? "";
      };
      const numeric = (target: string) => parsed.numericSlots.has(`${r}|${byTarget.get(target)}`);
      let clientId = read("clientId", true);
      if (numeric("clientId")) {
        if (file.parseSettings.format !== "xlsx" || file.parseSettings.clientIdFormat !== "integer") throw new Error("Numeric client ID requires declared integer source format; no leading-zero inference.");
        const n = exactOoxmlNumber(clientId, "clientId-integer"); if (!n.ok) throw new Error(n.reason); clientId = n.value;
      }
      if (typeof parseKeyOf("text", clientId) !== "string") throw new Error("Missing/invalid exact client ID.");
      const matches = index.get(clientId);
      if (!matches || matches.size !== 1) throw new Error("Unknown/ambiguous exact client ID; no name match or donor creation.");
      const known = [...matches.values()][0], transactionId = read("transactionId");
      if (!plain(transactionId, 100) || !transactionId || transactionId !== transactionId.trim()) throw new Error("Missing/invalid exact source transaction ID; numeric keys must be exported as text.");
      if (seen.has(transactionId)) throw new Error("Duplicate source transaction ID in this file.");
      seen.add(transactionId);
      const verify = read("cptid", true);
      if (verify) { const n = exactOoxmlNumber(verify, "cptid"); if (!n.ok || n.value !== String(known.cptid)) throw new Error("Supplied CPTID conflicts with exact client ID."); }
      const kind = read("kind"), status = read("status"), currency = read("currency");
      if (kind && !/^(gift|cash|donation)$/i.test(kind)) throw new Error("Only received cash gifts supported; pledge/refund rows held.");
      if (status && !/^(received|succeeded|completed|paid)$/i.test(status)) throw new Error("Only received/succeeded/completed/paid cash supported.");
      if (currency && currency !== "USD") throw new Error("Only USD supported.");
      if ((byTarget.has("kind") && !kind) || (byTarget.has("status") && !status) || (byTarget.has("currency") && !currency)) throw new Error("Mapped kind/status/currency cannot be blank.");
      const amount = monthlyMoney(read("amount", true), numeric("amount")), date = monthlyTransactionDate(read("date", true), numeric("date"), file.dateSystem);
      if (date.slice(0, 7) !== file.period) throw new Error("Transaction date is outside selected calendar month.");
      const donorName = read("donorName") || known.name, note = read("note");
      if (!plain(donorName, 300) || !donorName.trim() || !plain(note, 500)) throw new Error("A current donor name and note up to500 plain characters are required.");
      rows.push({ row: parsed.lines[r], transactionId, clientId, cptid: known.cptid, donorName, amount, date, note, kind: "gift", status: "received", currency: "USD" });
    } catch (e) { exceptions.push({ row: parsed.lines[r], reason: e instanceof Error ? e.message : "Invalid transaction." }); }
  }
  if (exceptions.length) throw new MonthlyFileError("File held; correct every listed row before preview. Nothing submitted to SQL.", exceptions);
  const request: MonthlyRequest = { client, source: file.source, requestId: file.requestId, fileName: file.fileName, fileDigest: parsed.fileDigest, sourceDate: file.sourceDate, period: file.period, actor: file.actor, campaignOnly: true, currency: "USD", basis: "received-cash", rows };
  if (Buffer.byteLength(JSON.stringify(request), "utf8") > 2_000_000) throw new MonthlyFileError("Normalized whole-file request exceeds 2MB; no splitting performed.");
  return { request, payloadHash: createHash("sha256").update(monthlyCanonical(request)).digest("hex"), unmapped: parsed.headers.filter(h => !mapping.some(([source]) => source === h)) };
}
