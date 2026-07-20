import { LucideIcon, Check } from "lucide-react";

interface ServiceSection {
  title: string;
  description: string;
  bullets?: string[];
}

interface ServiceDetailProps {
  sections: ServiceSection[];
  sidebarTitle: string;
  sidebarIcon: LucideIcon;
  sidebarItems: string[];
}

export function ServiceDetail({
  sections,
  sidebarTitle,
  sidebarIcon: Icon,
  sidebarItems,
}: ServiceDetailProps) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
      <div className="grid gap-14 lg:grid-cols-3">
        <div className="space-y-14 lg:col-span-2">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-display text-2xl text-[rgb(var(--navy))] sm:text-3xl">
                {section.title}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
                {section.description}
              </p>
              {section.bullets && (
                <ul className="mt-5 space-y-3">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-base text-[rgb(var(--ink))]/75">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--brass))]" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <aside className="h-fit rounded-2xl border border-[rgb(var(--line))] bg-white p-8 lg:sticky lg:top-28">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--navy))]/5">
            <Icon className="h-5 w-5 text-[rgb(var(--brass))]" />
          </span>
          <h3 className="mt-6 font-display text-xl text-[rgb(var(--navy))]">{sidebarTitle}</h3>
          <ul className="mt-5 space-y-3">
            {sidebarItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-base text-[rgb(var(--ink))]/70">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--brass))]" />
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
