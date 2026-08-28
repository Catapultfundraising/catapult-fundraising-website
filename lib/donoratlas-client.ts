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

// Parses a single-data-row CSV (as returned by the exports endpoint for a
// one-donor export) into a { header: value } map. Handles quoted fields
// containing commas (e.g. "$52,500") -- a naive split(",") would break on
// those, so this is a small hand-rolled RFC-4180-ish parser rather than a
// dependency, since we only ever need to parse our own single-row export.
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseCsvSingleRow(csvText: string): Record<string, string> {
  const lines = csvText.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.length < 2) return {};
  const headers = parseCsvLine(lines[0]);
  const values = parseCsvLine(lines[1]);
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h] = values[i] ?? "";
  });
  return row;
}

// Fields the `/donors/{id}` lookup does NOT return but the separate
// `/exports` endpoint does -- confirmed against the live DASpreadsheetFieldName
// enum: verified contact info (phone/email) and family relationships
// (spouse, parents, children) are only available through this endpoint.
const EXPORT_FIELDS = [
  "Verified Mobile Phone",
  "Best Verified Email",
  "Verified Personal Emails",
  "Verified Work Emails",
  "Other Emails",
  "Other Phones",
  "Religion",
  "Spouse",
  "Parents",
  "Children",
] as const;

// Pulls the fields above for a single donor via a 1-row CSV export -- 1
// DonorAtlas credit per call (on top of the 1 credit for getDonorById).
// Returns {} (rather than throwing) on any failure so a hiccup here never
// blocks the rest of the donor profile from loading.
export async function exportDonorFields(id: string): Promise<Record<string, string>> {
  try {
    const body = await daFetch("/exports", {
      method: "POST",
      body: JSON.stringify({
        source: { type: "ids", donor_ids: [id] },
        export_type: "csv",
        fields: EXPORT_FIELDS,
      }),
    });
    const url = body?.download_url;
    if (!url) return {};
    const res = await fetch(url);
    if (!res.ok) return {};
    const text = await res.text();
    return parseCsvSingleRow(text);
  } catch {
    return {};
  }
}
