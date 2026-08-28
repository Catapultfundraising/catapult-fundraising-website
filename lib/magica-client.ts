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
  subModels?: { subModelId: string }[];
};

let nodeTypeCache: Map<string, string> | null = null;

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

// Resolves a subModelId (e.g. "google/gemini-3.1-pro-preview") to the
// nodeType its /run endpoint lives under, by listing all models once per
// warm server instance and caching the mapping.
async function resolveNodeType(subModelId: string): Promise<string> {
  if (nodeTypeCache?.has(subModelId)) {
    return nodeTypeCache.get(subModelId)!;
  }
  const res = await magicaFetch("/models");
  if (!res.ok) {
    throw new Error(`Failed to list Magica models (${res.status}).`);
  }
  const models: MagicaModelSummary[] = await res.json();
  const map = new Map<string, string>();
  for (const model of models) {
    // Some models are addressed directly by nodeType (single-mode models);
    // others expose multiple subModels under one nodeType.
    map.set(model.nodeType, model.nodeType);
    for (const sub of model.subModels || []) {
      map.set(sub.subModelId, model.nodeType);
    }
  }
  nodeTypeCache = map;
  const nodeType = map.get(subModelId);
  if (!nodeType) {
    throw new Error(`Could not find a Magica model matching "${subModelId}".`);
  }
  return nodeType;
}

export async function runMagicaModel(
  subModelId: string,
  input: Record<string, unknown>,
  opts: { pollIntervalMs?: number; maxAttempts?: number } = {}
): Promise<any> {
  const nodeType = await resolveNodeType(subModelId);

  const startRes = await magicaFetch(`/nodes/${nodeType}/run`, {
    method: "POST",
    body: JSON.stringify({ subModelId, input }),
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
    throw new Error(`Magica run ended with status ${run.status}.`);
  }
  return run.output ?? run.response ?? run;
}
