import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { MemoryStore, readSession, type CampaignStore, type Session } from "./store";

export const COOKIE = "catapult_cp_session";
const g = globalThis as unknown as { __cpMem?: MemoryStore };
/** With PORTAL_WRITE_SECRET set (Engage feed), campaigns are stored via Engage; otherwise an in-memory store (preview only, not durable). */
export async function getStore(): Promise<CampaignStore> {
  if (process.env.PORTAL_WRITE_SECRET && process.env.CP_STORE !== "memory") return new (await import("./engage-store")).EngageStore();
  return (g.__cpMem ??= new MemoryStore());
}
/** Cookie-signing key derived from the existing PORTAL_WRITE_SECRET, so no new secret is needed. Used for nothing else. */
export const secret = () => { const s = process.env.PORTAL_WRITE_SECRET; if (!s || s.length < 24) throw new Error("PORTAL_WRITE_SECRET not configured"); return createHmac("sha256", s).update("campaign-platform-session-v1").digest("hex"); };
export async function currentSession(): Promise<Session | null> {
  try { return readSession((await cookies()).get(COOKIE)?.value, secret()); } catch { return null; }
}
