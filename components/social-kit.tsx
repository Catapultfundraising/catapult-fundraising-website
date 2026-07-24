import { Download, Megaphone, Users, CalendarDays } from "lucide-react";

interface Item {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  label: string;
}

const ITEMS: Item[] = [
  {
    icon: Megaphone,
    title: "Rebrand Announcement (Public)",
    description: "A ready-to-post square graphic announcing our refreshed brand — for Instagram, LinkedIn, and Facebook.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/c7259881-9b93-40e9-aed0-096c66c95d04.png",
    label: "Download Image (.png)",
  },
  {
    icon: Users,
    title: "Rebrand Announcement (Employee)",
    description: "An internal version encouraging staff to share our new look on their own social channels.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/499d15bf-30da-43c4-aee8-1761f43b09b2.png",
    label: "Download Image (.png)",
  },
  {
    icon: CalendarDays,
    title: "3-Month Content Calendar",
    description: "27 branded, ready-to-post square graphics built from real photos from our own site — covering the company, our services, and blog articles, one post every 3-4 days. Includes a posting-schedule spreadsheet (dates, platforms, captions, hashtags) plus a written, on-brand short write-up for every single post.",
    href: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/f50196c3-e3f2-4a11-a0e4-d0f97ed19db4.zip",
    label: "Download Kit (.zip)",
  },
];

export function SocialKit() {
  return (
    <div className="mt-16 space-y-6">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          Social Media Kit
        </p>
        <h2 className="mt-2 font-display text-3xl text-[rgb(var(--navy))]">
          Ready-to-post content for Instagram, LinkedIn, and Facebook.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--ink))]/65">
          Rebrand announcements plus a full 3-month posting calendar with written copy for every post, all built to drive traffic to the new site.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => (
          <div key={item.href} className="rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
              <item.icon className="h-5 w-5 text-[rgb(var(--brass))]" />
            </span>
            <h3 className="mt-5 font-display text-xl text-[rgb(var(--navy))]">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/65">{item.description}</p>
            <div className="mt-5">
              <a
                href={item.href}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--paper))] transition-colors hover:bg-[rgb(var(--navy-deep))]"
              >
                <Download className="h-4 w-4" />
                {item.label}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
