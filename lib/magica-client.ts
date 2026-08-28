// Thin client for calling Magica's public REST API (https://magica.com/docs/)
// from server-side code. Used by /api/research-pdf-import to run the
// document-understanding model that extracts structured profile data from a
// wealth-screening PDF (DonorAtlas). Requires MAGICA_API_KEY to be set as a
// Vercel environment variable -- generate one in the Magica app under
// Settings -> API Keys -> Manage, then add it in Vercel Project Settings ->
// Environment Variables (do not commit the key to the repo).

const MAGICA_BASE = "https://inference.magica.com/v1";

type MagicaModelSummary = {
  nodeType: string;
  category?: string;
  name?: string;
  subModels?: { subModelId: string }[];
};

let modelsCache: MagicaModelSummary[] | null = null;

async function magicaFetch(path: string, init?: RequestInit) {
  const apiKey = process.env.MAGICA_API_KEY;
  if (!apiKey) {
    throw new Error("MAGICA_API_KEY is not configured on the server.");
  }
  const res = await fetch(`${MAGICA_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  return res;
}

async function listModels(): Promise<MagicaModelSummary[]> {
  if (modelsCache) return modelsCache;
  const res = await magicaFetch("/models");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to list Magica models (${res.status}): ${body}`);
  }
  const models: MagicaModelSummary[] = await res.json();
  modelsCache = models;
  return models;
}

// Resolves a preferred model identifier to the {nodeType, subModelId} pair
// needed for POST /v1/nodes/{nodeType}/run. Tries an exact match first
// (against nodeType or any subModels[].subModelId), then falls back to a
// fuzzy keyword match (all keywords must appear, case-insensitively, in
// either the nodeType or the subModelId) -- this keeps the integration
// working even if the exact model naming used by Magica's public API
// catalog differs slightly from an internal reference name, without
// needing a code change every time Magica renames or versions a model.
async function resolveModel(
  preferredId: string,
  fuzzyKeywords: string[]
): Promise<{ nodeType: string; subModelId?: string }> {
  const models = await listModels();

  for (const model of models) {
    if (model.nodeType === preferredId) return { nodeType: model.nodeType };
    for (const sub of model.subModels || []) {
      if (sub.subModelId === preferredId) {
        return { nodeType: model.nodeType, subModelId: sub.subModelId };
      }
    }
  }

  const lowerKeywords = fuzzyKeywords.map((k) => k.toLowerCase());
  const candidates: { nodeType: string; subModelId?: string; id: string }[] = [];
  for (const model of models) {
    const nodeMatches = lowerKeywords.every((k) => model.nodeType.toLowerCase().includes(k));
    if (nodeMatches) candidates.push({ nodeType: model.nodeType, id: model.nodeType });
    for (const sub of model.subModels || []) {
      const subMatches = lowerKeywords.every((k) => sub.subModelId.toLowerCase().includes(k));
      if (subMatches) candidates.push({ nodeType: model.nodeType, subModelId: sub.subModelId, id: sub.subModelId });
    }
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const diagnostic = candidates.length > 1
    ? `Multiple possible matches found: ${candidates.map((c) => c.id).join(", ")}.`
    : `No model matched "${preferredId}" or keywords [${fuzzyKeywords.join(", ")}]. Available models with "gemini" or "media-understanding" in their name: ${models
        .flatMap((m) => [m.nodeType, ...((m.subModels || []).map((s) => s.subModelId))])
        .filter((id) => /gemini|media.?understanding/i.test(id))
        .join(", ") || "(none found)"}`;
  throw new Error(`Could not resolve a Magica model for "${preferredId}". ${diagnostic}`);
}

export async function runMagicaModel(
  subModelId: string,
  input: Record<string, unknown>,
  opts: { pollIntervalMs?: number; maxAttempts?: number; fuzzyKeywords?: string[] } = {}
): Promise<any> {
  const fuzzyKeywords = opts.fuzzyKeywords || subModelId.split(/[\/\-.]/).filter(Boolean);
  const resolved = await resolveModel(subModelId, fuzzyKeywords);

  const startRes = await magicaFetch(`/nodes/${resolved.nodeType}/run`, {
    method: "POST",
    body: JSON.stringify({ subModelId: resolved.subModelId ?? subModelId, input }),
  });
  if (!startRes.ok) {
    const body = await startRes.text().catch(() => "");
    throw new Error(`Magica run failed to start (${startRes.status}): ${body}`);
  }
  const { runId } = await startRes.json();
  if (!runId) {
    throw new Error("Magica run did not return a runId.");
  }

  const terminal = new Set(["COMPLETED", "FAILED", "CANCELED"]);
  const pollIntervalMs = opts.pollIntervalMs ?? 2000;
  const maxAttempts = opts.maxAttempts ?? 60;

  let run: any = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pollRes = await magicaFetch(`/nodes/runs/${runId}`);
    if (!pollRes.ok) {
      throw new Error(`Magica run lookup failed (${pollRes.status}).`);
    }
    run = await pollRes.json();
    if (terminal.has(run.status)) break;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  if (!run || !terminal.has(run.status)) {
    throw new Error("The PDF import timed out before Magica finished processing it.");
  }
  if (run.status !== "COMPLETED") {
    throw new Error(`Magica run ended with status ${run.status}: ${JSON.stringify(run.error ?? "")}`);
  }
  return run.output ?? run.response ?? run;
}
