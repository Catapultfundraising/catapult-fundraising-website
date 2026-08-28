// Thin server-only wrapper around the DonorAtlas Partners API
// (https://developer.donoratlas.com). The API key is read from the
// DONORATLAS_API_KEY environment variable and never touches the client --
// every call here MUST only be made from a Next.js API route (server), never
// from a "use client" component.

const BASE_URL = "https://api.donoratlas.com/v1/partners";

function getApiKey(): string {
  const key = process.env.DONORATLAS_API_KEY;
  if (!key) {
    throw new Error("DONORATLAS_API_KEY is not configured. Add it in Vercel's Environment Variables.");
  }
  return key;
}

async function daFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  // DonorAtlas can return an empty body on some error paths -- parse
  // defensively rather than letting a bare `res.json()` throw an opaque
  // "Unexpected end of JSON input" (the same class of bug we hit earlier
  // with the Magica API client).
  const rawText = await res.text().catch(() => "");
  let json: any = {};
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new Error(
        `DonorAtlas returned a non-JSON response (status ${res.status}, content preview: ${rawText.slice(0, 300)})`
      );
    }
  }
  if (!res.ok) {
    const detail = json?.detail || json?.message;
    throw new Error(detail || `DonorAtlas API error (status ${res.status})`);
  }
  return json;
}

export interface DonorSearchCandidate {
  id: string;
  name: string;
  bio: string;
  city: string;
  state: string;
  giving_capacity: number | null;
  net_worth_min: number | null;
  net_worth_max: number | null;
  liquidity_min: number | null;
  liquidity_max: number | null;
  primary_photo: string | null;
}

// Structured name+location search -- 1 DonorAtlas credit per call.
export async function searchDonors(params: {
  firstName: string;
  lastName: string;
  city?: string;
  state?: string;
}): Promise<DonorSearchCandidate[]> {
  const donor_description: any = {
    name: {
      first: params.firstName || undefined,
      last: params.lastName || undefined,
    },
  };
  if (params.city || params.state) {
    donor_description.locations = [
      {
        city: params.city || undefined,
        state: params.state || undefined,
      },
    ];
  }
  const body = await daFetch("/search", {
    method: "POST",
    body: JSON.stringify({ mode: "structured", donor_description, page_size: 10 }),
  });
  return Array.isArray(body?.results) ? body.results : [];
}

// Full donor profile lookup by ID -- 1 DonorAtlas credit per call.
export async function getDonorById(id: string): Promise<any> {
  const body = await daFetch(`/donors/${encodeURIComponent(id)}`, { method: "GET" });
  return body?.donor ?? body;
}
