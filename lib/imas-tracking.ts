import { get, put } from "@vercel/blob";
import { liveBuild, sqlTracking, saveTrackingWithBases } from "@/lib/client-live-data.server";
import { applyTrackingBases, recordBase } from "@/lib/portal-v2/sql-newer";
import { EMPTY_TRACKING, type ImasTracking } from "@/lib/imas-tracking-types";

// Committee updates + activity history (written by portal users) and the PIR
// link map (written by Viktor). Private blobs; local files when IMAS_LOCAL_DIR is set.
export const IMAS_TRACKING_PATH = "imas-data/tracking.json";
export const IMAS_PIRS_PATH = "imas-data/pirs.json";

async function readJson<T>(path: string): Promise<T | null> {
  const dir = process.env.IMAS_LOCAL_DIR;
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
  const dir = process.env.IMAS_LOCAL_DIR;
  if (dir) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${dir}/${path.split("/").pop()}`, body);
    return;
  }
  await put(path, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
}

export async function getImasTracking(): Promise<ImasTracking> {
  // After this client's switch, tracking lives in imas.dashboard_prospect_status / imas.dashboard_activity (SQL)
  // and PIR links come from imas.pir_links. Before it, the blob below is still the source.
  const fromSql = await sqlTracking("imas");
  if (fromSql) {
    const build = await liveBuild("imas");
    // Newest change wins: a solicitor changed in SQL after the dashboard edit shows instead of it.
    return { ...fromSql, prospects: applyTrackingBases(fromSql.prospects as Record<string, Record<string, unknown>>, recordBase("imas", build.records.records)), pirs: build.pirs } as unknown as ImasTracking;
  }
  const [t, pirs] = await Promise.all([readJson<Omit<ImasTracking, "pirs">>(IMAS_TRACKING_PATH), readJson<ImasTracking["pirs"]>(IMAS_PIRS_PATH)]);
  return { prospects: t?.prospects ?? EMPTY_TRACKING.prospects, activity: t?.activity ?? [], removed: t?.removed ?? [], pirs: pirs ?? {} };
}
export async function saveImasTracking(t: ImasTracking) {
  if (await saveTrackingWithBases("imas", t)) return;
  await writeJson(IMAS_TRACKING_PATH, { prospects: t.prospects, activity: t.activity, removed: t.removed ?? [] });
}
