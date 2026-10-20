import { NextRequest, NextResponse } from "next/server";
import { currentMember, sortEntries } from "@/lib/board-review/server";
import { getList, getResponses, saveAnswers, touchMember } from "@/lib/board-review/store";
import { addBoardSuggestion, portalProspects, BOARD_SUGGEST_PREFIX } from "@/lib/portal-v2/server";
import { BR_CHOICES, BR_CLIENT_NAMES, type BrAnswer } from "@/lib/board-review/config";

// Board member API: returns ONLY the shared list (name, city, state) and the member's OWN answers.
export const dynamic = "force-dynamic";
const deny = () => NextResponse.json({ error: "Please sign in" }, { status: 401 });

export async function GET(req: NextRequest) {
  const me = await currentMember(req);
  if (!me) return deny();
  const [list, resp, added] = await Promise.all([getList(me.client), getResponses(me.client, me.member.id), portalProspects(me.client)]);
  const mine = added.filter((p) => p.created_by === `${BOARD_SUGGEST_PREFIX}${me.member.name}`.slice(0, 200)).map((p) => ({ name: p.full_name, city: p.city ?? "", state: p.state ?? "" }));
  // Touch lastSeen at most once an hour.
  if (!me.member.lastSeen || Date.now() - Date.parse(me.member.lastSeen) > 3600_000) {
    await touchMember(me.client, me.member.id).catch(() => {});
  }
  return NextResponse.json({
    client: me.client, clientName: BR_CLIENT_NAMES[me.client], member: { name: me.member.name },
    entries: sortEntries(list?.entries ?? []).map((e) => ({ cptid: e.cptid, name: e.name, city: e.city, state: e.state })),
    answers: resp.answers, updatedAt: resp.updatedAt, suggestions: mine,
  });
}

const VALID = new Set<string>(["", ...BR_CHOICES.map((c) => c.key)]);
export async function POST(req: NextRequest) {
  const me = await currentMember(req);
  if (!me) return deny();
  const body = await req.json().catch(() => ({}));
  if (body.suggest) {
    const t = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
    const sg = { name: t(body.suggest.name, 200), city: t(body.suggest.city, 100), state: t(body.suggest.state, 50), phone: t(body.suggest.phone, 50), how: t(body.suggest.how, 700) };
    if (!sg.name) return NextResponse.json({ error: "Please enter a name" }, { status: 400 });
    try { await addBoardSuggestion(me.client, me.member.name, sg); }
    catch { return NextResponse.json({ error: "Could not save right now. Please try again." }, { status: 500 }); }
    return NextResponse.json({ ok: true, suggestion: { name: sg.name, city: sg.city, state: sg.state } });
  }
  const changes = (body.answers ?? {}) as Record<string, { choice?: string; other?: string }>;
  const list = await getList(me.client);
  const onList = new Set((list?.entries ?? []).map((e) => String(e.cptid)));
  const now = new Date().toISOString();
  const out: Record<string, BrAnswer | null> = {};
  for (const [id, a] of Object.entries(changes)) {
    if (!onList.has(id)) continue;
    const choice = String(a?.choice ?? "");
    if (!VALID.has(choice)) continue;
    const other = String(a?.other ?? "").slice(0, 1000);
    out[id] = !choice && !other ? null : { choice: choice as BrAnswer["choice"], other: other || undefined, at: now };
  }
  if (Object.keys(out).length) await saveAnswers(me.client, me.member.id, out);
  return NextResponse.json({ ok: true, updatedAt: now });
}
