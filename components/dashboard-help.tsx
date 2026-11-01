"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, CircleHelp, Search, X } from "lucide-react";
import { searchTopics, sectionTopicsFor, taskTopicsFor, topicForTab, type HelpClient, type HelpTopic } from "@/lib/dashboard-help";

/** Optional topic catalog for dashboards outside the five client set (e.g. the fictional sample dashboard). */
export interface HelpCatalog { sections: HelpTopic[]; tasks: HelpTopic[]; search: (q: string) => HelpTopic[]; topicForTab: (tab?: string) => HelpTopic | undefined }

/** Help button + indexed, searchable how-to panel for the employee data dashboards. Read-only: no network calls. */
export function DashboardHelp({ client, catalog, currentTab }: { client?: HelpClient; catalog?: HelpCatalog; currentTab?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileList, setMobileList] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const forTab = (tab?: string) => (catalog ? catalog.topicForTab(tab) : client ? topicForTab(client, tab) : undefined);
  const sections = useMemo(() => catalog?.sections ?? (client ? sectionTopicsFor(client) : []), [client, catalog]);
  const tasks = useMemo(() => catalog?.tasks ?? (client ? taskTopicsFor(client) : []), [client, catalog]);
  const results = useMemo(() => (q.trim() ? (catalog ? catalog.search(q) : client ? searchTopics(client, q) : []) : null), [client, catalog, q]);
  const byId = useMemo(() => new Map([...sections, ...tasks].map((t) => [t.id, t])), [sections, tasks]);
  const topic = (selected && byId.get(selected)) || forTab(currentTab) || sections[0];

  // Opening always starts on the section the user is looking at.
  const onOpenChange = (o: boolean) => {
    if (o) { setSelected(forTab(currentTab)?.id ?? sections[0]?.id ?? null); setQ(""); setMobileList(false); }
    setOpen(o);
  };
  const pick = (id: string) => { setSelected(id); setMobileList(false); };
  useEffect(() => { contentRef.current?.scrollTo?.({ top: 0 }); }, [selected]);

  const indexItem = (t: HelpTopic) => (
    <li key={t.id}>
      <button
        type="button"
        onClick={() => pick(t.id)}
        aria-current={t.id === topic?.id ? "true" : undefined}
        className={`w-full rounded-md px-3 py-2 text-left text-sm ${t.id === topic?.id ? "bg-[rgb(var(--navy))] text-white" : "text-[rgb(var(--ink))]/80 hover:bg-[rgb(var(--brass))]/10"}`}
      >
        {t.title}
      </button>
    </li>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 self-center rounded-full border border-[rgb(var(--brass))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--navy))] hover:bg-[rgb(var(--brass))]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brass))]"
          aria-label={`Help${currentTab ? ` for ${currentTab}` : ""}`}
        >
          <CircleHelp className="h-4 w-4" aria-hidden />Help
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--navy))]/40" />
        <DialogPrimitive.Content
          data-testid="dashboard-help"
          className="fixed inset-0 z-50 flex flex-col bg-[rgb(var(--paper))] shadow-2xl focus:outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(880px,100vw)] sm:border-l sm:border-[rgb(var(--line))]"
        >
          <header className="flex items-center gap-3 bg-[rgb(var(--navy))] px-5 py-4 text-white">
            <CircleHelp className="h-5 w-5 text-[rgb(var(--brass-light))]" aria-hidden />
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-display text-xl">Dashboard help</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-white/70">Step-by-step instructions for each section. Press Escape to close.</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1.5 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="Close help">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </header>

          <div className="border-b border-[rgb(var(--line))] bg-white px-5 py-3">
            <label className="relative block">
              <span className="sr-only">Search help</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--ink))]/40" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => { setQ(e.target.value); setMobileList(!!e.target.value.trim()); }}
                placeholder="Search help (e.g. merge, pledge, Excel)"
                className="w-full rounded-md border border-[rgb(var(--line))] py-2 pl-9 pr-3 text-sm"
              />
            </label>
          </div>

          <div className="flex min-h-0 flex-1">
            <nav
              aria-label="Help topics"
              className={`${mobileList ? "block" : "hidden"} w-full shrink-0 overflow-y-auto border-r border-[rgb(var(--line))] bg-white p-3 sm:block sm:w-64`}
            >
              {results ? (
                <>
                  <p className="px-3 pb-2 text-xs text-[rgb(var(--ink))]/60" role="status" aria-live="polite">
                    {results.length ? `${results.length} topic${results.length === 1 ? "" : "s"} found` : "No help topics match. Try a different word."}
                  </p>
                  <ul className="space-y-0.5">{results.map(indexItem)}</ul>
                </>
              ) : (
                <>
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">Sections</p>
                  <ul className="space-y-0.5">{sections.map(indexItem)}</ul>
                  <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">How to</p>
                  <ul className="space-y-0.5">{tasks.map(indexItem)}</ul>
                </>
              )}
            </nav>

            <div ref={contentRef} className={`${mobileList ? "hidden" : "block"} min-w-0 flex-1 overflow-y-auto p-5 sm:block sm:p-7`}>
              {topic && (
                <article aria-labelledby="help-topic-title">
                  <button type="button" onClick={() => setMobileList(true)} className="mb-3 inline-flex items-center gap-1 text-sm text-[rgb(var(--navy))] underline sm:hidden">
                    <ArrowLeft className="h-4 w-4" aria-hidden />All topics
                  </button>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">{topic.kind === "section" ? "Section" : "How to"}</p>
                  <h3 id="help-topic-title" className="font-display mt-1 text-2xl text-[rgb(var(--navy))]">{topic.title}</h3>
                  <p className="mt-2 text-sm text-[rgb(var(--ink))]/75">{topic.summary}</p>
                  <ol className="mt-5 space-y-3">
                    {topic.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm text-[rgb(var(--ink))]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--navy))] text-xs font-semibold text-white" aria-hidden>{i + 1}</span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                  {!!topic.notes?.length && (
                    <div className="mt-6 rounded-lg border border-[rgb(var(--brass))]/40 bg-[rgb(var(--brass))]/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--navy))]">Good to know</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[rgb(var(--ink))]/80">{topic.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                    </div>
                  )}
                  {!!topic.related?.length && (
                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">Related</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {topic.related.map((id) => byId.get(id)).filter((t): t is HelpTopic => !!t).map((t) => (
                          <button key={t.id} type="button" onClick={() => pick(t.id)} className="rounded-full border border-[rgb(var(--line))] bg-white px-3 py-1 text-xs text-[rgb(var(--navy))] hover:border-[rgb(var(--brass))]">{t.title}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
