import type { Metadata } from "next";

export const metadata: Metadata = { title: "IMAS Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };

export default function ImasDataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
