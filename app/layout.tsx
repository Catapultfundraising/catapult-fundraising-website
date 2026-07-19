import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Catapult Fundraising | Capital Campaign & Donor Calling Consultants",
  description:
    "Catapult Fundraising guides nonprofits from feasibility study through public-phase calling, raising more from major donors, annual funds, and community campaigns. Based in Henderson, NV, serving clients nationwide.",
  keywords: [
    "capital campaign consultant",
    "nonprofit fundraising consultant",
    "donor calling program",
    "feasibility study nonprofit",
    "annual fund calling services",
    "Las Vegas fundraising consultant",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[rgb(var(--paper))] text-[rgb(var(--ink))] antialiased">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
