"use client";
import { pvasActionFetch } from "@/lib/portal-v2/pvas-action.client";
import { pendingCampaignChange, newCampaignRequestId, submitCampaignChange, checkCampaignChange } from "@/lib/portal-v2/pvas-native-mutation.client";
import { pvasCanonicalEnabled } from "@/lib/portal-v2/pvas-canonical";
import { uploadUndoPolicy, uploadHistoryRowKey, completePvasUploadHistory } from "@/lib/portal-v2/pvas-upload-history";
import { moneyInput } from "@/lib/portal-v2/pvas-financials";
import {usdExact}from"@/lib/portal-v2/pvas-financials";
import {pvasGiftMetadata}from"@/lib/portal-v2/pvas-gift-wire";
import {pvasContactProfile,pvasProspectChanges}from"@/lib/portal-v2/pvas-contact-wire";
import { MonthlyGiftUpload } from "@/components/monthly-gift-upload";
import {currentDashboardSnapshot} from "@/lib/portal-v2/current-dashboard-snapshot";

import { assignmentSnapshot, type Assignment, type AssignmentTracking } from "@/lib/portal-v2/effective-assignment";
import { DirectDashboardUpload } from "@/components/direct-dashboard-upload";
import { directSnapshot, type DirectClientView } from "@/lib/portal-v2/direct-snapshot";
import { askEdits, overlayCampaignAsks } from "@/lib/portal-v2/effective-ask";
import { buildOverlay, type UpdateRow } from "@/lib/portal-v2/record-overlay";

import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PORTAL_V2, campaignByLevel, type PortalClient, type PortalGift, type PortalState, type PortalBatch } from "@/lib/portal-v2/clients";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DuplicatesPanel, refreshCrmIndex } from "@/components/record-tools";
import { DateInput, NameLink, isoToUs, parseUsDateClient, useSort, SortTh } from "@/components/dashboard-shared";

// Portal v2 shared UI: campaign progress bar, Campaign Donors (gift-chart levels),
// Add Prospect, manual gift/pledge entry, bulk client-file upload with preview, audit log + undo.

type V2State = PortalState & { goal: number; configured: boolean; error?: string; directView?: DirectClientView; directSourceRevision?: string };
interface Ctx { client: PortalClient; state: V2State | null; loading: boolean; reload: () => Promise<void> }
const V2 = createContext<Ctx | null>(null);
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
const card = "rounded-lg border border-[rgb(var(--line))] bg-white p-5";
const input = "w-full rounded border border-[rgb(var(--line))] px-3 py-2 text-sm";
const btn = "rounded bg-[rgb(var(--navy))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
const btn2 = "rounded border border-[rgb(var(--navy))] px-4 py-2 text-sm font-medium text-[rgb(var(--navy))] disabled:opacity-50";
const th = "px-3 py-2 text-left text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55";
const td = "px-3 py-2 text-sm";

export function PortalV2Provider({ client, children }: { client: PortalClient; children: React.ReactNode }) {
  const [state, setState] = useState<V2State | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      const r = await fetch(PORTAL_V2[client].api, { cache: "no-store" });
      if (!r.ok) throw new Error("Current state unavailable");
      let next: V2State = await r.json();
      if (pvasCanonicalEnabled(client)) next = await completePvasUploadHistory(next, async before => {
        const page = await fetch(PORTAL_V2[client].api, { method: "POST", cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ op: "pvasHistoricalUploads", before, limit: 200 }) });
        if (!page.ok) throw new Error("PVAS upload history unavailable");
        return page.json();
      });
      setState(next);
    } catch { setState(previous => previous ? { ...previous, configured: false, error: "Current state unavailable; retained last good data, not current success" } : null); }
    finally { setLoading(false); }
  }, [client]);
  useEffect(() => {
    const refresh = () => { void reload(); };
    refresh(); window.addEventListener("campaign-ask-refresh", refresh);
    return () => window.removeEventListener("campaign-ask-refresh", refresh);
  }, [reload]);
  return <V2.Provider value={{ client, state, loading, reload }}>{children}</V2.Provider>;
}
export function useCampaignDataStatus() { const { state, loading } = useV2(); return { loading, available: !!state && state.configured !== false && !state.error }; }
export function useCampaignAskSnapshot<T extends object>(snapshot: T, index?: ({ cptid: number } & Partial<Assignment>)[] | null, tracking?: AssignmentTracking): T & { directReadUnavailable?: boolean } {
  const { client, state } = useV2();
  return useMemo(() => {
    const updates = (state?.updates ?? []) as UpdateRow[];
    if (state?.directSourceRevision && (index as unknown as { directSourceRevision?: string })?.directSourceRevision !== state.directSourceRevision)
      return { ...snapshot, directReadUnavailable: true };
    if (pvasCanonicalEnabled(client)) {
      if (!index || !tracking) return { ...snapshot, directReadUnavailable: true };
      try { return currentDashboardSnapshot(client,snapshot,index,tracking,updates,state?.directView); }
      catch { return { ...snapshot, directReadUnavailable: true }; }
    }
    return currentDashboardSnapshot(client,snapshot,index??null,tracking,updates,state?.directView);
  }, [snapshot, state, client, index, tracking]);
}
function useV2() { const c = useContext(V2); if (!c) throw new Error("PortalV2Provider missing"); return c; }
async function post(client: PortalClient, body: unknown) {
  const r = await pvasActionFetch(client, PORTAL_V2[client].api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
function useBy() {
  const [by, setBy] = useState("");
  useEffect(() => { setBy(localStorage.getItem("portal-v2-by") ?? ""); }, []);
  return [by, (v: string) => { setBy(v); localStorage.setItem("portal-v2-by", v); }] as const;
}

/** Progress toward the campaign goal (gifts + pledges, no double counting of pledge payments). */
export function CampaignProgress({ goal: selectedGoal }: { goal?: number } = {}) {
  const { client, state } = useV2();
  const cfg = PORTAL_V2[client];
  const goal = selectedGoal ?? state?.goal ?? cfg.goal;
  const c = useMemo(() => campaignByLevel(cfg.chart(goal), state?.gifts ?? []), [cfg, goal, state]);
  if (!state) return null;
  const share = Math.min(1, c.raised / goal);
  return (
    <div className={`${card} mb-6`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Campaign total including pledges</p>
          <p className="font-display text-2xl text-[rgb(var(--navy))]">{usd(c.raised)} <span className="text-base text-[rgb(var(--ink))]/60">of {usd(goal)} goal</span></p>
        </div>
        <p className="text-sm text-[rgb(var(--ink))]/70">{pct(c.raised / goal)} secured · {c.donors.length} donors · gifts {usd(c.totalGifts)} · pledges {usd(c.totalPledges)}</p>
      </div>
      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-[rgb(var(--paper))]" role="progressbar" aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[rgb(var(--brass))]" style={{ width: `${share * 100}%` }} />
      </div>
      {!state.configured && <p className="mt-2 text-xs text-red-700">Campaign entries are unavailable right now ({state.error}).</p>}
    </div>
  );
}

export function CampaignDonors() {
  const { client, state } = useV2();
  const cfg = PORTAL_V2[client];
  const [goalText, setGoalText] = useState(String(cfg.goal));
  const goal = Math.min(500_000_000, Math.max(100_000, Number(goalText.replace(/[^\d]/g, "")) || cfg.goal));
  const c = useMemo(() => campaignByLevel(cfg.chart(goal), state?.gifts ?? []), [cfg, goal, state]);
  const [open, setOpen] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  async function download(format: "pdf" | "xlsx") {
    setDownloading(true); setDownloadError("");
    try {
      const r = await fetch(`${cfg.api}?report=campaign&format=${format}&goal=${goal}`, { cache: "no-store" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Download failed. Please try again.");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a"); a.href = url;
      a.download = r.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `${client.toUpperCase()} Campaign Donors.${format}`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { setDownloadError((e as Error).message); }
    finally { setDownloading(false); }
  }
  if (!state) return <p className="text-sm">Loading…</p>;
  return (
    <div className="space-y-6">
      <CampaignProgress goal={goal} />
      <div className={card}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-[rgb(var(--navy))]">Campaign donors by gift-chart level</h2>
            <p className="text-sm text-[rgb(var(--ink))]/65">Click a level to see every donor in it; click a name to open the record. {pvasCanonicalEnabled(client)?"Campaign gifts and pledges reflect current donor records; online activity is shown separately.":"Campaign gifts and pledges from the client database (live SQL), client uploads and portal entries."} Each donor sits at the highest level their commitment reaches (the larger of pledged or given, so pledge payments are not counted twice).</p>
          </div>
          <label className="text-xs uppercase tracking-wider text-[rgb(var(--ink))]/55">Campaign goal
            <input className={`${input} mt-1 w-40`} value={goalText} onChange={(e) => setGoalText(e.target.value)} />
          </label>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={btn2} disabled={downloading || !state.configured} onClick={() => void download("pdf")}>Download PDF</button>
          <button className={btn2} disabled={downloading || !state.configured} onClick={() => void download("xlsx")}>Download Excel</button>
          {downloading && <span className="self-center text-sm">Preparing download…</span>}
        </div>
        {downloadError && <p role="alert" className="mb-3 text-sm">{downloadError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[rgb(var(--line))]">
              <th className={th}>Gift level</th><th className={`${th} text-right`}>Gifts needed</th><th className={`${th} text-right`}>Secured</th><th className={`${th} text-right`}>Remaining</th>
              <th className={`${th} text-right`}>Level total</th><th className={`${th} text-right`}>Secured $</th><th className={`${th} text-right`}>Remaining $</th>
            </tr></thead>
            <tbody>
              {c.levels.map((l) => (
                <Fragment key={l.level}>
                  <tr className="cursor-pointer border-b border-[rgb(var(--line))] hover:bg-[rgb(var(--paper))]" onClick={() => setOpen(open === l.level ? null : l.level)}>
                    <td className={`${td} font-medium`}>{usd(l.level)} {l.donors.length > 0 && <span className="text-xs text-[rgb(var(--ink))]/50">{open === l.level ? "▾" : "▸"}</span>}</td>
                    <td className={`${td} text-right`}>{l.gifts}</td><td className={`${td} text-right`}>{l.secured}</td><td className={`${td} text-right`}>{l.remaining}</td>
                    <td className={`${td} text-right`}>{usd(l.value)}</td><td className={`${td} text-right`}>{usd(l.securedValue)}</td><td className={`${td} text-right`}>{usd(l.remainingValue)}</td>
                  </tr>
                  {open === l.level && l.donors.map((d) => (
                    <tr key={`${l.level}-${d.key}`} className="bg-[rgb(var(--paper))]/60 text-[rgb(var(--ink))]/80">
                      <td className={`${td} pl-8`} colSpan={3}><NameLink name={d.name} cptid={d.cptid} />{d.cptid ? <span className="text-xs text-[rgb(var(--ink))]/50"> · CPTID {d.cptid}</span> : null}</td>
                      <td className={td} colSpan={2}>Pledged {usd(d.pledges)} · Given {usd(d.gifts)}</td>
                      <td className={`${td} text-right`} colSpan={2}>{usd(d.credit)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr className="cursor-pointer border-b border-[rgb(var(--line))] hover:bg-[rgb(var(--paper))]" onClick={() => setOpen(open === -1 ? null : -1)}>
                <td className={`${td} font-medium`}>Below {usd(Math.min(...c.levels.map((l) => l.level)))} {c.below.length > 0 && <span className="text-xs text-[rgb(var(--ink))]/50">{open === -1 ? "▾" : "▸"}</span>}</td><td className={`${td} text-right`}>—</td><td className={`${td} text-right`}>{c.below.length}</td><td className={td} />
                <td className={td} /><td className={`${td} text-right`}>{usd(c.belowValue)}</td><td className={td} />
              </tr>
              {open === -1 && c.below.map((d) => (
                <tr key={`below-${d.key}`} className="bg-[rgb(var(--paper))]/60 text-[rgb(var(--ink))]/80">
                  <td className={`${td} pl-8`} colSpan={3}><NameLink name={d.name} cptid={d.cptid} />{d.cptid ? <span className="text-xs text-[rgb(var(--ink))]/50"> · CPTID {d.cptid}</span> : null}</td>
                  <td className={td} colSpan={2}>Pledged {usd(d.pledges)} · Given {usd(d.gifts)}</td>
                  <td className={`${td} text-right`} colSpan={2}>{usd(d.credit)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={td}>Total</td><td className={td} /><td className={`${td} text-right`}>{c.donors.length}</td><td className={td} />
                <td className={`${td} text-right`}>{usd(goal)}</td><td className={`${td} text-right`}>{usd(c.raised)}</td><td className={`${td} text-right`}>{usd(Math.max(0, goal - c.raised))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <GiftForm />
      <AllGifts />
    </div>
  );
}

function giftId(g: PortalGift) { return g._nativeGift ? `native:${g._nativeGift.giftId}` : Number(g.id) > 0 ? String(g.id) : g.key ?? String(g.id); }
function AllGifts() {
  const { client, state, reload } = useV2();
  const [by, setBy] = useBy();
  const [mode, setMode] = useState<{ id: string; kind: "edit" | "void";original?:PortalGift } | null>(null);
  const [f, setF] = useState({ amount: "", kind: "pledge", date: "", note: "", reason: "" });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [pendingChange, setPendingChange] = useState(false);
  useEffect(() => {
    if (!pvasCanonicalEnabled(client)) return;
    try { setPendingChange(!!pendingCampaignChange()); }
    catch { setPendingChange(true); setMsg("The saved change could not be verified. Keep this tab and ask for help before making another change."); }
  }, [client]);
  const editorName = useRef<HTMLInputElement>(null);
  const voidReason = useRef<HTMLInputElement>(null);
  const gso = useSort([...(state?.gifts ?? [])].reverse().map((g) => ({ ...g, amount: Number(g.amount), src: g._nativeGift ? (g._nativeGift.representation === "admitted-event" ? "Recorded gift" : g._nativeGift.source.system === "website_db" ? "Client database" : "Portal entry") : g.source === "database" ? (g.created_by || "Client database") : g.source === "upload" ? "Client file" : "Portal entry" })), (r, k) => (r as unknown as Record<string, unknown>)[k]);
  if (!state) return null;
  const start = (g: PortalGift, kind: "edit" | "void") => {
    if (pvasCanonicalEnabled(client) && (!state.databaseGiftEditsAvailable || pendingChange || g._nativeGift?.representation !== "native-campaign")) { setMsg("Gift changes are currently unavailable."); return; }
    setMsg("");setMode({id:giftId(g),kind,...(pvasCanonicalEnabled(client)?{original:structuredClone(g)}:{})});
    setF({amount:String(g.amount),kind:g.kind,date:g._nativeGift ? g.gift_date ?? "" : isoToUs(g.gift_date),note:g.note??"",reason:""});
  };
  const base = (g: PortalGift) => ({ id: Number(g.id) > 0 ? Number(g.id) : undefined, key: Number(g.id) > 0 ? undefined : g.key, cptid: g.cptid, donorName: g.donor_name,
    original: { amount: Number(g.amount), kind: g.kind, date: g.gift_date, name: g.donor_name, cptid: g.cptid } });
  const save = async (g: PortalGift) => {
    if (pvasCanonicalEnabled(client) && (!state.databaseGiftEditsAvailable || pendingChange)) { setMsg("Gift changes are currently unavailable."); return; }
    if (!by.trim()) { setMsg("Enter your name below so we can record who made this change."); editorName.current?.focus(); return; }
    setBusy(true); setMsg("");
    try {
      if(pvasCanonicalEnabled(client)){
        const meta=g._nativeGift;
        if (!meta || meta.representation !== "native-campaign") throw new Error("This gift cannot be changed here.");
        const command={v:3 as const,requestId:newCampaignRequestId(),rootCptid:meta.cptid,
          target:{giftId:meta.giftId,expectedVersion:meta.version,source:meta.source}};
        if(mode?.kind==="void"){
          if(!f.reason.trim())throw new Error("Enter a reason for voiding");
          await submitCampaignChange(PORTAL_V2[client].api,{op:"nativeCampaignMutationV3",client:"pvas",by,command:{...command,action:"void",reason:f.reason}});
        }else{
          if(f.kind!=="gift"&&f.kind!=="pledge")throw new Error("Choose Gift or Pledge.");
          await submitCampaignChange(PORTAL_V2[client].api,{op:"nativeCampaignMutationV3",client:"pvas",by,command:{...command,action:"edit",
            values:{amount:f.amount,kind:f.kind,date:f.date,note:f.note}}});
        }
        await reload();setMode(null);setMsg("Saved. The existing record was updated.");return;
      }
      if (mode?.kind === "void") {
        if (!f.reason.trim()) { setMsg("Enter a reason for voiding."); voidReason.current?.focus(); return; }
        await post(client, { op: "voidGift", by, reason: f.reason, gift: base(g) });
        setMsg(`Voided. Reason, your name and the time are saved.`);
      } else {
        const d = parseUsDateClient(f.date);
        if (d === null) { setMsg("Use MM/DD/YYYY for the date."); return; }
        await post(client, { op: "editGift", by, gift: { ...base(g), amount: f.amount, kind: f.kind, date: f.date, note: f.note } });
        setMsg("Saved. The existing record was updated.");
      }
      await reload(); setMode(null);
    } catch (e) {
      if(pvasCanonicalEnabled(client)) { try { setPendingChange(!!pendingCampaignChange()); } catch { setPendingChange(true); } }
      setMsg((e as Error).message);
    } finally { setBusy(false); }
  };
  const checkSaved = async () => {
    setBusy(true);
    try {
      const result=await checkCampaignChange(PORTAL_V2[client].api);
      if(result.status==="committed"){setPendingChange(false);setMode(null);await reload();setMsg("Saved. The current record has been reloaded.");}
      else setMsg("This change is not yet confirmed. Do not resend it; check again later.");
    } catch {setMsg("The change could not be confirmed. Keep the saved change and check again later.");}
    finally {setBusy(false);}
  };
  const voided = state.voidedGifts ?? [];
  const dbVoids = (state.giftOverrides ?? []).filter((o) => o.voided);
  const activeGift = mode?.original??state.gifts.find((g) => giftId(g) === mode?.id);
  return (
    <div className={card}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-display text-lg text-[rgb(var(--navy))]">All campaign gifts and pledges</h3>
        <label className="text-xs">Your name (required to edit or void)<input className={`${input} mt-1 w-56`} value={by} onChange={(e) => setBy(e.target.value)} /></label>
      </div>
      <p className="mt-1 text-xs text-[rgb(var(--ink))]/55">{pvasCanonicalEnabled(client) ? state.databaseGiftEditsAvailable ? "Edit updates the existing gift or pledge. Void removes it from campaign totals and keeps the reason and history." : "Gift changes are currently unavailable." : "Edit changes the existing gift or pledge (no second record). Void removes a duplicate or mistake from the totals; it asks for a reason and keeps who and when. Corrections to client-database rows are saved in the client's SQL tables and always applied."}</p>
      {pvasCanonicalEnabled(client)&&pendingChange&&<button className={`${btn2} mt-2`} disabled={busy} onClick={checkSaved}>Check saved change</button>}
      {msg && !mode && <p role="status" aria-live="polite" className="mt-2 rounded border border-[rgb(var(--brass))] p-3 text-sm">{msg}</p>}
      <div className="mt-3 max-h-[560px] overflow-auto">
        <table className="w-full"><thead><tr className="border-b border-[rgb(var(--line))]"><SortTh s={gso} k="gift_date" label="Date" className={th} /><SortTh s={gso} k="donor_name" label="Donor" className={th} /><SortTh s={gso} k="kind" label="Type" className={th} /><SortTh s={gso} k="amount" label="Amount" className={`${th} text-right`} /><SortTh s={gso} k="src" label="Source" className={th} /><SortTh s={gso} k="note" label="Note" className={th} /><th className={th} /></tr></thead>
          <tbody>{gso.sorted.map((g) => (
            <Fragment key={giftId(g)}>
              <tr className="border-b border-[rgb(var(--line))]"><td className={td}>{g._nativeGift ? g.gift_date ?? "Unknown date" : isoToUs(g.gift_date)}</td><td className={td}><NameLink name={g.donor_name} cptid={g.cptid} />{g.cptid ? <span className="text-xs text-[rgb(var(--ink))]/50"> · {g.cptid}</span> : null}</td>
                <td className={td}>{g.kind === "pledge" ? "Pledge" : "Gift"}</td><td className={`${td} text-right`}>{g.amountExact?usdExact(g.amountExact):usd(Number(g.amount))}{g.corrected ? <div className="text-[11px] text-[rgb(var(--ink))]/50">was {usd(g.corrected.from)}, corrected by {g.corrected.by}</div> : null}</td>
                <td className={td}>{g.src}</td><td className={td}>{g.note ?? ""}</td>
                <td className={`${td} whitespace-nowrap text-right`}>{(g._nativeGift || Number(g.id) > 0 || g.key) && <>
                  <button className="text-xs font-semibold text-[rgb(var(--navy))] hover:underline disabled:opacity-50" disabled={pvasCanonicalEnabled(client)&&(!state.databaseGiftEditsAvailable||pendingChange||g._nativeGift?.representation!=="native-campaign")} onClick={() => start(g, "edit")}>Edit</button>
                  <button className="ml-3 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50" disabled={pvasCanonicalEnabled(client)&&(!state.databaseGiftEditsAvailable||pendingChange||g._nativeGift?.representation!=="native-campaign")} onClick={() => start(g, "void")}>Void</button></>}</td></tr>
            </Fragment>
          ))}</tbody></table>
        {!state.gifts.length && <p className="py-4 text-sm text-[rgb(var(--ink))]/60">No campaign gifts or pledges recorded yet.</p>}
      </div>
      {!!state.otherCanonicalGifts?.length&&<details className="mt-3"><summary>Other canonical gift rows (not counted in USD hard-credit campaign totals)</summary><ul className="text-sm">{state.otherCanonicalGifts.map((row,i)=>{const g=pvasGiftMetadata(row._canonicalGift).gift;return <li key={g.giftId??i}>{g.donorName??`CPTID ${g.cptid}`} · {g.amount} {g.currency} · {g.scope} · {g.credit} · {g.kind} · {g.status}</li>;})}</ul></details>}
      <Dialog open={!!(mode && activeGift)} onOpenChange={(open) => { if (!open && !busy) { setMode(null); setMsg(""); } }}>
        {mode && activeGift && <DialogContent className="z-[100] max-h-[85vh] max-w-2xl overflow-y-auto bg-white text-[rgb(var(--navy))]">
          <DialogTitle>{mode.kind === "edit" ? "Edit" : "Void"} {activeGift.donor_name}&rsquo;s {activeGift.kind}</DialogTitle>
          <DialogDescription>Your name is saved in the audit history. {mode.kind === "edit" ? "This updates the existing record, without creating a second gift or pledge." : "Voiding removes this record from campaign totals and keeps the reason and history."}</DialogDescription>
                  <label className="mb-3 block text-xs">Your name (required for this change)
                    <input ref={editorName} autoFocus={!by.trim()} className={`${input} mt-1 max-w-sm`} value={by} onChange={(e) => setBy(e.target.value)} aria-required="true" />
                  </label>
                  {mode.kind === "edit" ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="text-xs">Amount<input className={input} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
                      <label className="text-xs">Type<select className={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="pledge">Pledge</option><option value="gift">Gift</option></select></label>
                      <label className="text-xs">Date<DateInput className={input} value={f.date} onChange={(v) => setF({ ...f, date: v })} /></label>
                      <label className="text-xs md:col-span-2">Note<input className={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
                    </div>
                  ) : (
                    <label className="block text-xs">Reason for voiding (required), e.g. &ldquo;Duplicate of the $7,500 pledge&rdquo;<input ref={voidReason} className={input} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></label>
                  )}
                  {msg && <p role="alert" className="mt-3 rounded border border-[rgb(var(--brass))] bg-white p-3 text-sm">{msg}</p>}
                  <div className="mt-2 flex gap-2"><button className={btn} disabled={busy||(pvasCanonicalEnabled(client)&&(!state.databaseGiftEditsAvailable||pendingChange))} onClick={() => save(activeGift)}>{busy ? "Saving…" : mode.kind === "edit" ? "Save changes" : "Void this record"}</button><button className={btn2} disabled={busy} onClick={() => { setMode(null); setMsg(""); }}>Cancel</button></div>

        </DialogContent>}
      </Dialog>
      {(voided.length > 0 || dbVoids.length > 0) && (
        <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">Voided records ({voided.length + dbVoids.length}), not counted in totals</summary>
          <table className="mt-2 w-full"><tbody>
            {voided.map((v) => <tr key={`v${v.id}`} className="border-b border-[rgb(var(--line))] text-[rgb(var(--ink))]/70"><td className={td}>{v.donor_name}</td><td className={td}>{v.kind}</td><td className={`${td} text-right`}>{usd(Number(v.amount))}</td><td className={td}>Reason: {v.void_reason}</td><td className={td}>{v.voided_by} · {v.voided_at ? new Date(v.voided_at).toLocaleString() : ""}</td></tr>)}
            {dbVoids.map((v) => <tr key={`o${v.id}`} className="border-b border-[rgb(var(--line))] text-[rgb(var(--ink))]/70"><td className={td}>{v.donor_name ?? v.gift_key}</td><td className={td}>database row</td><td className={td} /><td className={td}>Reason: {v.void_reason}</td><td className={td}>{v.created_by} · {new Date(v.created_at).toLocaleString()}</td></tr>)}
          </tbody></table>
        </details>
      )}
    </div>
  );
}

function GiftForm() {
  const { client, reload } = useV2();
  const [by, setBy] = useBy();
  const [f, setF] = useState({ donorName: "", cptid: "", kind: "pledge", amount: "", date: "", note: "" });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<{ cptid: number; name: string; address: string; exact: boolean }[] | null>(null);
  const save = async (confirmNew = false, gift = f) => {
    if (pvasCanonicalEnabled(client)) { setMsg("New gift entry is unavailable."); return; }
    if (parseUsDateClient(gift.date) === null) { setMsg("Use MM/DD/YYYY for the date."); return; }
    setBusy(true); setMsg("");
    try {
      let r;
      if(pvasCanonicalEnabled(client)){
        if(!by.trim())throw new Error("Enter your name before saving");
        if(!gift.cptid){
          const matched=await post(client,{op:"matchDonor",name:gift.donorName});
          setMatches(matched.matches??[]);setMsg("Select an existing donor, or add a prospect first. Canonical gifts require an exact CPTID.");return;
        }
        const cptid=/^[1-9]\d*$/.test(gift.cptid)?Number(gift.cptid):NaN;
        if(!Number.isInteger(cptid)||cptid>2147483647)throw new Error("Enter an exact valid CPTID");
        const date=parseUsDateClient(gift.date);
        if(date===null)throw new Error("Use MM/DD/YYYY or leave the unknown date blank");
        r=await post(client,{op:"pvasGift",by,command:{cptid,actor:by,action:"create",source:{system:"manual",key:"@new-manual-action"},
          gift:{amount:moneyInput(gift.amount),currency:"USD",date:date===""?null:date,year:null,kind:gift.kind,status:gift.kind==="pledge"?"pledged":"received",
            scope:"campaign",credit:"hard",campaign:null,fund:null,type:null,note:gift.note,donorName:gift.donorName}}});
      }else r=await post(client, { op: "addGift", by, gift, confirmNew });
      if (r.matches) { setMatches(r.matches); setMsg(""); return; }
      setMatches(null); setF({ donorName: "", cptid: "", kind: f.kind, amount: "", date: "", note: "" }); setMsg("Saved."); await reload();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  if (pvasCanonicalEnabled(client)) return <p className="text-sm">New gift entry is unavailable. Existing gifts can be edited in Gift history.</p>;
  return (
    <div className={card}>
      <h3 className="font-display text-lg text-[rgb(var(--navy))]">Record a gift or pledge</h3>
      {pvasCanonicalEnabled(client) && <p className="mt-2 text-sm">New gift entry is currently unavailable.</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-6">
        <input className={`${input} md:col-span-2`} placeholder="Donor name *" value={f.donorName} onChange={(e) => { setF({ ...f, donorName: e.target.value }); setMatches(null); }} />
        <input className={input} placeholder="CPTID (if known)" value={f.cptid} onChange={(e) => { setF({ ...f, cptid: e.target.value }); setMatches(null); }} />
        <select className={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="pledge">Pledge</option><option value="gift">Gift</option></select>
        <input className={input} placeholder="Amount *" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <DateInput className={input} value={f.date} onChange={(v) => setF({ ...f, date: v })} />
        <input className={`${input} md:col-span-4`} placeholder="Note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        <input className={input} placeholder="Your name" value={by} onChange={(e) => setBy(e.target.value)} />
        <button className={btn} disabled={busy || pvasCanonicalEnabled(client)} onClick={() => save(false)}>{busy ? "Saving…" : "Save"}</button>
      </div>
      {matches && (
        <div className="mt-4 rounded border border-amber-400 bg-amber-50 p-4 text-sm">
          <p className="font-medium">No CPTID entered. These donors already on file match &ldquo;{f.donorName}&rdquo;. Pick one so the {f.kind} attaches to their record:</p>
          <ul className="mt-2 space-y-1">{matches.map((m) => (
            <li key={m.cptid} className="flex flex-wrap items-center gap-2">
              <button className={btn2} disabled={busy} onClick={() => { const g = { ...f, cptid: String(m.cptid), donorName: m.name }; setF(g); void save(true, g); }}>Use this record</button>
              <span><strong>{m.name}</strong> · CPTID {m.cptid}{m.address ? ` · ${m.address}` : ""}{m.exact ? " · exact name match" : ""}</span>
            </li>))}</ul>
          <div className="mt-3 flex gap-2"><button className={btn2} onClick={() => setMatches(null)}>Cancel</button>{!pvasCanonicalEnabled(client)&&<button className={btn} disabled={busy} onClick={() => save(true)}>None of these, save as a new donor</button>}</div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

const EMPTY_P = { firstName: "", lastName: "", orgName: "", clientId: "", address1: "", city: "", state: "", zip: "", email: "", phone: "", note: "" };
export function AddProspect() {
  const { client, reload } = useV2();
  const [by, setBy] = useBy();
  const [p, setP] = useState(EMPTY_P);
  const [dups, setDups] = useState<{ cptid: number; name: string; address: string; clientId: string }[] | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const save = async (force = false) => {
    setBusy(true); setMsg("");
    try {
      let r;
      if(pvasCanonicalEnabled(client)){
        const fullName=p.orgName.trim()||`${p.firstName} ${p.lastName}`.trim();
        if(!fullName||!by.trim())throw new Error("Enter a prospect name and your name");
        if(!force){
          const matches=await post(client,{op:"matchDonor",name:fullName});
          if(matches.matches?.length){setDups(matches.matches);return;}
        }
        r=await post(client,{op:"pvasContact",by,command:{operation:"contact-create",actor:by,clientId:p.clientId===""?null:p.clientId,
          fields:{fullName,firstName:p.firstName,lastName:p.lastName,street:p.address1,city:p.city,state:p.state,zip:p.zip,email:p.email,phone:p.phone},
          extras:{orgName:p.orgName,note:p.note}}});
      }else r=await post(client, { op: "addProspect", by, force, prospect: p });
      if (r.duplicates) { setDups(r.duplicates); return; }
      const screened = !pvasCanonicalEnabled(client) && !p.orgName && !!p.state.trim() && !!(p.firstName.trim() && p.lastName.trim());
      setDups(null); setP(EMPTY_P); setMsg(`Added with CPTID ${r.cptid}.${pvasCanonicalEnabled(client)?" Live wealth-screening submission is held until the canonical request consumer is accepted.":screened ? " A DonorSearch wealth screening was requested and will appear on the record within about 15 minutes." : " Add a first name, last name and state to run a DonorSearch wealth screening from the record."}`); await reload(); refreshCrmIndex();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  if (pvasCanonicalEnabled(client)) return <p className="text-sm">Adding new donors is unavailable. Existing records can still be edited.</p>;
  const fld = (k: keyof typeof EMPTY_P, ph: string, cls = "") => <input className={`${input} ${cls}`} placeholder={ph} value={p[k]} onChange={(e) => { setP({ ...p, [k]: e.target.value }); setDups(null); }} />;
  return (
    <div className={card}>
      <h3 className="font-display text-lg text-[rgb(var(--navy))]">Add prospect</h3>
      <p className="text-sm text-[rgb(var(--ink))]/65">Assigns the next unused CPTID for this client. You will be warned first if a record with the same name or address already exists.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        {fld("firstName", "First name")}{fld("lastName", "Last name")}{fld("orgName", "Organization (if not a person)", "md:col-span-2")}
        {fld("clientId", PORTAL_V2[client].clientIdLabel)}{fld("address1", "Street address", "md:col-span-3")}
        {fld("city", "City")}{fld("state", "State")}{fld("zip", "ZIP")}{fld("phone", "Phone")}
        {fld("email", "Email", "md:col-span-2")}{fld("note", "Note", "md:col-span-2")}
        <input className={input} placeholder="Your name" value={by} onChange={(e) => setBy(e.target.value)} />
        <button className={btn} disabled={busy} onClick={() => save(false)}>{busy ? "Saving…" : "Add prospect"}</button>
      </div>
      {dups && (
        <div className="mt-4 rounded border border-amber-400 bg-amber-50 p-4 text-sm">
          <p className="font-medium">Possible duplicate{dups.length > 1 ? "s" : ""} already on file:</p>
          <ul className="mt-2 list-disc pl-5">{dups.map((d) => <li key={d.cptid}>{d.name || "(no name)"} · CPTID {d.cptid}{d.clientId ? ` · ${PORTAL_V2[client].clientIdLabel} ${d.clientId}` : ""}{d.address ? ` · ${d.address}` : ""}</li>)}</ul>
          <div className="mt-3 flex gap-2"><button className={btn2} onClick={() => setDups(null)}>Cancel</button><button className={btn} disabled={busy} onClick={() => save(true)}>Add anyway</button></div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

interface Preview { fileName: string; rows: number; mapped: Record<string, string>; newRows: { line: number; prospect: Record<string, string>; possibleDuplicates: { cptid: number; name: string }[] }[];
  changed: { line: number; cptid: number; name: string; how: string; changes: { field: string; oldValue: string | null; newValue: string }[] }[]; unchanged: number;
  gifts: { line: number; donorName: string; kind: string; amount: number; date: string | null; cptid: number | null }[]; duplicateGifts: number; idsLoaded: boolean }
export function UploadClientFile() {
  const { client, reload } = useV2();
  const [by, setBy] = useBy();
  const [file, setFile] = useState<File | null>(null);
  const [pv, setPv] = useState<Preview | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const send = async (confirm: boolean) => {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const fd = new FormData(); fd.set("file", file); fd.set("by", by); if (confirm) fd.set("confirm", "1");
      const r = await fetch(PORTAL_V2[client].api, { method: "POST", body: fd });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
      if (confirm) { setPv(null); setFile(null); setMsg(j.applied ? `Applied: ${j.newRows} new, ${j.changed} changed, ${j.gifts} gifts/pledges (batch ${j.batchId}).` : j.message); await reload(); }
      else setPv(j);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  if (pvasCanonicalEnabled(client)) return <p className="text-sm">File uploads are unavailable. Upload history remains readable.</p>;
  return (
    <div className={card}>
      <h3 className="font-display text-lg text-[rgb(var(--navy))]">Upload client file</h3>
      <p className="text-sm text-[rgb(var(--ink))]/65">Excel or CSV from the client. Rows match on the client&apos;s {PORTAL_V2[client].clientIdLabel}, then on name + address. Nothing is saved until you review the preview and confirm. Gift and pledge columns (amount, pledge amount, type, date) are added to campaign donors.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPv(null); }} />
        <input className={`${input} w-48`} placeholder="Your name" value={by} onChange={(e) => setBy(e.target.value)} />
        <button className={btn2} disabled={!file || busy} onClick={() => send(false)}>{busy && !pv ? "Reading…" : "Preview"}</button>
      </div>
      {pv && (
        <div className="mt-4 space-y-4 text-sm">
          <p><strong>{pv.fileName}</strong>: {pv.rows} rows · <strong>{pv.newRows.length}</strong> new · <strong>{pv.changed.length}</strong> changed · {pv.unchanged} unchanged · <strong>{pv.gifts.length}</strong> gifts/pledges{pv.duplicateGifts ? ` (${pv.duplicateGifts} already recorded, skipped)` : ""}</p>
          <p className="text-xs text-[rgb(var(--ink))]/60">Columns used: {Object.entries(pv.mapped).map(([k, v]) => `${k} ← "${v}"`).join(" · ") || "none recognised"}{!pv.idsLoaded && " · client ID index not built yet, matching on name + address only"}</p>
          {pv.newRows.length > 0 && <details open><summary className="cursor-pointer font-medium">New records ({pv.newRows.length}) — each gets a new CPTID</summary>
            <table className="mt-2 w-full"><tbody>{pv.newRows.slice(0, 300).map((n) => (
              <tr key={n.line} className="border-b border-[rgb(var(--line))]"><td className={td}>Row {n.line}</td><td className={td}>{n.prospect.fullName}</td><td className={td}>{n.prospect.clientId}</td><td className={td}>{[n.prospect.address1, n.prospect.city, n.prospect.zip].filter(Boolean).join(", ")}</td>
                <td className={`${td} text-amber-700`}>{n.possibleDuplicates.length ? `Possible duplicate: ${n.possibleDuplicates.map((d) => `${d.name} (${d.cptid})`).join(", ")}` : ""}</td></tr>))}</tbody></table></details>}
          {pv.changed.length > 0 && <details><summary className="cursor-pointer font-medium">Changed records ({pv.changed.length})</summary>
            <table className="mt-2 w-full"><tbody>{pv.changed.slice(0, 300).map((c) => (
              <tr key={c.line} className="border-b border-[rgb(var(--line))]"><td className={td}>Row {c.line}</td><td className={td}>{c.name} · CPTID {c.cptid}<span className="text-xs text-[rgb(var(--ink))]/50"> ({c.how})</span></td>
                <td className={td}>{c.changes.map((x) => `${x.field}: ${x.oldValue ?? "(blank)"} → ${x.newValue}`).join("; ")}</td></tr>))}</tbody></table></details>}
          {pv.gifts.length > 0 && <details><summary className="cursor-pointer font-medium">Gifts and pledges ({pv.gifts.length})</summary>
            <table className="mt-2 w-full"><tbody>{pv.gifts.slice(0, 300).map((g, i) => (
              <tr key={i} className="border-b border-[rgb(var(--line))]"><td className={td}>Row {g.line}</td><td className={td}>{g.donorName}</td><td className={td}>{g.kind}</td><td className={`${td} text-right`}>{usd(g.amount)}</td><td className={td}>{g.date ?? ""}</td></tr>))}</tbody></table></details>}
          <div className="flex gap-2"><button className={btn2} onClick={() => setPv(null)}>Cancel</button><button className={btn} disabled={busy} onClick={() => send(true)}>{busy ? "Saving…" : "Confirm and save"}</button></div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

export function AuditLog() {
  const { client, state, reload } = useV2();
  const [by] = useBy();
  const [busy, setBusy] = useState<number | string | null>(null); const [msg, setMsg] = useState("");
  const aso = useSort(state?.batches ?? [], (r, k) => (r as unknown as Record<string, unknown>)[k]);
  const undo = async (batch: PortalBatch) => {
    const policy = uploadUndoPolicy(client, batch);
    if (!policy.allowed) { setMsg(policy.reason); return; }
    const id = batch.id;
    if (!confirm(`Undo batch ${id}? Every record, change and gift it added will be removed from the portal (kept in the audit log).`)) return;
    setBusy(id); setMsg("");
    try { await post(client, { op: "undo", batchId: id, by }); await reload(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  };
  if (!state) return null;
  return (
    <div className={card}>
      <h3 className="font-display text-lg text-[rgb(var(--navy))]">Change log</h3>
      {pvasCanonicalEnabled(client) && <p className="mt-2 text-sm text-[rgb(var(--ink))]/60">Pre-cutover upload history is read-only; Undo is unavailable for those uploads. Undo for new uploads is not yet available in this view.</p>}
      <div className="mt-3 max-h-[420px] overflow-auto">
        <table className="w-full"><thead><tr className="border-b border-[rgb(var(--line))]"><SortTh s={aso} k="created_at" label="When" className={th} /><SortTh s={aso} k="file_name" label="What" className={th} /><SortTh s={aso} k="created_by" label="By" className={th} /><SortTh s={aso} k="new_rows" label="New" className={`${th} text-right`} /><SortTh s={aso} k="changed_rows" label="Changed" className={`${th} text-right`} /><SortTh s={aso} k="gift_rows" label="Gifts" className={`${th} text-right`} /><th className={th} /></tr></thead>
          <tbody>{aso.sorted.map((b) => (
            <tr key={uploadHistoryRowKey(client, b)} className={`border-b border-[rgb(var(--line))] ${b.undone_at ? "text-[rgb(var(--ink))]/40 line-through" : ""}`}>
              <td className={td}>{new Date(b.created_at).toLocaleString()}</td><td className={td}>{b.kind === "upload" ? `File: ${b.file_name}` : b.kind === "edit" ? `Change: ${b.file_name}` : `Entry: ${b.file_name}`}</td><td className={td}>{b.created_by}</td>
              <td className={`${td} text-right`}>{b.new_rows}</td><td className={`${td} text-right`}>{b.changed_rows}</td><td className={`${td} text-right`}>{b.gift_rows}</td>
              <td className={td}>
                {uploadUndoPolicy(client, b).kind === "pre-cutover" && <span className="block text-xs">Pre-cutover · read-only</span>}
                {b.kind === "edit" ? <span className="text-xs text-[rgb(var(--ink))]/50">Logged</span> : b.undone_at ? <span className="no-underline">Undone {new Date(b.undone_at).toLocaleDateString()}</span> : <button className="text-sm text-[rgb(var(--navy))] underline disabled:opacity-50" disabled={busy === b.id || !uploadUndoPolicy(client, b).allowed} title={uploadUndoPolicy(client, b).reason || undefined} onClick={() => undo(b)}>Undo</button>}
              </td>
            </tr>))}</tbody></table>
        {!state.batches.length && <p className="py-4 text-sm text-[rgb(var(--ink))]/60">No changes yet.</p>}
      </div>
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
    </div>
  );
}

const EDIT_FIELDS: [key: string, col: string, label: string][] = [["firstName", "first_name", "First name"], ["lastName", "last_name", "Last name"], ["fullName", "full_name", "Full name (shown everywhere)"], ["orgName", "org_name", "Organization"],
  ["address1", "address1", "Address"], ["city", "city", "City"], ["state", "state", "State"], ["zip", "zip", "ZIP"], ["email", "email", "Email"], ["phone", "phone", "Phone"], ["clientId", "client_id", "Client ID"]];
function EditPortalProspect({ p, onDone }: { p: PortalState["prospects"][number]; onDone: () => void }) {
  const { client, reload } = useV2();
  const [by] = useBy();
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(EDIT_FIELDS.map(([k, col]) => [k, String((p as unknown as Record<string, unknown>)[col] ?? "")])));
  const [original]=useState(()=>({values:Object.fromEntries(EDIT_FIELDS.map(([k,col])=>[k,String((p as unknown as Record<string,unknown>)[col]??"")])),profile:structuredClone(p._canonicalContact)}));
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const set = (k: string, v: string) => setF((o) => {
    const n = { ...o, [k]: v };
    // Keep the full name in step with first/last when it was built from them.
    if ((k === "firstName" || k === "lastName") && o.fullName === `${o.firstName} ${o.lastName}`.trim()) n.fullName = `${n.firstName} ${n.lastName}`.trim();
    return n;
  });
  const save = async () => {
    setBusy(true); setErr("");
    try {
      const actor=by||"Catapult portal";
      if(pvasCanonicalEnabled(client)){
        const profile=pvasContactProfile(original.profile,p.cptid),changed=Object.fromEntries(Object.entries(f).filter(([k,v])=>v!==original.values[k]));
        await post(client,{op:"pvasContact",by:actor,command:{...pvasProspectChanges(profile,changed),actor}});
      }else await post(client, { op: "editProspect", cptid: p.cptid, prospect: f, by: actor });
      await reload(); onDone(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <tr className="border-b border-[rgb(var(--line))] bg-[rgb(var(--line))]/20"><td colSpan={6} className="px-3 py-3">
      <div className="grid gap-3 sm:grid-cols-4">{EDIT_FIELDS.map(([k, , label]) => (
        <label key={k} className={`text-xs ${k === "fullName" || k === "address1" ? "sm:col-span-2" : ""}`}>{label}<input className={input} value={f[k]} onChange={(e) => set(k, e.target.value)} /></label>
      ))}</div>
      <div className="mt-3 flex gap-2"><button className={btn} disabled={busy} onClick={save}>{busy ? "Saving..." : "Save changes"}</button><button className={btn2} onClick={onDone}>Cancel</button></div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </td></tr>
  );
}

export function AddAndUpload() {
  const { state, client, reload } = useV2();
  const [editing, setEditing] = useState<number | null>(null);
  const pso = useSort([...(state?.prospects ?? [])].reverse().map((p) => ({ ...p, addr: [p.address1, p.city, p.state, p.zip].filter(Boolean).join(", ") })), (r, k) => (r as unknown as Record<string, unknown>)[k]);
  return (
    <div className="space-y-6">
      {pvasCanonicalEnabled(client) ? <p className="text-sm">New donors, new gifts and uploads are unavailable. Existing records can still be edited below or from their donor record.</p> : <>
        <AddProspect />
        <DirectDashboardUpload key={`direct:${client}`} client={client} />
        <MonthlyGiftUpload key={`monthly:${client}`} client={client} refresh={reload} />
        <details><summary className="cursor-pointer text-sm font-medium">Legacy contact / gift upload (tuple dedupe only: not the monthly transaction importer)</summary><UploadClientFile /></details>
        <div className={card}><DuplicatesPanel client={client} /></div>
      </>}
      <AuditLog />
      {state && state.prospects.length > 0 && (
        <div className={card}>
          <h3 className="font-display text-lg text-[rgb(var(--navy))]">Prospects added in the portal ({state.prospects.length})</h3>
          <p className="mt-1 text-xs text-[rgb(var(--ink))]/55">Click Edit to fix a name, address or contact detail. Changes are logged in the audit log.</p>
          <div className="mt-3 max-h-[520px] overflow-auto"><table className="w-full"><thead><tr className="border-b border-[rgb(var(--line))]"><SortTh s={pso} k="cptid" label="CPTID" className={th} /><SortTh s={pso} k="full_name" label="Name" className={th} /><SortTh s={pso} k="client_id" label="Client ID" className={th} /><SortTh s={pso} k="addr" label="Address" className={th} /><SortTh s={pso} k="source" label="Source" className={th} /><th className={th} /></tr></thead><tbody>{pso.sorted.map((p) => (
            <Fragment key={p.id}>
              <tr className="border-b border-[rgb(var(--line))]"><td className={td}>CPTID {p.cptid}</td><td className={td}><NameLink name={p.full_name} cptid={p.cptid} /></td><td className={td}>{p.client_id ?? ""}</td><td className={td}>{[p.address1, p.city, p.state, p.zip].filter(Boolean).join(", ")}</td><td className={td}>{p.source === "upload" ? "Client file" : "Portal entry"}</td>
                <td className={`${td} text-right`}><button className="text-xs font-semibold text-[rgb(var(--navy))] hover:underline" onClick={() => setEditing(editing === p.cptid ? null : p.cptid)}>{editing === p.cptid ? "Close" : "Edit"}</button></td></tr>
              {editing === p.cptid && <EditPortalProspect p={p} onDone={() => setEditing(null)} />}
            </Fragment>
          ))}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
