"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { HUBSPOT_PORTAL_ID, LINKEDIN_PARTNER_ID, GA4_MEASUREMENT_ID } from "@/lib/constants";

const CONSENT_KEY = "catapult_cookie_consent";

type ConsentValue = "accepted" | "necessary";

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted" || stored === "necessary") {
      setConsent(stored);
    } else {
      setVisible(true);
    }
  }, []);

  function choose(value: ConsentValue) {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setVisible(false);
  }

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA4_MEASUREMENT_ID}');
            `}
          </Script>
          <Script
            id="hs-script-loader"
            strategy="afterInteractive"
            src={`https://js.hs-scripts.com/${HUBSPOT_PORTAL_ID}.js`}
          />
          <Script id="li-insight-tag" strategy="afterInteractive">
            {`
              _linkedin_partner_id = "${LINKEDIN_PARTNER_ID}";
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              (function(l) {
                if (!l) {
                  window.lintrk = function(a, b) { window.lintrk.q.push([a, b]) };
                  window.lintrk.q = [];
                }
                var s = document.getElementsByTagName("script")[0];
                var b = document.createElement("script");
                b.type = "text/javascript"; b.async = true;
                b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                s.parentNode.insertBefore(b, s);
              })(window.lintrk);
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://px.ads.linkedin.com/collect/?pid=${LINKEDIN_PARTNER_ID}&fmt=gif`}
            />
          </noscript>
        </>
      )}

      {visible && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-[rgb(var(--line))] bg-[rgb(var(--navy))] px-6 py-5 text-[rgb(var(--paper))] shadow-[0_-8px_24px_rgba(0,0,0,0.25)] sm:px-10"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-relaxed text-[rgb(var(--paper))]/80">
              We use cookies to understand site traffic and improve your experience.
              Essential cookies keep the site running; other cookies are only set if
              you accept. See our{" "}
              <Link
                href="/cookie-policy"
                className="underline underline-offset-2 hover:text-[rgb(var(--brass-light))]"
              >
                Cookie Policy
              </Link>{" "}
              for details on what we track.
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => choose("necessary")}
                className="rounded-[var(--radius)] border border-[rgb(var(--paper))]/30 px-4 py-2 text-sm font-medium text-[rgb(var(--paper))] transition hover:bg-[rgb(var(--paper))]/10"
              >
                Necessary Only
              </button>
              <button
                type="button"
                onClick={() => choose("accepted")}
                className="rounded-[var(--radius)] bg-[rgb(var(--brass))] px-4 py-2 text-sm font-semibold text-[rgb(var(--navy))] transition hover:bg-[rgb(var(--brass-light))]"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
