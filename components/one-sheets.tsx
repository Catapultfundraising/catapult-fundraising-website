import { Download, Layers, Gift, Users, Phone, UserCircle, HelpCircle, Target, FolderOpen, BookOpen, Heart, Mail, Home, Landmark } from "lucide-react";

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
    href: "/one-sheets/press/Catapult-All-Services-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Target,
    title: "Capital Campaign",
    description: "Feasibility, campaign planning, quiet phase, and public-phase calling.",
    href: "/one-sheets/press/Catapult-Capital-Campaign-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Gift,
    title: "Legacy Call",
    description: "Our planned giving methodology and the 7-step donor journey.",
    href: "/one-sheets/press/Catapult-Legacy-Call-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Users,
    title: "Donor Engagement",
    description: "The 8-stage mid-level donor engagement journey.",
    href: "/one-sheets/press/Catapult-Donor-Engagement-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Phone,
    title: "Annual Fund Calling",
    description: "The AF Connect program and included digital enhancements.",
    href: "/one-sheets/press/Catapult-Annual-Fund-Calling-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Landmark,
    title: "Board Development",
    description: "Board assessment, recruitment, orientation, and activation in five steps.",
    href: "/one-sheets/press/Catapult-Board-Development-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: UserCircle,
    title: "Leadership Bios",
    description:
      "Expanded bios for our President/CEO and senior leadership team — designed to print two-sided.",
    href: "/one-sheets/press/Catapult-Leadership-Bios-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: HelpCircle,
    title: "Frequently Asked Questions",
    description: "Answers to the questions we hear most from boards and staff.",
    href: "/one-sheets/press/Catapult-Frequently-Asked-Questions-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: FolderOpen,
    title: "Presentation Folder",
    description:
      "Exterior cover proof only. The full production folder file with printed pockets is pending the printer's template export. Do not use this cover proof as the final press file.",
    href: "/one-sheets/print/Catapult-Presentation-Folder-Artwork-2026-11-03.pdf",
  },
  {
    icon: BookOpen,
    title: "Trifold Brochure",
    description:
      "6-panel conference leave-behind covering all four services, our capital campaign process, and results — built for heavy-stock glossy print.",
    href: "/one-sheets/press/Catapult-Trifold-Brochure-CMYK-Press-2026-11-03.pdf",
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
    href: "https://galaxy-prod.tlcdn.com/gen/a523cec299a748869716bcb8e7751360.pdf",
  },
];

const CASE_STUDY_SHEETS: Sheet[] = [
  {
    icon: Home,
    title: "Ronald McDonald House Charities South Texas",
    description: "Capital Campaign: Love Builds a New Home grew from just over $5 million to more than $25 million raised, exceeding its $25 million goal.",
    href: "/one-sheets/press/Catapult-Ronald-McDonald-House-Charities-South-Texas-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Gift,
    title: "PBS KVIE",
    description: "Legacy Call: 63 planned gifts totaling $4,620,000 and 106 donors added to the pipeline.",
    href: "/one-sheets/press/Catapult-PBS-KVIE-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Target,
    title: "Salvation Army of Southern Nevada",
    description: "Capital campaign restarted and finished at $10 million, including a $1.25 million endowment.",
    href: "/one-sheets/press/Catapult-Salvation-Army-of-Southern-Nevada-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Gift,
    title: "Northeast University",
    description: "Legacy Call: 500 loyal donors, 50 confirmed planned gifts, $4,894,000.",
    href: "/one-sheets/press/Catapult-Northeast-University-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Gift,
    title: "The Hill School",
    description: "Legacy Calls across two phases: 47 confirmed planned gifts totaling $7,666,000.",
    href: "/one-sheets/press/Catapult-The-Hill-School-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Gift,
    title: "Ronald Reagan Presidential Library",
    description: "Legacy Call: 26 confirmed planned gifts totaling $2,825,000.",
    href: "/one-sheets/press/Catapult-Ronald-Reagan-Presidential-Library-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Phone,
    title: "Special Olympics Indiana",
    description: "AF Connect: an 85% pledge rate with lapsed donors and a 39% higher average gift.",
    href: "/one-sheets/press/Catapult-Special-Olympics-Indiana-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Gift,
    title: "New Jersey Hospital",
    description: "Legacy Call: $1,023,000 confirmed in three months, 30% interest among those reached.",
    href: "/one-sheets/press/Catapult-New-Jersey-Hospital-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Gift,
    title: "International Ministry",
    description: "Legacy Call across two phases: 149 planned gifts totaling $6,867,161.",
    href: "/one-sheets/press/Catapult-International-Ministry-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Users,
    title: "Faith-Based Organization",
    description: "Mid-level engagement: 57% qualified for stewardship, 9% for a major gift appointment.",
    href: "/one-sheets/press/Catapult-Faith-Based-Organization-CMYK-Press-2026-11-03.pdf",
  },
  {
    icon: Users,
    title: "Performing Arts Organization",
    description: "Hidden capacity under $350 lifetime giving: 467 new gifts and a $2,390 average first gift.",
    href: "/one-sheets/press/Catapult-Performing-Arts-Organization-CMYK-Press-2026-11-03.pdf",
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
          Service sheets and case studies now include CMYK artwork, crop marks and ⅛-inch bleed. The folder cover proof is not a final production file.
        </p>
      </div>

      <div className="text-sm">
        <a href="/one-sheets/press/Catapult-Sheets-and-Brochure-CMYK-Press-2026-11-03.zip" download className="font-semibold underline">
          Download all 19 sheets and the brochure: CMYK press package
        </a>
        <p className="mt-2 text-[rgb(var(--ink))]/65">
          Includes the two-page leadership bios. Excludes the folder, postcard and envelope.
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

      <div className="pt-6">
        <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Case Studies
        </p>
        <h2 className="mt-2 font-display text-3xl text-[rgb(var(--navy))]">
          One-page case studies, ready to leave behind.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--ink))]/65">
          Each published case study as a single branded page. Clients who have approved named use are
          named; the rest are described by organization type.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CASE_STUDY_SHEETS.map((sheet) => (
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
