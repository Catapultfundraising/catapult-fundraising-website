import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { startMagicaRun } from "@/lib/magica-client";

export const runtime = "nodejs";
export const maxDuration = 60;

// Two separate upload lanes, because the two source documents are nothing
// alike and one prompt covering both extracts worse on each:
//
//  - kind=grants  -> an IRS Form 990 / 990-PF for the foundation. The grants
//                    paid list (990-PF Part XV line 3, or Schedule I for a
//                    990) plus the financial and officer data on the return.
//  - kind=profile -> any other foundation write-up (Candid/Foundation
//                    Directory profile, annual report, the foundation's own
//                    guidelines page saved to PDF) that carries mission,
//                    focus areas, limitations and application process.
//
// Both start a Magica run and return a runId; the client polls
// /api/foundation-pdf-import/status?runId=...&kind=... which normalizes the
// model output into exactly the Foundation Profile Builder's field names.

type FoundationImportKind = "grants" | "profile";

const GRANTS_SYSTEM_PROMPT =
  "You extract structured grantmaking data from an IRS Form 990 or 990-PF filed by a private foundation, for a nonprofit fundraising CRM. Return ONLY valid JSON, no markdown fences, no commentary. Include EVERY grant row you can find in the return, not a sample and not a rolled-up total: on a 990-PF that is Part XV line 3 'Grants and Contributions Paid During the Year' (and line 3b approved for future payment, if present), and on a 990 that is Schedule I Parts II and III. If a field is not present, use an empty string or an empty array. Never invent, estimate or round a figure that is not printed in the return. The PDF you are given may be one page range of a longer return that is being read in parts, and it may be a scan rather than digital text: read the scanned pages, extract only what is actually visible on these pages, and return empty strings and empty arrays for anything not shown on them rather than inferring it. When the return is read in parts, the FIRST page of each PDF you receive is the cover page of the return, carrying the legal name, EIN and the tax year, and it is usually not part of the grants list; use it to fill taxYear, and give every grant row a year: the year printed on the row itself, or otherwise the tax year the return covers.";

const GRANTS_PROMPT = `Extract this IRS return into this exact JSON shape:
{
  "name": string (the filing foundation's legal name as printed on the return),
  "ein": string (formatted XX-XXXXXXX),
  "address": string (the foundation's address from the return header, single line),
  "phone": string (telephone number on the return, if shown),
  "taxYear": string (the tax year the return covers, e.g. "2024"),
  "financialData": string (a short factual summary of the return's own financial figures, each labeled and each traceable to a line on the return: total assets at end of year (fair market value if given), total revenue, total contributions/grants paid during the year, and the minimum 5% distribution requirement if stated. Plain sentences or "Label: figure" lines, no analysis, no projections.),
  "officersDirectors": string (newline-separated "Name: Title, compensation" for each officer, director, trustee, or foundation manager listed on the return (990-PF Part VIII line 1 / 990 Part VII). Write "Compensation: $0" verbatim if the return reports none.),
  "geographicFocus": string (only if the return itself states a geographic restriction on giving, e.g. in the application guidelines section; otherwise empty),
  "limitations": string (any restrictions the return states on the types of requests or recipients it will consider, e.g. "no grants to individuals"; otherwise empty),
  "applicationInformation": string (the return's own description of the form in which applications should be submitted, submission deadlines, and required materials -- 990-PF Part XV line 2; otherwise empty),
  "dueDate": string (an application deadline if the return states one; otherwise empty),
  "potentialGrantRange": string (the range from the smallest to the largest grant actually paid in the grants list, e.g. "$5,000 - $250,000", computed only from amounts printed in the return),
  "selectedGrants": [{"year": string (REQUIRED, never empty: the specific year printed on the row if the return shows one, otherwise the tax year the return covers), "grantee": string (recipient name, followed by the recipient's city and state in parentheses when the return prints an address, then the stated purpose of the grant in parentheses when the return gives one, e.g. "Boys & Girls Club of Henderson (Henderson, NV) (general operating support)"; never guess a location that is not printed), "amount": string (exactly as printed, e.g. "$25,000")}]
}`;

const PROFILE_SYSTEM_PROMPT =
  "You extract structured foundation information from a foundation profile, annual report, or published grantmaking guidelines document, for a nonprofit fundraising CRM. Return ONLY valid JSON, no markdown fences, no commentary. Use only what the document actually says -- never infer a mission, a focus area, or a dollar range that is not stated. If a field is not present, use an empty string or an empty array. Include every executive, officer, trustee, or program staff member the document names.";

const PROFILE_PROMPT = `Extract this foundation document into this exact JSON shape:
{
  "name": string (foundation name),
  "ein": string (EIN if shown, formatted XX-XXXXXXX),
  "address": string (single line),
  "phone": string,
  "website": string,
  "missionPurpose": string (the foundation's stated mission and purpose, as a single flowing paragraph),
  "history": string (founding story, founder(s), year established, endowment origin -- single flowing paragraph),
  "officersDirectors": string (newline-separated "Name: Title" for board members, officers, and trustees named in the document),
  "financialData": string (any stated asset, endowment, annual grantmaking total or payout figures, each labeled, verbatim as shown),
  "geographicFocus": string (the geographic areas the foundation funds in),
  "fieldsOfInterest": string (the broad interest areas or causes it funds),
  "programAreas": string (its named program areas or funding initiatives, with a short description of each if given),
  "typesOfSupport": string (e.g. general operating, program/project, capital, capacity building, matching, multi-year -- only those stated),
  "potentialGrantRange": string (the typical or stated grant size range, verbatim),
  "limitations": string (what it explicitly does NOT fund),
  "dueDate": string (application deadline(s) or LOI dates, verbatim),
  "applicationInformation": string (how to apply: LOI vs full proposal, portal, review cycle, contact, required attachments),
  "relationshipToOrg": string (only if the document describes a relationship or prior giving to a specific nonprofit; otherwise empty),
  "givingHistoryToClient": string (only if the document states prior gifts to a specific nonprofit; otherwise empty),
  "executives": [{"name": string, "title": string, "contactInfo": string (email/phone if given), "bio": string (their background as described, single flowing paragraph)}]
}`;

// Optional narrowing for the grants lane. Returns are alphabetical, so a
// profiler working one client usually wants a size floor or a place/name
// match rather than all several hundred rows.
function grantFilterClause(minAmount: string, keyword: string, states: string): string {
  const clauses: string[] = [];
  if (states) {
    clauses.push(
      `Include ONLY grants whose recipient address, as printed on the return, is in one of these states: ${states}. Skip a grant if the return prints no address for that recipient. Never guess a recipient's state.`
    );
  }
  if (minAmount) {
    clauses.push(
      `Include ONLY grants whose printed amount is at least ${minAmount}. Skip every smaller grant. Do not adjust or round any amount you do include.`
    );
  }
  if (keyword) {
    clauses.push(
      `Include ONLY grants where the recipient name, its city or state, or the stated purpose mentions "${keyword}". Skip every other grant.`
    );
  }
  if (!clauses.length) return "";
  return `\n\nFilters for selectedGrants (these do not affect any other field):\n${clauses.join("\n")}`;
}

function promptsFor(kind: FoundationImportKind, minAmount = "", keyword = "", states = "") {
  return kind === "grants"
    ? { system: GRANTS_SYSTEM_PROMPT, prompt: GRANTS_PROMPT + grantFilterClause(minAmount, keyword, states) }
    : { system: PROFILE_SYSTEM_PROMPT, prompt: PROFILE_PROMPT };
}

// Pulls the foundation's logo out of a profile-style PDF: the largest
// embedded JPEG on page 1. Deliberately simpler than the individual
// importer's headshot logic (which is position-aware because those
// templates always put the headshot at the top of the page) -- foundation
// documents have no such convention, so anything found here is offered as a
// suggestion and only used when the profiler hasn't set a logo already.
// Never applied to a 990: IRS returns contain no usable logo.
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
    const kindRaw = String(formData.get("kind") || "profile");
    const kind: FoundationImportKind = kindRaw === "grants" ? "grants" : "profile";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file was uploaded." }, { status: 400 });
    }
    // The browser splits anything bigger than 3MB into page ranges before
    // uploading, because Vercel rejects request bodies over ~4.5MB. If a
    // request this big still arrives, that split did not happen.
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "This PDF is too large to send in one piece. Reload the page and try the upload again." },
        { status: 413 }
      );
    }

    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const dataUrl = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;
    const minAmount = String(formData.get("minAmount") || "").slice(0, 40).trim();
    const keyword = String(formData.get("keyword") || "").slice(0, 80).trim();
    const states = String(formData.get("states") || "").slice(0, 120).trim();
    const { system, prompt } = promptsFor(kind, minAmount, keyword, states);

    const [{ runId }, logo] = await Promise.all([
      startMagicaRun("gemini_3_1_pro_preview", {
        file_urls: [dataUrl],
        system_prompt: system,
        prompt,
      }),
      kind === "profile" ? extractLogo(pdfBytes) : Promise.resolve(""),
    ]);

    return NextResponse.json({ ok: true, runId, kind, logo });
  } catch (err: any) {
    console.error("foundation-pdf-import start error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to start the PDF import. Please try again." },
      { status: 500 }
    );
  }
}
