"use client";

import { useEffect, useState } from "react";

type AskState = { edited: boolean; ask: number | null; oldAsk: number | null; by?: string; at?: string };
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Editable campaign ask on a prospect record. Edits are saved to Azure SQL (engage.portal_updates via Portal v2)
 *  and win over the weekly refresh; the value it replaced is kept as the Old ask amount. */
export function AskAmountPanel({ client, cptid, base }: { client: string; cptid: number; base: number }) {
  const [st, setSt] = useState<AskState | null>(null);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const api = `/api/${client}-data-v2`;
  const post = (body: Record<string, unknown>) => fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, cptid }) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Could not save"); return j as AskState; });
  useEffect(() => { setSt(null); setEditing(false); setErr(""); post({ op: "getAsk" }).then(setSt).catch(() => setSt({ edited: false, ask: null, oldAsk: null })); }, [cptid]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = st?.edited ? st.ask ?? 0 : base;
  async function save() {
    setBusy(true); setErr("");
    try { setSt(await post({ op: "setAsk", amount: val, current })); setEditing(false); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="mb-4 flex flex-wrap items-end gap-6 rounded-xl border border-[rgb(var(--brass))]/50 bg-[rgb(var(--brass))]/5 p-3">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">Campaign ask amount</p>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
            <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              inputMode="decimal" placeholder="$0" className="w-36 rounded-md border border-[rgb(var(--line))] px-2 py-1 text-sm" />
            <button onClick={save} disabled={busy} className="rounded-md bg-[rgb(var(--navy))] px-3 py-1 text-xs font-medium text-white disabled:opacity-50">{busy ? "Saving..." : "Save"}</button>
            <button onClick={() => setEditing(false)} className="text-xs underline">Cancel</button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-3">
            <p className="font-display text-xl text-[rgb(var(--navy))]">{st === null ? "..." : current ? usd(current) : "Not set"}</p>
            {st !== null && <button onClick={() => { setVal(current ? String(current) : ""); setEditing(true); }} className="rounded-md border border-[rgb(var(--navy))] px-2.5 py-0.5 text-xs font-medium text-[rgb(var(--navy))]">Edit</button>}
          </div>
        )}
        {err && <p className="mt-1 text-xs text-[rgb(var(--navy))]">{err}</p>}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[rgb(var(--ink))]/55">Old ask amount</p>
        <p className="mt-1 font-display text-xl text-[rgb(var(--ink))]/70">{st?.edited ? (st.oldAsk ? usd(st.oldAsk) : "None") : "None"}</p>
      </div>
      {st?.edited && st.by && <p className="text-[11px] text-[rgb(var(--ink))]/55">Updated by {st.by}{st.at ? ` · ${String(st.at).slice(0, 10)}` : ""}</p>}
    </div>
  );
}
