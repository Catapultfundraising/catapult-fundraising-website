"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";
import { SURVEY_QUESTIONS } from "@/lib/csnf-online-survey";
import { SurveyAutosave, sendSurveyWrite, type SurveyFormData, type SaveView } from "@/lib/csnf-survey-autosave";

export function CsnfSurveyForm({ accepting }: { accepting: boolean }) {
  const [data, setData] = useState<SurveyFormData>({ firstName: "", lastName: "", telephone: "", answers: {}, website: "" });
  const [view, setView] = useState<SaveView>({ phase: "idle", finalizing: false });
  const saver = useRef<SurveyAutosave | null>(null);
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    if (!accepting) return;
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map(v => v.toString(16).padStart(2, "0")).join("");
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(v => v.toString(16).padStart(2, "0")).join("");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const controller = new SurveyAutosave(id, token, sendSurveyWrite, setView);
    saver.current = controller;
    controller.update(latest.current);
    const flush = () => { controller.update(latest.current); controller.flushOnExit(); };
    const hidden = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
      controller.flushOnExit();
      saver.current = null;
    };
  }, [accepting]);
  useEffect(() => {
    saver.current?.update(data);
    if (!accepting || !data.firstName.trim() || !data.lastName.trim()) return;
    const timeout = window.setTimeout(() => { void saver.current?.flush(); }, 1000);
    return () => window.clearTimeout(timeout);
  }, [data, accepting]);

  const namesPresent = Boolean(data.firstName.trim() && data.lastName.trim());
  const status = !accepting ? "Preview only: responses are not being collected."
    : !namesPresent ? "First and last name are needed to continue saving. Your latest edits have not been saved."
    : view.phase === "saved" ? "Saved automatically as an in-progress response."
    : view.phase === "saving" ? view.finalizing ? "Submitting your survey…" : "Saving your latest changes…"
    : view.phase === "error" ? "Your latest changes are not confirmed saved. Check your entries and connection, then retry."
    : "Latest changes not yet saved.";
  const disabled = !accepting || view.finalizing;
  const fieldClass = "mt-2 w-full rounded-md border border-[#d8e3ef] bg-white p-3 text-base focus:outline-[#004990]";
  const flushOnBlur = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.hasAttribute("data-survey-retry")) return;
    saver.current?.update(latest.current); void saver.current?.flush();
  };
  if (view.phase === "submitted") return <section aria-live="polite" className="rounded-md border border-[#004990] bg-white p-8"><h2 className="text-2xl font-bold text-[#004990]">Thank you for sharing your perspective.</h2><p className="mt-3">Your survey has been submitted and saved.</p></section>;
  return <form onSubmit={e => {
    e.preventDefault();
    if (!accepting || !namesPresent || view.phase === "saving" && view.finalizing) return;
    saver.current?.update(latest.current);
    void saver.current?.flush(true);
  }} className="space-y-8">
    {!accepting && <p role="status" className="rounded-md border border-[#d8e3ef] bg-white p-4">Preview only: responses are not being collected.</p>}
    <section aria-labelledby="your-details" className="rounded-md border border-[#d8e3ef] bg-white p-5 sm:p-7">
      <h3 id="your-details" className="text-xl font-bold text-[#004990]">Your details</h3>
      <p id="autosave-disclosure" className="mt-3 text-sm leading-relaxed">Once you enter your first and last name, your details and answers save automatically, including unfinished surveys you do not submit. Telephone is optional. Check the save status before leaving.</p>
      <fieldset disabled={disabled} aria-describedby="autosave-disclosure" className="mt-5 grid gap-5 sm:grid-cols-2">
        <label htmlFor="survey-firstName" className="font-semibold">First name <span aria-hidden="true">*</span><input id="survey-firstName" name="firstName" autoComplete="given-name" required maxLength={120} value={data.firstName} onChange={e => setData(d => ({ ...d, firstName: e.target.value }))} onBlur={flushOnBlur} className={fieldClass} /></label>
        <label htmlFor="survey-lastName" className="font-semibold">Last name <span aria-hidden="true">*</span><input id="survey-lastName" name="lastName" autoComplete="family-name" required maxLength={120} value={data.lastName} onChange={e => setData(d => ({ ...d, lastName: e.target.value }))} onBlur={flushOnBlur} className={fieldClass} /></label>
        <label htmlFor="survey-telephone" className="font-semibold sm:col-span-2">Telephone <span className="font-normal">(optional)</span><input id="survey-telephone" name="telephone" type="tel" autoComplete="tel" maxLength={80} value={data.telephone} onChange={e => setData(d => ({ ...d, telephone: e.target.value }))} onBlur={flushOnBlur} className={fieldClass} /></label>
      </fieldset>
      <div className="mt-4 min-h-[148px] sm:min-h-[100px]">
        <p role="status" aria-live="polite" className="text-sm font-semibold text-[#004990]">{status}</p>
        <div className="mt-3 h-6">{view.phase === "error" && <button data-survey-retry type="button" disabled={!namesPresent || !accepting} onClick={() => { void saver.current?.flush(view.finalizing); }} className="font-semibold text-[#004990] underline disabled:opacity-60">Retry saving</button>}</div>
      </div>
    </section>
    <p className="text-sm">Please do not include sensitive personal or financial information in written comments. Survey questions are optional.</p>
    <div aria-hidden="true" className="hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={data.website} onChange={e => setData(d => ({ ...d, website: e.target.value }))} /></label></div>
    <fieldset disabled={disabled} className="space-y-8 disabled:opacity-80">
      {SURVEY_QUESTIONS.filter(q => !q.commentFor).map(q => <fieldset aria-labelledby={`question-${q.id}`} key={q.id} className="rounded-md border border-[#d8e3ef] bg-white p-5 sm:p-7">
        <h3 id={`question-${q.id}`} className="mb-5 whitespace-pre-line text-base font-semibold text-[#004990]">{q.label}</h3>
        {q.type === "text" ? <><label htmlFor={`survey-${q.id}`} className="sr-only">{q.label}</label><textarea id={`survey-${q.id}`} maxLength={2000} rows={4} value={data.answers[q.id] as string ?? ""} onChange={e => setData(d => ({ ...d, answers: { ...d.answers, [q.id]: e.target.value } }))} onBlur={flushOnBlur} className={fieldClass} /><p className="mt-1 text-xs">Up to 2,000 characters.</p></> :
          <div className="space-y-3">{q.options?.map(option => <label key={option} className="flex cursor-pointer items-start gap-3 py-1">
            <input className="mt-1 h-5 w-5 shrink-0 accent-[#004990]" type={q.type === "multi" ? "checkbox" : "radio"} name={q.id} value={option} checked={q.type === "multi" ? (data.answers[q.id] as string[] ?? []).includes(option) : data.answers[q.id] === option} onChange={e => setData(d => ({ ...d, answers: { ...d.answers, [q.id]: q.type === "multi" ? (e.target.checked ? [...(d.answers[q.id] as string[] ?? []), option] : (d.answers[q.id] as string[] ?? []).filter(v => v !== option)) : option } }))} />
            <span>{option}</span>
          </label>)}</div>}
        {SURVEY_QUESTIONS.filter(c => c.commentFor === q.id).map(c => <div key={c.id} className="mt-5"><label htmlFor={`survey-${c.id}`} className="whitespace-pre-line text-sm font-semibold">{c.label}</label><textarea id={`survey-${c.id}`} maxLength={2000} rows={3} value={data.answers[c.id] as string ?? ""} onChange={e => setData(d => ({ ...d, answers: { ...d.answers, [c.id]: e.target.value } }))} onBlur={flushOnBlur} className={fieldClass} /><p className="mt-1 text-xs">Up to 2,000 characters.</p></div>)}
      </fieldset>)}
    </fieldset>
    <p className="text-sm font-semibold text-[#004990]">{status}</p>
    <button type="submit" disabled={!accepting || !namesPresent || view.finalizing && view.phase === "saving"} className="rounded-md bg-[#004990] px-7 py-4 font-semibold text-white disabled:opacity-60">{view.finalizing ? view.phase === "error" ? "Retry submission" : "Submitting…" : "Submit survey"}</button>
  </form>;
}
