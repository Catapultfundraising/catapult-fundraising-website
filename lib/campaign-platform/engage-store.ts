// CampaignStore backed by Catapult Engage (static IPs reach Azure SQL). Same pattern as the dashboards' read feed.
// Auth: Bearer PORTAL_WRITE_SECRET, already configured on both projects. Engage stores in its own cp_* tables.
import type { CampaignStore, Session } from "./store";
import type { TenantRecord } from "./tenant";

function url() {
  const u = process.env.ENGAGE_CAMPAIGN_URL || (process.env.ENGAGE_PORTAL_URL ? process.env.ENGAGE_PORTAL_URL.replace(/\/api\/portal-v2\/?$/, "/api/campaign-platform") : "https://engage.catapultfr.com/api/campaign-platform");
  return u;
}
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const secret = process.env.PORTAL_WRITE_SECRET; if (!secret) throw new Error("PORTAL_WRITE_SECRET not set");
  const r = await fetch(url(), { method: "POST", cache: "no-store", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error ?? `Engage ${r.status}`);
  return j as T;
}
export class EngageStore implements CampaignStore {
  async createAccount(email: string, password: string, tenantId: string) { await call({ action: "createAccount", email, password, tenantId }); }
  async verify(email: string, password: string): Promise<Session | null> { return (await call<{ session: Session | null }>({ action: "verify", email, password })).session; }
  async saveCampaign(s: Session, c: TenantRecord) { await call({ action: "save", tenantId: s.tenantId, id: c.id, name: c.name, body: JSON.stringify(c) }); }
  async listCampaigns(s: Session) { return (await call<{ bodies: string[] }>({ action: "list", tenantId: s.tenantId })).bodies.map((b) => JSON.parse(b) as TenantRecord); }
  async getCampaign(s: Session, id: string) { const b = (await call<{ body: string | null }>({ action: "get", tenantId: s.tenantId, id })).body; return b ? (JSON.parse(b) as TenantRecord) : null; }
}
