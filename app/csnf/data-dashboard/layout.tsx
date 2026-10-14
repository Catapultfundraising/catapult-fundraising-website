import type { Metadata } from "next";

export const metadata: Metadata = { title: "CSNF Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };

export default function CsnfDataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
