import type { Metadata } from "next";

// Password-gated client-facing interview tracker (see middleware.ts). A
// layout-level metadata export is needed here because
// app/jag-dashboard/login/page.tsx is a client component ("use client") and
// can't export `metadata` itself -- a layout always runs as a Server
// Component even when its children don't, so this reliably applies noindex
// to every page in the tree. app/jag-dashboard/page.tsx already sets its own
// more specific `metadata` with `robots: { index: false }`, which simply
// overrides this default.
export const metadata: Metadata = {
  title: "JAG Nevada Interview Tracker | Catapult Fundraising",
  robots: { index: false, follow: false },
};

export default function JagDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
