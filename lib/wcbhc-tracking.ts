import { get, put } from "@vercel/blob";
import { EMPTY_TRACKING, type WcbhcTracking } from "@/lib/wcbhc-tracking-types";

// Committee updates + activity history (written by portal users) and the PIR
// link map (written by Viktor). Private blobs; local files when WCBHC_LOCAL_DIR is set.
export const WCBHC_TRACKING_PATH = "wcbhc-data/tracking.json";
export const WCBHC_PIRS_PATH = "wcbhc-data/pirs.json";

async function readJson<T>(path: string): Promise<T | null> {
  const dir = process.env.WCBHC_LOCAL_DIR;
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
  const dir = process.env.WCBHC_LOCAL_DIR;
  if (dir) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${dir}/${path.split("/").pop()}`, body);
    return;
  }
  await put(path, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
}

export async function getWcbhcTracking(): Promise<WcbhcTracking> {
  const [t, pirs] = await Promise.all([readJson<Omit<WcbhcTracking, "pirs">>(WCBHC_TRACKING_PATH), readJson<WcbhcTracking["pirs"]>(WCBHC_PIRS_PATH)]);
  return { prospects: t?.prospects ?? EMPTY_TRACKING.prospects, activity: t?.activity ?? [], removed: t?.removed ?? [], pirs: pirs ?? {} };
}
export async function saveWcbhcTracking(t: WcbhcTracking) {
  await writeJson(WCBHC_TRACKING_PATH, { prospects: t.prospects, activity: t.activity, removed: t.removed ?? [] });
}
