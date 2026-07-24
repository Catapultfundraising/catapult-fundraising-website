import { Download, Building2, Layers, Gift, Users, Phone, UserCircle, HelpCircle, BarChart3, Quote } from "lucide-react";

interface Sheet {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

const SHEETS: Sheet[] = [
  {
    icon: Building2,
    title: "About Catapult",
    description: "Company overview, core differentiators, and key stats.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/2e141b7c-1bae-49c9-8ec8-576a628628d2.pdf",
  },
  {
    icon: Layers,
    title: "All Services",
    description: "Every service line and the 5-phase campaign process.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/c20c4727-a78d-4e11-bce9-eabf2d971d78.pdf",
  },
  {
    icon: Gift,
    title: "Legacy Call",
    description: "Our planned giving methodology and the 7-step donor journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/10d7cea3-70c4-4573-a9e3-d34241e1962f.pdf",
  },
  {
    icon: Users,
    title: "Donor Engagement",
    description: "The 8-stage mid-level donor engagement journey.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/ef58e8d6-7fab-41f7-9438-7dfab301b63d.pdf",
  },
  {
    icon: Phone,
    title: "Annual Fund Calling",
    description: "The AF Connect program and included digital enhancements.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/fe1bfc97-861e-48dd-a373-ad4eb306d495.pdf",
  },
  {
    icon: UserCircle,
    title: "Leadership Bios",
    description: "Professional bios for our full leadership and consulting team.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/e9e42b4b-1b7e-4d64-820a-7e0a3feba07a.pdf",
  },
  {
    icon: HelpCircle,
    title: "Frequently Asked Questions",
    description: "Answers to the questions we hear most from boards and staff.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/4dec95de-7df4-4497-9dfb-c39a0bf6b8ec.pdf",
  },
  {
    icon: BarChart3,
    title: "Case Studies",
    description: "Documented results from our client partnerships.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/64b257a9-fcae-40f6-b7e8-adcd6ed19cbf.pdf",
  },
  {
    icon: Quote,
    title: "What Our Clients Are Saying",
    description: "Real testimonials from the boards and teams we've partnered with.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/a5d3f8dc-6447-486f-b076-bf1947e8a768.pdf",
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
