import type { Metadata } from "next";

export const metadata: Metadata = { title: "WCBHC Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };

export default function WcbhcDataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
