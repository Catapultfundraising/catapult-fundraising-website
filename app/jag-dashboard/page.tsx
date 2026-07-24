import { redirect } from "next/navigation";

export const metadata = {
  title: "JAG Nevada Interview Tracker | Catapult Fundraising",
  description:
    "JAG Nevada Donor Assessment Study — weekly interview and calling status, prepared by Catapult Fundraising.",
  robots: { index: false, follow: false },
};

export default function JagDashboardPage() {
  redirect("https://dashboard.catapultfr.com");
}
