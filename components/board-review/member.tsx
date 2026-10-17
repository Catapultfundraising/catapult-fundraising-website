"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BR_CHOICES, type BrClient } from "@/lib/board-review/config";

type Entry = { cptid: number; name: string; city: string; state: string };
type Ans = { choice: string; other?: string };

export function BoardReviewMember({ client }: { client: BrClient }) {
  const [data, setData] = useState<{ clientName: string; member: { name: string }; entries: Entry[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, Ans>>({});
  const [status, setStatus] = useState("");
  const pending = useRef<Record<string, Ans>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/board-review/member", { cache: "no-store" }).then(async (r) => {
      if (r.status === 401) { window.location.href = `/${client}/data-dashboard/review/login`; return; }
      const j = await r.json(); setData(j); setAnswers(j.answers ?? {});
    });
  }, [client]);

  const flush = useCallback(async () => {
    const batch = pending.current; pending.current = {};
    if (!Object.keys(batch).length) return;
    setStatus("Saving...");
    try {
      const r = await fetch("/api/board-review/member", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: batch }) });
      if (!r.ok) throw new Error();
      setStatus(`All changes saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
    } catch {
      pending.current = { ...batch, ...pending.current };
      setStatus("Could not save. Check your connection; we will retry.");
      timer.current = setTimeout(flush, 5000);
    }
  }, []);
  useEffect(() => {
    const h = () => { if (Object.keys(pending.current).length) navigator.sendBeacon?.("/api/board-review/member", new Blob([JSON.stringify({ answers: pending.current })], { type: "application/json" })); };
    window.addEventListener("pagehide", h); return () => window.removeEventListener("pagehide", h);
  }, []);

  const update = (id: number, patch: Partial<Ans>, delay = 600) => {
    const k = String(id);
    setAnswers((prev) => {
      const next: Ans = { ...(prev[k] ?? { choice: "" }), ...patch };
      pending.current[k] = next;
      return { ...prev, [k]: next };
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  if (!data) return <main className="mx-auto max-w-3xl p-10 text-[#0E1E31]">Loading...</main>;
  const done = data.entries.filter((e) => answers[String(e.cptid)]?.choice).length;

  return (
    <main className="min-h-screen bg-[rgb(var(--paper))]">
      <header className="bg-[#0E1E31] px-6 py-8 text-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#B28C46]">{data.clientName} · Prepared by Catapult Fundraising</p>
            <h1 className="font-display mt-1 text-3xl">Prospect Review</h1>
            <p className="mt-1 text-sm text-white/70">Welcome, {data.member.name}. Your answers are private: only the Catapult team sees them.</p>
          </div>
          <button className="text-xs text-white/70 underline" onClick={async () => { await flush(); await fetch("/api/board-review/login", { method: "DELETE" }); window.location.href = `/${client}/data-dashboard/review/login`; }}>Sign out</button>
        </div>
      </header>
      <div className="sticky top-0 z-10 border-b border-[rgb(var(--line))] bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm text-[#0E1E31]">
          <span><b>{done}</b> of {data.entries.length} answered</span>
          <span className="text-[#0E1E31]/60">{status || "Answers save automatically. You can come back any time."}</span>
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-8">
        <p className="text-sm text-[#0E1E31]/80">For each prospect below, choose the option that best describes your relationship. Prospects are listed alphabetically by last name.</p>
        {!data.entries.length && <p className="rounded-xl border border-[rgb(var(--line))] bg-white p-6">The review list is not ready yet. Please check back soon.</p>}
        {data.entries.map((e, i) => {
          const a = answers[String(e.cptid)] ?? { choice: "" };
          const nm = `p${e.cptid}`;
          return (
            <section key={e.cptid} className="rounded-xl border border-[rgb(var(--line))] bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg text-[#0E1E31]"><span className="mr-2 text-sm text-[#B28C46]">{i + 1}.</span>{e.name}</h2>
              {(e.city || e.state) && <p className="text-sm text-[#0E1E31]/60">{[e.city, e.state].filter(Boolean).join(", ")}</p>}
              <fieldset className="mt-3 space-y-2">
                <legend className="sr-only">Your relationship with {e.name}</legend>
                {BR_CHOICES.map((c) => (
                  <label key={c.key} className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm ${a.choice === c.key ? "border-[#B28C46] bg-[#B28C46]/10" : "border-transparent hover:bg-[#F1ECE0]/60"}`}>
                    <input type="radio" name={nm} className="mt-0.5 accent-[#0E1E31]" checked={a.choice === c.key} onChange={() => update(e.cptid, { choice: c.key }, 300)} />
                    <span className="text-[#0E1E31]">{c.label}</span>
                  </label>
                ))}
                <input
                  aria-label={`Other notes for ${e.name}`}
                  className="ml-9 w-[calc(100%-2.25rem)] rounded-md border border-[rgb(var(--line))] px-3 py-1.5 text-sm outline-none focus:border-[#B28C46]"
                  placeholder="Optional: add a note"
                  value={a.other ?? ""}
                  onChange={(ev) => update(e.cptid, { other: ev.target.value, ...(a.choice ? {} : { choice: "O" }) }, 1200)}
                />
                {a.choice && <button className="ml-9 text-xs text-[#0E1E31]/50 hover:underline" onClick={() => update(e.cptid, { choice: "", other: "" }, 300)}>Clear my answer</button>}
              </fieldset>
            </section>
          );
        })}
      </div>
    </main>
  );
}
