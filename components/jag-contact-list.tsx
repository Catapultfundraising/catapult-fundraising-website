"use client";

import { useState } from "react";
import type { ContactRow, ContactStatus } from "@/lib/jag-data";

const STATUS_FILTERS: Array<ContactStatus | "All"> = [
  "All",
  "Completed",
  "Scheduled",
  "To Be Rescheduled",
  "Declined",
  "Deceased",
];

const STATUS_DOT: Record<ContactStatus, string> = {
  Completed: "bg-emerald-500",
  Scheduled: "bg-[rgb(var(--brass))]",
  "To Be Rescheduled": "bg-amber-500",
  Declined: "bg-rose-400",
  Deceased: "bg-[rgb(var(--ink))]/40",
};

export function JagContactList({ rows }: { rows: ContactRow[] }) {
  const [filter, setFilter] = useState<ContactStatus | "All">("All");
  const filtered = filter === "All" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      <p className="text-xs text-[rgb(var(--ink))]/55">
        {filtered.length} of {rows.length} named contacts shown
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              filter === s
                ? "border-[rgb(var(--navy))] bg-[rgb(var(--navy))] text-white"
                : "border-[rgb(var(--line))] text-[rgb(var(--ink))]/70 hover:border-[rgb(var(--navy))]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[560px] overflow-y-auto overflow-x-auto rounded-xl border border-[rgb(var(--line))]">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="sticky top-0 bg-[rgb(var(--paper))]">
            <tr>
              {["Name", "Organization", "Status", "Interview Date", "Reason / Notes"].map((h) => (
                <th
                  key={h}
                  className="border-b border-[rgb(var(--line))] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/55"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.name + r.status + i} className="border-b border-[rgb(var(--line))]/70 last:border-0">
                <td className="px-3 py-2 text-[rgb(var(--navy))]">{r.name}</td>
                <td className="px-3 py-2 text-[rgb(var(--ink))]/75">{r.org || "—"}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[rgb(var(--ink))]/80">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-[rgb(var(--ink))]/75">{r.date || "—"}</td>
                <td className="px-3 py-2 text-[rgb(var(--ink))]/75">{r.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
