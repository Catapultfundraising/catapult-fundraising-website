export function FeasibilityReportOutline() {
  return (
    <section aria-labelledby="report-outline" className="mx-auto max-w-7xl px-6 pb-14 lg:px-10">
      <div className="rounded-2xl border border-[rgb(var(--line))] bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">Illustrative outline — not a client report</p>
        <h2 id="report-outline" className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">What the feasibility report covers</h2>
        <p className="mt-3 max-w-3xl text-lg text-[rgb(var(--ink))]/75">An outline of the findings, observations and recommendations described above. No donor responses or client results are shown here.</p>
        <ol className="mt-6 grid gap-6 text-lg leading-relaxed text-[rgb(var(--ink))]/75 md:grid-cols-3">
          <li><h3 className="font-semibold text-[rgb(var(--navy))]">1. Findings</h3><p className="mt-2">Interview comments, giving ranges signaled by key prospects and leadership interest.</p></li>
          <li><h3 className="font-semibold text-[rgb(var(--navy))]">2. Observations</h3><p className="mt-2">Which parts of the case for support resonate and which get in the way.</p></li>
          <li><h3 className="font-semibold text-[rgb(var(--navy))]">3. Recommendations</h3><p className="mt-2">Recommended goal, gift chart scenarios, leadership prospect list, campaign timetable, staffing and communications priorities.</p></li>
        </ol>
      </div>
    </section>
  );
}
