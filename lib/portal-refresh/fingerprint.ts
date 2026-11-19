import { rows } from "./common";

export type FingerprintClient = "pvas" | "csnf" | "jag" | "wcbhc" | "baq";

/** Full contents, including long nvarchar/text and explicit NULLs. Per-row JSON
 * is hashed on SQL Server, then sorted fixed-length hashes preserve duplicates
 * without depending on physical row order. varchar(max) avoids STRING_AGG's 8K
 * limit; Azure SQL supports SHA2_256 with max-length inputs. Only digests/counts
 * leave SQL. Unsupported FOR JSON types fail closed into a fresh build.
 */
export function fingerprintQuery(client: FingerprintClient | "source_import", names: string[]): string {
  const quote = (n: string) => `[${n.replace(/]/g, "]]")}]`;
  return names.map(n => `SELECT '${n.replace(/'/g, "''")}' t, COUNT_BIG(*) c,
    CONVERT(varchar(64), HASHBYTES('SHA2_256', COALESCE(
      STRING_AGG(CAST(h.row_hash AS varchar(max)), '') WITHIN GROUP (ORDER BY h.row_hash COLLATE Latin1_General_100_BIN2), '')), 2) k
    FROM (SELECT CONVERT(varchar(64), HASHBYTES('SHA2_256',
      (SELECT src.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)), 2) row_hash
      FROM ${client}.${quote(n)} src) h`).join(" UNION ALL ");
}

/** Canonical PVAS contacts/native gifts (including joins) and the other clients'
 * ID feeds all read their own schema; no cross-schema build tables remain after
 * cutover. Independent shared Engage documents/lists/ratings are not cached here.
 * Table discovery also detects newly added/dropped source tables.
 */
export async function clientFingerprint(client: FingerprintClient, includeReadView = false): Promise<string> {
  const tables = await rows(`SELECT t.name FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name='${client}'`);
  const names = tables.map(t => String(t.name)).filter(n => !/^(legacy_|reconciliation_|_)/i.test(n) || includeReadView && client === "pvas" && n === "legacy_engage_portal_batches").sort();
  if (!names.length) throw new Error("No fingerprint tables");
  const checks = await rows(fingerprintQuery(client, names));
  if (checks.length !== names.length || checks.some(r => !names.includes(String(r.t)) ||
      !/^\d+$/.test(String(r.c)) || !/^[a-f0-9]{64}$/i.test(String(r.k))) ||
      new Set(checks.map(r => r.t)).size !== names.length) throw new Error("Incomplete fingerprint");
  if (includeReadView && client !== "pvas") {
    const extra = await rows(fingerprintQuery("source_import", ["requests"]));
    if (extra.length !== 1 || extra[0].t !== "requests" || !/^\d+$/.test(String(extra[0].c)) || !/^[a-f0-9]{64}$/i.test(String(extra[0].k)))
      throw new Error("Incomplete shared ready fingerprint");
    checks.push({ ...extra[0], t: "source_import.requests" });
  }
  return JSON.stringify(["sha256-json-v1", checks.map(r => [r.t, String(r.c), r.k]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))]);
}
