import { NextRequest, NextResponse } from "next/server";
import { catapultClient, publicMember, sortEntries, allResponses } from "@/lib/board-review/server";
import { getList, saveList, getMembers, saveMembers, deleteResponses, type BrMember } from "@/lib/board-review/store";
import { getPool, applyFilters, toEntry, matchUpload, isAssigned } from "@/lib/board-review/source";
import { generatePassword, hashPassword } from "@/lib/board-review/auth";
import type { BrFilters } from "@/lib/board-review/config";

// Catapult-only setup + results API for the board Prospect Review.
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const deny = () => NextResponse.json({ error: "Catapult staff login required" }, { status: 401 });

export async function GET(req: NextRequest) {
  const c = await catapultClient(req, req.nextUrl.searchParams.get("client"));
  if (!c) return deny();
  const [list, members] = await Promise.all([getList(c), getMembers(c)]);
  const answers = await allResponses(c, members);
  return NextResponse.json({
    list: list ? { ...list, entries: sortEntries(list.entries) } : null,
    members: members.map((m) => publicMember(m, Object.values(answers[m.id] ?? {}).filter((a) => a.choice).length)),
    answers,
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
    if (members.some((m) => m.email === email)) return NextResponse.json({ error: "That email is already invited for this client" }, { status: 400 });
    const password = generatePassword();
    const { salt, hash } = await hashPassword(password);
    const m: BrMember = { id: crypto.randomUUID().replace(/-/g, "").slice(0, 12), name: name.slice(0, 120), email, role: String(body.role ?? "").slice(0, 80), salt, hash, version: 1, invitedAt: new Date().toISOString() };
    await saveMembers(c, [...members, m]);
    return NextResponse.json({ ok: true, member: publicMember(m, 0), password });
  }
  if (op === "reset") {
    const members = await getMembers(c);
    const m = members.find((x) => x.id === body.id);
    if (!m) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    const password = generatePassword();
    Object.assign(m, await hashPassword(password), { version: m.version + 1 });
    await saveMembers(c, members);
    return NextResponse.json({ ok: true, password });
  }
  if (op === "remove") {
    const members = await getMembers(c);
    await saveMembers(c, members.filter((x) => x.id !== body.id));
    if (body.deleteAnswers) await deleteResponses(c, String(body.id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}
