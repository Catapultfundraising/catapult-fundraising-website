import { put, get, del } from "@vercel/blob";

export interface CaseIndexEntry {
  id: string;
  clientName: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

const INDEX_PATH = "client-cases/index.json";
const filePath = (id: string, fileName: string) => `client-cases/files/${id}-${fileName}`;

async function fetchJsonBlob<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

async function readIndex(): Promise<CaseIndexEntry[]> {
  const data = await fetchJsonBlob<CaseIndexEntry[]>(INDEX_PATH);
  return data ?? [];
}

async function writeIndex(entries: CaseIndexEntry[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(entries), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function listCases(): Promise<CaseIndexEntry[]> {
  const entries = await readIndex();
  return entries.sort((a, b) => a.clientName.localeCompare(b.clientName));
}

export interface SaveCaseParams {
  id?: string;
  clientName: string;
  fileName: string;
  contentType: string;
  fileBuffer: Buffer;
}

export async function saveCase(params: SaveCaseParams): Promise<CaseIndexEntry> {
  const id = params.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const pathname = filePath(id, params.fileName);

  await put(pathname, params.fileBuffer, {
    access: "private",
    contentType: params.contentType || "application/pdf",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const entry: CaseIndexEntry = {
    id,
    clientName: params.clientName || "Untitled Client",
    fileName: params.fileName || "case.pdf",
    fileSize: params.fileBuffer.length,
    contentType: params.contentType || "application/pdf",
    uploadedAt: now,
  };

  const entries = await readIndex();
  const next = [...entries.filter((e) => e.id !== id), entry];
  await writeIndex(next);
  return entry;
}

export async function getCaseFile(
  id: string
): Promise<{ entry: CaseIndexEntry; stream: ReadableStream } | null> {
  const entries = await readIndex();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;

  const pathname = filePath(id, entry.fileName);
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || !result.stream) return null;

  return { entry, stream: result.stream };
}

export async function deleteCase(id: string): Promise<void> {
  const entries = await readIndex();
  const entry = entries.find((e) => e.id === id);
  await writeIndex(entries.filter((e) => e.id !== id));
  if (entry) {
    try {
      await del(filePath(id, entry.fileName));
    } catch {
      // Non-fatal: the file blob may already be gone; the index removal above
      // is what actually hides it from the library.
    }
  }
}
