"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SERVICE_LINKS,
  INSIGHTS_LINKS,
  NAV_LINKS,
  FIRM_PHONE,
  FIRM_PHONE_HREF,
} from "@/lib/constants";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileInsightsOpen, setMobileInsightsOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
      if (insightsRef.current && !insightsRef.current.contains(e.target as Node)) {
        setInsightsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isServiceActive = pathname.startsWith("/services");
  const isInsightsActive = pathname.startsWith("/insights") || pathname.startsWith("/blog");
  const homeLink = NAV_LINKS.find((link) => link.href === "/");
  const restLinks = NAV_LINKS.filter((link) => link.href !== "/");

  return (
    <header className="sticky top-0 z-50 border-b border-[rgb(var(--line))] bg-[rgb(var(--paper))]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-1.5 lg:justify-between lg:px-10">
        <Link
          href="/"
          className="relative z-10 mr-auto -my-9 flex shrink-0 items-center py-1 sm:-my-11 lg:mr-0 lg:-my-12"
          onClick={() => setOpen(false)}
        >
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ccdcb7df-f854-4cf8-a390-1d9eb56ecd9d.png"
            alt="Catapult Fundraising"
            width={680}
            height={415}
            className="h-36 w-auto sm:h-44 lg:h-52"
            priority
          />
        </Link>

        <nav className="hidden min-w-0 items-center gap-6 lg:flex xl:gap-8">
          {homeLink && (
            <Link
              href={homeLink.href}
              className={cn(
                "whitespace-nowrap text-lg font-bold tracking-wide text-[rgb(var(--navy))]/70 transition-colors hover:text-[rgb(var(--navy))]",
                pathname === homeLink.href && "text-[rgb(var(--navy))]"
              )}
            >
              {homeLink.label}
            </Link>
          )}

          <div className="relative" ref={servicesRef}>
            <button
              onClick={() => setServicesOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap text-lg font-bold tracking-wide text-[rgb(var(--navy))]/70 transition-colors hover:text-[rgb(var(--navy))]",
                isServiceActive && "text-[rgb(var(--navy))]"
              )}
            >
              Services
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", servicesOpen && "rotate-180")}
              />
            </button>
            {servicesOpen && (
              <div className="absolute left-1/2 top-full w-72 -translate-x-1/2 pt-3">
                <div className="rounded-xl border border-[rgb(var(--line))] bg-white p-2 shadow-xl shadow-[rgb(var(--navy))]/10">
                  {SERVICE_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setServicesOpen(false)}
                      className={cn(
                        "block rounded-lg px-4 py-3 text-base font-medium text-[rgb(var(--navy))]/80 transition-colors hover:bg-[rgb(var(--paper))] hover:text-[rgb(var(--navy))]",
                        pathname === link.href && "bg-[rgb(var(--paper))] text-[rgb(var(--navy))]"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {restLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap text-lg font-bold tracking-wide text-[rgb(var(--navy))]/70 transition-colors hover:text-[rgb(var(--navy))]",
                pathname === link.href && "text-[rgb(var(--navy))]"
              )}
            >
              {link.label}
            </Link>
          ))}

          <div className="relative" ref={insightsRef}>
            <button
              onClick={() => setInsightsOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap text-lg font-bold tracking-wide text-[rgb(var(--navy))]/70 transition-colors hover:text-[rgb(var(--navy))]",
                isInsightsActive && "text-[rgb(var(--navy))]"
              )}
            >
              Insights
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", insightsOpen && "rotate-180")}
              />
            </button>
            {insightsOpen && (
              <div className="absolute left-1/2 top-full w-72 -translate-x-1/2 pt-3">
                <div className="rounded-xl border border-[rgb(var(--line))] bg-white p-2 shadow-xl shadow-[rgb(var(--navy))]/10">
                  <Link
                    href="/insights"
                    onClick={() => setInsightsOpen(false)}
                    className={cn(
                      "block rounded-lg px-4 py-3 text-base font-medium text-[rgb(var(--navy))]/80 transition-colors hover:bg-[rgb(var(--paper))] hover:text-[rgb(var(--navy))]",
                      pathname === "/insights" && "bg-[rgb(var(--paper))] text-[rgb(var(--navy))]"
                    )}
                  >
                    All Insights
                  </Link>
                  {INSIGHTS_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setInsightsOpen(false)}
                      className={cn(
                        "block rounded-lg px-4 py-3 text-base font-medium text-[rgb(var(--navy))]/80 transition-colors hover:bg-[rgb(var(--paper))] hover:text-[rgb(var(--navy))]",
                        pathname === link.href && "bg-[rgb(var(--paper))] text-[rgb(var(--navy))]"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

        </nav>

        <div className="hidden shrink-0 items-center gap-4 lg:flex">
          <a
            href={`tel:${FIRM_PHONE_HREF}`}
            className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-[rgb(var(--navy))]"
          >
            <Phone className="h-4 w-4 shrink-0 text-[rgb(var(--brass))]" />
            {FIRM_PHONE}
          </a>
          <Link
            href="/contact"
            className="whitespace-nowrap rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:bg-[rgb(var(--navy-deep))]"
          >
            Start a Conversation
          </Link>
        </div>

        <button
          className="relative z-10 shrink-0 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[rgb(var(--line))] bg-[rgb(var(--paper))] px-6 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {homeLink && (
              <Link
                href={homeLink.href}
                onClick={() => setOpen(false)}
                className="py-2 text-lg font-medium text-[rgb(var(--navy))]"
              >
                {homeLink.label}
              </Link>
            )}

            <button
              onClick={() => setMobileServicesOpen((v) => !v)}
              className="flex items-center justify-between py-2 text-lg font-medium text-[rgb(var(--navy))]"
            >
              Services
              <ChevronDown
                className={cn("h-5 w-5 transition-transform", mobileServicesOpen && "rotate-180")}
              />
            </button>
            {mobileServicesOpen && (
              <div className="flex flex-col gap-0.5 border-l-2 border-[rgb(var(--line))] pl-4">
                {SERVICE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="py-1.5 text-xs font-medium text-[rgb(var(--navy))]/75"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {restLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-lg font-medium text-[rgb(var(--navy))]"
              >
                {link.label}
              </Link>
            ))}

            <button
              onClick={() => setMobileInsightsOpen((v) => !v)}
              className="flex items-center justify-between py-2 text-lg font-medium text-[rgb(var(--navy))]"
            >
              Insights
              <ChevronDown
                className={cn("h-5 w-5 transition-transform", mobileInsightsOpen && "rotate-180")}
              />
            </button>
            {mobileInsightsOpen && (
              <div className="flex flex-col gap-0.5 border-l-2 border-[rgb(var(--line))] pl-4">
                <Link
                  href="/insights"
                  onClick={() => setOpen(false)}
                  className="py-1.5 text-xs font-medium text-[rgb(var(--navy))]/75"
                >
                  All Insights
                </Link>
                {INSIGHTS_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="py-1.5 text-xs font-medium text-[rgb(var(--navy))]/75"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            <a
              href={`tel:${FIRM_PHONE_HREF}`}
              className="mt-1.5 flex items-center gap-1.5 py-2 text-base font-medium text-[rgb(var(--brass))]"
            >
              <Phone className="h-4 w-4" />
              {FIRM_PHONE}
            </a>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-[rgb(var(--navy))] px-4 py-3 text-center text-xs font-semibold text-[rgb(var(--paper))]"
            >
              Start a Conversation
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
