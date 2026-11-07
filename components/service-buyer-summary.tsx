import type { ReactNode } from "react";

export function ServiceBuyerSummary({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="mx-auto max-w-7xl px-6 pt-10 lg:px-10">
      <div className="rounded-2xl border border-[rgb(var(--line))] border-l-4 border-l-[rgb(var(--brass))] bg-white p-6 sm:p-8">
        <h2 className="font-display text-2xl text-[rgb(var(--navy))]">{title}</h2>
        <dl className="mt-5 grid gap-6 text-lg leading-relaxed text-[rgb(var(--ink))]/75 sm:grid-cols-2">{children}</dl>
      </div>
    </section>
  );
}
