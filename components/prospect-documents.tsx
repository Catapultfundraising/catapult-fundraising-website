"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { FileText, Upload, ExternalLink } from "lucide-react";
import type { PortalClient } from "@/lib/portal-v2/clients";

type Doc = { id: number; cptid: number; filename: string; bytes: number; uploaded_by: string; uploaded_at: string };
type Queue = { name: string; status: string; failed?: boolean };
const LIMIT = 20 * 1024 * 1024;
const size = (n: number) => n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(n / 1024))} KB`;
async function jsonResponse(r: Response) {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Could not save the PDF. Please try again.");
  return j;
}
export function ProspectDocuments({ client, cptid }: { client: PortalClient; cptid: number }) {
  const api = `/api/${client}-data-documents`;
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<Queue[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const scope = useRef("");
  scope.current = `${client}:${cptid}`;
  const load = useCallback(async () => {
    const key = `${client}:${cptid}`;
    try {
      const j = await jsonResponse(await fetch(`${api}?cptid=${cptid}`, { cache: "no-store" }));
      if (scope.current === key) { setDocs(j.documents); setError(""); }
    } catch (e) {
      if (scope.current === key) setError((e as Error).message);
    } finally { if (scope.current === key) setLoading(false); }
  }, [api, client, cptid]);
  useEffect(() => {
    setDocs([]); setLoading(true); setError(""); setQueue([]);
    setBy(localStorage.getItem(`${client}-by`) ?? "");
    void load();
  }, [client, cptid, load]);
  async function save(files: File[]) {
    if (!files.length) return;
    const key = `${client}:${cptid}`, uploader = by.trim();
    if (!uploader) { setError("Enter your name before uploading."); return; }
    localStorage.setItem(`${client}-by`, uploader);
    setBusy(true); setError(""); setQueue(files.map((f) => ({ name: f.name, status: "Waiting" })));
    const mark = (i: number, status: string, failed = false) => {
      if (scope.current === key) setQueue((q) => q.map((x, n) => n === i ? { ...x, status, failed } : x));
    };
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        try {
          if (!/\.pdf$/i.test(f.name)) throw new Error("Only PDF files are accepted.");
          if (!f.size || f.size > LIMIT) throw new Error("Choose a PDF up to 20 MB.");
          const header = new TextDecoder().decode(await f.slice(0, 1024).arrayBuffer());
          if (!header.includes("%PDF-")) throw new Error("This file is not a valid PDF.");
          mark(i, "Uploading…");
          const intent = await jsonResponse(await fetch(api, { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ op: "prepare", cptid, filename: f.name, by: uploader }) }));
          const blob = await upload(intent.pathname, f, { access: "private", handleUploadUrl: api,
            clientPayload: JSON.stringify({ cptid, filename: f.name, by: uploader }), contentType: "application/pdf",
            multipart: f.size > 4 * 1024 * 1024 });
          mark(i, "Saving to record…");
          await jsonResponse(await fetch(api, { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ op: "complete", cptid, pathname: blob.pathname, filename: f.name, by: uploader }) }));
          mark(i, "Saved");
        } catch (e) { mark(i, (e as Error).message, true); }
      }
      if (scope.current === key) await load();
    } finally {
      if (scope.current === key) setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <section className="mb-4 rounded-xl border border-[rgb(var(--line))] bg-white p-4" aria-label="PDF notes">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-lg text-[rgb(var(--navy))]">PDF notes</h4>
          <p className="mt-1 text-xs text-[rgb(var(--ink))]/60">Keep meeting notes and other PDFs with this prospect. Select one or several files, up to 20 MB each.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs">Your name
            <input value={by} maxLength={200} disabled={busy} onChange={(e) => setBy(e.target.value)}
              className="ml-2 rounded-md border border-[rgb(var(--line))] px-2 py-1.5" />
          </label>
          <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="sr-only" tabIndex={-1}
            aria-label="Choose PDF notes" disabled={busy} onChange={(e) => void save(Array.from(e.target.files ?? []))} />
          <button disabled={busy || !by.trim()} onClick={() => input.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[rgb(var(--navy))] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" />{busy ? "Uploading…" : "Upload PDF"}
          </button>
        </div>
      </div>
      {error && <div role="alert" className="mt-3 text-sm text-[rgb(var(--navy))]">{error} <button onClick={() => void load()} className="underline">Retry loading</button></div>}
      {queue.length > 0 && <ul aria-live="polite" className="mt-3 space-y-1 text-xs">
        {queue.map((q, i) => <li key={i} className={q.failed ? "font-medium" : ""}>{q.name}: {q.status}</li>)}
      </ul>}
      {loading ? <p className="mt-3 text-sm">Loading PDFs…</p> : !docs.length && !error ? <p className="mt-3 text-sm text-[rgb(var(--ink))]/55">No PDFs uploaded yet.</p> : null}
      {docs.length > 0 && <ul className="mt-3 divide-y divide-[rgb(var(--line))]">
        {docs.map((d) => <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
          <FileText className="h-5 w-5 shrink-0 text-[rgb(var(--brass))]" />
          <div className="min-w-0 flex-1">
            <a href={`${api}?cptid=${cptid}&id=${d.id}`} target="_blank" rel="noopener noreferrer" className="break-words text-sm font-medium text-[rgb(var(--navy))] underline">{d.filename}</a>
            <p className="mt-1 text-xs text-[rgb(var(--ink))]/55">{size(d.bytes)} · {new Date(d.uploaded_at).toLocaleString()} · {d.uploaded_by}{d.cptid !== cptid ? ` · From merged record ${d.cptid}` : ""}</p>
          </div>
          <a href={`${api}?cptid=${cptid}&id=${d.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${d.filename}`}
            className="inline-flex items-center gap-1 text-xs text-[rgb(var(--navy))]"><ExternalLink className="h-3.5 w-3.5" />Open PDF</a>
        </li>)}
      </ul>}
    </section>
  );
}
