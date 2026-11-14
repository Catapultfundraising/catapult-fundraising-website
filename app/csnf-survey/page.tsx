import type { Metadata } from "next";
import Image from "next/image";
import { CsnfSurveyForm } from "@/components/csnf-survey-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "CSNF Survey | CSN Foundation" },
  description: "Share your perspective on the CSN Foundation Northwest Campus campaign.",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  const accepting = process.env.CSNF_SURVEY_ENABLED === "true" && process.env.VERCEL_ENV !== "preview";
  return <div className="min-h-screen bg-white font-sans text-[#1f2933]">
    <header className="border-b-4 border-[#FFD51D]"><div className="mx-auto max-w-3xl px-6 py-6"><Image src="/csnf/csnf-logo.png" alt="College of Southern Nevada Foundation" width={553} height={283} className="h-16 w-auto sm:h-20" priority /></div></header>
    <div>
      <section className="bg-[#004990] text-white"><div className="mx-auto max-w-3xl px-6 py-12 sm:py-16"><p className="text-sm font-bold uppercase tracking-widest text-[#FFD51D]">Northwest Campus Campaign</p><h1 className="mt-3 text-3xl font-bold sm:text-5xl">CSNF Survey</h1><p className="mt-5 text-lg">Thank you for sharing your perspective on the proposed CSN Northwest Campus. Your responses will help assess community support and philanthropic potential for the project. Please select the response that best reflects your views.</p></div></section>
      <section aria-labelledby="case-summary" className="mx-auto max-w-3xl px-6 py-10">
        <h2 id="case-summary" className="text-2xl font-bold text-[#004990]">Bringing higher education closer to home</h2>
        <p className="mt-4 leading-relaxed">The proposed CSN Northwest Campus will bring affordable college education, workforce training, and student support services closer to the Northwest community. The first building will provide general education courses and serve as the new home of CSN’s Southern Desert Regional Police Academy.</p>
        <p className="mt-4 leading-relaxed">The CSN Foundation is leading a $10 million philanthropic campaign to help build and equip the first building with educational technology, training resources, and student-facing spaces.</p>
        <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 font-semibold text-[#004990]"><a href="/csnf#case-for-support" target="_blank" rel="noopener noreferrer" className="underline">Read the full case for support ↗</a><a href="/csnf#faq" target="_blank" rel="noopener noreferrer" className="underline">Frequently asked questions ↗</a></div>
      </section>
      <section aria-labelledby="survey-heading" className="border-t border-[#d8e3ef] bg-[#CFE0F2]/30"><div className="mx-auto max-w-3xl px-6 py-10 sm:py-14"><h2 id="survey-heading" className="mb-7 text-2xl font-bold text-[#004990]">Share your perspective</h2><CsnfSurveyForm accepting={accepting} /></div></section>
    </div>
    <footer className="mx-auto max-w-3xl px-6 py-8 text-sm">College of Southern Nevada Foundation · Northwest Campus Campaign</footer>
  </div>;
}
