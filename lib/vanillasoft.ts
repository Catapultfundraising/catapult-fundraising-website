// ---------------------------------------------------------------------------
// Minimal VanillaSoft Public API client.
//
// VanillaSoft is the calling CRM every Catapult feasibility-study and calling
// program runs in, so it is the system of record for dials, emails, interview
// outcomes and the survey answers captured on each call. This client is what
// lets a study portal (e.g. /jag-dashboard) build itself straight from that
// data instead of from a weekly PDF upload.
//
// Auth quirks worth knowing (verified against the live API, Sept 2026):
//   - The header is `Authorization: APIKey=<key>`, NOT Bearer.
//   - Every path lives under /WSPubAPI/.
//   - GetCallHistory accepts a maximum 7-day window per request, so a full
//     project history has to be pulled in weekly slices. It has no lookback
//     limit: you can pull back to the project's first call.
//   - Contacts accepts `modified_after` only inside roughly the last 30 days.
//     Older dates return HTTP 400 with an empty body. That is why the sync
//     keeps its own accumulated contact store rather than re-pulling history.
// ---------------------------------------------------------------------------

const API_ROOT = "https://vanillasoft.net/WSPubAPI";

export interface VsCustomField {
  name: string;
  value: string;
  data_type?: number;
}

export interface VsContact {
  contact_id: number;
  project_id: number;
  added_date_time_utc: string;
  modified_date_time_utc: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  title?: string;
  email?: string;
  company?: string;
  team?: string;
  deleted?: boolean;
  scheduled_call_date_time?: string | null;
  custom_fields?: VsCustomField[];
}

export interface VsCallRecord {
  contact_id: number;
  project_id: number;
  call_date_time_utc: string;
  result_code: string;
  result_group?: string;
  user_name?: string;
  talk_time?: number;
  deleted?: boolean;
}

function apiKey(): string {
  const key = process.env.VANILLASOFT_API_KEY;
  if (!key) throw new Error("VANILLASOFT_API_KEY is not set");
  return key;
}

async function vsGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${API_ROOT}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url, {
    headers: { Authorization: `APIKey=${apiKey()}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`VanillaSoft ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 19);
}

/**
 * Pulls call history for a project between two dates, automatically slicing
 * the range into the 7-day windows the API allows and stitching the results
 * back together. Deleted rows are dropped.
 */
export async function fetchCallHistory(projectId: number, start: Date, end: Date): Promise<VsCallRecord[]> {
  const rows: VsCallRecord[] = [];
  const seen = new Set<string>();
  let windowStart = new Date(start);

  while (windowStart < end) {
    const windowEnd = new Date(Math.min(windowStart.getTime() + 7 * 864e5, end.getTime()));
    const data = await vsGet<{ call_histories?: VsCallRecord[] }>("GetCallHistory", {
      project_id: projectId,
      start: isoDate(windowStart),
      end: isoDate(windowEnd),
      limit: 20000,
    });
    for (const r of data.call_histories ?? []) {
      if (r.deleted) continue;
      // Adjacent windows share a boundary instant; de-dupe defensively.
      const key = `${r.contact_id}|${r.call_date_time_utc}|${r.result_code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(r);
    }
    windowStart = windowEnd;
  }

  rows.sort((a, b) => a.call_date_time_utc.localeCompare(b.call_date_time_utc));
  return rows;
}

/**
 * Pulls contacts (with custom fields) modified since a given date. Because of
 * the API's ~30-day lookback ceiling, `since` is clamped to 28 days ago.
 */
export async function fetchContacts(projectId: number, since?: Date): Promise<VsContact[]> {
  const floor = new Date(Date.now() - 28 * 864e5);
  const from = !since || since < floor ? floor : since;

  const data = await vsGet<{ contacts?: VsContact[] }>("Contacts", {
    project_id: projectId,
    modified_after: isoDate(from),
    limit: 5000,
    custom_fields: 1,
  });
  return (data.contacts ?? []).filter((c) => !c.deleted);
}

export function customField(contact: VsContact, name: string): string {
  return contact.custom_fields?.find((f) => f.name === name)?.value?.trim() ?? "";
}

export function contactName(contact: VsContact): string {
  return [contact.first_name, contact.last_name]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}
