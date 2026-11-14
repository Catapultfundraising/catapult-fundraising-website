"use client";

import { useRef, useState } from "react";
import { SURVEY_QUESTIONS, SURVEY_VERSION, type SurveyAnswers } from "@/lib/csnf-online-survey";

export function CsnfSurveyForm({ accepting }: { accepting: boolean }) {
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  // Remains stable across network retries. Freeze the payload after an attempt:
  // if the response was lost after save, an edit must not turn it into a second
  // response or accidentally overwrite a previously accepted answer.
  const pending = useRef<object | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [website, setWebsite] = useState("");
  if (saved) return <section aria-live="polite" className="rounded-md border border-[#004990] bg-white p-8"><h2 className="text-2xl font-bold text-[#004990]">Thank you for sharing your perspective.</h2><p className="mt-3">Your survey response has been saved.</p></section>;
  const fieldClass = "mt-3 w-full rounded-md border border-[#d8e3ef] bg-white p-3 text-base focus:outline-[#004990]";
  return <form onSubmit={async e => {
    e.preventDefault();
    if (busy || !accepting) return;
    if (!pending.current) pending.current = { id: crypto.randomUUID(), surveyVersion: SURVEY_VERSION, answers, website };
    setAttempted(true); setBusy(true); setMessage("");
    try {
      const result = await fetch("/api/csnf-survey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current) });
      const body = await result.json();
      if (!result.ok || body.ok !== true) {
        // Validation errors are known not to have written and may be edited.
        if (result.status === 400) { pending.current = null; setAttempted(false); }
        throw new Error(body.error || "We could not confirm your response was saved. Please retry.");
      }
      setSaved(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not confirm your response was saved. Please retry.");
    } finally { setBusy(false); }
  }} className="space-y-8">
    {!accepting && <p role="status" className="rounded-md border border-[#d8e3ef] bg-white p-4">Preview only: responses are not being collected.</p>}
    <p className="text-sm">Your responses will be used for the CSN Foundation study. Please do not include sensitive personal or financial information in written comments.</p>
    <div aria-hidden="true" className="hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
    <fieldset disabled={busy || attempted || !accepting} className="space-y-8 disabled:opacity-80">
      {SURVEY_QUESTIONS.filter(q => !q.commentFor).map(q => <fieldset key={q.id} className="rounded-md border border-[#d8e3ef] bg-white p-5 sm:p-7">
        <legend className="px-2 text-base font-semibold text-[#004990]">{q.label}{q.required ? " *" : ""}</legend>
        {q.type === "text" ? <><label htmlFor={`survey-${q.id}`} className="sr-only">{q.label}</label><textarea id={`survey-${q.id}`} maxLength={2000} rows={4} required={q.required} value={answers[q.id] as string ?? ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} className={fieldClass} /><p className="mt-1 text-xs">Up to 2,000 characters.</p></> :
          <div className="space-y-3">{q.options?.map(option => <label key={option} className="flex cursor-pointer items-start gap-3 py-1">
            <input className="mt-1 h-5 w-5 shrink-0 accent-[#004990]" type={q.type === "multi" ? "checkbox" : "radio"} name={q.id} value={option} checked={q.type === "multi" ? (answers[q.id] as string[] ?? []).includes(option) : answers[q.id] === option} onChange={e => setAnswers(a => ({ ...a, [q.id]: q.type === "multi" ? (e.target.checked ? [...(a[q.id] as string[] ?? []), option] : (a[q.id] as string[] ?? []).filter(v => v !== option)) : option }))} />
            <span>{option}</span>
          </label>)}</div>}
        {SURVEY_QUESTIONS.filter(c => c.commentFor === q.id).map(c => <div key={c.id} className="mt-5"><label htmlFor={`survey-${c.id}`} className="whitespace-pre-line text-sm font-semibold">{c.label}</label><textarea id={`survey-${c.id}`} maxLength={2000} rows={3} value={answers[c.id] as string ?? ""} onChange={e => setAnswers(a => ({ ...a, [c.id]: e.target.value }))} className={fieldClass} /><p className="mt-1 text-xs">Up to 2,000 characters.</p></div>)}
      </fieldset>)}
    </fieldset>
    <div aria-live="polite">{message && <p role="alert" className="mb-4 font-semibold text-[#004990]">{message}</p>}{attempted && !busy && <p className="mb-4 text-sm">Your answers are held unchanged so you can safely retry without creating a duplicate response.</p>}</div>
    <button type="submit" disabled={busy || !accepting} className="rounded-md bg-[#004990] px-7 py-4 font-semibold text-white disabled:opacity-60">{busy ? "Saving response…" : attempted ? "Retry saving response" : "Submit survey"}</button>
  </form>;
}
