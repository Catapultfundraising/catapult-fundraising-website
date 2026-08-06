import { JagAdminForm } from "@/components/jag-admin-form";

export const metadata = {
  title: "JAG Data Update Tool",
  description: "Internal weekly data update tool.",
  robots: { index: false, follow: false },
};

export default function JagAdminPage() {
  return <JagAdminForm />;
}
