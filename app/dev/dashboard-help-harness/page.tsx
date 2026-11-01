import { notFound } from "next/navigation";
import { Harness } from "./harness";

// Synthetic-only QA harness for the dashboard Help panel (Playwright screenshots). No data, no network.
// Not served in production builds.
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness />;
}
