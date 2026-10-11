import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { CSNF_DATA_PATH } from "@/lib/csnf-data-store";

// Viktor posts the rebuilt CSNF data snapshot here (Bearer CRON_SECRET).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.text();
  try {
    const parsed = JSON.parse(body);
    if (!parsed.kpi || !parsed.client) throw new Error("bad shape");
  } catch {
    return NextResponse.json({ error: "invalid snapshot" }, { status: 400 });
  }
  await put(CSNF_DATA_PATH, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  return NextResponse.json({ ok: true, bytes: body.length });
}
