"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BR_CHOICE_SHORT, BR_CLIENT_NAMES, type BrSettings, type BrAnswer, type BrClient, type BrEntry, type BrFilters, type BrList, type BrMemberPublic, type BrPoolRow } from "@/lib/board-review/config";

const API = "/api/board-review/admin";
const usd = (n: number) => (n ? `$${Math.round(n).toLocaleString()}` : "");
const TABS = ["Build list", "Review list", "Members", "Results"] as const;
type Tab = (typeof TABS)[number];
type Row = BrPoolRow & { assigned: boolean };

const card = "rounded-xl border border-[rgb(var(--line))] bg-white p-5 shadow-sm";
const input = "w-full rounded-md border border-[rgb(var(--line))] px-2.5 py-1.5 text-sm outline-none focus:border-[rgb(var(--brass))]";
const btn = "rounded-md bg-[#0E1E31] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50";
const btn2 = "rounded-md border border-[#B28C46] px-3 py-1.5 text-sm font-semibold text-[#0E1E31] hover:bg-[#B28C46]/10 disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold uppercase tracking-wide text-[#0E1E31]/70">{label}<div className="mt-1 font-normal normal-case tracking-normal">{children}</div></label>;
}

export function BoardReviewAdmin({ client }: { client: BrClient }) {
  const [tab, setTab] = useState<Tab>("Build list");
  const [list, setList] = useState<BrList | null>(null);
  const [members, setMembers] = useState<BrMemberPublic[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<string, BrAnswer>>>({});
  const [msg, setMsg] = useState("");
  const [settings, setSettings] = useState<BrSettings>({ windowDays: 14, fixedDue: null, remindAfterDays: 5 });

  const load = useCallback(async () => {
    const r = await fetch(`${API}?client=${client}`, { cache: "no-store" });
    if (!r.ok) { setMsg("Catapult staff login required."); return; }
    const j = await r.json();
    setList(j.list); setMembers(j.members); setAnswers(j.answers); if (j.settings) setSettings(j.settings);
  }, [client]);
  useEffect(() => { load(); }, [load]);

  const post = async (body: Record<string, unknown>) => {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
    return j;
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--paper))]">
      <header className="bg-[#0E1E31] px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[#B28C46]">{BR_CLIENT_NAMES[client]} · Catapult staff only</p>
          <h1 className="font-display mt-1 text-3xl">Board Prospect Review</h1>
          <p className="mt-1 text-sm text-white/70">Build one shared review list, invite board and committee members, and see their picks. Only Catapult can see this page and the results.</p>
          <p className="mt-2 text-xs text-white/60">Member sign-in page: <span className="text-[#B28C46]">{typeof window !== "undefined" ? window.location.origin : ""}/{client}/data-dashboard/review</span> · <a className="underline" href={`/${client}/data-dashboard`}>Back to the dashboard</a></p>
        </div>
      </header>
      <nav className="sticky top-0 z-10 border-b border-[rgb(var(--line))] bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${t === tab ? "border-[#B28C46] text-[#0E1E31]" : "border-transparent text-[#0E1E31]/60"}`}>
              {t}{t === "Review list" && list ? ` (${list.entries.length})` : ""}{t === "Members" ? ` (${members.length})` : ""}
            </button>
          ))}
        </div>
      </nav>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {msg && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{msg}</p>}
        {tab === "Build list" && <Build client={client} list={list} post={post} onSaved={(l) => { setList(l); setTab("Review list"); }} />}
        {tab === "Review list" && <ListView list={list} post={post} onChange={setList} />}
        {tab === "Members" && <Members client={client} settings={settings} members={members} total={list?.entries.length ?? 0} post={post} reload={load} />}
        {tab === "Results" && <Results client={client} list={list} members={members} answers={answers} reload={load} />}
      </div>
    </main>
  );
}

type Post = (b: Record<string, unknown>) => Promise<Record<string, unknown>>;

function Build({ client, list, post, onSaved }: { client: BrClient; list: BrList | null; post: Post; onSaved: (l: BrList) => void }) {
  const [f, setF] = useState<BrFilters>({ assigned: "any", donor: "any", kind: "any", sort: "capacity" });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<{ total: number; count: number; ds: string[]; statuses: string[] }>({ total: 0, count: 0, ds: [], statuses: [] });
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [name, setName] = useState(list?.name ?? "Board Prospect Review");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [upload, setUpload] = useState<{ matched: BrEntry[]; unmatched: { line: number; text: string }[]; total: number } | null>(null);
  const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(/[$,]/g, "")));
  const set = (k: keyof BrFilters, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  const run = async () => {
    setBusy(true); setErr("");
    try {
      const j = (await post({ op: "preview", filters: f })) as unknown as { rows: Row[]; total: number; count: number; ds: string[]; statuses: string[] };
      setRows(j.rows); setMeta(j); setPicked(new Set(j.rows.map((r) => r.cptid)));
    } catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };
  useEffect(() => { run(); /* first load shows the whole pool */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (ids: number[], mode: "replace" | "add", source: string) => {
    if (!ids.length) { setErr("Nothing selected."); return; }
    if (mode === "replace" && list?.entries.length && !confirm(`Replace the saved list of ${list.entries.length} prospects? Member answers for prospects that stay on the list are kept.`)) return;
    setBusy(true); setErr("");
    try { const j = await post({ op: "save", cptids: ids, mode, name, source }); onSaved(j.list as BrList); }
    catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };

  const doUpload = async (file: File) => {
    setBusy(true); setErr(""); setUpload(null);
    const fd = new FormData(); fd.append("client", client); fd.append("file", file);
    const r = await fetch(API, { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error || "Upload failed"); else setUpload(j);
    setBusy(false);
  };

  const filterDesc = useMemo(() => Object.entries(f).filter(([, v]) => v !== undefined && v !== "" && v !== "any").map(([k, v]) => `${k}: ${v}`).join(", "), [f]);

  return (
    <>
      <div className={card}>
        <Field label="List name"><input className={input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <p className="mt-2 text-xs text-[#0E1E31]/60">One shared list per client. Every invited member reviews the same list. {list ? `Saved list: ${list.entries.length} prospects, updated ${new Date(list.updatedAt).toLocaleString()}.` : "No list saved yet."}</p>
      </div>

      <div className={card}>
        <h2 className="font-display text-xl text-[#0E1E31]">Option A: select prospects with filters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Capacity at least ($)"><input className={input} placeholder="1,000,000" onChange={(e) => set("capMin", num(e.target.value))} /></Field>
          <Field label="Capacity at most ($)"><input className={input} onChange={(e) => set("capMax", num(e.target.value))} /></Field>
          <Field label="Wealth rating starts with"><select className={input} value={f.ds ?? ""} onChange={(e) => set("ds", e.target.value)}><option value="">Any</option>{meta.ds.map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
          <Field label="Assigned to a solicitor"><select className={input} value={f.assigned} onChange={(e) => set("assigned", e.target.value)}><option value="any">Any</option><option value="no">Not assigned</option><option value="yes">Assigned</option></select></Field>
          <Field label="Donor status"><select className={input} value={f.donor} onChange={(e) => set("donor", e.target.value)}><option value="any">Any</option><option value="donor">Donors (any giving)</option><option value="nondonor">Non-donors</option></select></Field>
          <Field label="Lifetime giving at least ($)"><input className={input} onChange={(e) => set("lifeMin", num(e.target.value))} /></Field>
          <Field label="Lifetime giving at most ($)"><input className={input} onChange={(e) => set("lifeMax", num(e.target.value))} /></Field>
          <Field label="Last gift at least ($)"><input className={input} onChange={(e) => set("lastMin", num(e.target.value))} /></Field>
          <Field label="Last gift at most ($)"><input className={input} onChange={(e) => set("lastMax", num(e.target.value))} /></Field>
          <Field label="Last gift on or after"><input type="date" className={input} onChange={(e) => set("lastAfter", e.target.value)} /></Field>
          <Field label="Last gift on or before"><input type="date" className={input} onChange={(e) => set("lastBefore", e.target.value)} /></Field>
          <Field label="States (e.g. NV, CA)"><input className={input} onChange={(e) => set("states", e.target.value)} /></Field>
          <Field label="Type"><select className={input} value={f.kind} onChange={(e) => set("kind", e.target.value)}><option value="any">Any</option><option value="individual">Individuals</option><option value="organization">Organizations</option></select></Field>
          <Field label="Committee status"><select className={input} value={f.status ?? ""} onChange={(e) => set("status", e.target.value)}><option value="">Any</option>{meta.statuses.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Name or city contains"><input className={input} onChange={(e) => set("q", e.target.value)} /></Field>
          <Field label="Top N only"><input className={input} placeholder="All" onChange={(e) => set("limit", num(e.target.value))} /></Field>
          <Field label="Sort"><select className={input} value={f.sort} onChange={(e) => set("sort", e.target.value)}><option value="capacity">Capacity, high to low</option><option value="lifetime">Lifetime giving, high to low</option><option value="name">Last name</option></select></Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={btn} disabled={busy} onClick={run}>{busy ? "Working..." : "Apply filters"}</button>
          {rows && <span className="text-sm text-[#0E1E31]/70">{meta.count.toLocaleString()} of {meta.total.toLocaleString()} prospects match · {picked.size} checked{meta.count > rows.length ? ` (showing first ${rows.length})` : ""}</span>}
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        {rows && (
          <>
            <div className="mt-4 max-h-[480px] overflow-auto rounded-md border border-[rgb(var(--line))]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0E1E31] text-left text-xs text-white">
                  <tr>
                    <th className="p-2"><input type="checkbox" checked={picked.size === rows.length && rows.length > 0} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.cptid)) : new Set())} /></th>
                    <th className="p-2">Name</th><th className="p-2">City</th><th className="p-2">State</th><th className="p-2">Rating</th><th className="p-2 text-right">Capacity</th>
                    <th className="p-2 text-right">Lifetime</th><th className="p-2 text-right">Last gift</th><th className="p-2">Last date</th><th className="p-2">Solicitor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.cptid} className={i % 2 ? "bg-[#F1ECE0]/60" : ""}>
                      <td className="p-2"><input type="checkbox" checked={picked.has(r.cptid)} onChange={(e) => { const s = new Set(picked); if (e.target.checked) s.add(r.cptid); else s.delete(r.cptid); setPicked(s); }} /></td>
                      <td className="p-2 font-medium text-[#0E1E31]">{r.name}</td><td className="p-2">{r.city}</td><td className="p-2">{r.state}</td><td className="p-2">{r.ds}</td>
                      <td className="p-2 text-right">{r.capacity || usd(r.capMin)}</td><td className="p-2 text-right">{usd(r.lifetime)}</td><td className="p-2 text-right">{usd(r.lastAmt)}</td>
                      <td className="p-2">{r.lastDate}</td><td className="p-2">{r.solicitor || (r.assigned ? "Assigned" : "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className={btn} disabled={busy || !picked.size} onClick={() => save([...picked], "replace", `Filters: ${filterDesc || "none"}`)}>Save as the review list ({picked.size})</button>
              <button className={btn2} disabled={busy || !picked.size || !list} onClick={() => save([...picked], "add", `Added by filters: ${filterDesc || "none"}`)}>Add to saved list</button>
            </div>
          </>
        )}
      </div>

      <div className={card}>
        <h2 className="font-display text-xl text-[#0E1E31]">Option B: upload a prospect list</h2>
        <p className="mt-1 text-sm text-[#0E1E31]/70">CSV or Excel. Rows match on a CPTID column first, then the client&apos;s own ID column (ID, Client ID, Account ID), then on name (Name, or First + Last). Anything that does not match is listed below and left off.</p>
        <input type="file" accept=".csv,.xlsx,.xls" className="mt-3 text-sm" disabled={busy} onChange={(e) => e.target.files?.[0] && doUpload(e.target.files[0])} />
        {upload && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[#0E1E31]"><b>{upload.matched.length}</b> matched · <b>{upload.unmatched.length}</b> not matched · {upload.total} rows read</p>
            <div className="flex flex-wrap gap-3">
              <button className={btn} disabled={busy || !upload.matched.length} onClick={() => save(upload.matched.map((m) => m.cptid), "replace", "Uploaded list")}>Save matched as the review list</button>
              <button className={btn2} disabled={busy || !upload.matched.length || !list} onClick={() => save(upload.matched.map((m) => m.cptid), "add", "Uploaded list (added)")}>Add matched to saved list</button>
            </div>
            {upload.unmatched.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                <p className="font-semibold text-red-700">Not matched (add these to the database first, or fix the name and upload again):</p>
                <ul className="mt-1 list-disc pl-5">{upload.unmatched.map((u) => <li key={u.line}>Row {u.line}: {u.text}</li>)}</ul>
              </div>
            )}
            <details className="text-sm"><summary className="cursor-pointer text-[#0E1E31]/70">Show matched prospects</summary>
              <ul className="mt-1 columns-2 text-[#0E1E31]">{upload.matched.map((m) => <li key={m.cptid}>{m.name} ({[m.city, m.state].filter(Boolean).join(", ")})</li>)}</ul>
            </details>
          </div>
        )}
      </div>
    </>
  );
}

function ListView({ list, post, onChange }: { list: BrList | null; post: Post; onChange: (l: BrList) => void }) {
  if (!list || !list.entries.length) return <div className={card}>No review list saved yet. Build one on the Build list tab.</div>;
  return (
    <div className={card}>
      <h2 className="font-display text-xl text-[#0E1E31]">{list.name}</h2>
      <p className="text-sm text-[#0E1E31]/70">{list.entries.length} prospects · last saved {new Date(list.updatedAt).toLocaleString()} · {list.source}. Members see these in this order (last name), with city and state only.</p>
      <table className="mt-4 w-full text-sm">
        <thead className="bg-[#0E1E31] text-left text-xs text-white"><tr><th className="p-2">Prospect</th><th className="p-2">City</th><th className="p-2">State</th><th className="p-2">CPTID</th><th /></tr></thead>
        <tbody>{list.entries.map((e, i) => (
          <tr key={e.cptid} className={i % 2 ? "bg-[#F1ECE0]/60" : ""}>
            <td className="p-2 font-medium text-[#0E1E31]">{e.name}</td><td className="p-2">{e.city}</td><td className="p-2">{e.state}</td><td className="p-2">{e.cptid}</td>
            <td className="p-2 text-right"><button className="text-xs text-red-600 hover:underline" onClick={async () => { const j = await post({ op: "removeEntry", cptid: e.cptid }); onChange(j.list as BrList); }}>Remove</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const day = (d?: string) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" }) : "");

function DueSettings({ settings, post, reload }: { settings: BrSettings; post: Post; reload: () => void }) {
  const [mode, setMode] = useState<"days" | "date">(settings.fixedDue ? "date" : "days");
  const [days, setDays] = useState(String(settings.windowDays)), [date, setDate] = useState(settings.fixedDue ?? ""), [remind, setRemind] = useState(String(settings.remindAfterDays));
  const [note, setNote] = useState("");
  useEffect(() => { setMode(settings.fixedDue ? "date" : "days"); setDays(String(settings.windowDays)); setDate(settings.fixedDue ?? ""); setRemind(String(settings.remindAfterDays)); }, [settings]);
  const save = async () => {
    setNote("");
    try {
      if (mode === "date" && !date) throw new Error("Pick a due date");
      const j = await post({ op: "saveSettings", settings: { windowDays: Number(days) || 14, fixedDue: mode === "date" ? date : null, remindAfterDays: Number(remind) || 5 } });
      setNote(`Saved. Reminder goes ${(j.settings as BrSettings).remindAfterDays} days after the invite.`); reload();
    } catch (e) { setNote((e as Error).message); }
  };
  return (
    <div className={card}>
      <h2 className="font-display text-xl text-[#0E1E31]">Due date and reminder</h2>
      <p className="mt-1 text-xs text-[#0E1E31]/60">The invite email tells members this date. It applies to invites sent from now on; people already invited keep the date their email gave them.</p>
      <div className="mt-4 flex flex-wrap items-end gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" checked={mode === "days"} onChange={() => setMode("days")} /> Due
          <select className={`${input} w-auto`} value={["7", "10", "14", "21", "30"].includes(days) ? days : "custom"} onChange={(e) => e.target.value !== "custom" && setDays(e.target.value)} onFocus={() => setMode("days")}>
            {["7", "10", "14", "21", "30"].map((d) => <option key={d} value={d}>{d} days</option>)}{!["7", "10", "14", "21", "30"].includes(days) && <option value="custom">{days} days</option>}
          </select> after the invite</label>
        <label className="flex items-center gap-2"><input type="radio" checked={mode === "date"} onChange={() => setMode("date")} /> Due on a set date
          <input type="date" className={`${input} w-auto`} value={date} onChange={(e) => { setDate(e.target.value); setMode("date"); }} /></label>
        <label className="flex items-center gap-2">Reminder
          <input type="number" min={1} max={60} className={`${input} w-20`} value={remind} onChange={(e) => setRemind(e.target.value)} /> days after the invite</label>
        <button className={btn} onClick={save}>Save</button>
      </div>
      <p className="mt-2 text-xs text-[#0E1E31]/60">Tip: for a 7-day window, a reminder at day 3 or 4 works well. A set date is used only while it is still ahead; after it passes, new invites fall back to the day count.</p>
      {note && <p className="mt-2 rounded-md bg-[#F1ECE0] p-2 text-sm text-[#0E1E31]">{note}</p>}
    </div>
  );
}

function MemberUpload({ members, post, reload }: { members: BrMemberPublic[]; post: Post; reload: () => void }) {
  const [rows, setRows] = useState<{ name: string; email: string; role: string; status: string }[]>([]);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const read = async (f: File) => {
    setMsg("");
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await f.arrayBuffer());
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const have = new Set(members.map((m) => m.email.toLowerCase()));
    const pick = (r: Record<string, unknown>, ...keys: string[]) => { for (const k of Object.keys(r)) if (keys.includes(k.trim().toLowerCase().replace(/[^a-z]/g, ""))) { const v = String(r[k] ?? "").trim(); if (v) return v; } return ""; };
    const out = raw.map((r) => {
      const name = pick(r, "name", "fullname", "membername") || `${pick(r, "first", "firstname")} ${pick(r, "last", "lastname")}`.trim();
      const email = pick(r, "email", "emailaddress", "e mail", "email1").toLowerCase();
      const role = pick(r, "role", "title", "position");
      const status = !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? "Missing name or valid email" : have.has(email) ? "Already a member" : "Ready";
      return { name, email, role, status };
    }).filter((r) => r.name || r.email);
    setRows(out);
  };
  const ready = rows.filter((r) => r.status === "Ready");
  const addAll = async () => {
    setBusy(true); let ok = 0; const next = [...rows];
    for (const r of next) { if (r.status !== "Ready") continue; try { await post({ op: "invite", name: r.name, email: r.email, role: r.role }); r.status = "Added"; ok++; } catch (e) { r.status = (e as Error).message; } }
    setRows(next); setBusy(false); setMsg(`${ok} member${ok === 1 ? "" : "s"} added. Nobody has been emailed yet: use Send invite below when you are ready.`); reload();
  };
  return (
    <div className={card}>
      <h2 className="font-display text-xl text-[#0E1E31]">Upload a member roster</h2>
      <p className="mt-1 text-sm text-[#0E1E31]/70">CSV or Excel with a Name column (or First + Last), an Email column and an optional Role column. Emails already on the list are skipped. Uploading does not email anyone.</p>
      <input type="file" accept=".csv,.xlsx,.xls" className="mt-3 text-sm" disabled={busy} onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      {rows.length > 0 && (
        <div className="mt-4">
          <table className="w-full text-sm"><thead><tr className="text-left text-[#0E1E31]/60"><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-[rgb(var(--line))]"><td className="py-1">{r.name}</td><td>{r.email}</td><td>{r.role}</td><td>{r.status}</td></tr>)}</tbody></table>
          <button className={`${btn} mt-3`} disabled={busy || !ready.length} onClick={addAll}>{busy ? "Adding…" : `Add ${ready.length} member${ready.length === 1 ? "" : "s"}`}</button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-[#0E1E31]">{msg}</p>}
    </div>
  );
}

function Members({ client, settings, members, total, post, reload }: { client: BrClient; settings: BrSettings; members: BrMemberPublic[]; total: number; post: Post; reload: () => void }) {
  const [note, setNote] = useState("");
  const send = async (body: Record<string, unknown>, what: string) => {
    setErr(""); setNote("");
    try { const j = await post(body); setNote(Number(j.queued) ? `${j.queued} ${what} queued. Jackie's mailbox sends them within about 3 hours (7am to 7pm Pacific).` : "Nobody to send to."); reload(); }
    catch (e) { setErr((e as Error).message); }
  };
  const now = Date.now();
  const fixedAhead = !!settings.fixedDue && Date.parse(`${settings.fixedDue}T23:59:00-07:00`) > now;
  const dueLabel = fixedAhead ? `by ${new Date(`${settings.fixedDue}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : `in ${settings.windowDays} days`;
  const done = (m: BrMemberPublic) => total > 0 && (m.answered ?? 0) >= total;
  const notInvited = members.filter((m) => !m.invitedAt && !m.queued);
  const overdue = members.filter((m) => m.invitedAt && !m.queued && m.dueDate && Date.parse(m.dueDate) <= now && !done(m));
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [role, setRole] = useState("");
  const [shown, setShown] = useState<{ who: string; email: string; password: string } | null>(null);
  const [err, setErr] = useState("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/${client}/data-dashboard/review` : "";
  const invite = async () => {
    setErr("");
    try { const j = await post({ op: "invite", name, email, role }); setShown({ who: name, email, password: String(j.password) }); setName(""); setEmail(""); setRole(""); reload(); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <>
      <DueSettings settings={settings} post={post} reload={reload} />
      <MemberUpload members={members} post={post} reload={reload} />
      <div className={card}>
        <h2 className="font-display text-xl text-[#0E1E31]">Invite a board or committee member</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Name"><input className={input} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><input className={input} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Role (optional)"><input className={input} placeholder="Board member, Campaign committee" value={role} onChange={(e) => setRole(e.target.value)} /></Field>
        </div>
        <button className={`${btn} mt-4`} onClick={invite}>Add member</button>
        <p className="mt-2 text-xs text-[#0E1E31]/60">Adding a member does not email them. Use Send invite below: the email comes from Jackie with the sign-in link, their email, a password and the instructions, due back {dueLabel}.</p>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        {shown && (
          <div className="mt-4 rounded-md border border-[#B28C46] bg-[#F1ECE0] p-4 text-sm text-[#0E1E31]">
            <p className="font-semibold">Login for {shown.who} (shown once). Sending the invite email creates a new password, so you only need this if you are giving it to them yourself.</p>
            <p className="mt-2">Sign in at: {link}</p><p>Email: {shown.email}</p><p>Password: <b className="font-mono">{shown.password}</b></p>
          </div>
        )}
      </div>
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-[#0E1E31]">Members</h2>
          <div className="flex flex-wrap gap-2">
            <button className={btn} disabled={!notInvited.length || !total} onClick={() => confirm(`Email invites from Jackie to ${notInvited.length} member(s) not yet invited?`) && send({ op: "sendNew" }, "invite(s)")}>Send to all not yet invited ({notInvited.length})</button>
            {overdue.length > 0 && <button className={btn2} onClick={() => confirm(`Resend the invite to ${overdue.length} member(s) who have not finished? They get a new password and a new due date (${dueLabel}).`) && send({ op: "resendNon" }, "resend(s)")}>Resend to non-respondents ({overdue.length})</button>}
            <button className={btn2} onClick={reload}>Refresh</button>
          </div>
        </div>
        {!total && <p className="mt-2 text-sm text-red-600">Save a review list before sending invites.</p>}
        {note && <p className="mt-2 rounded-md bg-[#F1ECE0] p-2 text-sm text-[#0E1E31]">{note}</p>}
        <p className="mt-1 text-xs text-[#0E1E31]/60">A reminder goes out automatically {settings.remindAfterDays} days after the invite to anyone who has not rated every prospect (once per invite).</p>
        {!members.length ? <p className="mt-2 text-sm">No members yet.</p> : (
          <table className="mt-3 w-full text-sm">
            <thead className="bg-[#0E1E31] text-left text-xs text-white"><tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Progress</th><th className="p-2">Invite</th><th className="p-2">Reminder</th><th className="p-2">Due</th><th className="p-2">Last visit</th><th /></tr></thead>
            <tbody>{members.map((m, i) => (
              <tr key={m.id} className={i % 2 ? "bg-[#F1ECE0]/60" : ""}>
                <td className="p-2 font-medium">{m.name}</td><td className="p-2">{m.email}</td><td className="p-2">{m.role}</td>
                <td className="p-2 whitespace-nowrap">{done(m) ? <b className="text-green-700">Done</b> : null} rated {m.answered ?? 0} of {total}</td>
                <td className="p-2 whitespace-nowrap">{m.queued && m.queued !== "reminder" ? <span className="text-[#B28C46]">Queued</span> : m.invitedAt ? `Sent ${day(m.invitedAt)}${(m.inviteCount ?? 0) > 1 ? ` (x${m.inviteCount})` : ""}` : <span className="text-[#0E1E31]/50">Not invited</span>}</td>
                <td className="p-2 whitespace-nowrap">{m.queued === "reminder" ? <span className="text-[#B28C46]">Queued</span> : m.reminderSentAt ? `Sent ${day(m.reminderSentAt)}` : m.invitedAt ? (done(m) ? "Not needed" : `Due ${day(new Date(Date.parse(m.invitedAt) + settings.remindAfterDays * 86400_000).toISOString())}`) : ""}</td>
                <td className="p-2 whitespace-nowrap">{m.dueDate ? <span className={!done(m) && Date.parse(m.dueDate) <= now ? "font-semibold text-red-600" : ""}>{day(m.dueDate)}{!done(m) && Date.parse(m.dueDate) <= now ? " (past)" : ""}</span> : ""}</td>
                <td className="p-2">{m.lastSeen ? new Date(m.lastSeen).toLocaleString() : "Not yet"}</td>
                <td className="space-x-3 whitespace-nowrap p-2 text-right text-xs">
                  {!m.queued && <button className="font-semibold text-[#B28C46] hover:underline" disabled={!total} onClick={() => confirm(`Email ${m.invitedAt ? "a new invite" : "the invite"} from Jackie to ${m.name} (${m.email})? This sets a new password.`) && send({ op: "send", ids: [m.id] }, "invite")}>{m.invitedAt ? "Resend invite" : "Send invite"}</button>}
                  <button className="text-[#0E1E31] hover:underline" onClick={async () => { const j = await post({ op: "reset", id: m.id }); setShown({ who: m.name, email: m.email, password: String(j.password) }); }}>New password</button>
                  <button className="text-red-600 hover:underline" onClick={async () => { if (!confirm(`Remove ${m.name}? Their login stops working and their answers are deleted.`)) return; await post({ op: "remove", id: m.id, deleteAnswers: true }); reload(); }}>Remove</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Results({ client, list, members, answers, reload }: { client: BrClient; list: BrList | null; members: BrMemberPublic[]; answers: Record<string, Record<string, BrAnswer>>; reload: () => void }) {
  const [only, setOnly] = useState<"all" | "answered" | "A">("all");
  const entries = (list?.entries ?? []).filter((e) => {
    const picks = members.map((m) => answers[m.id]?.[String(e.cptid)]?.choice).filter(Boolean);
    if (only === "answered") return picks.some((p) => p !== "D");
    if (only === "A") return picks.some((p) => p === "A" || p === "B");
    return true;
  });
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[#0E1E31]">Results</h2>
          <p className="text-sm text-[#0E1E31]/70">Visible to Catapult only. Members never see each other&apos;s answers, and client staff cannot open this page.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={input + " w-auto"} value={only} onChange={(e) => setOnly(e.target.value as typeof only)}>
            <option value="all">All prospects</option><option value="answered">Someone knows them (A, B, C or Other)</option><option value="A">Has an A or B</option>
          </select>
          <button className={btn2} onClick={reload}>Refresh</button>
          <a className={btn} href={`${API}/export?client=${client}`}>Export to Excel</a>
        </div>
      </div>
      {!members.length || !list ? <p className="mt-4 text-sm">Save a list and invite members to see results.</p> : (
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0E1E31] text-left text-xs text-white">
              <tr><th className="sticky left-0 bg-[#0E1E31] p-2">Prospect</th><th className="p-2">City, State</th>{members.map((m) => <th key={m.id} className="min-w-[140px] p-2">{m.name}</th>)}</tr>
            </thead>
            <tbody>{entries.map((e, i) => (
              <tr key={e.cptid} className={i % 2 ? "bg-[#F1ECE0]/60" : "bg-white"}>
                <td className="sticky left-0 bg-inherit p-2 font-medium text-[#0E1E31]">{e.name}</td>
                <td className="p-2">{[e.city, e.state].filter(Boolean).join(", ")}</td>
                {members.map((m) => { const a = answers[m.id]?.[String(e.cptid)]; return (
                  <td key={m.id} className="p-2 align-top">
                    {a?.choice ? <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${a.choice === "A" ? "bg-[#0E1E31] text-white" : a.choice === "B" ? "bg-[#B28C46] text-white" : "bg-[#F1ECE0] text-[#0E1E31]"}`}>{BR_CHOICE_SHORT[a.choice]}</span> : <span className="text-[#0E1E31]/30">&middot;</span>}
                    {a?.other && <div className="mt-1 text-xs text-[#0E1E31]/80">{a.other}</div>}
                  </td>
                ); })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
