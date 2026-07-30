import Image from "next/image";
import { Download, Layers, Gift, Users, Phone, UserCircle, HelpCircle, Target, FolderOpen, BookOpen } from "lucide-react";

interface Sheet {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  image?: string;
}

const SHEETS: Sheet[] = [
  {
    icon: Layers,
    title: "All Services",
    description: "Every service line and the 5-phase campaign process.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ca2d31c8-9221-45e5-8247-f2d1aea02ae5.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6a9d6b64-b8bd-4cee-9045-ab3625a83f84.png",
  },
  {
    icon: Target,
    title: "Capital Campaign",
    description: "Feasibility, campaign planning, quiet phase, and public-phase calling.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3d5776ff-efea-41cf-a257-add676d1ea94.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/aaaa9b5e-08d1-4e3f-b92b-800b7f1e8670.png",
  },
  {
    icon: Gift,
    title: "Legacy Call",
    description: "Our planned giving methodology and the 7-step donor journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/fec23ca6-6bd3-4695-a8fd-e064b991fc1c.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e50ca83a-da69-40b8-8a37-d317da31b8ce.png",
  },
  {
    icon: Users,
    title: "Donor Engagement",
    description: "The 8-stage mid-level donor engagement journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/5e919d66-ee32-4e14-9a68-ae3f42fe28da.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/9a488a11-f7d0-4ea8-bfdc-d966a596bec7.png",
  },
  {
    icon: Phone,
    title: "Annual Fund Calling",
    description: "The AF Connect program and included digital enhancements.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/212e1027-29d9-4a90-b16b-8fe348185c93.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e98a14b7-8b8f-4234-9588-3a615af1708c.png",
  },
  {
    icon: UserCircle,
    title: "Leadership Bios",
    description:
      "Expanded bios for our President/CEO and senior leadership team — designed to print two-sided.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/033d478b-c0d5-4eaf-8612-cf80f971c269.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/57b7c106-a473-4e12-948a-efaf9846fb00.png",
  },
  {
    icon: HelpCircle,
    title: "Frequently Asked Questions",
    description: "Answers to the questions we hear most from boards and staff.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/9c7c25c5-13c5-4681-8196-d778e10b63d3.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/27395262-2a11-4808-8598-d240b86b3532.png",
  },
  {
    icon: FolderOpen,
    title: "Presentation Folder",
    description:
      "Print-ready two-pocket presentation folder — front, back, and interior spread with business card slits, packaged as a single print-vendor handoff PDF.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/65b2e7da-f119-43dd-89a6-bbc6084ea890.pdf",
  },
  {
    icon: BookOpen,
    title: "Trifold Brochure",
    description:
      "6-panel conference leave-behind covering all four services, our capital campaign process, and results — built for heavy-stock glossy print.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/eb45ccc8-2fbb-4885-ade4-90b467adc406.pdf",
  },
];

export function OneSheets() {
  return (
    <div className="mt-16 space-y-6">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          One-Sheets
        </p>
        <h2 className="mt-2 font-display text-3xl text-[rgb(var(--navy))]">
          Print-ready one-sheets for every conversation.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--ink))]/65">
          Branded PDFs built to match the current website. Print them, email them, or drop them into a proposal.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SHEETS.map((sheet) => (
          <a
            key={sheet.href}
            href={sheet.href}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white transition-colors hover:border-[rgb(var(--brass))]"
          >
            {sheet.image ? (
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={sheet.image}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--navy-deep))]/75 via-[rgb(var(--navy-deep))]/10 to-transparent" />
                <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--paper))]/95">
                  <sheet.icon className="h-4 w-4 text-[rgb(var(--brass))]" />
                </span>
              </div>
            ) : (
              <div className="px-6 pt-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
                  <sheet.icon className="h-5 w-5 text-[rgb(var(--brass))]" />
                </span>
              </div>
            )}
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-display text-lg text-[rgb(var(--navy))]">{sheet.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[rgb(var(--ink))]/65">
                {sheet.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))] transition-colors group-hover:text-[rgb(var(--brass))]">
                <Download className="h-4 w-4" />
                Download PDF
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
