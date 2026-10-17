import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/board-review/store";
import { BR_MEMBER_COOKIE, checkPassword, signMemberToken } from "@/lib/board-review/auth";
import { isBrClient } from "@/lib/board-review/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const client = String(body.client ?? ""), email = String(body.email ?? "").trim().toLowerCase(), password = String(body.password ?? "");
  const fail = NextResponse.json({ ok: false, error: "Email or password is incorrect." }, { status: 401 });
  if (!isBrClient(client) || !email || !password) return fail;
  const m = (await getMembers(client)).find((x) => x.email === email);
  if (!m || !(await checkPassword(password, m.salt, m.hash))) return fail;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BR_MEMBER_COOKIE, await signMemberToken(client, m.id, m.version), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BR_MEMBER_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
