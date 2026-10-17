import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { BR_MEMBER_COOKIE, verifyMemberToken } from "@/lib/board-review/auth";
import { getMembers, getState, type BrMember } from "@/lib/board-review/store";
import { isBrClient, type BrClient, type BrEntry, type BrMemberPublic } from "@/lib/board-review/config";

/** Catapult staff only: the research cookie (or X-Research-Key). Client dashboard passwords do NOT qualify. */
export async function catapultClient(req: NextRequest, c: string | null): Promise<BrClient | null> {
  if (!c || !isBrClient(c)) return null;
  return (await isCatapultStaff(req)) ? c : null;
}

/** Research cookie / research key, or Viktor's Bearer CRON_SECRET. Never a client dashboard password. */
export async function isCatapultStaff(req: NextRequest): Promise<boolean> {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return isResearchAuthed(req);
}

/** A signed-in board member, re-checked against the saved member list. */
export async function currentMember(req: NextRequest): Promise<{ client: BrClient; member: BrMember } | null> {
  const t = await verifyMemberToken(req.cookies.get(BR_MEMBER_COOKIE)?.value);
  if (!t || !isBrClient(t.client)) return null;
  const member = (await getMembers(t.client)).find((m) => m.id === t.memberId);
  if (!member || member.version !== t.version) return null;
  return { client: t.client, member };
}

export const publicMember = (m: BrMember, answered?: number): BrMemberPublic => ({ id: m.id, name: m.name, email: m.email, role: m.role, invitedAt: m.invitedAt, lastSeen: m.lastSeen,
  answered: answered ?? m.answered, dueDate: m.dueDate, reminderSentAt: m.reminderSentAt, inviteCount: m.inviteCount, queued: m.queued });

export const sortEntries = (e: BrEntry[]) => [...e].sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.name.localeCompare(b.name));

/** Everything for the staff screens in one SQL round trip. */
export async function adminState(c: BrClient) {
  const s = await getState(c);
  return { list: s.list, members: s.members, answers: s.answers ?? {} };
}
