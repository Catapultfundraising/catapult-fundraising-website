"use client";
import { nativeHistoryDetail, type NativeDonorHistory } from "@/lib/portal-v2/pvas-native-consumer";

const value = (x: string | number | null) => x === null ? "Not recorded" : x === "" ? "(blank)" : String(x);
/** Original detail only. Do not derive cash/lifetime/calendar-year totals here. */
export function PvasNativeHistory({ history, cptid }: { history: NativeDonorHistory; cptid: number }) {
  const rows = nativeHistoryDetail(history, cptid);
  return <section className="rounded-xl border border-[rgb(var(--line))] p-4">
    <h3 className="font-display text-lg text-[rgb(var(--navy))]">Gift history</h3>
    <p className="mt-1 text-sm">Original amounts, dates, years and statuses are shown below. This history is read-only.</p>
    <div className="mt-3 overflow-auto"><table className="w-full text-left text-sm">
      <thead><tr>{["Original amount", "Date", "Year", "Status", "Campaign", "Fund", "Type", "Note", "Loaded at"].map(label=><th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={row.giftId} className="border-t border-[rgb(var(--line))]">
        {[row.amount,row.date,row.year,row.status,row.campaign,row.fund,row.type,row.note,row.loadedAt].map((cell,i)=><td key={i} className="px-3 py-2">{value(cell)}</td>)}
      </tr>)}</tbody>
    </table></div>
    {!rows.length && <p className="mt-2 text-sm">No gift history recorded.</p>}
  </section>;
}
