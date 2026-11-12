"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { attributedBookingUrl, captureLeadAttribution, isMarketingPath, readLeadAttribution } from "@/lib/lead-attribution";

/** Mounted only for accepted consent. No activity on dashboards/research/applicant routes. */
export function LeadAttribution() {
  const pathname = usePathname();
  useEffect(() => {
    captureLeadAttribution();
    if (!isMarketingPath(pathname)) return;
    const decorate = (event: MouseEvent) => {
      if (!isMarketingPath(window.location.pathname)) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor instanceof HTMLAnchorElement) {
        anchor.href = attributedBookingUrl(anchor.href, readLeadAttribution());
      }
    };
    // Capture phase handles native/new-tab navigation; auxclick covers middle-click.
    document.addEventListener("click", decorate, true);
    document.addEventListener("auxclick", decorate, true);
    return () => {
      document.removeEventListener("click", decorate, true);
      document.removeEventListener("auxclick", decorate, true);
    };
  }, [pathname]);
  return null;
}
