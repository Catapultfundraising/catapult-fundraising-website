import { NextResponse } from "next/server";
import { searchDonors } from "@/lib/donoratlas-client";

export const runtime = "nodejs";
export const maxDuration = 30;

// Looks up candidate donors by name (+ optional city/state) in DonorAtlas so
// the profiler can pick the right person before pulling their full profile.
// 1 DonorAtlas credit per search.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    if (!firstName && !lastName) {
      return NextResponse.json({ error: "Enter at least a first or last name to search." }, { status: 400 });
    }
    const results = await searchDonors({
      firstName,
      lastName,
      city: body?.city ? String(body.city).trim() : undefined,
      state: body?.state ? String(body.state).trim() : undefined,
    });
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("research-donoratlas-search error", err);
    return NextResponse.json({ error: err?.message || "Failed to search DonorAtlas." }, { status: 500 });
  }
}
