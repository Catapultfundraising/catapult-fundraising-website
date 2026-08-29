import type { Metadata } from "next";

// Password-gated internal brand-assets hub (see middleware.ts). A
// layout-level metadata export is needed here because app/assets/login/page.tsx
// is a client component ("use client") and can't export `metadata` itself --
// a layout always runs as a Server Component even when its children don't,
// so this reliably applies noindex to every page in the tree.
// app/assets/page.tsx already sets its own more specific `metadata` with
// `robots: { index: false }`, which simply overrides this default.
export const metadata: Metadata = {
  title: "Brand Assets & Tools | Catapult Fundraising",
  robots: { index: false, follow: false },
};

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
