import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { deleteCase, getCaseFile } from "@/lib/client-cases-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const result = await getCaseFile(id);
    if (!result) {
      return NextResponse.json({ error: "Case file not found." }, { status: 404 });
    }
    return new NextResponse(result.stream as any, {
      status: 200,
      headers: {
        "Content-Type": result.entry.contentType || "application/pdf",
        "Content-Disposition": `inline; filename="${result.entry.fileName}"`,
      },
    });
  } catch (err) {
    console.error("client-cases/[id] GET error", err);
    return NextResponse.json({ error: "Failed to load case file." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteCase(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("client-cases/[id] DELETE error", err);
    return NextResponse.json({ error: "Failed to delete case file." }, { status: 500 });
  }
}
