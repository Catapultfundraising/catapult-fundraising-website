"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { BR_CLIENT_NAMES, type BrClient } from "@/lib/board-review/config";

export function BoardReviewLogin({ client }: { client: BrClient }) {
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [error, setError] = useState(""), [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const r = await fetch("/api/board-review/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client, email, password }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { setError(j.error || "Email or password is incorrect."); setLoading(false); return; }
    window.location.href = `/${client}/data-dashboard/review`;
  }
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-24">
      <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--line))] bg-white p-8 shadow-sm">
        <div className="flex justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0E1E31]/5"><Lock className="h-5 w-5 text-[#B28C46]" /></span></div>
        <h1 className="mt-4 text-center font-display text-2xl text-[#0E1E31]">Prospect Review</h1>
        <p className="mt-1 text-center text-xs uppercase tracking-[0.18em] text-[#B28C46]">{BR_CLIENT_NAMES[client]} · Prepared by Catapult Fundraising</p>
        <p className="mt-2 text-center text-sm text-[#0E1E31]/65">For board and committee members. Sign in with the email and password Catapult sent you.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input type="email" required autoFocus placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-[rgb(var(--line))] px-4 py-2.5 text-sm outline-none focus:border-[#B28C46]" />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-[rgb(var(--line))] px-4 py-2.5 text-sm outline-none focus:border-[#B28C46]" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#0E1E31] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">{loading ? "Checking..." : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}
