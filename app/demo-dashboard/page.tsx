import type { Metadata } from "next";
import { DemoDataDashboard } from "@/components/demo-data-dashboard";

// Public SAMPLE dashboard with fictional data only. Static: no server data, no client APIs.
export const metadata: Metadata = {
  title: { absolute: "Sample Data Dashboard (fictional data)" },
  robots: { index: false, follow: false },
};

export default function DemoDashboardPage() {
  return <DemoDataDashboard />;
}
