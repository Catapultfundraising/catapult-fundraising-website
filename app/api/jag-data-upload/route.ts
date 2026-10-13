import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { JAG_DATA_PATH, JAG_RECORDS_PATH } from "@/lib/jag-data-store";
import { JAG_PIRS_PATH } from "@/lib/jag-tracking";

export const runtime = "nodejs";

// Viktor posts the rebuilt JAG data here (Bearer CRON_SECRET).
// ?kind=snapshot (default) or ?kind=records. Body may be gzipped (x-gzip: 1)
// because the records file is larger than the function body limit.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const k = new URL(req.url).searchParams.get("kind");
  const kind = k === "records" ? "records" : k === "pirs" ? "pirs" : "snapshot";
  const raw = Buffer.from(await req.arrayBuffer());
  const body = req.headers.get("x-gzip") === "1" ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
  try {
    const parsed = JSON.parse(body);
    if (kind === "pirs" ? typeof parsed !== "object" || Array.isArray(parsed) : kind === "snapshot" ? !parsed.kpi || !parsed.client : !parsed.index || !parsed.records) throw new Error("bad shape");
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  await put(kind === "records" ? JAG_RECORDS_PATH : kind === "pirs" ? JAG_PIRS_PATH : JAG_DATA_PATH, body, {
    access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true,
  });
  return NextResponse.json({ ok: true, kind, bytes: body.length });
}
