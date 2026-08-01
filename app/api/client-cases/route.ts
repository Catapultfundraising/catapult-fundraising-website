import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { listCases, saveCase } from "@/lib/client-cases-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const entries = await listCases();
    return NextResponse.json({ cases: entries });
  } catch (err) {
    console.error("client-cases GET error", err);
    return NextResponse.json({ error: "Failed to load client cases." }, { status: 500 });
  }
}

// Accepts either:
//  - multipart/form-data with fields `clientName` + `file` (the real upload UI), or
//  - application/json with { clientName, fileName, sourceUrl } to ingest a file
//    that is already hosted somewhere else (used for initial bulk loading).
export async function POST(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const contentType = req.headers.get("content-type") || "";
    let clientName = "";
    let fileName = "";
    let fileContentType = "application/pdf";
    let buffer: Buffer;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      clientName = String(form.get("clientName") || "").trim();
      if (!file) {
        return NextResponse.json({ error: "Missing file." }, { status: 400 });
      }
      fileName = file.name || "case.pdf";
      fileContentType = file.type || "application/pdf";
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await req.json().catch(() => ({}));
      clientName = String(body?.clientName || "").trim();
      const sourceUrl = body?.sourceUrl;
      fileName = body?.fileName || "case.pdf";
      if (!sourceUrl) {
        return NextResponse.json({ error: "Missing sourceUrl or file." }, { status: 400 });
      }
      const res = await fetch(sourceUrl);
      if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch sourceUrl." }, { status: 400 });
      }
      fileContentType = res.headers.get("content-type") || "application/pdf";
      buffer = Buffer.from(await res.arrayBuffer());
    }

    if (!clientName) {
      return NextResponse.json({ error: "Missing client/organization name." }, { status: 400 });
    }

    const entry = await saveCase({
      clientName,
      fileName,
      contentType: fileContentType,
      fileBuffer: buffer,
    });
    return NextResponse.json({ ok: true, case: entry });
  } catch (err) {
    console.error("client-cases POST error", err);
    return NextResponse.json({ error: "Failed to save client case." }, { status: 500 });
  }
}
