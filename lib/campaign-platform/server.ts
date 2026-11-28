import { cookies } from "next/headers";
import { MemoryStore, readSession, type CampaignStore, type Session } from "./store";

export const COOKIE = "catapult_cp_session";
const g = globalThis as unknown as { __cpMem?: MemoryStore };
/** CP_STORE=mssql uses Azure SQL; otherwise an in-memory store (preview only, not durable on serverless). */
export async function getStore(): Promise<CampaignStore> {
  if (process.env.CP_STORE === "mssql") return new (await import("./mssql-store")).MssqlStore();
  return (g.__cpMem ??= new MemoryStore());
}
export const secret = () => { const s = process.env.CP_SESSION_SECRET; if (!s || s.length < 24) throw new Error("CP_SESSION_SECRET not configured"); return s; };
export async function currentSession(): Promise<Session | null> {
  try { return readSession((await cookies()).get(COOKIE)?.value, secret()); } catch { return null; }
}
