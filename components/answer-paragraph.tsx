import Link from "next/link";
import React, { type ReactNode } from "react";
import type { RelatedLink } from "@/lib/answers";

/** Keep answer data plain text for schema while linking explicitly configured phrases. */
export function AnswerParagraph({ text, links = [] }: { text: string; links?: RelatedLink[] }) {
  const matches = links
    .filter(link => link.label.length > 0)
    .map(link => ({ ...link, start: text.indexOf(link.label) }))
    .filter(link => link.start >= 0)
    .sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const link of matches) {
    if (link.start < cursor) continue;
    parts.push(text.slice(cursor, link.start));
    parts.push(
      <Link key={link.start} href={link.href}
        className="font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40 decoration-2 underline-offset-4">
        {link.label}
      </Link>
    );
    cursor = link.start + link.label.length;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
