"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle, AlertCircle, BookOpen, Wrench, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackLeadSubmission } from "@/lib/analytics";

const FIELD_CLASS =
  "border-[rgb(var(--line))] bg-white text-[rgb(var(--navy))] placeholder:text-[rgb(var(--ink))]/30 focus-visible:ring-[rgb(var(--brass))] focus-visible:ring-offset-0";
const GOLD_BTN =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--brass))] px-8 py-4 text-base font-bold uppercase tracking-wide text-[rgb(var(--navy-deep))] shadow-lg shadow-[rgb(var(--brass))]/20 transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))] disabled:opacity-60";

export type ArticleCard = { slug: string; title: string; description: string; image: string; alt: string; readTime: string };
export type ToolCard = { href: string; title: string; description: string };

export function PartnerSignup(props: {
  partnerSlug: string;
  partnerName: string;
  bookingUrl: string;
  articles: ArticleCard[];
  tools: ToolCard[];
  serviceChoices?: string[];
  deck?: { href: string; title: string; description: string };
  eventWord?: string;
  readingList?: string;
}) {
  const eventWord = props.eventWord ?? "webinar";
  const storageKey = `catapult-partner-${props.partnerSlug}`;
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(storageKey)) setUnlocked(true);
  }, [storageKey]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const utm = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    setBusy(true);
    try {
      const res = await fetch("/api/partner-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner: props.partnerSlug,
          name: fd.get("name"),
          email: fd.get("email"),
          org: fd.get("org"),
          title: fd.get("title"),
          company: fd.get("company"),
          interests: fd.getAll("interests"),
          utm,
          startedAt,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Something went wrong. Please try again.");
        return;
      }
      trackLeadSubmission(`partner-${props.partnerSlug}`);
      localStorage.setItem(storageKey, "1");
      setUnlocked(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const bookBtn = (
    <a href={props.bookingUrl} target="_blank" rel="noopener noreferrer" className={GOLD_BTN}>
      <CalendarDays className="h-5 w-5" /> Schedule a meeting with Anthony
    </a>
  );

  if (!unlocked) {
    return (
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <h2 className="font-display text-3xl text-[rgb(var(--navy))]">Your {eventWord} resources</h2>
          <ul className="space-y-4 text-[rgb(var(--ink))]/80">
            {props.deck && <li className="flex gap-3"><Download className="mt-1 h-5 w-5 shrink-0 text-[rgb(var(--brass))]" />A downloadable PDF of the {eventWord} presentation.</li>}
            <li className="flex gap-3"><Wrench className="mt-1 h-5 w-5 shrink-0 text-[rgb(var(--brass))]" />Free tools for campaign planning, readiness, and donor loyalty.</li>
            <li className="flex gap-3"><BookOpen className="mt-1 h-5 w-5 shrink-0 text-[rgb(var(--brass))]" />{props.readingList ?? "A focused reading list on mid-level donors, annual giving, and legacy giving."}</li>
          </ul>
          <a href={props.bookingUrl} target="_blank" rel="noopener noreferrer" className={GOLD_BTN}>
            <CalendarDays className="h-5 w-5" /> Meet with Anthony
          </a>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
          <h2 className="font-display text-2xl text-[rgb(var(--navy))]">Get the slides and resources</h2>
          {error && (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div className="space-y-2"><Label htmlFor="name">Full name *</Label><Input id="name" name="name" required className={FIELD_CLASS} /></div>
          <div className="space-y-2"><Label htmlFor="email">Work email *</Label><Input id="email" name="email" type="email" required className={FIELD_CLASS} /></div>
          <div className="space-y-2"><Label htmlFor="org">Organization</Label><Input id="org" name="org" className={FIELD_CLASS} /></div>
          <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" className={FIELD_CLASS} /></div>
          {props.serviceChoices && props.serviceChoices.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-[rgb(var(--navy))]">
                Would you like more information about any of our services? <span className="font-normal text-[rgb(var(--ink))]/60">(optional)</span>
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {props.serviceChoices.map((service) => (
                  <label key={service} className="flex cursor-pointer items-start gap-2 text-sm text-[rgb(var(--ink))]/80">
                    <input
                      type="checkbox"
                      name="interests"
                      value={service}
                      className="mt-1 accent-[rgb(var(--brass))]"
                    />
                    <span>{service}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <button type="submit" disabled={busy} className={`${GOLD_BTN} w-full`}>
            {busy ? "Submitting..." : "Get access"} <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-xs text-[rgb(var(--ink))]/55">We respect your inbox. See our <Link href="/data-privacy" className="underline">privacy policy</Link>.</p>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-16">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[rgb(var(--line))] bg-[#b28c46]/10 p-10 text-center">
        <CheckCircle className="h-10 w-10 text-[rgb(var(--brass))]" />
        <h2 className="font-display text-3xl text-[rgb(var(--navy))]">You&apos;re in. Welcome!</h2>
        <p className="max-w-xl text-[rgb(var(--ink))]/70">Everything below is yours to use. When you&apos;re ready to talk about your own program, grab a time on Anthony&apos;s calendar.</p>
        {props.deck && (
          <div className="w-full max-w-2xl rounded-2xl border border-[rgb(var(--line))] bg-white p-8 text-left">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl text-[rgb(var(--navy))]">{props.deck.title}</h3>
                <p className="mt-2 text-sm text-[rgb(var(--ink))]/70">{props.deck.description}</p>
              </div>
              <a href={props.deck.href} download className={`${GOLD_BTN} shrink-0`}>
                <Download className="h-5 w-5" /> Download PDF
              </a>
            </div>
          </div>
        )}
        {bookBtn}
      </div>

      <section className="space-y-6">
        <h2 className="font-display text-3xl text-[rgb(var(--navy))]">Free fundraising tools</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {props.tools.map((t) => (
            <Link key={t.href} href={t.href} className="group rounded-2xl border border-[rgb(var(--line))] bg-white p-6 transition hover:border-[rgb(var(--brass))]">
              <h3 className="font-display text-xl text-[rgb(var(--navy))]">{t.title}</h3>
              <p className="mt-2 text-sm text-[rgb(var(--ink))]/70">{t.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[rgb(var(--brass))]">Open tool <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl text-[rgb(var(--navy))]">Articles</h2>
          <Link href="/blog" className="text-sm font-bold text-[rgb(var(--brass))]">See all articles</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {props.articles.map((a) => (
            <Link key={a.slug} href={`/blog/${a.slug}`} className="group overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white transition hover:border-[rgb(var(--brass))]">
              <div className="relative aspect-[3/2]"><Image src={a.image} alt={a.alt} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" /></div>
              <div className="p-5">
                <h3 className="font-display text-lg leading-snug text-[rgb(var(--navy))]">{a.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-[rgb(var(--ink))]/70">{a.description}</p>
                <p className="mt-3 text-xs text-[rgb(var(--ink))]/50">{a.readTime}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex justify-center">{bookBtn}</div>
    </div>
  );
}
