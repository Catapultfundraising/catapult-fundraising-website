import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getStore, secret, COOKIE } from "@/lib/campaign-platform/server";
import { signSession } from "@/lib/campaign-platform/store";

export const dynamic = "force-dynamic";
// Self-service sign-up. The tenant id is always generated here; a caller can never name or join an existing tenant.
const hits = new Map<string, number[]>(); // best-effort per-instance throttle: 5 sign-ups / hour / IP
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const now = Date.now(); const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= 5) return NextResponse.json({ error: "Too many sign-ups from this network. Try again later." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const email = String(b.email ?? "").trim(); const password = String(b.password ?? "");
  if (b.website) return NextResponse.json({ error: "Could not create account" }, { status: 400 }); // honeypot field
  if (!/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (password.length < 10 || password.length > 200) return NextResponse.json({ error: "Password must be 10 to 200 characters" }, { status: 400 });
  recent.push(now); hits.set(ip, recent);
  const tenantId = `t-${randomBytes(12).toString("hex")}`;
  try { await (await getStore()).createAccount(email, password, tenantId); }
  catch (e) { return NextResponse.json({ error: /exist|duplicate|PRIMARY KEY/i.test(String((e as Error).message)) ? "An account with this email already exists. Sign in instead." : "Could not create account" }, { status: 400 }); }
  const res = NextResponse.json({ email: email.toLowerCase() });
  res.cookies.set(COOKIE, signSession({ email: email.toLowerCase(), tenantId }, secret()), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 12 * 3600 });
  return res;
}
