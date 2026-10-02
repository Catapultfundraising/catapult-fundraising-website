"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { CGA_WEBINAR } from "@/lib/webinars";

// In-page CGA webinar invitation for legacy / planned-giving content. Renders
// until the webinar ends, then disappears on its own.
export function WebinarCallout({
  lead = "Want to put this into practice? Join our free live webinar with Endowment Partners.",
  inset = false,
}: {
  lead?: string;
  /** true when placed inside an existing card/section (no outer section padding) */
  inset?: boolean;
}) {
  const [over, setOver] = useState(false);
  useEffect(() => {
    setOver(Date.now() > new Date(CGA_WEBINAR.endIso).getTime());
  }, []);
  if (over) return null;

  const card = (
    <Link
      href={CGA_WEBINAR.href}
      className="group flex flex-col gap-6 overflow-hidden rounded-3xl border border-[rgb(var(--brass))]/50 bg-white p-6 shadow-sm transition-colors hover:border-[rgb(var(--brass))] sm:flex-row sm:items-center sm:p-8"
    >
      <Image
        src={CGA_WEBINAR.image}
        alt={CGA_WEBINAR.title}
        width={360}
        height={360}
        sizes="180px"
        className="h-auto w-40 shrink-0 rounded-xl border border-[rgb(var(--line))] sm:w-44"
      />
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Free live webinar
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/70">{lead}</p>
        <p className="mt-2 font-display text-2xl text-[rgb(var(--navy))]">{CGA_WEBINAR.title}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-[rgb(var(--ink))]/70">
          <CalendarDays className="h-4 w-4 text-[rgb(var(--brass))]" />
          {CGA_WEBINAR.dateLabel} · {CGA_WEBINAR.timeLabel}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
          Save your free seat
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );

  if (inset) return card;
  return <section className="mx-auto max-w-4xl px-6 pb-14 lg:px-10 lg:pb-16">{card}</section>;
}
