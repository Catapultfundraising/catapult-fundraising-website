import type { Metadata } from "next";

// Password-gated client-facing interview tracker for the CSNF feasibility
// study (see middleware.ts). Its own password, separate from JAG's, so no
// client can ever reach another client's study data.
export const metadata: Metadata = {
  title: "CSNF Interview Tracker | Catapult Fundraising",
  robots: { index: false, follow: false },
};

export default function CsnfDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
