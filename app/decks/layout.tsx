import type { Metadata } from "next";

// Password-gated sales deck portal (see middleware.ts). Metadata lives at the
// layout level because app/decks/login/page.tsx is a client component and
// cannot export `metadata` itself, and a layout always runs as a Server
// Component. Individual pages set their own more specific metadata.
export const metadata: Metadata = {
  title: "Sales Decks | Catapult Fundraising",
  robots: { index: false, follow: false },
};

export default function DecksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
