import { put, list } from "@vercel/blob";

export type ProfileStatus = "draft" | "sent_for_approval" | "approved";

export interface ProfileIndexEntry {
  id: string;
  name: string;
  status: ProfileStatus;
  updatedAt: string;
  createdAt: string;
}

const INDEX_PATH = "research-profiles/index.json";
const dataPath = (id: string) => `research-profiles/data/${id}.json`;

async function fetchJsonBlob<T>(prefix: string): Promise<T | null> {
  const { blobs } = await list({ prefix });
  const match = blobs.find((b) => b.pathname === prefix);
  if (!match) return null;
  const res = await fetch(match.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function readIndex(): Promise<ProfileIndexEntry[]> {
  const data = await fetchJsonBlob<ProfileIndexEntry[]>(INDEX_PATH);
  return data ?? [];
}

async function writeIndex(entries: ProfileIndexEntry[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(entries), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function listProfiles(): Promise<ProfileIndexEntry[]> {
  const entries = await readIndex();
  return entries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export interface ProfileEnvelope {
  name: string;
  status: ProfileStatus;
  data: any;
  updatedAt: string;
}

export async function getProfile(id: string): Promise<ProfileEnvelope | null> {
  return fetchJsonBlob<ProfileEnvelope>(dataPath(id));
}

export async function saveProfile(params: {
  id?: string;
  name: string;
  status: ProfileStatus;
  data: any;
}): Promise<ProfileIndexEntry> {
  const id = params.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const envelope: ProfileEnvelope = {
    name: params.name || "Untitled Prospect",
    status: params.status,
    data: params.data,
    updatedAt: now,
  };
  await put(dataPath(id), JSON.stringify(envelope), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const entries = await readIndex();
  const existing = entries.find((e) => e.id === id);
  const entry: ProfileIndexEntry = {
    id,
    name: params.name || "Untitled Prospect",
    status: params.status,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const next = [...entries.filter((e) => e.id !== id), entry];
  await writeIndex(next);
  return entry;
}

export async function deleteProfile(id: string): Promise<void> {
  const entries = await readIndex();
  await writeIndex(entries.filter((e) => e.id !== id));
  // Note: the underlying data blob is intentionally left in place (cheap,
  // orphaned) rather than risking a delete-tool version mismatch; it is no
  // longer reachable from the index/list UI.
}
