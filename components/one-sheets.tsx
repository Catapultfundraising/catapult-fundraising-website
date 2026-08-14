import { Download, Layers, Gift, Users, Phone, UserCircle, HelpCircle, Target, FolderOpen, BookOpen, Heart, Mail } from "lucide-react";

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
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/eb9c7595-a8dd-4026-aba8-c2a31bc64f40.pdf",
  },
  {
    icon: Target,
    title: "Capital Campaign",
    description: "Feasibility, campaign planning, quiet phase, and public-phase calling.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/78d0d662-4f94-4a7e-bc1d-79f8d2c89f14.pdf",
  },
  {
    icon: Gift,
    title: "Legacy Call",
    description: "Our planned giving methodology and the 7-step donor journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/11472be2-2699-4a1d-9304-d04c2c90057b.pdf",
  },
  {
    icon: Users,
    title: "Donor Engagement",
    description: "The 8-stage mid-level donor engagement journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/40de600c-6754-4f14-add4-3b39d5aa92a8.pdf",
  },
  {
    icon: Phone,
    title: "Annual Fund Calling",
    description: "The AF Connect program and included digital enhancements.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0ffd3539-4742-4480-a0ad-9e8b158ab8f4.pdf",
  },
  {
    icon: UserCircle,
    title: "Leadership Bios",
    description:
      "Expanded bios for our President/CEO and senior leadership team — designed to print two-sided.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/b6a0a544-9958-4afe-968f-9c52b81e7bb6.pdf",
  },
  {
    icon: HelpCircle,
    title: "Frequently Asked Questions",
    description: "Answers to the questions we hear most from boards and staff.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/84825e0d-aa6b-442f-af6a-3a07cabd66ea.pdf",
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
  {
    icon: Heart,
    title: "Thank You Postcard",
    description:
      "Branded postcard for handwritten notes after sales calls and meetings — front and back, print-ready with bleed and embedded fonts.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/0a71500e-e6fe-423d-8dce-eaff24dc2689.pdf",
  },
  {
    icon: Mail,
    title: "Postcard Envelope",
    description:
      "Matching A6 envelope for mailing the thank you postcard — return address stacked below the logo, print-ready with bleed.",
    href: "https://galaxy-prod.tlcdn.com/gen/e1024ec7c33c44c9a788802b2bba377e.pdf",
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
            className="group flex flex-col rounded-2xl border border-[rgb(var(--line))] bg-white p-6 transition-colors hover:border-[rgb(var(--brass))] lg:p-10"
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
