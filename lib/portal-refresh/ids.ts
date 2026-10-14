import { rows, type Row } from "@/lib/portal-refresh/common";

// Portal v2 match index: CPTID <-> the client's own ID plus name/address, used by
// the bulk client-file upload (client files carry their CRM id, never CPTID) and by
// Add Prospect (next CPTID + duplicate warning). Written to {client}-data/ids.json.
export interface IdRow { cptid: number; clientId: string; name: string; address: string; city: string; zip: string }

const ID_SQL: Record<string, string> = {
  pvas: `SELECT g.CPTID cptid, g.Client_ID client_id, COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(p.First_Name,' ',p.Last_Name))),''), g.Account_Name) name,
           p.Address address, p.City city, p.Zip_Code zip
         FROM pvas.giving_history_overview g LEFT JOIN pvas.portfolio p ON p.CPTID = g.CPTID
         UNION ALL SELECT p.CPTID, p.Client_ID, COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(p.First_Name,' ',p.Last_Name))),''), p.Account_Name), p.Address, p.City, p.Zip_Code
         FROM pvas.portfolio p WHERE NOT EXISTS (SELECT 1 FROM pvas.giving_history_overview g WHERE g.CPTID = p.CPTID)`,
  csnf: `SELECT g.CPTID cptid, COALESCE(CAST(c.Account_ID AS NVARCHAR(100)), CAST(g.Client_ID AS NVARCHAR(100))) client_id, g.Account_Name name, NULL address, NULL city, NULL zip
         FROM csnf.Giving_History_Overview g LEFT JOIN csnf.Client_ID c ON c.CPTID = g.CPTID
         UNION ALL SELECT c.CPTID, CAST(c.Account_ID AS NVARCHAR(100)), NULL, NULL, NULL, NULL FROM csnf.Client_ID c
         WHERE NOT EXISTS (SELECT 1 FROM csnf.Giving_History_Overview g WHERE g.CPTID = c.CPTID)`,
  jag: `SELECT cptid, client_id, COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(first_name,' ',last_name))),''), organization, account_name) name, address_1 address, city, zip FROM jag.constituents`,
  wcbhc: `SELECT CPTID cptid, Client_ID client_id, COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(First_Name,' ',Last_Name))),''), Company_Foundation_Name, Account_Name) name, Address address, City city, Zip_Code zip FROM wcbhc.master`,
  baq: `SELECT CPTID cptid, Client_ID client_id, COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(First_Name,' ',Last_Name))),''), Company_Foundation_Name, Account_Name) name, Address address, City city, Zip_Code zip FROM baq.master`,
};

// Client ids come back as floats from Access loads (29309523.0); keep them as clean strings.
export const cleanId = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  const t = /^\d+\.0+$/.test(s) ? s.replace(/\.0+$/, "") : s;
  return t === "0" ? "" : t;
};
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export async function buildIds(client: string): Promise<IdRow[]> {
  const q = ID_SQL[client];
  if (!q) throw new Error(`no id source for ${client}`);
  const seen = new Map<string, IdRow>();
  for (const r of (await rows(q)) as Row[]) {
    const cptid = Number(r.cptid);
    if (!Number.isFinite(cptid) || cptid <= 0) continue;
    const row = { cptid, clientId: cleanId(r.client_id), name: str(r.name), address: str(r.address), city: str(r.city), zip: str(r.zip) };
    const key = `${cptid}|${row.clientId}`;
    const prev = seen.get(key);
    if (!prev) seen.set(key, row);
    else if (!prev.name && row.name) prev.name = row.name;
  }
  return [...seen.values()];
}
