// Board review member logins. Edge-safe (middleware imports this): Web Crypto only.
// Member cookie = "<client>.<memberId>.<version>.<expires>.<hmac>" signed with
// BOARD_REVIEW_SECRET (falls back to RESEARCH_AUTH_SECRET). The API re-checks that the
// member still exists and that the version matches, so removing a member or resetting
// a password logs them out at once.
export const BR_MEMBER_COOKIE = "catapult_board_review";
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
const secret = () => process.env.BOARD_REVIEW_SECRET || process.env.RESEARCH_AUTH_SECRET || "";

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(`board-review:${secret()}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function signMemberToken(client: string, memberId: string, version: number, days = 30): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const body = `${client}.${memberId}.${version}.${exp}`;
  return `${body}.${await hmac(body)}`;
}

export interface MemberToken { client: string; memberId: string; version: number }
export async function verifyMemberToken(token: string | undefined): Promise<MemberToken | null> {
  if (!token || !secret()) return null;
  const p = token.split(".");
  if (p.length !== 5) return null;
  const [client, memberId, v, exp, sig] = p;
  if (Number(exp) * 1000 < Date.now()) return null;
  if (!safeEqual(sig, await hmac(`${client}.${memberId}.${v}.${exp}`))) return null;
  return { client, memberId, version: Number(v) };
}

export async function hashPassword(pw: string, salt?: string): Promise<{ salt: string; hash: string }> {
  const s = salt ?? hex(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer);
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(s), iterations: 100_000 }, key, 256);
  return { salt: s, hash: hex(bits) };
}
export async function checkPassword(pw: string, salt: string, hash: string) {
  return safeEqual((await hashPassword(pw, salt)).hash, hash);
}

/** Readable one-time password, e.g. "Gold-4827-Navy". No ambiguous characters. */
export function generatePassword(): string {
  const words = ["Gold", "Navy", "Cedar", "River", "Summit", "Harbor", "Maple", "Falcon", "Canyon", "Meadow", "Pine", "Ridge", "Silver", "Willow"];
  const r = crypto.getRandomValues(new Uint32Array(3));
  return `${words[r[0] % words.length]}-${1000 + (r[1] % 9000)}-${words[r[2] % words.length]}`;
}
