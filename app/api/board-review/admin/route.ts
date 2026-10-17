import { NextRequest, NextResponse } from "next/server";
import { catapultClient, publicMember, sortEntries, adminState } from "@/lib/board-review/server";
import { getList, saveList, getMembers, addMember, setPassword, removeMember, queueInvites, importFromBlob, inviteLog } from "@/lib/board-review/store";
import { getPool, applyFilters, toEntry, matchUpload, isAssigned } from "@/lib/board-review/source";
import { generatePassword, hashPassword } from "@/lib/board-review/auth";
import { BR_CLIENT_NAMES, type BrClient, type BrFilters } from "@/lib/board-review/config";

// Catapult-only setup + results API for the board Prospect Review.
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const deny = () => NextResponse.json({ error: "Catapult staff login required" }, { status: 401 });

export async function GET(req: NextRequest) {
  const c = await catapultClient(req, req.nextUrl.searchParams.get("client"));
  if (!c) return deny();
  let st = await adminState(c);
  // First open after the move to SQL: copy the old Blob data in once.
  if (!st.list && !st.members.length) { const r = await importFromBlob(c).catch(() => null); if (r && !("skipped" in r) && (r.list || r.members)) st = await adminState(c); }
  return NextResponse.json({
    list: st.list ? { ...st.list, entries: sortEntries(st.list.entries) } : null,
    members: st.members.map((m) => publicMember(m)),
    answers: st.answers,
  });
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const c = await catapultClient(req, String(fd.get("client") ?? ""));
    if (!c) return deny();
    const f = fd.get("file");
    if (!(f instanceof Blob)) return NextResponse.json({ error: "No file" }, { status: 400 });
    const pool = await getPool(c);
    const res = await matchUpload(c, Buffer.from(await f.arrayBuffer()), pool);
    return NextResponse.json(res);
  }
  const body = await req.json().catch(() => ({}));
  const c = await catapultClient(req, body.client ?? null);
  if (!c) return deny();
  const op = String(body.op ?? "");

  if (op === "preview") {
    const pool = await getPool(c);
    const rows = applyFilters(pool, (body.filters ?? {}) as BrFilters);
    const ds = [...new Set(pool.map((p) => p.ds).filter(Boolean))].sort();
    const statuses = [...new Set(pool.map((p) => p.status).filter(Boolean))].sort();
    return NextResponse.json({ total: pool.length, count: rows.length, rows: rows.slice(0, 2000).map((r) => ({ ...r, assigned: isAssigned(r) })), ds, statuses });
  }
  if (op === "save") {
    const ids: number[] = Array.isArray(body.cptids) ? body.cptids.map(Number).filter(Boolean) : [];
    const pool = await getPool(c);
    const byId = new Map(pool.map((p) => [p.cptid, p]));
    const prev = await getList(c);
    const keep = body.mode === "add" && prev ? prev.entries : [];
    const have = new Set(keep.map((e) => e.cptid));
    const added = ids.filter((id) => byId.has(id) && !have.has(id)).map((id) => toEntry(byId.get(id)!));
    const entries = sortEntries([...keep, ...added]);
    const list = { name: String(body.name || prev?.name || "Prospect Review").slice(0, 120), entries, updatedAt: new Date().toISOString(), source: String(body.source ?? "filters").slice(0, 300) };
    await saveList(c, list);
    return NextResponse.json({ ok: true, list });
  }
  if (op === "removeEntry") {
    const prev = await getList(c);
    if (!prev) return NextResponse.json({ ok: true });
    const list = { ...prev, entries: prev.entries.filter((e) => e.cptid !== Number(body.cptid)), updatedAt: new Date().toISOString() };
    await saveList(c, list);
    return NextResponse.json({ ok: true, list: { ...list, entries: sortEntries(list.entries) } });
  }
  if (op === "invite") {
    const name = String(body.name ?? "").trim(), email = String(body.email ?? "").trim().toLowerCase();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Name and a valid email are required" }, { status: 400 });
    const members = await getMembers(c);
    if (members.some((m) => m.email === email)) return NextResponse.json({ error: "That email is already on the member list for this client" }, { status: 400 });
    const password = generatePassword();
    const { salt, hash } = await hashPassword(password);
    const m = { id: crypto.randomUUID().replace(/-/g, "").slice(0, 12), name: name.slice(0, 120), email, role: String(body.role ?? "").slice(0, 80), salt, hash, version: 1 };
    await addMember(c, m);
    return NextResponse.json({ ok: true, member: publicMember({ ...m, invitedAt: "" }, 0), password });
  }
  if (op === "reset") {
    const m = (await getMembers(c)).find((x) => x.id === body.id);
    if (!m) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    const password = generatePassword();
    const { salt, hash } = await hashPassword(password);
    await setPassword(c, m.id, salt, hash, true);
    return NextResponse.json({ ok: true, password });
  }
  if (op === "remove") {
    await removeMember(c, String(body.id), !!body.deleteAnswers);
    return NextResponse.json({ ok: true });
  }
  // Email invites. These only QUEUE rows (engage.ratings_invites); Viktor's mail cron sends them from Jackie's
  // Outlook every few hours, then marks them sent (that sets invitedAt and dueDate = +14 days).
  //   send:      ids = [memberId]                    -> invite (or resend if they were invited before)
  //   sendNew:   everyone never invited and not already queued
  //   resendNon: invited members whose window has ended without rating every prospect
  if (op === "send" || op === "sendNew" || op === "resendNon") {
    const [members, list] = await Promise.all([getMembers(c), getList(c)]);
    const total = list?.entries.length ?? 0;
    if (!total) return NextResponse.json({ error: "Save a review list before sending invites" }, { status: 400 });
    const now = Date.now();
    const pick = op === "send" ? members.filter((m) => (body.ids ?? []).includes(m.id))
      : op === "sendNew" ? members.filter((m) => !m.invitedAt && !m.queued)
      : members.filter((m) => m.invitedAt && !m.queued && m.dueDate && Date.parse(m.dueDate) <= now && (m.answered ?? 0) < total);
    const items = await Promise.all(pick.map(async (m) => { const password = generatePassword(); return { memberId: m.id, kind: (m.invitedAt ? "resend" : "invite") as "invite" | "resend", password, ...(await hashPassword(password)) }; }));
    if (!items.length) return NextResponse.json({ ok: true, queued: 0 });
    const r = await queueInvites(c, items, BR_CLIENT_NAMES[c as BrClient], `${req.nextUrl.origin}/${c}/data-dashboard/review/login`, String(body.by ?? "dashboard"));
    return NextResponse.json({ ok: true, queued: r.queued });
  }
  if (op === "log") return NextResponse.json({ log: await inviteLog(c) });
  if (op === "migrate") return NextResponse.json(await importFromBlob(c, !!body.force));
  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}
