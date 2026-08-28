// Thin client for calling Magica's public REST API (https://magica.com/docs/)
// from server-side code. Used by the PDF import routes to start and poll a
// document-understanding model run. Requires MAGICA_API_KEY to be set as a
// Vercel environment variable -- generate one in the Magica app under
// Settings -> API Keys -> Manage, then add it in Vercel Project Settings ->
// Environment Variables (do not commit the key to the repo).
//
// Deliberately split into startMagicaRun()/getMagicaRunStatus() rather than
// one blocking call: a single HTTP request/response that stays open for the
// 1-3 minutes a large-document model call can take is fragile against
// gateway/proxy idle timeouts. Starting the run and letting the caller poll
// a lightweight status endpoint keeps every individual request fast.

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
// fuzzy keyword match so the integration keeps working even if Magica's
// public catalog naming differs slightly from a hardcoded reference name.
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

// Starts a Magica model run and returns immediately with the runId --
// does NOT wait for completion. Fast (well under a second beyond the
// one-time /models lookup), so this is safe to call from a normal
// request/response cycle.
export async function startMagicaRun(
  subModelId: string,
  input: Record<string, unknown>,
  opts: { fuzzyKeywords?: string[] } = {}
): Promise<{ runId: string; nodeType: string }> {
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
  return { runId, nodeType: resolved.nodeType };
}

// Checks the current status of a previously-started run. A single fast
// call -- the caller is responsible for polling this on an interval.
export async function getMagicaRunStatus(runId: string): Promise<any> {
  const pollRes = await magicaFetch(`/nodes/runs/${runId}`);
  if (!pollRes.ok) {
    throw new Error(`Magica run lookup failed (${pollRes.status}).`);
  }
  return pollRes.json();
}
