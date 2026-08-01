"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Trash2, FileText, Loader2 } from "lucide-react";

interface CaseIndexEntry {
  id: string;
  clientName: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function ClientCasesPage() {
  const [cases, setCases] = useState<CaseIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clientName, setClientName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client-cases", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load client cases.");
      const json = await res.json();
      setCases(json.cases || []);
    } catch (err: any) {
      setError(err?.message || "Something went wrong loading client cases.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(file: File) {
    if (!clientName.trim()) {
      alert("Enter a client/organization name before uploading.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("clientName", clientName.trim());
      form.append("file", file);
      const res = await fetch("/api/client-cases", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed.");
      setClientName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch {
      alert("Could not upload this case for support. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove the case for support for "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/client-cases/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete.");
      setCases((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Could not delete this file. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
      <Link
        href="/research"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--ink))]/50 hover:text-[rgb(var(--navy))]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        My Profiles
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Internal Tool
          </p>
          <h1 className="mt-1 font-display text-3xl text-[rgb(var(--navy))]">Client Case Library</h1>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/60">
        Securely store each client&rsquo;s case for support here. These documents will later be read
        automatically to generate donor ask strategies by comparing a prospect&rsquo;s intelligence
        profile against the client&rsquo;s case for support.
      </p>

      <div className="mt-6 rounded-2xl border border-[rgb(var(--line))] bg-[rgb(var(--paper))] p-5">
        <label className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Client / Organization Name
        </label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="e.g., Segerstrom Center for the Arts"
          className="mt-1.5 w-full rounded-lg border border-[rgb(var(--line))] px-3 py-2 text-sm text-[rgb(var(--ink))] outline-none focus:border-[rgb(var(--brass))]"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))] disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Upload Case for Support (PDF)"}
        </button>
      </div>

      <div className="mt-8">
        {loading && <p className="text-sm text-[rgb(var(--ink))]/50">Loading client cases...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && cases.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[rgb(var(--line))] px-6 py-14 text-center">
            <p className="text-sm text-[rgb(var(--ink))]/50">
              No case-for-support documents uploaded yet.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {cases.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[rgb(var(--line))] p-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <FileText className="h-5 w-5 flex-shrink-0 text-[rgb(var(--brass))]" />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-[rgb(var(--navy))]">{c.clientName}</p>
                  <p className="mt-0.5 truncate text-xs text-[rgb(var(--ink))]/45">
                    {c.fileName} &middot; {formatBytes(c.fileSize)} &middot; Uploaded{" "}
                    {new Date(c.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/client-cases/${c.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--line))] px-4 py-2 text-xs font-semibold text-[rgb(var(--navy))] hover:border-[rgb(var(--brass))]"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id, c.clientName)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-2 text-xs font-semibold text-red-600/70 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
