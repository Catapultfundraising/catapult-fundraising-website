import React from "react";
import { ArrowUpRight } from "lucide-react";

export function WebinarRegistration({ title, registrationUrl }: { title: string; registrationUrl: string | null }) {
  if (!registrationUrl) {
    return (
      <p className="inline-flex min-h-12 items-center rounded-full border border-[rgb(var(--line))] bg-white px-6 py-3 text-sm font-semibold text-[rgb(var(--navy))]">
        <span className="sr-only">{title}: </span>Registration opens soon
      </p>
    );
  }

  return (
    <a href={registrationUrl} target="_blank" rel="noopener noreferrer" aria-label={`Register for ${title} (opens in a new tab)`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-6 py-3 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:bg-[rgb(var(--navy-deep))]">
      Register for this session <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
    </a>
  );
}
