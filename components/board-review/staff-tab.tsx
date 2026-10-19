"use client";
import { useEffect, useState } from "react";

// True only when the viewer has an employee dashboard login for that client.
export function useBoardReviewStaff(client: string) {
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    let on = true;
    fetch(`/api/board-review/staff?client=${client}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { staff: false }))
      .then((j) => on && setStaff(!!j.staff))
      .catch(() => {});
    return () => { on = false; };
  }, [client]);
  return staff;
}

// Shown on the Prospect Ratings tab when the viewer came in another way (e.g. research login).
export function StaffSignIn({ client }: { client: string }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch(`/api/${client}-data-login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) window.location.reload(); else setErr("That password didn't work. Use the employee dashboard password for this client.");
  }
  return (
    <form onSubmit={go} className="mx-auto mt-10 max-w-md rounded-xl border border-[rgb(var(--line))] bg-white p-6">
      <h2 className="font-serif text-xl text-[rgb(var(--navy))]">Staff sign-in</h2>
      <p className="mt-2 text-sm text-[rgb(var(--ink))]/70">Prospect Ratings is for Catapult staff. Enter this client&rsquo;s employee dashboard password to open it.</p>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-4 w-full rounded border border-[rgb(var(--line))] px-3 py-2" placeholder="Employee password" />
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      <button className="mt-4 rounded bg-[rgb(var(--navy))] px-4 py-2 text-sm text-white">Sign in</button>
    </form>
  );
}
