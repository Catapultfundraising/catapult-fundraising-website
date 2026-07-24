import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CaseStudy } from "@/lib/case-studies";

export function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <Link
      href={`/insights/case-studies/${caseStudy.slug}`}
      className="group flex flex-col justify-between rounded-2xl border border-[rgb(var(--line))] bg-white p-8 transition-colors hover:border-[rgb(var(--brass))] lg:p-10"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          {caseStudy.sector}
        </p>
        <h3 className="mt-3 font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">
          {caseStudy.title}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-[rgb(var(--ink))]/70">
          {caseStudy.summary}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[rgb(var(--line))] pt-6">
          {caseStudy.stats.slice(0, 2).map((stat) => (
            <div key={stat.label}>
              <dt className="font-display text-2xl text-[rgb(var(--navy))]">{stat.value}</dt>
              <dd className="mt-1 text-xs uppercase tracking-wider text-[rgb(var(--ink))]/50">
                {stat.label}
              </dd>
            </div>
          ))}
        </div>
      </div>
      <span className="mt-8 inline-flex items-center gap-2 font-semibold text-[rgb(var(--navy))]">
        Read the case study
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
