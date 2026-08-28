import { NextResponse } from "next/server";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { startMagicaRun } from "@/lib/magica-client";
import zlib from "zlib";

export const runtime = "nodejs";
export const maxDuration = 60;

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

// --- Position-aware headshot extraction -----------------------------------
//
// Wealth-screening PDF exports (DonorAtlas, etc.) place the prospect's
// headshot photo at the TOP of page 1, but the page can also contain other
// embedded JPEG/JP2 raster images lower down (employer logos in an
// Employment/Boards section, etc.) that are sometimes larger in raw pixel
// area than the actual headshot. Picking "largest image on the page" is
// therefore unreliable -- it can grab a company logo instead of the
// prospect's photo.
//
// To fix this we parse the page's content stream to find where each image
// XObject is actually DRAWN (via the `cm`/`Do` operators, tracking a
// q/Q graphics-state stack), and prefer whichever image is closest to the
// top of the page. Raw pixel area is kept only as a tie-breaker and as a
// fallback if content-stream parsing doesn't yield usable positions (e.g.
// an unusual/rotated layout), so this never regresses the previous
// behavior -- it only makes the common case more reliable.

type ImageCandidate = {
  name: string;
  bytes: Uint8Array;
  mime: string;
  area: number;
};

type DrawPosition = {
  distFromTop: number;
  drawWidth: number;
  drawHeight: number;
};

function multiplyMatrix(m1: number[], m2: number[]): number[] {
  // PDF matrices are [a b c d e f]; this computes m1 * m2 per the PDF spec's
  // row-vector convention (matches how `cm` concatenates onto the CTM).
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}

function getDrawPositions(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument["getPage"]>
): Map<string, DrawPosition> {
  const positions = new Map<string, DrawPosition>();
  try {
    const pageHeight = page.getHeight();
    const context = pdfDoc.context;

    const contentsRef = page.node.Contents();
    const list: unknown[] = Array.isArray((contentsRef as any)?.array)
      ? (contentsRef as any).array
      : [contentsRef];

    let allOps = "";
    for (const item of list) {
      // @ts-expect-error -- resolving a possible indirect reference
      const raw = item instanceof PDFRawStream ? item : context.lookup(item);
      if (!(raw instanceof PDFRawStream)) continue;
      const filter = raw.dict.lookup(PDFName.of("Filter"))?.toString() || "";
      let buf = Buffer.from(raw.contents);
      if (filter.includes("FlateDecode")) {
        try {
          buf = zlib.inflateSync(buf);
        } catch {
          continue;
        }
      }
      allOps += buf.toString("latin1") + "\n";
    }

    const tokens = allOps.split(/\s+/).filter(Boolean);
    let stack: number[][] = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    let numBuf: string[] = [];
    let lastName: string | null = null;

    for (const tok of tokens) {
      if (tok.startsWith("/")) {
        lastName = tok.slice(1);
        continue;
      }
      if (tok === "q") {
        stack.push(ctm);
        continue;
      }
      if (tok === "Q") {
        ctm = stack.pop() || ctm;
        continue;
      }
      if (tok === "cm") {
        const nums = numBuf.slice(-6).map(Number);
        if (nums.length === 6) ctm = multiplyMatrix(nums, ctm);
        numBuf = [];
        continue;
      }
      if (tok === "Do") {
        if (lastName) {
          // Unit-square image space maps (0,0)-(1,1) through the CTM.
          const topY = 1 * ctm[3] + ctm[5];
          const bottomY = ctm[5];
          const distFromTop = pageHeight - topY;
          const drawWidth = Math.hypot(ctm[0], ctm[1]);
          const drawHeight = Math.hypot(ctm[2], ctm[3]);
          const existing = positions.get(lastName);
          if (!existing || distFromTop < existing.distFromTop) {
            positions.set(lastName, { distFromTop, drawWidth, drawHeight });
          }
        }
        numBuf = [];
        continue;
      }
      if (/^[-\d.]+$/.test(tok)) numBuf.push(tok);
    }
  } catch {
    // If parsing fails for any reason, we simply return whatever we
    // managed to collect (possibly empty) and let the caller fall back
    // to the area-only heuristic.
  }
  return positions;
}

// Extracts the prospect's headshot photo from the PDF's first page and
// returns it as a base64 data URI. Prefers the image drawn closest to the
// top of the page (where these profile templates consistently place the
// headshot), falling back to the largest embedded JPEG/JP2 image if
// position data isn't available. Returns "" if no suitable image is found
// -- the profiler can still upload a photo manually, same as today.
async function extractHeadshot(pdfBytes: Uint8Array): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const page = pdfDoc.getPage(0);
    const resources = page.node.Resources();
    const xobjects = resources?.lookup(PDFName.of("XObject"));
    if (!xobjects) return "";

    const candidates: ImageCandidate[] = [];
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
      const mime =
        filter === "/DCTDecode" ? "image/jpeg" : filter === "/JPXDecode" ? "image/jp2" : null;
      if (!mime) continue; // skip non-JPEG image streams (rare in these exports)
      candidates.push({ name: key.toString().replace(/^\//, ""), bytes: xobj.contents, mime, area });
    }
    if (!candidates.length) return "";

    const positions = getDrawPositions(pdfDoc, page);

    // Ignore tiny icon-sized draws (e.g. small bullet/UI glyphs) so they
    // never outrank a real headshot just by having no position data.
    const MIN_DRAW_DIMENSION = 30; // points

    let best: ImageCandidate | null = null;
    let bestDistFromTop = Infinity;
    let bestHasPosition = false;

    for (const candidate of candidates) {
      const pos = positions.get(candidate.name);
      if (pos && (pos.drawWidth < MIN_DRAW_DIMENSION || pos.drawHeight < MIN_DRAW_DIMENSION)) {
        continue; // too small to be a headshot
      }
      if (pos) {
        if (!bestHasPosition || pos.distFromTop < bestDistFromTop) {
          best = candidate;
          bestDistFromTop = pos.distFromTop;
          bestHasPosition = true;
        }
      } else if (!bestHasPosition) {
        // No position data for this candidate -- only use it (by area) if
        // we haven't already found a positioned candidate.
        if (!best || candidate.area > best.area) {
          best = candidate;
        }
      }
    }

    if (!best) return "";
    const base64 = Buffer.from(best.bytes).toString("base64");
    return `data:${best.mime};base64,${base64}`;
  } catch {
    return "";
  }
}

// Starts the extraction job and returns immediately with a runId -- does
// NOT wait for the model to finish. The client polls
// /api/research-pdf-import/status to get the result. This avoids holding
// one long HTTP connection open for the 1-3 minutes a large PDF can take,
// which is fragile against gateway/proxy idle timeouts.
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

    const [{ runId }, photo] = await Promise.all([
      startMagicaRun("gemini_3_1_pro_preview", {
        file_urls: [dataUrl],
        system_prompt: EXTRACTION_SYSTEM_PROMPT,
        prompt: EXTRACTION_PROMPT,
      }),
      extractHeadshot(pdfBytes),
    ]);

    return NextResponse.json({ ok: true, runId, photo });
  } catch (err: any) {
    console.error("research-pdf-import start error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to start the PDF import. Please try again." },
      { status: 500 }
    );
  }
}
