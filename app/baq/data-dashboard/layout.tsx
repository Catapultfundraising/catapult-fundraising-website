import type { Metadata } from "next";

export const metadata: Metadata = { title: "BAQ Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };

export default function BaqDataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
