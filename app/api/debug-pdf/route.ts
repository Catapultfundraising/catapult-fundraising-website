import { NextRequest, NextResponse } from "next/server";
import "@/lib/pdf-polyfills";
import { PDFParse } from "pdf-parse";
import { listCases, getCaseFile } from "@/lib/client-cases-store";

export const runtime = "nodejs";
export const maxDuration = 60;

// Temporary diagnostic route, gated by DEBUG_ADMIN_TOKEN (not the /research
// cookie), used to isolate a production-only PDF-extraction failure. Removed
// once diagnosis is complete.
export async function GET(req: NextRequest) {
  const expected = process.env.DEBUG_ADMIN_TOKEN;
  const provided = req.headers.get("x-debug-token");
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  try {
    const cases = await listCases();
    if (!id) {
      return NextResponse.json({ cases: cases.map((c) => ({ id: c.id, clientName: c.clientName, fileName: c.fileName, fileSize: c.fileSize })) });
    }

    const fileResult = await getCaseFile(id);
    if (!fileResult) {
      return NextResponse.json({ error: "case file not found" }, { status: 404 });
    }
    const buf = Buffer.from(await new Response(fileResult.stream).arrayBuffer());

    try {
      const parser = new PDFParse({ data: buf });
      const parsed = await parser.getText();
      return NextResponse.json({
        ok: true,
        fileName: fileResult.entry.fileName,
        bufferBytes: buf.length,
        textLength: parsed.text?.length || 0,
        sample: (parsed.text || "").slice(0, 200),
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          ok: false,
          stage: "pdf-parse",
          bufferBytes: buf.length,
          message: err?.message || String(err),
          stack: err?.stack || null,
          name: err?.name || null,
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, stage: "outer", message: err?.message || String(err), stack: err?.stack || null },
      { status: 500 }
    );
  }
}
