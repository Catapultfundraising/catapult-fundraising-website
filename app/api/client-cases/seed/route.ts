import { NextRequest, NextResponse } from "next/server";
import { listCases, saveCase } from "@/lib/client-cases-store";

export const runtime = "nodejs";

// One-time internal bootstrap route used to load the initial batch of
// case-for-support PDFs into the Client Case Library from already-hosted
// URLs, without requiring the /research login cookie. Gated by a random
// token stored only in a Vercel env var (SEED_ADMIN_TOKEN). This route (and
// the env var) are removed once the initial batch load is complete.
export async function POST(req: NextRequest) {
  const expected = process.env.SEED_ADMIN_TOKEN;
  const provided = req.headers.get("x-seed-token");
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const items: Array<{ clientName: string; fileName: string; sourceUrl: string }> = body?.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing items." }, { status: 400 });
    }

    const results = [];
    for (const item of items) {
      const res = await fetch(item.sourceUrl);
      if (!res.ok) {
        results.push({ clientName: item.clientName, error: `Failed to fetch (${res.status})` });
        continue;
      }
      const contentType = res.headers.get("content-type") || "application/pdf";
      const buffer = Buffer.from(await res.arrayBuffer());
      const entry = await saveCase({
        clientName: item.clientName,
        fileName: item.fileName,
        contentType,
        fileBuffer: buffer,
      });
      results.push(entry);
    }

    const all = await listCases();
    return NextResponse.json({ ok: true, results, allCases: all });
  } catch (err) {
    console.error("client-cases/seed POST error", err);
    return NextResponse.json({ error: "Failed to seed client cases." }, { status: 500 });
  }
}
