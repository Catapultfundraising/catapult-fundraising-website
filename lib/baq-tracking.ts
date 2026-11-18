import { get, put } from "@vercel/blob";
import { liveBuild, sqlTracking, saveSqlTracking } from "@/lib/client-live-data.server";
import { EMPTY_TRACKING, type BaqTracking } from "@/lib/baq-tracking-types";

// Committee updates + activity history (written by portal users) and the PIR
// link map (written by Viktor). Private blobs; local files when BAQ_LOCAL_DIR is set.
export const BAQ_TRACKING_PATH = "baq-data/tracking.json";
export const BAQ_PIRS_PATH = "baq-data/pirs.json";

async function readJson<T>(path: string): Promise<T | null> {
  const dir = process.env.BAQ_LOCAL_DIR;
  try {
    if (dir) {
      const { readFile } = await import("node:fs/promises");
      return JSON.parse(await readFile(`${dir}/${path.split("/").pop()}`, "utf8")) as T;
    }
    const r = await get(path, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text()) as T;
  } catch {
    return null;
  }
}
export async function writeJson(path: string, data: unknown) {
  const body = JSON.stringify(data);
  const dir = process.env.BAQ_LOCAL_DIR;
  if (dir) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${dir}/${path.split("/").pop()}`, body);
    return;
  }
  await put(path, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
}

export async function getBaqTracking(): Promise<BaqTracking> {
  // After this client's switch, tracking lives in baq.dashboard_prospect_status / baq.dashboard_activity (SQL)
  // and PIR links come from baq.pir_links. Before it, the blob below is still the source.
  const fromSql = await sqlTracking("baq");
  if (fromSql) return { ...fromSql, pirs: (await liveBuild("baq")).pirs } as unknown as BaqTracking;
  const [t, pirs] = await Promise.all([readJson<Omit<BaqTracking, "pirs">>(BAQ_TRACKING_PATH), readJson<BaqTracking["pirs"]>(BAQ_PIRS_PATH)]);
  return { prospects: t?.prospects ?? EMPTY_TRACKING.prospects, activity: t?.activity ?? [], removed: t?.removed ?? [], pirs: pirs ?? {} };
}
export async function saveBaqTracking(t: BaqTracking) {
  if (await saveSqlTracking("baq", t)) return;
  await writeJson(BAQ_TRACKING_PATH, { prospects: t.prospects, activity: t.activity, removed: t.removed ?? [] });
}
