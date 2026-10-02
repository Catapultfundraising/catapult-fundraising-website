"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { CGA_WEBINAR } from "@/lib/webinars";

// Slim, dismissible site-wide promo for the CGA webinar. A gentler alternative
// to a pop-up: it never covers content, closing it is remembered per browser,
// and it switches itself off once the webinar has ended.
const DISMISS_KEY = "catapult-cga-webinar-bar-dismissed";
const HIDDEN_PREFIXES = [
  CGA_WEBINAR.href,
  "/research",
  "/decks",
  "/jag-admin",
  "/jag-dashboard",
  "/csnf-dashboard",
];

export function WebinarBar() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const over = Date.now() > new Date(CGA_WEBINAR.endIso).getTime();
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    setShow(!over && !dismissed);
  }, []);

  if (!show || HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div className="relative bg-[rgb(var(--navy))] text-[rgb(var(--paper))]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-3 px-12 py-2.5 text-center text-sm">
        <Link href={CGA_WEBINAR.href} className="group">
          <span className="font-semibold text-[rgb(var(--brass-light))]">
            <span className="sm:hidden">Free CGA webinar · Nov 4</span>
            <span className="hidden sm:inline">Free webinar · Nov 4:</span>
          </span>{" "}
          <span className="hidden sm:inline">Turning Donor Relationships into Charitable Gift Annuities</span>
          <span className="ml-2 inline-flex items-center gap-1 font-semibold underline decoration-[rgb(var(--brass))] underline-offset-4">
            Save your seat
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close webinar announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[rgb(var(--paper))]/70 hover:bg-white/10 hover:text-[rgb(var(--paper))]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
