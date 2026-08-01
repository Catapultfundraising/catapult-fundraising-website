import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { deleteProfile, getProfile } from "@/lib/research-profiles-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const data = await getProfile(id);
    if (!data) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error("research-profiles/[id] GET error", err);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteProfile(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("research-profiles/[id] DELETE error", err);
    return NextResponse.json({ error: "Failed to delete profile." }, { status: 500 });
  }
}
