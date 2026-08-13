import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CaseStudy } from "@/lib/case-studies";

export function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <Link
      href={`/insights/case-studies/${caseStudy.slug}`}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white transition-colors hover:border-[rgb(var(--brass))]"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <Image
          src={caseStudy.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          quality={60}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--navy-deep))]/70 via-[rgb(var(--navy-deep))]/5 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col justify-between p-8 lg:p-10">
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
      </div>
    </Link>
  );
}
