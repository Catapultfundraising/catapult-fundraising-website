"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

function JagAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/jag-admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/jag-admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Incorrect password.");
        setLoading(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-24">
      <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
            <Lock className="h-5 w-5 text-[rgb(var(--brass))]" />
          </span>
        </div>
        <h1 className="mt-4 text-center font-display text-2xl text-[rgb(var(--navy))]">
          JAG Data Update Tool
        </h1>
        <p className="mt-2 text-center text-sm text-[rgb(var(--ink))]/65">
          Internal use only — for the data manager updating the weekly report. This is not the
          client-facing dashboard.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              required
              className="w-full rounded-lg border border-[rgb(var(--line))] px-4 py-2.5 text-sm text-[rgb(var(--ink))] outline-none focus:border-[rgb(var(--brass))]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[rgb(var(--navy))] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--navy-deep))] disabled:opacity-60"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JagAdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <JagAdminLoginForm />
    </Suspense>
  );
}
