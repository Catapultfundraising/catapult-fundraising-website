import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { isResearchAuthed } from "@/lib/research-auth";
import { getProfile } from "@/lib/research-profiles-store";
import { listCases, getCaseFile } from "@/lib/client-cases-store";
import { extractClientAcronym, findMatchingCase, buildAskStrategy } from "@/lib/ask-strategy";
import { buildAskStrategyDocx } from "@/lib/ask-strategy-docx";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isResearchAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const profile = await getProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    if (profile.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved profiles can generate an ask strategy." },
        { status: 400 }
      );
    }

    const acronym = extractClientAcronym(profile.data?.clientProfiler || "");
    if (!acronym) {
      return NextResponse.json(
        {
          error:
            'Add a "Client Name / Profiler Initials" value (e.g., SCFTA/JG) to this profile before generating an ask strategy.',
        },
        { status: 400 }
      );
    }

    const cases = await listCases();
    const match = findMatchingCase(cases, acronym);
    if (!match) {
      const available = cases.map((c) => c.clientName).join(", ") || "none uploaded yet";
      return NextResponse.json(
        {
          error: `No case for support found matching "${acronym}". Upload one in the Client Case Library first. Available clients: ${available}.`,
        },
        { status: 404 }
      );
    }

    const fileResult = await getCaseFile(match.id);
    if (!fileResult) {
      return NextResponse.json({ error: "Could not read the matched case for support file." }, { status: 500 });
    }
    const caseBuffer = new Uint8Array(await new Response(fileResult.stream).arrayBuffer());

    let caseText = "";
    try {
      const pdf = await getDocumentProxy(caseBuffer);
      const { text } = await extractText(pdf, { mergePages: true });
      caseText = text || "";
    } catch (err) {
      console.error("ask-strategy PDF parse error", err);
      return NextResponse.json(
        { error: "Could not extract text from the client's case for support PDF." },
        { status: 500 }
      );
    }

    const prospectName = profile.data?.name || profile.name || "Prospect";

    const strategy = buildAskStrategy({
      profileData: profile.data || {},
      clientOrgName: match.clientName,
      caseForSupportText: caseText,
    });

    const generatedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const docxBuffer = await buildAskStrategyDocx({
      prospectName,
      clientOrgName: match.clientName,
      catapultId: profile.data?.catapultId,
      generatedDate,
      strategy,
    });

    const fileName = `${prospectName.replace(/[^a-z0-9]+/gi, "_")}_Ask_Strategy.docx`;
    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("ask-strategy POST error", err);
    return NextResponse.json({ error: err?.message || "Failed to generate ask strategy." }, { status: 500 });
  }
}
