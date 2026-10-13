import type { Metadata } from "next";

export const metadata: Metadata = { title: "JAG Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };

export default function JagDataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
