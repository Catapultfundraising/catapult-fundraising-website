import { put, get } from "@vercel/blob";

export type ProfileStatus = "draft" | "sent_for_approval" | "approved";
// Which builder created this profile. Defaults to "individual" everywhere
// a profile predates this field, so old saved profiles keep working and
// routing to the correct editor/PDF endpoint without a migration step.
export type ProfileType = "individual" | "corporate" | "foundation";

export interface ProfileIndexEntry {
  id: string;
  name: string;
  status: ProfileStatus;
  type: ProfileType;
  updatedAt: string;
  createdAt: string;
}

const INDEX_PATH = "research-profiles/index.json";
const dataPath = (id: string) => `research-profiles/data/${id}.json`;

async function fetchJsonBlob<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

async function readIndex(): Promise<ProfileIndexEntry[]> {
  const data = await fetchJsonBlob<ProfileIndexEntry[]>(INDEX_PATH);
  return (data ?? []).map((e) => ({ ...e, type: e.type || "individual" }));
}

async function writeIndex(entries: ProfileIndexEntry[]): Promise<void> {
  await put(INDEX_PATH, JSON.stringify(entries), {
    access: "private",
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
  type: ProfileType;
  data: any;
  updatedAt: string;
}

export async function getProfile(id: string): Promise<ProfileEnvelope | null> {
  const envelope = await fetchJsonBlob<ProfileEnvelope>(dataPath(id));
  if (!envelope) return null;
  return { ...envelope, type: envelope.type || "individual" };
}

export async function saveProfile(params: {
  id?: string;
  name: string;
  status: ProfileStatus;
  type?: ProfileType;
  data: any;
}): Promise<ProfileIndexEntry> {
  const id = params.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const type: ProfileType = params.type || "individual";

  const envelope: ProfileEnvelope = {
    name: params.name || "Untitled Prospect",
    status: params.status,
    type,
    data: params.data,
    updatedAt: now,
  };
  await put(dataPath(id), JSON.stringify(envelope), {
    access: "private",
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
    // Once a profile is created as a given type, that type never changes on
    // subsequent saves even if the caller omits it -- only a brand-new
    // profile can set it.
    type: existing?.type || type,
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
