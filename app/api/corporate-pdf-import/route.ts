import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { startMagicaRun } from "@/lib/magica-client";

export const runtime = "nodejs";
export const maxDuration = 60;

// Corporate Profile Builder's "Upload Information PDF" lane. Same pattern as
// the Foundation Profile Builder's information upload: any company write-up
// (company profile from a research database, annual report, About/Our
// Story page saved to PDF, corporate responsibility or community giving
// report, press kit) goes in, and the model returns exactly the Corporate
// Profile Builder's field names.
//
// POST starts a Magica run and returns a runId; the client polls
// /api/corporate-pdf-import/status?runId=... which normalizes the output.

const SYSTEM_PROMPT =
  "You extract structured company information from a company profile, annual report, corporate responsibility or community giving report, company website page saved to PDF, or press kit, for a nonprofit fundraising CRM. Return ONLY valid JSON, no markdown fences, no commentary. Use only what the document actually says -- never infer a history, a value, a revenue figure, or a giving program that is not stated, and never invent, estimate or round a figure that is not printed in the document. If a field is not present, use an empty string or an empty array. Include every executive, officer, board member, or community relations / giving contact the document names. The PDF may be a scan: read the scanned pages.";

const PROMPT = `Extract this company document into this exact JSON shape:
{
  "name": string (company name),
  "address": string (headquarters address, single line),
  "phone": string (main phone number),
  "website": string,
  "revenueYear": string (the fiscal year of the most recent revenue figure stated, e.g. "2025"; empty if no revenue figure is stated),
  "revenueAmount": string (that revenue figure exactly as printed, e.g. "$4.2 billion"; empty if not stated),
  "companyHeritage": string (founding story, founder(s), year founded, ownership history, major milestones -- single flowing paragraph),
  "keyInformation": string (the key facts a fundraiser should know: industry, ownership (public/private/family-owned, ticker if public), employee count, number of locations, markets served, parent company or subsidiaries -- only those stated, single flowing paragraph),
  "productsOperations": string (what the company makes or does and where it operates -- single flowing paragraph),
  "values": string (the company's stated mission, vision, and values -- single flowing paragraph),
  "corporateGiving": string (the company's stated community giving, sponsorship, employee giving/matching, volunteer and corporate responsibility programs, focus areas, and any stated giving totals or application process -- single flowing paragraph),
  "companyAffiliations": string (newline-separated memberships, partnerships, industry associations, and nonprofit boards or affiliations the document names),
  "relevantFindings": string (anything else in the document a fundraiser approaching this company would want flagged, e.g. recent expansion, new headquarters, anniversary, leadership change, awards -- only what is stated; otherwise empty),
  "relationshipToOrg": string (only if the document describes a relationship with a specific nonprofit; otherwise empty),
  "firstGiftAmount": string (only if the document states the company's first gift to a specific nonprofit; otherwise empty),
  "lastGiftAmount": string (only if the document states the company's most recent gift to a specific nonprofit; otherwise empty),
  "largestGiftAmount": string (only if the document states the company's largest gift to a specific nonprofit; otherwise empty),
  "foundations": [{"name": string (a company or family foundation affiliated with the company), "address": string, "phone": string, "email": string, "website": string, "netAssetsYear": string, "netAssetsAmount": string (exactly as printed)}],
  "keyPeople": [{"name": string, "title": string, "contactInfo": string (email/phone if given), "bio": string (their background as described, single flowing paragraph)}]
}`;

// Pulls the company's logo out of a company information PDF: the largest
// embedded JPEG on page 1. Deliberately simpler than the individual
// importer's headshot logic (which is position-aware because those
// templates always put the headshot at the top of the page) -- foundation
// documents have no such convention, so anything found here is offered as a
// suggestion and only used when the profiler hasn't set a logo already.
async function extractLogo(pdfBytes: Uint8Array): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const page = pdfDoc.getPage(0);
    const xobjects = page.node.Resources()?.lookup(PDFName.of("XObject"));
    if (!xobjects) return "";

    let bestBytes: Uint8Array | null = null;
    let bestArea = 0;
    let bestMime = "image/jpeg";
    // @ts-expect-error -- pdf-lib's PDFDict doesn't type keys()/lookup() precisely enough here
    for (const key of xobjects.keys()) {
      // @ts-expect-error
      const xobj = xobjects.lookup(key);
      if (!(xobj instanceof PDFRawStream)) continue;
      const dict = xobj.dict;
      if (dict.lookup(PDFName.of("Subtype"))?.toString() !== "/Image") continue;
      const filter = dict.lookup(PDFName.of("Filter"))?.toString();
      const mime =
        filter === "/DCTDecode" ? "image/jpeg" : filter === "/JPXDecode" ? "image/jp2" : null;
      if (!mime) continue;
      const widthObj = dict.lookup(PDFName.of("Width")) as any;
      const heightObj = dict.lookup(PDFName.of("Height")) as any;
      const width = widthObj?.asNumber?.() ?? widthObj?.numberValue ?? 0;
      const height = heightObj?.asNumber?.() ?? heightObj?.numberValue ?? 0;
      const area = width * height;
      // Skip sub-64px images: page furniture, bullets and rules, never a logo.
      if (width < 64 || height < 64) continue;
      if (area > bestArea) {
        bestArea = area;
        bestBytes = xobj.contents;
        bestMime = mime;
      }
    }

    if (!bestBytes) return "";
    return `data:${bestMime};base64,${Buffer.from(bestBytes).toString("base64")}`;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    // This route spends paid model credits, so gate it on the same
    // /research cookie the builder page itself is behind. API routes are not
    // covered by the middleware page gate, so each one checks independently.
    if (!(await isResearchAuthed(req))) {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    const formData = await req.formData();
    const file = formData.get("pdf");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file was uploaded." }, { status: 400 });
    }
    // The browser splits anything bigger than 3MB into page ranges before
    // uploading, because Vercel rejects request bodies over ~4.5MB.
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "This PDF is too large to send in one piece. Reload the page and try the upload again." },
        { status: 413 }
      );
    }

    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const dataUrl = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;

    const [{ runId }, logo] = await Promise.all([
      startMagicaRun("gemini_3_1_pro_preview", {
        file_urls: [dataUrl],
        system_prompt: SYSTEM_PROMPT,
        prompt: PROMPT,
      }),
      extractLogo(pdfBytes),
    ]);

    return NextResponse.json({ ok: true, runId, logo });
  } catch (err: any) {
    console.error("corporate-pdf-import start error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to start the PDF import. Please try again." },
      { status: 500 }
    );
  }
}
