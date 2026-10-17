import { NextRequest, NextResponse } from "next/server";
import { currentMember, sortEntries } from "@/lib/board-review/server";
import { getList, getResponses, saveResponses, getMembers, saveMembers } from "@/lib/board-review/store";
import { BR_CHOICES, BR_CLIENT_NAMES, type BrAnswer } from "@/lib/board-review/config";

// Board member API: returns ONLY the shared list (name, city, state) and the member's OWN answers.
export const dynamic = "force-dynamic";
const deny = () => NextResponse.json({ error: "Please sign in" }, { status: 401 });

export async function GET(req: NextRequest) {
  const me = await currentMember(req);
  if (!me) return deny();
  const [list, resp] = await Promise.all([getList(me.client), getResponses(me.client, me.member.id)]);
  // Touch lastSeen at most once an hour.
  if (!me.member.lastSeen || Date.now() - Date.parse(me.member.lastSeen) > 3600_000) {
    const ms = await getMembers(me.client); const m = ms.find((x) => x.id === me.member.id);
    if (m) { m.lastSeen = new Date().toISOString(); await saveMembers(me.client, ms).catch(() => {}); }
  }
  return NextResponse.json({
    client: me.client, clientName: BR_CLIENT_NAMES[me.client], member: { name: me.member.name },
    entries: sortEntries(list?.entries ?? []).map((e) => ({ cptid: e.cptid, name: e.name, city: e.city, state: e.state })),
    answers: resp.answers, updatedAt: resp.updatedAt,
  });
}

const VALID = new Set<string>(["", ...BR_CHOICES.map((c) => c.key)]);
export async function POST(req: NextRequest) {
  const me = await currentMember(req);
  if (!me) return deny();
  const body = await req.json().catch(() => ({}));
  const changes = (body.answers ?? {}) as Record<string, { choice?: string; other?: string }>;
  const list = await getList(me.client);
  const onList = new Set((list?.entries ?? []).map((e) => String(e.cptid)));
  const resp = await getResponses(me.client, me.member.id);
  const now = new Date().toISOString();
  for (const [id, a] of Object.entries(changes)) {
    if (!onList.has(id)) continue;
    const choice = String(a?.choice ?? "");
    if (!VALID.has(choice)) continue;
    const other = String(a?.other ?? "").slice(0, 1000);
    if (!choice && !other) { delete resp.answers[id]; continue; }
    resp.answers[id] = { choice: choice as BrAnswer["choice"], other: other || undefined, at: now };
  }
  resp.updatedAt = now;
  await saveResponses(me.client, resp);
  return NextResponse.json({ ok: true, updatedAt: now });
}
