import { get, put } from "@vercel/blob";
import { EMPTY_TRACKING, type JagTracking } from "@/lib/jag-tracking-types";

// Committee updates + activity history (written by portal users) and the PIR
// link map (written by Viktor). Private blobs; local files when JAG_LOCAL_DIR is set.
export const JAG_TRACKING_PATH = "jag-data/tracking.json";
export const JAG_PIRS_PATH = "jag-data/pirs.json";

async function readJson<T>(path: string): Promise<T | null> {
  const dir = process.env.JAG_LOCAL_DIR;
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
  const dir = process.env.JAG_LOCAL_DIR;
  if (dir) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${dir}/${path.split("/").pop()}`, body);
    return;
  }
  await put(path, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
}

export async function getJagTracking(): Promise<JagTracking> {
  const [t, pirs] = await Promise.all([readJson<Omit<JagTracking, "pirs">>(JAG_TRACKING_PATH), readJson<JagTracking["pirs"]>(JAG_PIRS_PATH)]);
  return { prospects: t?.prospects ?? EMPTY_TRACKING.prospects, activity: t?.activity ?? [], pirs: pirs ?? {} };
}
export async function saveJagTracking(t: JagTracking) {
  await writeJson(JAG_TRACKING_PATH, { prospects: t.prospects, activity: t.activity });
}
