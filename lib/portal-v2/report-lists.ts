import { NextRequest, NextResponse } from "next/server";
import { engageCall } from "@/lib/portal-v2/server";
import { FIELD_BY_ID, OPS, TOP_MAX, queryErrors, type ReportQuery } from "@/lib/portal-v2/report-fields";
import type { PortalClient } from "@/lib/portal-v2/clients";

export interface SharedReportList { id: number; name: string; query: ReportQuery; version: number; created_by: string; created_at: string; updated_by: string; updated_at: string }
export type EngageCaller = (client: PortalClient, op: string, body: Record<string, unknown>) => Promise<{ status: number; body: Record<string, unknown> }>;
class Bad extends Error {}

/** Strict (not forgiving) check for a list being saved: unknown fields/operators are rejected, never silently dropped. */
export function strictSavedQuery(raw: unknown): ReportQuery {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Bad("A report definition is required.");
  const r = raw as Record<string, unknown>;
  const extra = Object.keys(r).filter((k) => !["fields", "filters", "search", "sort", "top"].includes(k));
  if (extra.length) throw new Bad(`Unknown report setting: ${extra[0].slice(0, 40)}`);
  if (!Array.isArray(r.fields) || !r.fields.length) throw new Bad("Choose at least one field.");
  const fields = r.fields.map(String);
  const unknown = [...fields, ...(Array.isArray(r.filters) ? r.filters.map((f) => String((f as { field?: unknown })?.field)) : []), ...(r.sort ? [String((r.sort as { field?: unknown }).field)] : [])].filter((f) => !FIELD_BY_ID.has(f));
  if (unknown.length) throw new Bad(`Unknown field: ${unknown[0].slice(0, 40)}`);
  if (new Set(fields).size !== fields.length) throw new Bad("A field is listed twice.");
  if (r.filters !== undefined && (!Array.isArray(r.filters) || r.filters.length > 20)) throw new Bad("At most 20 filters.");
  const filters = ((r.filters as unknown[]) ?? []).map((x) => {
    const f = x as Record<string, unknown>;
    if (!(String(f.op) in OPS)) throw new Bad("Unknown filter condition.");
    if (f.value !== undefined && (typeof f.value !== "string" || f.value.length > 200)) throw new Bad("Filter values must be text up to 200 characters.");
    return { field: String(f.field), op: f.op as keyof typeof OPS, ...(f.value !== undefined ? { value: f.value as string } : {}) };
  });
  if (r.search !== undefined && (typeof r.search !== "string" || r.search.length > 200)) throw new Bad("Search must be up to 200 characters.");
  let sort: ReportQuery["sort"];
  if (r.sort) { const s = r.sort as Record<string, unknown>; if (s.dir !== 1 && s.dir !== -1) throw new Bad("Bad sort direction."); sort = { field: String(s.field), dir: s.dir }; }
  if (r.top !== undefined && r.top !== null && !(Number.isInteger(r.top) && (r.top as number) >= 1 && (r.top as number) <= TOP_MAX)) throw new Bad(`Top rows must be 1 to ${TOP_MAX}.`);
  const q: ReportQuery = { fields, filters, search: (r.search as string) ?? "", ...(sort ? { sort } : {}), ...(r.top ? { top: r.top as number } : {}) };
  const errs = queryErrors(q);
  if (errs.length) throw new Bad(errs[0]);
  return q;
}

/**
 * GET lists · POST create (never overwrites; 409 on name clash) · PATCH rename/update with expectedVersion (409 on conflict)
 * · DELETE with expectedVersion. Each client route passes its own auth; the client is fixed server-side, never from the body.
 */
export function reportListsRoute(client: PortalClient, auth: (r: NextRequest) => Promise<boolean>, call: EngageCaller = engageCall) {
  const forward = async (op: string, body: Record<string, unknown>) => {
    let res;
    try { res = await call(client, op, body); }
    catch { return NextResponse.json({ error: "Saved lists are unavailable right now. Nothing was changed; please try again shortly." }, { status: 503 }); }
    const { status, body: b } = res;
    if (status >= 500) return NextResponse.json({ error: "Saved lists are unavailable right now. Nothing was changed; please try again shortly." }, { status: 503 });
    return NextResponse.json(b, { status, headers: { "cache-control": "no-store" } });
  };
  const handler = (method: "GET" | "POST" | "PATCH" | "DELETE") => async (req: NextRequest) => {
    if (!(await auth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (method === "GET") return forward("listReportLists", {});
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b || typeof b !== "object") return NextResponse.json({ error: "Bad request" }, { status: 400 });
    try {
      const by = typeof b.by === "string" ? b.by.trim() : "";
      if (!by || by.length > 200) throw new Bad("Enter your name (up to 200 characters) so others can see who saved this list.");
      const base = { by };
      const idv = () => { const id = Number(b.id), v = Number(b.expectedVersion); if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(v) || v < 1) throw new Bad("List id and version are required."); return { id, expectedVersion: v }; };
      const name = () => { const n = typeof b.name === "string" ? b.name.replace(/\s+/g, " ").trim() : ""; if (!n || n.length > 80) throw new Bad("List name is required (up to 80 characters)."); return n; };
      if (method === "POST") {
        const importKey = b.importKey === undefined ? undefined : String(b.importKey);
        if (importKey !== undefined && !/^[A-Za-z0-9_-]{1,64}$/.test(importKey)) throw new Bad("Bad import key.");
        return forward("createReportList", { ...base, name: name(), query: strictSavedQuery(b.query), ...(importKey ? { importKey } : {}) });
      }
      if (method === "PATCH") {
        if (b.name === undefined && b.query === undefined) throw new Bad("Nothing to update.");
        return forward("updateReportList", { ...base, ...idv(), ...(b.name !== undefined ? { name: name() } : {}), ...(b.query !== undefined ? { query: strictSavedQuery(b.query) } : {}) });
      }
      return forward("deleteReportList", { ...base, ...idv() });
    } catch (e) {
      if (e instanceof Bad) return NextResponse.json({ error: e.message, code: "invalid" }, { status: 400 });
      throw e;
    }
  };
  return { GET: handler("GET"), POST: handler("POST"), PATCH: handler("PATCH"), DELETE: handler("DELETE") };
}
