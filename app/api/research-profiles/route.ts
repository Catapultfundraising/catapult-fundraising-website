import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { listProfiles, saveProfile, type ProfileType } from "@/lib/research-profiles-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const entries = await listProfiles();
    return NextResponse.json({ profiles: entries });
  } catch (err) {
    console.error("research-profiles GET error", err);
    return NextResponse.json({ error: "Failed to load profiles." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, name, status, data, type } = body || {};
    if (!data) {
      return NextResponse.json({ error: "Missing profile data." }, { status: 400 });
    }
    const validType: ProfileType | undefined =
      type === "corporate" || type === "foundation" || type === "individual" ? type : undefined;
    const entry = await saveProfile({
      id: typeof id === "string" && id ? id : undefined,
      name: typeof name === "string" ? name : "",
      status: status === "sent_for_approval" || status === "approved" ? status : "draft",
      type: validType,
      data,
    });
    return NextResponse.json({ ok: true, profile: entry });
  } catch (err) {
    console.error("research-profiles POST error", err);
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }
}
