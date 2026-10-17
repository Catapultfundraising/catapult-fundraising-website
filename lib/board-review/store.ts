import { get, put, del } from "@vercel/blob";
import type { BrClient, BrList, BrResponses } from "@/lib/board-review/config";

// Board review storage: private Vercel Blob JSON next to each client's dashboard data
// ({client}-data/board-review/*). Same pattern as the dashboard tracking blobs. One blob
// per member for answers, so autosaves from different members never overwrite each other.
// BOARD_REVIEW_LOCAL_DIR switches to local files for QA.
export interface BrMember { id: string; name: string; email: string; role: string; salt: string; hash: string; version: number; invitedAt: string; lastSeen?: string }

const base = (c: BrClient) => `${c}-data/board-review`;
const listPath = (c: BrClient) => `${base(c)}/list.json`;
const membersPath = (c: BrClient) => `${base(c)}/members.json`;
const respPath = (c: BrClient, id: string) => `${base(c)}/responses-${id}.json`;

async function readJson<T>(path: string): Promise<T | null> {
  const dir = process.env.BOARD_REVIEW_LOCAL_DIR;
  try {
    if (dir) {
      const { readFile } = await import("node:fs/promises");
      return JSON.parse(await readFile(`${dir}/${path.replace(/\//g, "--")}`, "utf8")) as T;
    }
    const r = await get(path, { access: "private", useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text()) as T;
  } catch {
    return null;
  }
}
async function writeJson(path: string, data: unknown) {
  const body = JSON.stringify(data);
  const dir = process.env.BOARD_REVIEW_LOCAL_DIR;
  if (dir) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${dir}/${path.replace(/\//g, "--")}`, body);
    return;
  }
  await put(path, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
}
async function remove(path: string) {
  const dir = process.env.BOARD_REVIEW_LOCAL_DIR;
  try {
    if (dir) { const { unlink } = await import("node:fs/promises"); await unlink(`${dir}/${path.replace(/\//g, "--")}`); return; }
    await del(path);
  } catch { /* already gone */ }
}

export const getList = (c: BrClient) => readJson<BrList>(listPath(c));
export const saveList = (c: BrClient, l: BrList) => writeJson(listPath(c), l);
export const getMembers = async (c: BrClient) => (await readJson<BrMember[]>(membersPath(c))) ?? [];
export const saveMembers = (c: BrClient, m: BrMember[]) => writeJson(membersPath(c), m);
export async function getResponses(c: BrClient, id: string): Promise<BrResponses> {
  return (await readJson<BrResponses>(respPath(c, id))) ?? { memberId: id, answers: {}, updatedAt: "" };
}
export const saveResponses = (c: BrClient, r: BrResponses) => writeJson(respPath(c, r.memberId), r);
export const deleteResponses = (c: BrClient, id: string) => remove(respPath(c, id));
