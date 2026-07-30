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
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/d2833c85-209a-41e8-8ce7-30c86d080ddd.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6a9d6b64-b8bd-4cee-9045-ab3625a83f84.png",
  },
  {
    icon: Target,
    title: "Capital Campaign",
    description: "Feasibility, campaign planning, quiet phase, and public-phase calling.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/93b5f6d4-bb0e-4916-a1f2-0e514e91c625.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/aaaa9b5e-08d1-4e3f-b92b-800b7f1e8670.png",
  },
  {
    icon: Gift,
    title: "Legacy Call",
    description: "Our planned giving methodology and the 7-step donor journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/905e7745-9206-45a9-ae31-d6e8600d2304.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e50ca83a-da69-40b8-8a37-d317da31b8ce.png",
  },
  {
    icon: Users,
    title: "Donor Engagement",
    description: "The 8-stage mid-level donor engagement journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/413637bc-d900-4306-a6e5-d15bc5692313.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/9a488a11-f7d0-4ea8-bfdc-d966a596bec7.png",
  },
  {
    icon: Phone,
    title: "Annual Fund Calling",
    description: "The AF Connect program and included digital enhancements.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0ff3a388-414c-48fc-b721-06dcee24b3b9.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e98a14b7-8b8f-4234-9588-3a615af1708c.png",
  },
  {
    icon: UserCircle,
    title: "Leadership Bios",
    description:
      "Expanded bios for our President/CEO and senior leadership team — designed to print two-sided.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/8dbb89c5-153b-486a-8dc8-a844181c3c26.pdf",
    image:
      "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/57b7c106-a473-4e12-948a-efaf9846fb00.png",
  },
  {
    icon: HelpCircle,
    title: "Frequently Asked Questions",
    description: "Answers to the questions we hear most from boards and staff.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/fe9893f7-2e33-4864-9b0b-fdbaec559a3a.pdf",
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
