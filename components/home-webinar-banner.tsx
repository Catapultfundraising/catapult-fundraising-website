"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

// Homepage announcement sits above the navigation, like the former CGA bar.
// Keep it separate from the retired CGA campaign and its date/dismissal state.
export function HomeWebinarBanner() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <aside aria-label="2027 webinar series" className="bg-[rgb(var(--navy))] text-[rgb(var(--paper))]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-x-6 gap-y-1 px-6 py-2.5 text-center text-sm sm:flex-row lg:px-10">
        <p>
          <span className="font-semibold text-[rgb(var(--brass-light))]">Free 2027 Webinar Series</span>
          {" · "}Begins in January
        </p>
        <Link
          href="/webinars"
          className="group inline-flex min-h-11 items-center gap-2 font-semibold underline decoration-[rgb(var(--brass))] underline-offset-4 hover:decoration-[rgb(var(--paper))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--paper))]"
        >
          View the series &amp; register
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </aside>
  );
}
