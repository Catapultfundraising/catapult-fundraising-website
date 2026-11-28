// Tenant-isolated storage and client logins. The store is an interface: the in-memory adapter is for tests and the
// preview; a database adapter (pending Anthony's storage decision) implements the same interface.
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import type { TenantRecord } from "./tenant";

export type Account = { email: string; tenantId: string; salt: string; hash: string };
export type Session = { email: string; tenantId: string };

export interface CampaignStore {
  createAccount(email: string, password: string, tenantId: string): Promise<void>;
  verify(email: string, password: string): Promise<Session | null>;
  /** Every campaign call takes the caller's Session; the tenant is never taken from request input. */
  saveCampaign(s: Session, c: TenantRecord): Promise<void>;
  listCampaigns(s: Session): Promise<TenantRecord[]>;
  getCampaign(s: Session, id: string): Promise<TenantRecord | null>;
}

const norm = (e: string) => e.trim().toLowerCase();
const derive = (pw: string, salt: string) => scryptSync(pw, salt, 32).toString("hex");

export class MemoryStore implements CampaignStore {
  private accounts = new Map<string, Account>();
  private campaigns = new Map<string, Map<string, TenantRecord>>(); // tenantId -> id -> record
  async createAccount(email: string, password: string, tenantId: string) {
    const e = norm(email);
    if (this.accounts.has(e)) throw new Error("Account exists");
    if (password.length < 10) throw new Error("Password must be at least 10 characters");
    const salt = randomBytes(16).toString("hex");
    this.accounts.set(e, { email: e, tenantId, salt, hash: derive(password, salt) });
  }
  async verify(email: string, password: string) {
    const a = this.accounts.get(norm(email));
    const h = derive(password, a?.salt ?? "00");
    if (!a || !timingSafeEqual(Buffer.from(h), Buffer.from(a.hash))) return null;
    return { email: a.email, tenantId: a.tenantId };
  }
  async saveCampaign(s: Session, c: TenantRecord) {
    const m = this.campaigns.get(s.tenantId) ?? new Map();
    m.set(c.id, structuredClone({ ...c }));
    this.campaigns.set(s.tenantId, m);
  }
  async listCampaigns(s: Session) { return [...(this.campaigns.get(s.tenantId)?.values() ?? [])].map((c) => structuredClone(c)); }
  async getCampaign(s: Session, id: string) { const c = this.campaigns.get(s.tenantId)?.get(id); return c ? structuredClone(c) : null; }
}

/** Signed session cookie value: base64(json).hmac. Secret comes from the environment. */
export function signSession(s: Session, secret: string, ttlMs = 12 * 3600_000) {
  const body = Buffer.from(JSON.stringify({ ...s, exp: Date.now() + ttlMs })).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
export function readSession(token: string | undefined, secret: string): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { const p = JSON.parse(Buffer.from(body, "base64url").toString()); return p.exp > Date.now() ? { email: p.email, tenantId: p.tenantId } : null; } catch { return null; }
}
