"use client";
import { useState } from "react";
import { SAMPLE_PATH } from "@/lib/feasibility-sample";
export default function SampleLogin() {
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <section className="mx-auto max-w-lg px-6 py-20">
    <p className="text-sm font-semibold text-[rgb(var(--brass))]">For invited nonprofit leaders</p>
    <h1 className="mt-3 font-display text-4xl">A closer look at a feasibility study.</h1>
    <p className="mt-5 leading-relaxed">Explore our fictional sales sample, from findings to campaign recommendations. Use the sales-library password shared by your Catapult contact.</p>
    <form className="mt-8 space-y-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("");
      const form = e.currentTarget;
      try {
        const res = await fetch(`${SAMPLE_PATH}/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: new FormData(form).get("password") }) });
        if (!res.ok) { setError("Unable to unlock. Check the password or contact your Catapult representative."); return; }
        form.reset(); window.location.assign(SAMPLE_PATH);
      } catch { setError("Connection interrupted. Please try again."); }
      finally { setBusy(false); }
    }}>
      <label className="block font-semibold" htmlFor="sample-password">Sales-library password</label>
      <input id="sample-password" name="password" type="password" autoComplete="current-password" required maxLength={512} className="w-full border border-[rgb(var(--line))] bg-white px-4 py-3" />
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} className="bg-[rgb(var(--navy))] px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Checking…" : "Open the sample"}</button>
    </form>
    <p className="mt-8 text-sm">Fictional sales sample. Client and prospect identities and individual wealth capacities are fictionalized.</p>
  </section>;
}
