// Azure SQL adapter for CampaignStore. Uses ONLY its own schema `campaign_platform`; it never reads or writes existing client tables.
// Note: the website project has no static IP, so a direct connection needs the Azure firewall to allow it (see the pool in lib/portal-refresh/common.ts).
import sql from "mssql";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { azurePool } from "../portal-refresh/common";
import type { CampaignStore, Session } from "./store";
import type { TenantRecord } from "./tenant";

const DDL = `
IF SCHEMA_ID('campaign_platform') IS NULL EXEC('CREATE SCHEMA campaign_platform');
IF OBJECT_ID('campaign_platform.accounts') IS NULL CREATE TABLE campaign_platform.accounts (
  email NVARCHAR(256) NOT NULL PRIMARY KEY, tenant_id NVARCHAR(64) NOT NULL, salt CHAR(32) NOT NULL, hash CHAR(64) NOT NULL, created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
IF OBJECT_ID('campaign_platform.campaigns') IS NULL CREATE TABLE campaign_platform.campaigns (
  tenant_id NVARCHAR(64) NOT NULL, id NVARCHAR(64) NOT NULL, name NVARCHAR(256) NOT NULL, body NVARCHAR(MAX) NOT NULL, updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT pk_cp_campaigns PRIMARY KEY (tenant_id, id));`;

let ready: Promise<void> | null = null;
async function pool() { const p = await azurePool(); ready ??= p.request().batch(DDL).then(() => undefined); await ready; return p; }
const norm = (e: string) => e.trim().toLowerCase();
const derive = (pw: string, salt: string) => scryptSync(pw, salt, 32).toString("hex");

export class MssqlStore implements CampaignStore {
  async createAccount(email: string, password: string, tenantId: string) {
    if (password.length < 10) throw new Error("Password must be at least 10 characters");
    const salt = randomBytes(16).toString("hex");
    await (await pool()).request().input("e", sql.NVarChar, norm(email)).input("t", sql.NVarChar, tenantId).input("s", sql.Char, salt).input("h", sql.Char, derive(password, salt))
      .query("INSERT INTO campaign_platform.accounts (email, tenant_id, salt, hash) VALUES (@e,@t,@s,@h)");
  }
  async verify(email: string, password: string): Promise<Session | null> {
    const r = await (await pool()).request().input("e", sql.NVarChar, norm(email)).query("SELECT tenant_id, salt, hash FROM campaign_platform.accounts WHERE email=@e");
    const a = r.recordset[0];
    const h = derive(password, a?.salt ?? "0".repeat(32));
    if (!a || !timingSafeEqual(Buffer.from(h), Buffer.from(String(a.hash).trim()))) return null;
    return { email: norm(email), tenantId: a.tenant_id };
  }
  async saveCampaign(s: Session, c: TenantRecord) {
    await (await pool()).request().input("t", sql.NVarChar, s.tenantId).input("i", sql.NVarChar, c.id).input("n", sql.NVarChar, c.name).input("b", sql.NVarChar(sql.MAX), JSON.stringify(c))
      .query(`MERGE campaign_platform.campaigns AS x USING (SELECT @t AS tenant_id, @i AS id) AS y ON x.tenant_id=y.tenant_id AND x.id=y.id
              WHEN MATCHED THEN UPDATE SET name=@n, body=@b, updated_at=SYSUTCDATETIME()
              WHEN NOT MATCHED THEN INSERT (tenant_id,id,name,body) VALUES (@t,@i,@n,@b);`);
  }
  async listCampaigns(s: Session) {
    const r = await (await pool()).request().input("t", sql.NVarChar, s.tenantId).query("SELECT body FROM campaign_platform.campaigns WHERE tenant_id=@t ORDER BY updated_at DESC");
    return r.recordset.map((x) => JSON.parse(x.body) as TenantRecord);
  }
  async getCampaign(s: Session, id: string) {
    const r = await (await pool()).request().input("t", sql.NVarChar, s.tenantId).input("i", sql.NVarChar, id).query("SELECT body FROM campaign_platform.campaigns WHERE tenant_id=@t AND id=@i");
    return r.recordset[0] ? (JSON.parse(r.recordset[0].body) as TenantRecord) : null;
  }
}
