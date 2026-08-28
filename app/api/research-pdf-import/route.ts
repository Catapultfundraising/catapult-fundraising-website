import { NextResponse } from "next/server";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { runMagicaModel } from "@/lib/magica-client";

export const runtime = "nodejs";
export const maxDuration = 280;

const EXTRACTION_SYSTEM_PROMPT =
  "You extract structured prospect research data from wealth-screening PDF reports (e.g. DonorAtlas) into a strict JSON object for a nonprofit fundraising CRM. Return ONLY valid JSON, no markdown fences, no commentary. Every array field must include EVERY occurrence found in the document, not just the first one -- for example every real estate property (owned AND sold), every child, and every individual year/gift row in giving-history tables, not a rolled-up summary. If a field is not present, use an empty string or empty array.";

const EXTRACTION_PROMPT = `Extract this wealth-screening profile into this exact JSON shape:
{
  "name": string,
  "homeAddress": string,
  "born": string (age/DOB if present),
  "maritalStatusRaw": string (whatever the document says about marital status/spouse, verbatim),
  "estimatedNetWorth": string,
  "estimatedIncome": string,
  "givingCapacity": string,
  "wealthRating": string,
  "relationshipToOrg": string (short bio summary),
  "additionalInformation": string (career/honors narrative, notable facts),
  "boards": string (newline-separated "Org: Title, Years"),
  "businessAddresses": string (employment history as newline-separated "Org: Title, Years"),
  "childrenRows": [{"name": string, "age": string, "otherInfo": string}],
  "educationEntries": [{"institution": string, "degree": string, "year": string}],
  "realEstate": [{"address": string, "description": string, "value": string, "purchaseInfo": string}],
  "otherGiving": [{"recipient": string, "giving": string (category), "year": string, "amount": string}],
  "fecGiving": [{"org": string, "year": string, "amount": string}],
  "totalCharitableGiving": string
}`;

const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Implied Divorced", "Widowed", "Dating", "Unknown"];

function normalizeMaritalStatus(raw: string): string {
  const lower = (raw || "").toLowerCase();
  if (MARITAL_STATUS_OPTIONS.some((opt) => lower === opt.toLowerCase())) {
    const match = MARITAL_STATUS_OPTIONS.find((opt) => lower === opt.toLowerCase());
    return match || "Unknown";
  }
  if (lower.includes("widow")) return "Widowed";
  if (lower.includes("divorced")) return "Divorced";
  if (lower.includes("spouse") || lower.includes("married")) return "Married";
  if (lower.includes("single")) return "Single";
  if (lower.includes("dating") || lower.includes("partner")) return "Dating";
  return "Unknown";
}

function parseModelJson(text: string): Record<string, any> {
  // Strip markdown code fences if the model wrapped its JSON in them anyway.
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

// Extracts the largest embedded JPEG image on the PDF's first page and
// returns it as a base64 data URI. In DonorAtlas exports the prospect's
// headshot is consistently the largest embedded image on page 1 (secondary
// photos, like a "Connections" thumbnail, are meaningfully smaller). Returns
// "" if no suitable image is found -- the profiler can still upload a photo
// manually, same as today.
async function extractHeadshot(pdfBytes: Uint8Array): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const page = pdfDoc.getPage(0);
    const resources = page.node.Resources();
    const xobjects = resources?.lookup(PDFName.of("XObject"));
    if (!xobjects) return "";

    let best: { bytes: Uint8Array; area: number; mime: string } | null = null;
    // @ts-expect-error -- pdf-lib's PDFDict doesn't type keys()/lookup() precisely enough here
    for (const key of xobjects.keys()) {
      // @ts-expect-error
      const xobj = xobjects.lookup(key);
      if (!(xobj instanceof PDFRawStream)) continue;
      const dict = xobj.dict;
      const subtype = dict.lookup(PDFName.of("Subtype"))?.toString();
      if (subtype !== "/Image") continue;
      const filter = dict.lookup(PDFName.of("Filter"))?.toString();
      const widthObj = dict.lookup(PDFName.of("Width")) as any;
      const heightObj = dict.lookup(PDFName.of("Height")) as any;
      const width = widthObj?.asNumber?.() ?? widthObj?.numberValue ?? 0;
      const height = heightObj?.asNumber?.() ?? heightObj?.numberValue ?? 0;
      const area = width * height;
      const mime = filter === "/DCTDecode" ? "image/jpeg" : filter === "/JPXDecode" ? "image/jp2" : null;
      if (!mime) continue; // skip non-JPEG image streams (rare in these exports)
      if (!best || area > best.area) {
        best = { bytes: xobj.contents, area, mime };
      }
    }
    if (!best) return "";
    const base64 = Buffer.from(best.bytes).toString("base64");
    return `data:${best.mime};base64,${base64}`;
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file was uploaded." }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF is too large (25MB limit)." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    const base64Pdf = Buffer.from(pdfBytes).toString("base64");
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

    const [modelResult, photo] = await Promise.all([
      runMagicaModel("gemini_3_1_pro_preview", {
        file_urls: [dataUrl],
        system_prompt: EXTRACTION_SYSTEM_PROMPT,
        prompt: EXTRACTION_PROMPT,
      }),
      extractHeadshot(pdfBytes),
    ]);

    const rawText: string = typeof modelResult === "string" ? modelResult : modelResult?.text ?? "";
    const extracted = parseModelJson(rawText);

    const maritalStatus = normalizeMaritalStatus(extracted.maritalStatusRaw || "");

    return NextResponse.json({
      ok: true,
      data: {
        name: extracted.name || "",
        homeAddress: extracted.homeAddress || "",
        born: extracted.born || "",
        maritalStatus,
        estimatedNetWorth: extracted.estimatedNetWorth || "",
        estimatedIncome: extracted.estimatedIncome || "",
        givingCapacity: extracted.givingCapacity || "",
        wealthRating: extracted.wealthRating || "",
        relationshipToOrg: extracted.relationshipToOrg || "",
        additionalInformation: extracted.additionalInformation || "",
        boards: extracted.boards || "",
        businessAddresses: extracted.businessAddresses || "",
        childrenRows: Array.isArray(extracted.childrenRows) ? extracted.childrenRows : [],
        educationEntries: Array.isArray(extracted.educationEntries) ? extracted.educationEntries : [],
        realEstate: Array.isArray(extracted.realEstate) ? extracted.realEstate : [],
        otherGiving: Array.isArray(extracted.otherGiving) ? extracted.otherGiving : [],
        fecGiving: Array.isArray(extracted.fecGiving) ? extracted.fecGiving : [],
        totalCharitableGiving: extracted.totalCharitableGiving || "",
        photo,
      },
    });
  } catch (err: any) {
    console.error("research-pdf-import error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to import this PDF. Please try again or fill the form in manually." },
      { status: 500 }
    );
  }
}
