import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { CSNF_DATA_PATH, CSNF_RECORDS_PATH } from "@/lib/csnf-data-store";

export const runtime = "nodejs";

// Viktor posts the rebuilt CSNF data here (Bearer CRON_SECRET).
// ?kind=snapshot (default) or ?kind=records. Body may be gzipped (x-gzip: 1)
// because the records file is larger than the function body limit.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const kind = new URL(req.url).searchParams.get("kind") === "records" ? "records" : "snapshot";
  const raw = Buffer.from(await req.arrayBuffer());
  const body = req.headers.get("x-gzip") === "1" ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
  try {
    const parsed = JSON.parse(body);
    if (kind === "snapshot" ? !parsed.kpi || !parsed.client : !parsed.index || !parsed.records) throw new Error("bad shape");
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  await put(kind === "records" ? CSNF_RECORDS_PATH : CSNF_DATA_PATH, body, {
    access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true,
  });
  return NextResponse.json({ ok: true, kind, bytes: body.length });
}
