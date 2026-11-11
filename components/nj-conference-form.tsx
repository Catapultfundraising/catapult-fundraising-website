"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NJ_CUTOFF, NJ_SERVICES } from "@/lib/nj-conference";

const inputClass = "mt-2 min-h-12 w-full rounded-md border border-[rgb(var(--line))] bg-white px-3 py-3 text-base text-[rgb(var(--navy))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--navy))]";

export function NjConferenceForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [closed, setClosed] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const check = () => setClosed(Date.now() >= Date.parse(NJ_CUTOFF));
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (success || error) {
      notice.current?.focus({ preventScroll: true });
      notice.current?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [success, error]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/nj-conference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(data.entries()),
          marketingConsent: data.get("marketingConsent") === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        setError(result.error || "We could not confirm your entry. Please try again.");
        if (response.status === 410) setClosed(true);
      } else setSuccess(true);
    } catch {
      setError("We could not confirm your entry. Please retry with the same email.");
    } finally { setBusy(false); }
  }

  if (success) return (
    <div ref={notice} tabIndex={-1} role="status" className="rounded-2xl border border-[rgb(var(--brass))] bg-white p-6 sm:p-8">
      <h2 className="font-display text-3xl text-[rgb(var(--navy))]">You&apos;re entered!</h2>
      <p className="mt-4 leading-relaxed">Your entry is saved for the $50 Starbucks gift card drawing on November 12 at 3:15 p.m. Eastern.</p>
      <p className="mt-3 text-sm">One entry per email. Repeat submissions do not add chances. We&apos;ll use the winner&apos;s contact details to arrange the prize.</p>
    </div>
  );

  return (
    <form onSubmit={submit} data-hs-do-not-collect="true" className="space-y-5 rounded-2xl border border-[rgb(var(--line))] bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Enter the giveaway</h2>
      <p className="text-sm">Required fields are marked *. No purchase necessary.</p>
      {error && <div ref={notice} tabIndex={-1} role="alert" className="border-l-4 border-[rgb(var(--navy))] bg-[rgb(var(--paper))] p-4">{error}</div>}
      {closed && <p role="status" className="font-semibold">Entries are closed. Thank you for visiting us!</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold" htmlFor="nj-first">First name *<input className={inputClass} id="nj-first" name="firstName" required maxLength={80} autoComplete="given-name" /></label>
        <label className="text-sm font-semibold" htmlFor="nj-last">Last name *<input className={inputClass} id="nj-last" name="lastName" required maxLength={80} autoComplete="family-name" /></label>
      </div>
      <label className="block text-sm font-semibold" htmlFor="nj-email">Email *<input className={inputClass} id="nj-email" name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label className="block text-sm font-semibold" htmlFor="nj-org">Organization *<input className={inputClass} id="nj-org" name="organization" required maxLength={160} autoComplete="organization" /></label>
      <label className="block text-sm font-semibold" htmlFor="nj-phone">Phone <span className="font-normal">(optional)</span><input className={inputClass} id="nj-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" /></label>
      <label className="block text-sm font-semibold" htmlFor="nj-service">What would you like to learn about? <span className="font-normal">(optional)</span>
        <select className={inputClass} id="nj-service" name="serviceInterest" defaultValue="">
          <option value="">Choose a service, if you like</option>
          {NJ_SERVICES.map(service => <option key={service}>{service}</option>)}
        </select>
      </label>
      <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2 text-sm leading-relaxed">
        <input type="checkbox" name="marketingConsent" className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--navy))]" />
        <span>Yes, email me Catapult Fundraising news and service information. <strong>Optional, not required to enter.</strong> You can unsubscribe at any time.</span>
      </label>
      <div className="hidden" aria-hidden="true"><label htmlFor="nj-website">Leave blank</label><input id="nj-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
      <button disabled={busy || closed} type="submit" className="min-h-14 w-full rounded-md bg-[rgb(var(--navy))] px-5 py-4 text-base font-bold text-white transition hover:bg-[rgb(var(--navy-deep))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--navy))] disabled:cursor-not-allowed disabled:opacity-60">
        {closed ? "Entries closed" : busy ? "Saving your entry…" : "Enter to win"}
      </button>
      <p className="text-xs leading-relaxed">We use your details to administer this giveaway. Choosing a service does not subscribe you to marketing. See our <Link href="/data-privacy" className="underline underline-offset-2">privacy policy</Link>.</p>
    </form>
  );
}
