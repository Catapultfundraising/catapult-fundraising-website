import type { Metadata } from "next";

export const metadata: Metadata = { title: "PVAS Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };

export default function PvasDataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
