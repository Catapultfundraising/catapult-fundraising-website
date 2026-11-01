import { notFound } from "next/navigation";
import { Harness } from "./harness";

// Synthetic-only QA harness for the shared ReportBuilder (screenshots/downloads in Playwright).
// Not served in production builds; its data API is mocked by the test script.
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness />;
}
