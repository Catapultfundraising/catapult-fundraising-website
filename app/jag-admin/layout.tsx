import type { Metadata } from "next";

// Password-gated internal-only data upload tool (see middleware.ts) --
// same fix as app/research/layout.tsx, app/assets/layout.tsx, and
// app/jag-dashboard/layout.tsx: app/jag-admin/login/page.tsx is a client
// component ("use client") and can't export `metadata` itself, so a
// layout-level export is needed to guarantee noindex applies to every page
// in this tree. app/jag-admin/page.tsx already sets its own more specific
// `metadata` with `robots: { index: false }`, which simply overrides this
// default.
export const metadata: Metadata = {
  title: "JAG Admin | Catapult Fundraising",
  robots: { index: false, follow: false },
};

export default function JagAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
