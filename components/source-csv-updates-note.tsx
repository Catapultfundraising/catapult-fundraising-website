"use client";

import { useEffect, useState } from "react";

// Shared across the five client dashboards. Shows the latest ACCEPTED CSV updates per table as a separate note;
// it never replaces "Data updated" (legacy load date / unknown) and never claims a table or dashboard is fully refreshed.
type Note = { configured: boolean; summary?: string; rows?: { table: string; label: string }[] };
export function SourceCsvUpdatesNote({ client, dark = false }: { client: string; dark?: boolean }) {
  const [n, setN] = useState<Note | null>(null);
  useEffect(() => { fetch(`/api/${client}-data-v2?op=csvUpdates`).then((r) => (r.ok ? r.json() : null)).then(setN).catch(() => setN(null)); }, [client]);
  if (!n?.configured || !n.rows?.length) return null;
  return (
    <details className={`mt-1 text-xs ${dark ? "text-white/60" : "text-[rgb(var(--ink))]/50"}`}>
      <summary className="cursor-pointer">{n.summary}</summary>
      <ul className="mt-1">{n.rows.map((r) => <li key={r.table}>{r.table}: {r.label}</li>)}</ul>
    </details>
  );
}
