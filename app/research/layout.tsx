import type { Metadata } from "next";

// This entire /research tree is a password-gated internal tool (see
// middleware.ts), not a public marketing page. A layout-level metadata
// export is required here (rather than each page's own `export const
// metadata`) because several pages under this tree -- app/research/page.tsx,
// app/research/clients/page.tsx, app/research/login/page.tsx -- are client
// components ("use client"), and only Server Components can export
// `metadata`. A layout always runs as a Server Component even when its
// children are client components, so this is the one place that reliably
// applies noindex to every page in the tree. Individual pages that already
// set their own more specific `metadata` (e.g. app/research/new/page.tsx)
// simply override this default per-field -- their existing `robots: {
// index: false }` and unique titles are unaffected.
export const metadata: Metadata = {
  title: "Research Portal | Catapult Fundraising",
  robots: { index: false, follow: false },
};

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
