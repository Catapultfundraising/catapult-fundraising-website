import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { get as blobGet, del as blobDel, issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { PDFDocument } from "pdf-lib";
import { isPvasDataAuthed } from "@/lib/pvas-data-auth";
import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { isJagDataAuthed } from "@/lib/jag-data-auth";
import { isWcbhcDataAuthed } from "@/lib/wcbhc-data-auth";
import { isBaqDataAuthed } from "@/lib/baq-data-auth";
import { getPvasRecords } from "@/lib/pvas-data-store";
import { getCsnfRecords } from "@/lib/csnf-data-store";
import { getJagRecords } from "@/lib/jag-data-store";
import { getWcbhcRecords } from "@/lib/wcbhc-data-store";
import { getBaqRecords } from "@/lib/baq-data-store";
import { engage } from "@/lib/portal-v2/server";
import { buildOverlay, finalId, mergedSources, type UpdateRow } from "@/lib/portal-v2/record-overlay";
import type { PortalClient, PortalState } from "@/lib/portal-v2/clients";

const MAX_BYTES = 20 * 1024 * 1024;
const AUTH = { pvas: isPvasDataAuthed, csnf: isCsnfDataAuthed, jag: isJagDataAuthed, wcbhc: isWcbhcDataAuthed, baq: isBaqDataAuthed };
const LOAD = { pvas: getPvasRecords, csnf: getCsnfRecords, jag: getJagRecords, wcbhc: getWcbhcRecords, baq: getBaqRecords };
type Doc = { id: number; cptid: number; blob_path: string; filename: string; bytes: number; sha256: string; uploaded_by: string; uploaded_at: string; deleted_at?: string | null; deleted_by?: string | null };
type Intent = { cptid: number; filename: string; by: string };
class RequestError extends Error { constructor(message: string, public status = 400) { super(message); } }
function cptid(value: unknown) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) throw new RequestError("A valid prospect record is required.");
  return n;
}
function intent(b: Record<string, unknown>): Intent {
  const filename = String(b.filename ?? "").replace(/[/\\\u0000-\u001f\u007f]/g, " ").trim();
  const by = String(b.by ?? "").trim();
  if (!filename || filename.length > 240 || !/\.pdf$/i.test(filename)) throw new RequestError("Choose a PDF with a filename up to 240 characters.");
  if (!by || by.length > 200) throw new RequestError("Enter your name (up to 200 characters).");
  return { cptid: cptid(b.cptid), filename, by };
}
function validPath(client: PortalClient, id: number, pathname: string) {
  return new RegExp(`^prospect-notes/${client}/${id}/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.pdf$`).test(pathname);
}
async function recordScope(client: PortalClient, id: number) {
  // Do not silently fall back to an empty state: merge/deletion checks must succeed.
  const [state, data] = await Promise.all([engage<PortalState>(client, "state"), LOAD[client]()]);
  if (!data) throw new RequestError("Prospect records are temporarily unavailable. Please try again.", 503);
  const overlay = buildOverlay(state.updates as unknown as UpdateRow[]);
  const target = finalId(overlay, id);
  if (overlay.deleted.has(target) || (!data.index.some((x) => x.cptid === target) && !state.prospects.some((x) => x.cptid === target)))
    throw new RequestError("This prospect record is not available.", 404);
  const ids = [target, ...mergedSources(overlay, target)];
  if (ids.length > 2000) throw new RequestError("This merged record needs staff assistance to load its PDFs.", 503);
  return { target, ids };
}
async function checkedPdf(pathname: string) {
  const blob = await blobGet(pathname, { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200) throw new RequestError("The uploaded PDF could not be found. Please try again.", 404);
  if (!blob.blob.size || blob.blob.size > MAX_BYTES) throw new RequestError("Choose a PDF up to 20 MB.");
  const bytes = new Uint8Array(await new Response(blob.stream).arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES || !Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from("%PDF-")))
    throw new RequestError("This file is not a valid PDF.");
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    if (!pdf.getPageCount()) throw new Error("No pages");
  } catch { throw new RequestError("This PDF could not be read. Save a new PDF copy and upload it again."); }
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}
async function complete(client: PortalClient, pathname: string, meta: Intent) {
  if (!validPath(client, meta.cptid, pathname)) throw new RequestError("The upload does not belong to this prospect.");
  await recordScope(client, meta.cptid);
  // Completion is idempotent. Browser completion and the signed Blob callback can race safely.
  const existing = await engage<{ document: Doc | null }>(client, "documentByPath", { pathname });
  if (existing.document?.deleted_at) throw new RequestError("This PDF was deleted and cannot be restored by completing an old upload.", 410);
  if (existing.document) return { document: publicDoc(existing.document) };
  let pdf: Awaited<ReturnType<typeof checkedPdf>>;
  try { pdf = await checkedPdf(pathname); }
  catch (e) {
    // Delete only a newly rejected, invalid file. Never remove files on transient SQL/storage failures.
    if (e instanceof RequestError && e.status === 400) await blobDel(pathname).catch(() => {});
    throw e;
  }
  const saved = await engage<{ document: Doc }>(client, "addDocument", {
    document: { cptid: meta.cptid, blob_path: pathname, filename: meta.filename, bytes: pdf.bytes.length, sha256: pdf.sha256, uploaded_by: meta.by },
  });
  if (saved.document.deleted_at) throw new RequestError("This PDF was deleted and cannot be restored by completing an old upload.", 410);
  return { document: publicDoc(saved.document) };
}
function publicDoc(d: Doc) {
  const { blob_path: _path, sha256: _hash, ...out } = d;
  return out;
}
function failure(e: unknown) {
  if (e instanceof RequestError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("Prospect PDF operation failed", e instanceof Error ? e.name : "UnknownError");
  return NextResponse.json({ error: "PDF notes are temporarily unavailable. Please try again. Your saved files have not been removed." }, { status: 503 });
}
export function documentsRoute(client: PortalClient) {
  async function GET(req: NextRequest) {
    if (!(await AUTH[client](req))) return NextResponse.json({ error: "Please sign in to this data dashboard." }, { status: 401 });
    try {
      const scope = await recordScope(client, cptid(req.nextUrl.searchParams.get("cptid")));
      const id = req.nextUrl.searchParams.get("id");
      if (!id) {
        const result = await engage<{ documents: Doc[] }>(client, "listDocuments", { cptids: scope.ids });
        return NextResponse.json({ documents: result.documents.map(publicDoc) }, { headers: { "Cache-Control": "no-store" } });
      }
      const docId = cptid(id);
      const { document: doc } = await engage<{ document: Doc | null }>(client, "getDocument", { id: docId });
      if (!doc || !scope.ids.includes(doc.cptid) || !validPath(client, doc.cptid, doc.blob_path)) throw new RequestError("PDF not found on this prospect record.", 404);
      const blob = await blobGet(doc.blob_path, { access: "private", useCache: false });
      if (!blob || blob.statusCode !== 200) throw new RequestError("This PDF is temporarily unavailable. Please try again.", 503);
      const ascii = doc.filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
      return new Response(blob.stream, { headers: {
        "Content-Type": "application/pdf", "Content-Length": String(doc.bytes),
        "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; base-uri 'none'",
      } });
    } catch (e) { return failure(e); }
  }
  async function POST(req: NextRequest) {
    try {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") throw new RequestError("Invalid upload request.");
      if (body.type === "blob.generate-presigned-url" || body.type === "blob.upload-completed") {
        // Completion callbacks do not have staff cookies; the SDK verifies Vercel's Ed25519 signature.
        // Authorization is enforced before any upload token can be issued.
        const result = await handleUploadPresigned({ request: req, body: body as HandleUploadPresignedBody,
          getSignedToken: async (pathname, clientPayload) => {
            if (!(await AUTH[client](req))) throw new RequestError("Please sign in to this data dashboard.", 401);
            const meta = intent(JSON.parse(clientPayload || "{}"));
            await recordScope(client, meta.cptid);
            if (!validPath(client, meta.cptid, pathname)) throw new RequestError("Invalid prospect PDF location.");
            const validUntil = Date.now() + 15 * 60 * 1000;
            // This workspace uses Blob OIDC, not a read-write token. Delegate only this file's PUT.
            const token = await issueSignedToken({ pathname, operations: ["put"], allowedContentTypes: ["application/pdf"], maximumSizeInBytes: MAX_BYTES, validUntil });
            const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : req.nextUrl.origin;
            return { token, urlOptions: { allowedContentTypes: ["application/pdf"], maximumSizeInBytes: MAX_BYTES, addRandomSuffix: false,
              allowOverwrite: false, validUntil, tokenPayload: JSON.stringify(meta), callbackUrl: `${origin}${req.nextUrl.pathname}` } };
          },
          onUploadCompleted: async ({ blob, tokenPayload }) => {
            const meta = intent(JSON.parse(tokenPayload || "{}"));
            await complete(client, blob.pathname, meta);
          },
        });
        return NextResponse.json(result);
      }
      if (!(await AUTH[client](req))) return NextResponse.json({ error: "Please sign in to this data dashboard." }, { status: 401 });
      const meta = intent(body);
      if (body.op === "prepare") {
        await recordScope(client, meta.cptid);
        return NextResponse.json({ pathname: `prospect-notes/${client}/${meta.cptid}/${randomUUID()}.pdf` });
      }
      if (body.op === "complete") return NextResponse.json(await complete(client, String(body.pathname || ""), meta));
      throw new RequestError("Unknown PDF upload action.");
    } catch (e) { return failure(e); }
  }
  async function DELETE(req: NextRequest) {
    if (!(await AUTH[client](req))) return NextResponse.json({ error: "Please sign in to this data dashboard." }, { status: 401 });
    try {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") throw new RequestError("Invalid PDF deletion request.");
      const id = cptid(body.id), scope = await recordScope(client, cptid(body.cptid));
      const by = String(body.by ?? "").trim();
      if (!by || by.length > 200) throw new RequestError("Enter your name (up to 200 characters).");
      const { document: doc } = await engage<{ document: Doc | null }>(client, "getDocument", { id, includeDeleted: true });
      if (!doc || !scope.ids.includes(doc.cptid) || !validPath(client, doc.cptid, doc.blob_path)) throw new RequestError("PDF not found on this prospect record.", 404);
      // Mark first so every list/open URL stops serving the PDF immediately, even if Blob is temporarily unavailable.
      const result = await engage<{ document: Doc | null }>(client, "deleteDocument", { id, by });
      if (!result.document) throw new RequestError("PDF not found on this prospect record.", 404);
      try { await blobDel(doc.blob_path); }
      catch { throw new RequestError("The PDF was removed from the record, but storage cleanup could not finish. Click Retry deletion to finish removing the stored file.", 503); }
      return NextResponse.json({ deleted: true, id, filename: doc.filename }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) { return failure(e); }
  }
  return { GET, POST, DELETE };
}
