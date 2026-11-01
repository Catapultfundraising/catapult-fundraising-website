"use client";

import { usePathname } from "next/navigation";

// Routes that must render WITHOUT the Catapult site header/footer. The CSNF
// campaign pages (/csnf and /csnfvip) are a client-facing page styled as CSN Foundation and
// linked from the feasibility study interview invitation email, so Catapult
// chrome would break the illusion that it belongs to the Foundation.
const BARE_ROUTES = ["/csnf", "/csnfvip"];
// Exact paths only (no sub-paths): the fictional sample dashboard has its own Catapult-branded header.
const EXACT_BARE_ROUTES = ["/demo-dashboard"];

export function isBareRoute(pathname: string) {
  if (EXACT_BARE_ROUTES.includes(pathname)) return true;
  return BARE_ROUTES.some((route) => (pathname === route || pathname.startsWith(`${route}/`)) && !pathname.includes("/data-dashboard"));
}

export function BareRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isBareRoute(pathname)) {
    return null;
  }
  return <>{children}</>;
}
