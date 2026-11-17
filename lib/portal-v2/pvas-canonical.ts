/** Default-OFF server environment switch. The HTML marker projects routing
 * only; browser edits to it cannot enable the server's SQL/write acceptance. */
export const PVAS_SQL_ROUTING_MARKER = "pvas-sql-existing-records";
export function pvasCanonicalEnabled(client: string): boolean {
  if (client !== "pvas") return false;
  if (typeof window === "undefined") return process.env.PVAS_SQL_EXISTING_RECORDS_ENABLED === "1";
  return document.querySelector(`meta[name="${PVAS_SQL_ROUTING_MARKER}"]`)?.getAttribute("content") === "1";
}
