"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, FileEdit } from "lucide-react";

type ProfileStatus = "draft" | "sent_for_approval" | "approved";

interface ProfileIndexEntry {
  id: string;
  name: string;
  status: ProfileStatus;
  updatedAt: string;
  createdAt: string;
}

const STATUS_META: Record<ProfileStatus, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: "Draft", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  sent_for_approval: {
    label: "Sent for Approval",
    bg: "bg-[rgb(var(--brass))]/10",
    text: "text-[rgb(var(--brass))]",
    dot: "bg-[rgb(var(--brass))]",
  },
  approved: { label: "Approved", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-600" },
};

const TABS: Array<{ value: "all" | ProfileStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent_for_approval", label: "Sent for Approval" },
  { value: "approved", label: "Approved" },
];

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ResearchProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | ProfileStatus>("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research-profiles", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load profiles.");
      const json = await res.json();
      setProfiles(json.profiles || []);
    } catch (err: any) {
      setError(err?.message || "Something went wrong loading profiles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name || "this profile"}" from the list? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/research-profiles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete.");
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Could not delete this profile. Please try again.");
    }
  }

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (tab !== "all" && p.status !== tab) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [profiles, tab, search]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
            Internal Tool
          </p>
          <h1 className="mt-1 font-display text-3xl text-[rgb(var(--navy))]">My Prospect Profiles</h1>
        </div>
        <Link
          href="/research/new"
          className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[rgb(var(--brass))]"
        >
          <Plus className="h-4 w-4" />
          New Profile
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.value
                  ? "bg-[rgb(var(--navy))] text-white"
                  : "border border-[rgb(var(--line))] text-[rgb(var(--ink))]/60 hover:border-[rgb(var(--brass))]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--ink))]/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="rounded-full border border-[rgb(var(--line))] py-2 pl-9 pr-4 text-sm outline-none focus:border-[rgb(var(--brass))]"
          />
        </div>
      </div>

      <div className="mt-6">
        {loading && <p className="text-sm text-[rgb(var(--ink))]/50">Loading profiles...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[rgb(var(--line))] px-6 py-14 text-center">
            <p className="text-sm text-[rgb(var(--ink))]/50">
              {profiles.length === 0
                ? "No profiles saved yet. Click “New Profile” to get started."
                : "No profiles match your filters."}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((p) => {
            const meta = STATUS_META[p.status];
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[rgb(var(--line))] p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.bg} ${meta.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-display text-lg text-[rgb(var(--navy))]">
                    {p.name || "Untitled Prospect"}
                  </p>
                  <p className="mt-0.5 text-xs text-[rgb(var(--ink))]/45">Updated {timeAgo(p.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/research/new?id=${p.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--line))] px-4 py-2 text-xs font-semibold text-[rgb(var(--navy))] hover:border-[rgb(var(--brass))]"
                  >
                    <FileEdit className="h-3.5 w-3.5" />
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.name)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-2 text-xs font-semibold text-red-600/70 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
