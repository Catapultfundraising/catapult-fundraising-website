// Study interview timestamps are instants from VanillaSoft, not UTC calendar dates.
// Choose the Pacific date explicitly so server/browser timezone cannot change it.
const PACIFIC_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "numeric",
  day: "numeric",
  year: "numeric",
});

export function formatStudyDate(value: string): string {
  if (!value) return "";
  const input = value.trim();
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const usDay = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input);
  // A date-only value already identifies a calendar day. Never interpret its
  // midnight as a UTC instant and move it back to the previous Pacific day.
  if (isoDay || usDay) {
    const [year, month, day] = isoDay
      ? [isoDay[1], isoDay[2], isoDay[3]]
      : [usDay![3], usDay![1], usDay![2]];
    const canonical = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${canonical}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== canonical) return "";
    return `${Number(month)}/${Number(day)}/${year}`;
  }
  // The API's timestamps carry Z or an explicit offset. Reject ambiguous
  // timezone-less strings rather than letting the host choose their meaning.
  if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(input)) return "";
  const instant = new Date(input);
  return Number.isNaN(instant.getTime()) ? "" : PACIFIC_DATE.format(instant);
}
