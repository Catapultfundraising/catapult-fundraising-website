import { put, get } from "@vercel/blob";

export interface RosterGivingRow {
  year: string;
  amount: string;
  comments: string;
}

export interface RosterProspect {
  name: string;
  clientProfiler: string;
  catapultId: string;
  clientId: string;
  givingHistoryRows: RosterGivingRow[];
}

export interface RosterEnvelope {
  fileName: string;
  uploadedAt: string;
  prospects: RosterProspect[];
}

const ROSTER_PATH = "research-roster/current.json";

async function fetchJsonBlob<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

export async function getRoster(): Promise<RosterEnvelope | null> {
  return fetchJsonBlob<RosterEnvelope>(ROSTER_PATH);
}

export async function saveRoster(envelope: Omit<RosterEnvelope, "uploadedAt">): Promise<RosterEnvelope> {
  const full: RosterEnvelope = { ...envelope, uploadedAt: new Date().toISOString() };
  await put(ROSTER_PATH, JSON.stringify(full), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return full;
}

export async function clearRoster(): Promise<void> {
  await put(ROSTER_PATH, JSON.stringify({ fileName: "", uploadedAt: new Date().toISOString(), prospects: [] }), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
