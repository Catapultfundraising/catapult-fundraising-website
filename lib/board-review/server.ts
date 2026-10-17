import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { BR_MEMBER_COOKIE, verifyMemberToken } from "@/lib/board-review/auth";
import { getMembers, getResponses, type BrMember } from "@/lib/board-review/store";
import { isBrClient, type BrClient, type BrEntry, type BrMemberPublic } from "@/lib/board-review/config";

/** Catapult staff only: the research cookie (or X-Research-Key). Client dashboard passwords do NOT qualify. */
export async function catapultClient(req: NextRequest, c: string | null): Promise<BrClient | null> {
  if (!c || !isBrClient(c)) return null;
  return (await isResearchAuthed(req)) ? c : null;
}

/** A signed-in board member, re-checked against the saved member list. */
export async function currentMember(req: NextRequest): Promise<{ client: BrClient; member: BrMember } | null> {
  const t = await verifyMemberToken(req.cookies.get(BR_MEMBER_COOKIE)?.value);
  if (!t || !isBrClient(t.client)) return null;
  const member = (await getMembers(t.client)).find((m) => m.id === t.memberId);
  if (!member || member.version !== t.version) return null;
  return { client: t.client, member };
}

export const publicMember = (m: BrMember, answered?: number): BrMemberPublic => ({ id: m.id, name: m.name, email: m.email, role: m.role, invitedAt: m.invitedAt, lastSeen: m.lastSeen, answered });

export const sortEntries = (e: BrEntry[]) => [...e].sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.name.localeCompare(b.name));

export async function allResponses(c: BrClient, members: BrMember[]) {
  const rs = await Promise.all(members.map((m) => getResponses(c, m.id)));
  return Object.fromEntries(members.map((m, i) => [m.id, rs[i].answers]));
}
