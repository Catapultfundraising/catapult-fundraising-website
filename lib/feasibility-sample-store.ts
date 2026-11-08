import { get } from "@vercel/blob";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SAMPLE_PREFIX, sampleAsset } from "./feasibility-sample";

export async function readSampleAsset(name: string): Promise<ReadableStream | null> {
  if (!sampleAsset(name)) return null;
  // Local QA only; disabled unconditionally on Vercel, even if accidentally configured.
  const local = !process.env.VERCEL && process.env.FEASIBILITY_SAMPLE_LOCAL_DIR;
  if (local) return new Response(new Uint8Array(await readFile(join(local, name)))).body;
  const blob = await get(`${SAMPLE_PREFIX}${name}`, { access: "private", useCache: false });
  return blob?.statusCode === 200 ? blob.stream : null;
}
