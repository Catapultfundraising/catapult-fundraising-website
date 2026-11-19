import { rows } from "./common";

export type FingerprintClient = "pvas" | "csnf" | "jag" | "wcbhc" | "baq";

/** Read-only change detector for the complete live build source. Canonical PVAS
 * contacts/native gifts (including their joins) and the other clients' ID feeds
 * all read their own schema; no cross-schema build tables remain after cutover.
 * Read-time overlays/documents/ratings are not part of the cached base build.
 * Table discovery also detects newly added/dropped source tables.
 */
export async function clientFingerprint(client: FingerprintClient): Promise<string> {
  const tables = await rows(`SELECT t.name FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name='${client}'`);
  const names = tables.map(t => String(t.name)).filter(n => !/^(legacy_|reconciliation_|_)/i.test(n)).sort();
  if (!names.length) throw new Error("No fingerprint tables");
  const quote = (n: string) => `[${n.replace(/]/g, "]]")}]`;
  const checks = await rows(names.map(n => `SELECT '${n.replace(/'/g, "''")}' t, COUNT_BIG(*) c, CHECKSUM_AGG(BINARY_CHECKSUM(*)) k FROM ${client}.${quote(n)}`).join(" UNION ALL "));
  if (checks.length !== names.length) throw new Error("Incomplete fingerprint");
  return JSON.stringify(checks.map(r => [r.t, String(r.c), r.k === null ? null : String(r.k)]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}
