// Browser-side save call for the CSV updater. A rejected fetch / unreadable reply is NEVER treated as "not saved":
// it becomes "unconfirmed" carrying the preview's requestId so staff use Check status instead of uploading again.
export type ApplyOutcome =
  | { kind: "saved"; body: Record<string, any> }
  | { kind: "rejected"; error: string; body: Record<string, any> }
  | { kind: "unconfirmed"; requestId: string; error: string };

export async function postApply(fetchFn: typeof fetch, body: Record<string, unknown>, requestId: string): Promise<ApplyOutcome> {
  const MSG = "No confirmation came back. The save may or may not have happened. Use Check status; do not upload again.";
  const unconfirmed = (): ApplyOutcome => ({ kind: "unconfirmed", requestId, error: MSG });
  let r: Response;
  try { r = await fetchFn("/api/research-csv-updates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  catch { return unconfirmed(); }
  let j: Record<string, any>;
  try { j = await r.json(); } catch { return unconfirmed(); }
  if (j?.unconfirmed || r.status >= 500) return { kind: "unconfirmed", requestId: String(j?.requestId || requestId), error: j?.error || MSG };
  if (!r.ok) return { kind: "rejected", error: j?.error || "Not saved", body: j };
  return { kind: "saved", body: j };
}
