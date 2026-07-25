import { Download, Layers, Gift, Users, Phone, UserCircle, HelpCircle, Target, FolderOpen, BookOpen } from "lucide-react";

interface Sheet {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

const SHEETS: Sheet[] = [
  {
    icon: Layers,
    title: "All Services",
    description: "Every service line and the 5-phase campaign process.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/585ad107-29bb-4a12-bf02-2409e1c3e6fe.pdf",
  },
  {
    icon: Target,
    title: "Capital Campaign",
    description: "Feasibility, campaign planning, quiet phase, and public-phase calling.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/11aeb739-6d95-4f17-a4ac-f632a0564639.pdf",
  },
  {
    icon: Gift,
    title: "Legacy Call",
    description: "Our planned giving methodology and the 7-step donor journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/dfc72dfc-b983-4b26-be0c-d24412c7b20f.pdf",
  },
  {
    icon: Users,
    title: "Donor Engagement",
    description: "The 8-stage mid-level donor engagement journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3f4609a6-f4eb-49cf-a735-370e8df65ea7.pdf",
  },
  {
    icon: Phone,
    title: "Annual Fund Calling",
    description: "The AF Connect program and included digital enhancements.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/6e6f835b-c93d-4d90-bfac-f7e221d6dee8.pdf",
  },
  {
    icon: UserCircle,
    title: "Leadership Bios",
    description: "Expanded bios for our President/CEO and senior leadership team — designed to print two-sided.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/b6a0a544-9958-4afe-968f-9c52b81e7bb6.pdf",
  },
  {
    icon: HelpCircle,
    title: "Frequently Asked Questions",
    description: "Answers to the questions we hear most from boards and staff.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/668503da-58eb-42ff-9869-7554ecad759a.pdf",
  },
  {
    icon: FolderOpen,
    title: "Presentation Folder",
    description: "Print-ready two-pocket presentation folder — front, back, and interior spread with business card slits, packaged as a single print-vendor handoff PDF.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/188c0865-e285-488d-89e4-d117e598126c.pdf",
  },
  {
    icon: BookOpen,
    title: "Trifold Brochure",
    description: "6-panel conference leave-behind covering all four services, our capital campaign process, and results — built for heavy-stock glossy print.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ed339692-e8a0-497a-b410-126a3055728d.pdf",
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
            className="group flex flex-col rounded-2xl border border-[rgb(var(--line))] bg-white p-6 transition-colors hover:border-[rgb(var(--brass))]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
              <sheet.icon className="h-5 w-5 text-[rgb(var(--brass))]" />
            </span>
            <h3 className="mt-4 font-display text-lg text-[rgb(var(--navy))]">{sheet.title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[rgb(var(--ink))]/65">
              {sheet.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))] transition-colors group-hover:text-[rgb(var(--brass))]">
              <Download className="h-4 w-4" />
              Download PDF
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
