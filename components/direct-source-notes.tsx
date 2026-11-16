"use client";
import type { DirectFileStateNote } from "@/lib/portal-v2/directFileProtocol";
/** Separate immutable provenance lane. Never passed to mutable HistoryList/post/edit/delete. */
export function DirectSourceNotes({ record }: { record: unknown }) {
  const notes = (record as { directSourceNotes?: DirectFileStateNote[] })?.directSourceNotes;
  if (!notes?.length) return null;
  return <section className="mt-4 bg-[rgb(var(--paper))] p-4" aria-label="Imported source notes">
    <h3 className="font-display text-lg">Imported source notes — read only</h3>
    <p className="mb-3 text-xs">Separate from editable campaign history. Shared-login attribution is declared, not verified staff identity.</p>
    {notes.map(n => <article key={n.event_key} className="border-t border-[rgb(var(--line))] py-3 text-sm">
      <p className="whitespace-pre-wrap">{n.body}</p>
      <p className="mt-1 text-xs">{n.note_date} · {n.declared_actor} · {n.file_name} · source date {n.source_date}</p>
      <details className="text-xs"><summary>Source provenance</summary><p className="break-all">Request {n.request_id} · event {n.event_key} · SHA256 {n.file_digest} · template {n.template} · authority {n.authority_rev} · committed {n.committed_at}</p></details>
    </article>)}
  </section>;
}
