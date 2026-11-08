import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SAMPLE_COOKIE } from "./feasibility-sample";

export const SAMPLE_TTL = 60 * 60 * 8;
const scope = "catapult:feasibility-sales-sample:v1";
function config() {
  const password = process.env.DECKS_PASSWORD;
  const secret = process.env.DECKS_AUTH_SECRET;
  return password && secret ? { password, secret } : null;
}
function equal(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function samplePasswordValid(value: string) {
  const c = config();
  return !!c && equal(value, c.password);
}
export function sampleToken(now = Date.now()) {
  const c = config();
  if (!c) return null;
  const exp = Math.floor(now / 1000) + SAMPLE_TTL;
  const mac = createHmac("sha256", c.secret).update(`${scope}:${exp}:${c.password}`).digest("hex");
  return `${exp}.${mac}`;
}
export function sampleTokenValid(token: string | undefined, now = Date.now()) {
  const c = config();
  if (!c || !token || !/^\d{10}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expiry, mac] = token.split(".");
  const exp = Number(expiry), seconds = Math.floor(now / 1000);
  if (exp <= seconds || exp > seconds + SAMPLE_TTL) return false;
  const expected = createHmac("sha256", c.secret).update(`${scope}:${exp}:${c.password}`).digest("hex");
  return equal(mac, expected);
}
// One-way reuse of the existing sales-library gate, not research/client sessions.
// Must remain byte-compatible with middleware.ts and /api/decks-login.
export function sampleDeckTokenValid(token: string | undefined) {
  const c = config();
  if (!c || !token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return equal(token, createHash("sha256").update(`${c.password}:${c.secret}`).digest("hex"));
}
export async function sampleAuthorized() {
  const jar = await cookies();
  return sampleTokenValid(jar.get(SAMPLE_COOKIE)?.value) || sampleDeckTokenValid(jar.get("catapult_decks_auth")?.value);
}
