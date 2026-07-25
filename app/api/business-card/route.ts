import { NextRequest, NextResponse } from "next/server";
import { renderBusinessCardPdf } from "@/lib/business-card-pdf";

export const runtime = "nodejs";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "team-member"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const cellPhone = typeof body.cellPhone === "string" ? body.cellPhone.trim() : "";
    const officePhone = typeof body.officePhone === "string" ? body.officePhone.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const includeCropMarks = Boolean(body.includeCropMarks);

    const pdfBuffer = await renderBusinessCardPdf({
      fullName,
      title,
      cellPhone,
      officePhone,
      email,
      includeCropMarks,
    });

    const filename = `catapult-business-card-${slugify(fullName)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to render business card PDF", error);
    return NextResponse.json(
      { error: "Failed to generate business card PDF." },
      { status: 500 }
    );
  }
}
